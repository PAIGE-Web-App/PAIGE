import * as XLSX from 'xlsx';

export interface TodoCSVUploadResult {
  success: boolean;
  todos: Array<{
    name: string;
    note?: string;
    category?: string;
    deadline?: string;
    endDate?: string;
  }>;
  errors: string[];
  warnings: string[];
  totalRows: number;
  processedRows: number;
}

export interface TodoCSVColumnMapping {
  name: string;
  note?: string;
  category?: string;
  deadline?: string;
  endDate?: string;
}

export const DEFAULT_TODO_CSV_MAPPING: TodoCSVColumnMapping = {
  name: 'To-do Name',
  note: 'Note',
  category: 'Category',
  deadline: 'Deadline',
  endDate: 'End Date'
};

export function parseTodoCSVFile(
  file: File,
  columnMapping: TodoCSVColumnMapping = DEFAULT_TODO_CSV_MAPPING
): Promise<TodoCSVUploadResult> {
  return new Promise((resolve) => {
    const result: TodoCSVUploadResult = {
      success: false,
      todos: [],
      errors: [],
      warnings: [],
      totalRows: 0,
      processedRows: 0
    };

    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (fileExtension === '.csv') {
      parseCSVContent(file, columnMapping, result, resolve);
    } else if (fileExtension === '.xls' || fileExtension === '.xlsx') {
      parseExcelContent(file, columnMapping, result, resolve);
    } else {
      result.errors.push('Unsupported file format. Please use CSV, XLS, or XLSX files.');
      resolve(result);
    }
  });
}

function parseCSVContent(
  file: File,
  columnMapping: TodoCSVColumnMapping,
  result: TodoCSVUploadResult,
  resolve: (result: TodoCSVUploadResult) => void
) {
  const reader = new FileReader();
  
  reader.onload = (e) => {
    try {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        result.errors.push('CSV file must have at least a header row and one data row');
        resolve(result);
        return;
      }

      const headers = parseCSVLine(lines[0]);
      const dataRows = lines.slice(1);
      
      result.totalRows = dataRows.length;
      
      // Find column indices
      const nameIndex = findColumnIndex(headers, columnMapping.name);
      if (nameIndex === -1) {
        result.errors.push(`Required column "${columnMapping.name}" not found`);
        resolve(result);
        return;
      }

      const noteIndex = findColumnIndex(headers, columnMapping.note);
      const categoryIndex = findColumnIndex(headers, columnMapping.category);
      const deadlineIndex = findColumnIndex(headers, columnMapping.deadline);
      const endDateIndex = findColumnIndex(headers, columnMapping.endDate);

      // Process each row
      dataRows.forEach((line, index) => {
        try {
          const values = parseCSVLine(line);
          
          if (values.length === 0 || values.every(v => !v.trim())) {
            result.warnings.push(`Row ${index + 2}: Empty row skipped`);
            return;
          }

          const name = values[nameIndex]?.trim();
          if (!name) {
            result.warnings.push(`Row ${index + 2}: To-do item name is required, skipping row`);
            return;
          }

          const todo = {
            name,
            note: noteIndex !== -1 ? values[noteIndex]?.trim() : undefined,
            category: categoryIndex !== -1 ? values[categoryIndex]?.trim() : undefined,
            deadline: deadlineIndex !== -1 ? values[deadlineIndex]?.trim() : undefined,
            endDate: endDateIndex !== -1 ? values[endDateIndex]?.trim() : undefined
          };

          // Validate date formats
          if (todo.deadline && !isValidDateFormat(todo.deadline)) {
            result.warnings.push(`Row ${index + 2}: Invalid deadline format "${todo.deadline}". Expected: MM-DD-YYYY HH:mm`);
            todo.deadline = undefined;
          }

          if (todo.endDate && !isValidDateFormat(todo.endDate)) {
            result.warnings.push(`Row ${index + 2}: Invalid end date format "${todo.endDate}". Expected: MM-DD-YYYY HH:mm`);
            todo.endDate = undefined;
          }

          result.todos.push(todo);
          result.processedRows++;
        } catch (error) {
          result.warnings.push(`Row ${index + 2}: Error parsing row - ${error}`);
        }
      });

      result.success = result.processedRows > 0;
      resolve(result);
    } catch (error) {
      result.errors.push(`Error reading CSV file: ${error}`);
      resolve(result);
    }
  };

  reader.readAsText(file);
}

