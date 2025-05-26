export enum ExportFormat {
  JSON = 'json',
  CSV = 'csv',
  EXCEL = 'excel',
}

export interface ExportOptions {
  format: ExportFormat;
  multiRowExpansion?: boolean; // Optional: specific to CSV/Excel for array fields
  fieldsToExpand?: string[]; // Which fields to expand if multiRowExpansion is true
  // Potentially add other format-specific options here later
  // e.g., delimiter for CSV, sheetName for Excel
}

export interface ExportResult {
  success: boolean;
  fileUrl?: string; // URL to the exported file if successful
  data?: string | Buffer; // Or the direct data (e.g., JSON string, Excel buffer)
  error?: string; // Error message if not successful
  progress?: ExportProgress; // Optional: for tracking progress
}

export interface ExportProgress {
  totalItems: number;
  processedItems: number;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
}
