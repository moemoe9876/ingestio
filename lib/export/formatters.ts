import { ExportOptions, ExportFormat } from '../../types/export-types'; // Adjust path as needed
// It's likely we'll need a processor for multi-row expansion, let's import it
// We'll define its functions in the next step, but can anticipate its use here.
import { expandArrayFields } from './processors'; 
// For Excel, we'll use the 'exceljs' library.
// Make sure this dependency is added to package.json if it's not already.
// The worker should be able to install it using: npm install exceljs
// Or if using yarn: yarn add exceljs
import ExcelJS from 'exceljs';

/**
 * Converts an array of objects to a JSON string.
 * @param data Array of data to convert.
 * @returns JSON string representation of the data.
 */
export function toJson(data: any[]): string {
  return JSON.stringify(data, null, 2); // Pretty print JSON
}

/**
 * Converts an array of objects to a CSV string.
 * Handles multi-row expansion for array fields if specified in options.
 * @param data Array of data to convert.
 * @param options Export options, including multiRowExpansion and fieldsToExpand.
 * @returns CSV string representation of the data.
 */
export function toCsv(data: any[], options: ExportOptions): string {
  if (options.multiRowExpansion && options.fieldsToExpand && options.fieldsToExpand.length > 0) {
    data = expandArrayFields(data, options.fieldsToExpand);
  }

  if (data.length === 0) {
    return '';
  }

  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')]; // Header row

  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      // Handle cases where value might be null, undefined, or needs escaping
      if (value === null || value === undefined) {
        return '';
      }
      let stringValue = String(value);
      // Basic CSV escaping: if value contains comma, newline or double quote, enclose in double quotes
      if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
        stringValue = `"${stringValue.replace(/"/g, '""')}"`; // Escape double quotes by doubling them
      }
      return stringValue;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

/**
 * Converts an array of objects to an Excel buffer.
 * Handles multi-row expansion for array fields if specified in options.
 * @param data Array of data to convert.
 * @param options Export options, including multiRowExpansion and fieldsToExpand.
 * @returns A Promise that resolves to a Buffer containing the Excel file data.
 */
export async function toExcel(data: any[], options: ExportOptions): Promise<Buffer> {
  if (options.multiRowExpansion && options.fieldsToExpand && options.fieldsToExpand.length > 0) {
    data = expandArrayFields(data, options.fieldsToExpand);
  }

  const workbook = new ExcelJS.Workbook();
  const sheetName = (options as any).sheetName || 'Sheet 1'; // Allow sheetName via options
  const worksheet = workbook.addWorksheet(sheetName);

  if (data.length === 0) {
    // Return an empty Excel file if there's no data
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  // Define columns based on the keys of the first object
  // This assumes all objects have the same structure.
  worksheet.columns = Object.keys(data[0]).map(key => ({
    header: key,
    key: key,
    width: Math.max(key.length, 15) // Set a minimum width
  }));

  // Add rows
  worksheet.addRows(data);

  // Write to buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer); // Ensure it's a Node.js Buffer
}