function parseExcelContent(
  file: File,
  columnMapping: TodoCSVColumnMapping,
  result: TodoCSVUploadResult,
  resolve: (result: TodoCSVUploadResult) => void
) {
  const reader = new FileReader();
  
  reader.onload = (e) => {
    try {
      const data = e.target?.result;
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (jsonData.length < 2) {
        result.errors.push('Excel file must have at least a header row and one data row');
        resolve(result);
        return;
      }

      const headers = jsonData[0] as string[];
      const dataRows = jsonData.slice(1) as string[][];
      
      result.totalRows = dataRows.length;
      
      // Find column indices
      const nameIndex = findColumnIndex(headers, columnMapping.name);
      if (nameIndex === -1) {
        result.errors.push(`Required column "${columnMapping.name}" not found`);
        resolve(result);
        return;
      }

      const noteIndex = findColumnIndex(headers, columnMapping.note);
      const categoryIndex = findColumnIndex(headers, columnMapping.category);
      const deadlineIndex = findColumnIndex(headers, columnMapping.deadline);
      const endDateIndex = findColumnIndex(headers, columnMapping.endDate);

      // Process each row
      dataRows.forEach((values, index) => {
        try {
          if (!values || values.length === 0 || values.every(v => !v || !v.toString().trim())) {
            result.warnings.push(`Row ${index + 2}: Empty row skipped`);
            return;
          }

          const name = values[nameIndex]?.toString().trim();
          if (!name) {
            result.warnings.push(`Row ${index + 2}: To-do item name is required, skipping row`);
            return;
          }

          const todo = {
            name,
            note: noteIndex !== -1 ? values[noteIndex]?.toString().trim() : undefined,
            category: categoryIndex !== -1 ? values[categoryIndex]?.toString().trim() : undefined,
            deadline: deadlineIndex !== -1 ? values[deadlineIndex]?.toString().trim() : undefined,
            endDate: endDateIndex !== -1 ? values[endDateIndex]?.toString().trim() : undefined
          };

          // Validate date formats
          if (todo.deadline && !isValidDateFormat(todo.deadline)) {
            result.warnings.push(`Row ${index + 2}: Invalid deadline format "${todo.deadline}". Expected: MM-DD-YYYY HH:mm`);
            todo.deadline = undefined;
          }

          if (todo.endDate && !isValidDateFormat(todo.endDate)) {
            result.warnings.push(`Row ${index + 2}: Invalid end date format "${todo.endDate}". Expected: MM-DD-YYYY HH:mm`);
            todo.endDate = undefined;
          }

          result.todos.push(todo);
          result.processedRows++;
        } catch (error) {
          result.warnings.push(`Row ${index + 2}: Error parsing row - ${error}`);
        }
      });

      result.success = result.processedRows > 0;
      resolve(result);
    } catch (error) {
      result.errors.push(`Error reading Excel file: ${error}`);
      resolve(result);
    }
  };

  reader.readAsArrayBuffer(file);
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

function findColumnIndex(headers: string[], targetColumn: string): number {
  return headers.findIndex(header => 
    header.toLowerCase().trim() === targetColumn.toLowerCase().trim()
  );
}

function isValidDateFormat(dateString: string): boolean {
  // Check for MM-DD-YYYY HH:mm format
  const dateRegex = /^\d{2}-\d{2}-\d{4} \d{2}:\d{2}$/;
  if (!dateRegex.test(dateString)) {
    return false;
  }
  
  // Parse MM-DD-YYYY format
  const parts = dateString.split(' ');
  const datePart = parts[0];
  const timePart = parts[1];
  const [month, day, year] = datePart.split('-');
  
  // Create date in YYYY-MM-DD format for validation
  const isoDateString = `${year}-${month}-${day} ${timePart}`;
  const date = new Date(isoDateString);
  return !isNaN(date.getTime());
}

export function generateTodoCSVTemplate(): string {
  const headers = ['To-do Name', 'Note', 'Category', 'Deadline', 'End Date'];
  
  const sampleTodos = [
    ['Book venue', 'Research and visit 3-4 venues', 'Venue', '06-15-2024 18:00', '06-30-2024 18:00'],
    ['Order wedding dress', 'Schedule fittings and alterations', 'Attire', '05-01-2024 12:00', '07-15-2024 12:00'],
    ['Send save the dates', 'Design and print save the date cards', 'Invitations', '04-01-2024 10:00', '04-15-2024 10:00'],
    ['Hire photographer', 'Compare packages and book photographer', 'Photography', '05-15-2024 14:00', '06-01-2024 14:00'],
    ['Plan ceremony music', 'Choose songs for processional and recessional', 'Music', '06-01-2024 16:00', '07-01-2024 16:00'],
    ['Order wedding rings', 'Get rings sized and engraved', 'Attire', '05-30-2024 11:00', '07-01-2024 11:00'],
    ['Book hair and makeup', 'Schedule trial appointments', 'Beauty', '06-15-2024 10:00', '07-10-2024 10:00'],
    ['Plan rehearsal dinner', 'Choose venue and menu', 'Rehearsal', '07-20-2024 18:00', '07-25-2024 18:00'],
    ['Order wedding favors', 'Choose and order guest favors', 'Details', '06-30-2024 15:00', '07-15-2024 15:00'],
    ['Finalize guest list', 'Confirm final headcount with venue', 'Planning', '07-01-2024 12:00', '07-10-2024 12:00']
  ];
  
  // Properly escape CSV data
  const escapeCsvValue = (value: string): string => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };
  
  const csvContent = [
    headers.map(escapeCsvValue).join(','),
    ...sampleTodos.map(row => row.map(escapeCsvValue).join(','))
  ].join('\n');
  
  return csvContent;
}

export function downloadTodoCSVTemplate(): void {
  const csvContent = generateTodoCSVTemplate();
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'todo-list-template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
