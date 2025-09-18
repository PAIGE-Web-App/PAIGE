import { Guest, CSVUploadResult, GUEST_ATTRIBUTES } from '../types/seatingChart';
import * as XLSX from 'xlsx';

export interface CSVColumnMapping {
  name: string;
  relationship?: string;
  mealPreference?: string;
  email?: string;
  phone?: string;
  dietaryRestrictions?: string;
  plusOne?: string;
  plusOneName?: string;
  familyGroup?: string;
  friendGroup?: string;
  workGroup?: string;
  highSchoolGroup?: string;
  collegeGroup?: string;
  otherGroups?: string;
  notes?: string;
  isAttending?: string;
  rsvpStatus?: string;
}

export interface CustomColumn {
  id: string;
  key: string;
  label: string;
  type: 'text' | 'select';
  isRequired: boolean;
  isEditable: boolean;
  isRemovable: boolean;
  order: number;
  width: number;
  options?: string[];
}

export const DEFAULT_CSV_MAPPING: CSVColumnMapping = {
  name: 'Name',
  relationship: 'Relationship to You',
  mealPreference: 'Meal Preference',
  notes: 'Notes'
};

export function parseCSVFile(
  file: File,
  columnMapping: CSVColumnMapping = DEFAULT_CSV_MAPPING
): Promise<CSVUploadResult> {
  return new Promise((resolve) => {
    const result: CSVUploadResult = {
      success: false,
      guests: [],
      errors: [],
      warnings: [],
      totalRows: 0,
      processedRows: 0,
      customColumns: []
    };

    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (fileExtension === '.csv') {
      // Handle CSV files
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const csv = event.target?.result as string;
          const lines = csv.split('\n').filter(line => line.trim());
          
          if (lines.length < 2) {
            result.errors.push('CSV file must have at least a header row and one data row');
            resolve(result);
            return;
          }

          const headers = parseCSVRow(lines[0]);
          const dataRows = lines.slice(1);
          
          result.totalRows = dataRows.length;
          
          // Validate required columns (case-insensitive)
          const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
          const requiredColumn = columnMapping.name.toLowerCase().trim();
          
          if (!normalizedHeaders.includes(requiredColumn)) {
            result.errors.push(`Required column '${columnMapping.name}' not found in CSV`);
            resolve(result);
            return;
          }

          // Process each row
          dataRows.forEach((row, index) => {
            try {
              const values = parseCSVRow(row);
              // Ensure all values are strings and not undefined
              const safeValues = values.map(val => val ? val.toString() : '');
              const guest = parseGuestFromRow(safeValues, headers, columnMapping, index + 2);
              
              if (guest) {
                result.guests.push(guest);
                result.processedRows++;
              }
            } catch (error) {
              result.errors.push(`Row ${index + 2}: ${error instanceof Error ? error.message : 'Invalid data'}`);
            }
          });

          // Detect custom columns from the first guest's customFields
          if (result.guests.length > 0) {
            const firstGuest = result.guests[0];
            if (firstGuest.customFields) {
              result.customColumns = Object.keys(firstGuest.customFields).map((key, index) => ({
                id: `custom-${Date.now()}-${index}`,
                key: key,
                label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                type: 'text' as const,
                isRequired: false,
                isEditable: true,
                isRemovable: true,
                order: 100 + index, // Place after standard columns
                width: 150
              }));
              console.log('Detected custom columns:', result.customColumns);
            }
          }

          // Add warnings for common issues
          if (result.guests.length === 0) {
            result.warnings.push('No valid guest data found in CSV');
          } else if (result.processedRows < result.totalRows) {
            result.warnings.push(`${result.totalRows - result.processedRows} rows had errors and were skipped`);
          }

          result.success = result.processedRows > 0;
          resolve(result);

        } catch (error) {
          result.errors.push(`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
          resolve(result);
        }
      };

      reader.onerror = () => {
        result.errors.push('Failed to read CSV file');
        resolve(result);
      };

      reader.readAsText(file);
    } else if (fileExtension === '.xls' || fileExtension === '.xlsx') {
      // Handle Excel files
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const data = event.target?.result as ArrayBuffer;
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Find the first sheet that has data
          let sheetName = workbook.SheetNames[0];
          let worksheet = workbook.Sheets[sheetName];
          let jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          // If the first sheet is empty, try other sheets
          if (jsonData.length === 0) {
            for (const name of workbook.SheetNames) {
              const testWorksheet = workbook.Sheets[name];
              const testJsonData = XLSX.utils.sheet_to_json(testWorksheet, { header: 1 });
              if (testJsonData.length > 0) {
                sheetName = name;
                worksheet = testWorksheet;
                jsonData = testJsonData;
                console.log(`Using sheet '${sheetName}' instead of empty first sheet`);
                break;
              }
            }
          }
          
          if (jsonData.length < 2) {
            result.errors.push('Excel file must have at least a header row and one data row');
            resolve(result);
            return;
          }

          const headers = (jsonData[0] as string[]).map(h => h?.toString() || '');
          const dataRows = jsonData.slice(1) as string[][];
          
          // Additional validation for empty data
          if (headers.length === 0 || headers.every(h => !h || h.trim() === '')) {
            result.errors.push('Excel file appears to be empty or has no valid headers');
            resolve(result);
            return;
          }
          
          result.totalRows = dataRows.length;
          
          // Debug logging
          console.log('Excel headers:', headers);
          console.log('Excel data rows count:', dataRows.length);
          console.log('First data row:', dataRows[0]);
          console.log('All jsonData:', jsonData);
          console.log('Sheet names:', workbook.SheetNames);
          
          // Debug first few rows to see data structure
          dataRows.slice(0, 3).forEach((row, index) => {
            console.log(`Row ${index + 1}:`, row);
            console.log(`Row ${index + 1} mapped:`, row.map(cell => cell?.toString() || ''));
          });
          
          // Validate required columns (case-insensitive)
          const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
          const requiredColumn = columnMapping.name.toLowerCase().trim();
          
          if (!normalizedHeaders.includes(requiredColumn)) {
            result.errors.push(`Required column '${columnMapping.name}' not found in Excel file`);
            resolve(result);
            return;
          }

          // Process each row
          dataRows.forEach((row, index) => {
            try {
              const values = row.map(cell => cell?.toString() || '');
              // Ensure all values are strings and not undefined
              const safeValues = values.map(val => val ? val.toString() : '');
              const guest = parseGuestFromRow(safeValues, headers, columnMapping, index + 2);
              
              if (guest) {
                result.guests.push(guest);
                result.processedRows++;
              }
            } catch (error) {
              result.errors.push(`Row ${index + 2}: ${error instanceof Error ? error.message : 'Invalid data'}`);
            }
          });

          // Detect custom columns from the first guest's customFields
          if (result.guests.length > 0) {
            const firstGuest = result.guests[0];
            if (firstGuest.customFields) {
              result.customColumns = Object.keys(firstGuest.customFields).map((key, index) => ({
                id: `custom-${Date.now()}-${index}`,
                key: key,
                label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                type: 'text' as const,
                isRequired: false,
                isEditable: true,
                isRemovable: true,
                order: 100 + index, // Place after standard columns
                width: 150
              }));
              console.log('Detected custom columns:', result.customColumns);
            }
          }

          // Add warnings for common issues
          if (result.guests.length === 0) {
            result.warnings.push('No valid guest data found in Excel file');
          } else if (result.processedRows < result.totalRows) {
            result.warnings.push(`${result.totalRows - result.processedRows} rows had errors and were skipped`);
          }

          result.success = result.processedRows > 0;
          resolve(result);

        } catch (error) {
          result.errors.push(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
          resolve(result);
        }
      };

      reader.onerror = () => {
        result.errors.push('Failed to read Excel file');
        resolve(result);
      };

      reader.readAsArrayBuffer(file);
    } else {
      result.errors.push('Unsupported file format. Please use CSV, XLS, or XLSX files.');
      resolve(result);
    }
  });
}

function parseCSVRow(row: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

function parseGuestFromRow(
  values: string[],
  headers: string[],
  mapping: CSVColumnMapping,
  rowNumber: number
): Guest | null {
  const guest: Partial<Guest> = {
    id: generateGuestId(),
    customFields: {}
  };

  // First, map predefined columns
  Object.entries(mapping).forEach(([key, headerName]) => {
    if (!headerName) return;
    
    const columnIndex = headers.findIndex(h => 
      h.toLowerCase().trim() === headerName.toLowerCase().trim()
    );
    
    if (columnIndex >= 0 && columnIndex < values.length) {
      const rawValue = values[columnIndex];
      const value = rawValue ? rawValue.toString().trim() : '';
      
      switch (key) {
        case 'name':
          if (!value) {
            throw new Error('Name is required');
          }
          guest.fullName = value;
          break;
          
        case 'mealPreference':
          if (value) {
            guest.mealPreference = value;
          }
          break;
          
        case 'relationship':
          if (value) {
            guest.relationship = value;
          }
          break;
          
        case 'notes':
          if (value) {
            guest.notes = value;
          }
          break;
          
        case 'email':
        case 'phone':
        case 'plusOne':
        case 'plusOneName':
        case 'isAttending':
        case 'rsvpStatus':
          // Store these in customFields for now
          if (value && guest.customFields) {
            guest.customFields[key] = value;
          }
          break;
      }
    }
  });

  // Then, capture ALL other columns as custom fields
  headers.forEach((header, index) => {
    if (index < values.length) {
      const rawValue = values[index];
      const value = rawValue ? rawValue.toString().trim() : '';
      const normalizedHeader = header ? header.toLowerCase().trim() : '';
      
      // Skip if this column was already processed by the mapping above
      const isMappedColumn = Object.values(mapping).some(mappedHeader => 
        mappedHeader && mappedHeader.toLowerCase().trim() === normalizedHeader
      );
      
      if (!isMappedColumn && value && guest.customFields) {
        // Use the original header name as the key, but make it safe for object keys
        const safeKey = header ? header.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase() : `column_${index}`;
        guest.customFields[safeKey] = value;
        console.log(`Captured custom field: ${header} -> ${safeKey} = ${value}`);
      }
    }
  });

  // Validate required fields
  if (!guest.fullName) {
    throw new Error('Name is required');
  }

  return guest as Guest;
}

function generateGuestId(): string {
  return `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Helper function to create a sample CSV template
// Debug function to test Excel parsing
export function debugExcelFile(file: File): Promise<void> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result as ArrayBuffer;
        const workbook = XLSX.read(data, { type: 'array' });
        console.log('=== EXCEL DEBUG INFO ===');
        console.log('Sheet names:', workbook.SheetNames);
        console.log('First sheet name:', workbook.SheetNames[0]);
        
        // Check all sheets for data
        workbook.SheetNames.forEach((name, index) => {
          const testWorksheet = workbook.Sheets[name];
          const testJsonData = XLSX.utils.sheet_to_json(testWorksheet, { header: 1 });
          console.log(`Sheet ${index + 1} (${name}):`, testJsonData.length, 'rows');
          if (testJsonData.length > 0) {
            console.log(`  First row:`, testJsonData[0]);
          }
        });
        
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        console.log('First worksheet:', worksheet);
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        console.log('Raw jsonData from first sheet:', jsonData);
        console.log('jsonData length:', jsonData.length);
        
        if (jsonData.length > 0) {
          console.log('First row (headers):', jsonData[0]);
          console.log('Headers as strings:', (jsonData[0] as string[]).map(h => h?.toString() || ''));
        }
        
        if (jsonData.length > 1) {
          console.log('Second row (first data):', jsonData[1]);
        }
        
        console.log('=== END DEBUG INFO ===');
      } catch (error) {
        console.error('Debug error:', error);
      }
      resolve();
    };
    reader.readAsArrayBuffer(file);
  });
}

