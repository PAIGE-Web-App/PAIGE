import { Guest, CSVUploadResult, GUEST_ATTRIBUTES } from '@/types/seatingChart';

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
    const reader = new FileReader();
    const result: CSVUploadResult = {
      success: false,
      guests: [],
      errors: [],
      warnings: [],
      totalRows: 0,
      processedRows: 0
    };

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
    isAttending: true,
    rsvpStatus: 'pending'
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
          guest.name = value;
          break;
          
        case 'email':
          guest.email = value || undefined;
          break;
          
        case 'phone':
          guest.phone = value || undefined;
          break;
          
        case 'dietaryRestrictions':
          if (value) {
            guest.dietaryRestrictions = value
              .split(';')
              .map(d => d.trim())
              .filter(d => d && GUEST_ATTRIBUTES.dietaryRestrictions.includes(d));
          }
          break;
          
        case 'plusOne':
          guest.plusOne = value.toLowerCase() === 'yes' || value.toLowerCase() === 'true';
          break;
          
        case 'plusOneName':
          guest.plusOneName = value || undefined;
          break;
          
        case 'familyGroup':
          guest.familyGroup = value || undefined;
          break;
          
        case 'friendGroup':
          guest.friendGroup = value || undefined;
          break;
          
        case 'workGroup':
          guest.workGroup = value || undefined;
          break;
          
        case 'highSchoolGroup':
          guest.highSchoolGroup = value || undefined;
          break;
          
        case 'collegeGroup':
          guest.collegeGroup = value || undefined;
          break;
          
        case 'otherGroups':
          if (value) {
            guest.otherGroups = value
              .split(';')
              .map(g => g.trim())
              .filter(g => g);
          }
          break;
          
        case 'notes':
          guest.notes = value || undefined;
          break;
          
        case 'isAttending':
          guest.isAttending = value.toLowerCase() !== 'no' && value.toLowerCase() !== 'false';
          break;
          
        case 'rsvpStatus':
          const status = value.toLowerCase();
          if (GUEST_ATTRIBUTES.rsvpStatuses.includes(status as any)) {
            guest.rsvpStatus = status as 'pending' | 'confirmed' | 'declined';
          }
          break;
      }
    }
  });

  // Validate required fields
  if (!guest.name) {
    throw new Error('Name is required');
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
  
  if (!guest.name.trim()) {
    errors.push('Name is required');
  }
  
  if (guest.email && !isValidEmail(guest.email)) {
    errors.push('Invalid email format');
  }
  
  if (guest.phone && !isValidPhone(guest.phone)) {
    errors.push('Invalid phone format');
  }
  
  if (guest.plusOne && !guest.plusOneName) {
    errors.push('Plus one name is required when plus one is enabled');
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
