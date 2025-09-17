import { Guest, CSVUploadResult, GUEST_ATTRIBUTES } from '../types/seatingChart';
import * as XLSX from 'xlsx';

export interface CSVColumnMapping {
  name: string;
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

export const DEFAULT_CSV_MAPPING: CSVColumnMapping = {
  name: 'Name',
  email: 'Email',
  phone: 'Phone',
  dietaryRestrictions: 'Dietary Restrictions',
  plusOne: 'Plus One',
  plusOneName: 'Plus One Name',
  familyGroup: 'Family Group',
  friendGroup: 'Friend Group',
  workGroup: 'Work Group',
  highSchoolGroup: 'High School Group',
  collegeGroup: 'College Group',
  otherGroups: 'Other Groups',
  notes: 'Notes',
  isAttending: 'Is Attending',
  rsvpStatus: 'RSVP Status'
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
      processedRows: 0
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
          
          // Validate required columns
          if (!headers.includes(columnMapping.name)) {
            result.errors.push(`Required column '${columnMapping.name}' not found in CSV`);
            resolve(result);
            return;
          }

          // Process each row
          dataRows.forEach((row, index) => {
            try {
              const values = parseCSVRow(row);
              const guest = parseGuestFromRow(values, headers, columnMapping, index + 2);
              
              if (guest) {
                result.guests.push(guest);
                result.processedRows++;
              }
            } catch (error) {
              result.errors.push(`Row ${index + 2}: ${error instanceof Error ? error.message : 'Invalid data'}`);
            }
          });

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
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          if (jsonData.length < 2) {
            result.errors.push('Excel file must have at least a header row and one data row');
            resolve(result);
            return;
          }

          const headers = (jsonData[0] as string[]).map(h => h?.toString() || '');
          const dataRows = jsonData.slice(1) as string[][];
          
          result.totalRows = dataRows.length;
          
          // Validate required columns
          if (!headers.includes(columnMapping.name)) {
            result.errors.push(`Required column '${columnMapping.name}' not found in Excel file`);
            resolve(result);
            return;
          }

          // Process each row
          dataRows.forEach((row, index) => {
            try {
              const values = row.map(cell => cell?.toString() || '');
              const guest = parseGuestFromRow(values, headers, columnMapping, index + 2);
              
              if (guest) {
                result.guests.push(guest);
                result.processedRows++;
              }
            } catch (error) {
              result.errors.push(`Row ${index + 2}: ${error instanceof Error ? error.message : 'Invalid data'}`);
            }
          });

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

  // Map each column
  Object.entries(mapping).forEach(([key, headerName]) => {
    if (!headerName) return;
    
    const columnIndex = headers.findIndex(h => 
      h.toLowerCase().trim() === headerName.toLowerCase().trim()
    );
    
    if (columnIndex >= 0 && columnIndex < values.length) {
      const value = values[columnIndex].trim();
      
      switch (key) {
        case 'name':
          if (!value) {
            throw new Error('Name is required');
          }
          // Split name into firstName and lastName
          const nameParts = value.split(' ');
          if (nameParts.length >= 2) {
            (guest as any).firstName = nameParts[0];
            (guest as any).lastName = nameParts.slice(1).join(' ');
          } else {
            (guest as any).firstName = value;
            (guest as any).lastName = '';
          }
          break;
          
        case 'dietaryRestrictions':
          if (value) {
            guest.mealPreference = value;
          }
          break;
          
        case 'familyGroup':
        case 'friendGroup':
        case 'workGroup':
        case 'highSchoolGroup':
        case 'collegeGroup':
        case 'otherGroups':
          if (value) {
            guest.relationship = value;
          }
          break;
          
        case 'notes':
          if (value && guest.customFields) {
            guest.customFields.notes = value;
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

  // Validate required fields
  if (!(guest as any).firstName) {
    throw new Error('First name is required');
  }

  return guest as Guest;
}

function generateGuestId(): string {
  return `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Helper function to create a sample CSV template
export function generateCSVTemplate(): string {
  const headers = Object.values(DEFAULT_CSV_MAPPING).filter(Boolean);
  const sampleRow = [
    'John Smith',
    'john@email.com',
    '(555) 123-4567',
    'Vegetarian',
    'Yes',
    'Jane Smith',
    'Bride Family',
    'College Friends',
    'Tech Company',
    'Lincoln High',
    'Stanford University',
    'Book Club;Running Group',
    'Prefers to sit near family',
    'Yes',
    'confirmed'
  ];
  
  return [headers.join(','), sampleRow.join(',')].join('\n');
}

// Helper function to validate guest data
export function validateGuest(guest: Guest): string[] {
  const errors: string[] = [];
  
  if (!(guest as any).firstName?.trim()) {
    errors.push('First name is required');
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