export function generateCSVTemplate(): string {
  const headers = ['Name', 'Relationship to You', 'Meal Preference', 'Notes'];
  
  const sampleGuests = [
    ['Sarah Johnson', 'Bride\'s Family', 'Beef', 'Mother of the bride - prefers front table'],
    ['Michael Johnson', 'Bride\'s Family', 'Chicken', 'Father of the bride - needs wheelchair access'],
    ['Emily Chen', 'Bride\'s Friends', 'Fish', 'College roommate - vegetarian option needed'],
    ['David Rodriguez', 'Groom\'s Family', 'Beef', 'Best man - very social, good for mixing'],
    ['Maria Rodriguez', 'Groom\'s Family', 'Chicken', 'Groom\'s mother - prefers quiet area'],
    ['James Wilson', 'Groom\'s Friends', 'Fish', 'Work colleague - knows other guests'],
    ['Lisa Thompson', 'Bride\'s Friends', 'Beef', 'Childhood friend - gluten-free option'],
    ['Robert Brown', 'Bride\'s Family', 'Chicken', 'Uncle - elderly, needs assistance'],
    ['Jennifer Davis', 'Groom\'s Friends', 'Fish', 'High school friend - bringing plus one'],
    ['Christopher Lee', 'Bride\'s Family', 'Beef', 'Cousin - very outgoing, good for ice breaking']
  ];
  
  // Debug logging
  console.log('Generating CSV template with headers:', headers);
  console.log('Sample guests count:', sampleGuests.length);
  
  // Properly escape CSV data
  const escapeCsvValue = (value: string): string => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };
  
  const csvRows = [
    headers.map(escapeCsvValue).join(','),
    ...sampleGuests.map(row => row.map(escapeCsvValue).join(','))
  ];
  
  const csvContent = csvRows.join('\n');
  console.log('Generated CSV template:', csvContent);
  
  return csvContent;
}

// Helper function to validate guest data
export function validateGuest(guest: Guest): string[] {
  const errors: string[] = [];
  
  if (!guest.fullName?.trim()) {
    errors.push('Name is required');
  }
  
  // Check customFields for additional validation
  if (guest.customFields) {
    if (guest.customFields.email && !isValidEmail(guest.customFields.email)) {
      errors.push('Invalid email format');
    }
    
    if (guest.customFields.phone && !isValidPhone(guest.customFields.phone)) {
      errors.push('Invalid phone format');
    }
    
    if (guest.customFields.plusOne === 'true' && !guest.customFields.plusOneName) {
      errors.push('Plus one name is required when plus one is enabled');
    }
  }
  
  return errors;
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
}

// Export guests to CSV with group information
export function exportGuestsToCSV(guests: any[], guestGroups: any[] = []): string {
  const headers = [
    'Full Name',
    'Relationship',
    'Meal Preference',
    'Notes',
    'Groups'
  ];
  
  // Add custom field headers
  const customFields = new Set<string>();
  guests.forEach(guest => {
    if (guest.customFields) {
      Object.keys(guest.customFields).forEach(key => {
        if (!headers.includes(key)) {
          customFields.add(key);
        }
      });
    }
  });
  
  const allHeaders = [...headers, ...Array.from(customFields)];
  
  // Create CSV content
  const csvRows = [allHeaders.join(',')];
  
  guests.forEach(guest => {
    const row: string[] = [];
    
    // Basic fields
    row.push(escapeCSVField(guest.fullName || ''));
    row.push(escapeCSVField(guest.relationship || ''));
    row.push(escapeCSVField(guest.mealPreference || ''));
    row.push(escapeCSVField(guest.notes || ''));
    
    // Groups field - semicolon-separated group names
    const guestGroupIds = guest.groupIds || (guest.groupId ? [guest.groupId] : []);
    const guestGroupNames = guestGroups
      .filter(group => guestGroupIds.includes(group.id))
      .map(group => group.name);
    row.push(escapeCSVField(guestGroupNames.join('; ')));
    
    // Custom fields
    customFields.forEach(field => {
      row.push(escapeCSVField(guest.customFields?.[field] || ''));
    });
    
    csvRows.push(row.join(','));
  });
  
  return csvRows.join('\n');
}

// Helper function to escape CSV fields
function escapeCSVField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}
