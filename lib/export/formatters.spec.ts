import { vi } from 'vitest';
import { toJson, toCsv, toExcel } from './formatters';
import { ExportFormat, ExportOptions } from '../../types/export-types';
import * as processors from './processors'; // To mock expandArrayFields
import ExcelJS from 'exceljs';

// Mock exceljs library
vi.mock('exceljs');

// Mock processors.expandArrayFields
vi.spyOn(processors, 'expandArrayFields').mockImplementation((data, fields) => {
  // Simplified mock: if fields are provided and data exists, simulate expansion
  // This mock is basic and might need adjustment based on specific test needs for expandArrayFields' behavior.
  if (fields && fields.length > 0 && data.length > 0 && data[0] && fields.includes(Object.keys(data[0])[1])) { 
     let expanded: any[] = [];
     for (const item of data) {
         const fieldToExpand = fields[0]; // Assuming only one field for simplicity in this mock
         if (item[fieldToExpand] && Array.isArray(item[fieldToExpand])) {
             if (item[fieldToExpand].length === 0) {
                 expanded.push({...item, [fieldToExpand]: null });
             } else {
                 for (const val of item[fieldToExpand]) {
                     expanded.push({...item, [fieldToExpand]: val});
                 }
             }
         } else {
             expanded.push(item); // No expansion if field not array or not present
         }
     }
     return expanded;
  }
  return data; // Return original data if no expansion fields or conditions not met
});

describe('lib/export/formatters', () => {
  const sampleData = [
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob', email: 'bob@example.com' },
  ];
  const sampleDataWithArrays = [
     { id: 1, name: 'Doc A', tags: ['dev', 'test'], value: 10 },
     { id: 2, name: 'Doc B', tags: ['prod'], value: 20 }
  ];


  describe('toJson', () => {
    it('should convert data to a valid JSON string', () => {
      const jsonOutput = toJson(sampleData);
      expect(JSON.parse(jsonOutput)).toEqual(sampleData);
    });
    it('should pretty print JSON', () => {
      const jsonOutput = toJson([{id:1}]);
      expect(jsonOutput).toBe(JSON.stringify([{id:1}], null, 2));
    });
  });

  describe('toCsv', () => {
    it('should convert data to a CSV string with headers', () => {
      const csvOutput = toCsv(sampleData, { format: ExportFormat.CSV });
      const expectedCsv = 'id,name,email\n1,Alice,alice@example.com\n2,Bob,bob@example.com';
      expect(csvOutput).toBe(expectedCsv);
    });

    it('should handle empty data for CSV', () => {
      expect(toCsv([], { format: ExportFormat.CSV })).toBe('');
    });
    
    it('should escape commas in CSV values', () => {
      const dataWithComma = [{ id: 1, name: 'Smith, John', role: 'Developer' }];
      const csvOutput = toCsv(dataWithComma, { format: ExportFormat.CSV });
      expect(csvOutput).toBe('id,name,role\n1,"Smith, John",Developer');
    });

    it('should escape double quotes in CSV values', () => {
      const dataWithQuotes = [{ id: 1, name: 'Entry "X"', description: 'Test' }];
      const csvOutput = toCsv(dataWithQuotes, { format: ExportFormat.CSV });
      expect(csvOutput).toBe('id,name,description\n1,"Entry ""X""","Test"');
    });

    it('should call expandArrayFields when multiRowExpansion is true for CSV', () => {
      const options: ExportOptions = { format: ExportFormat.CSV, multiRowExpansion: true, fieldsToExpand: ['tags'] };
      // Reset mock before this specific call if needed, or ensure it's not affected by others
      (processors.expandArrayFields as any).mockClear(); 
      toCsv(sampleDataWithArrays, options);
      expect(processors.expandArrayFields).toHaveBeenCalledWith(sampleDataWithArrays, ['tags']);
    });
  });

  describe('toExcel', () => {
    let mockWorkbook: any;
    let mockWorksheet: any;
    let mockAddWorksheet: ReturnType<typeof vi.fn>;
    let mockAddRows: ReturnType<typeof vi.fn>;
    let mockWriteBuffer: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockAddRows = vi.fn();
      mockWriteBuffer = vi.fn().mockResolvedValue(Buffer.from('excel-data'));
      mockAddWorksheet = vi.fn().mockImplementation(() => {
         mockWorksheet = { addRows: mockAddRows, columns: [] };
         return mockWorksheet;
      });
      
      mockWorkbook = {
        addWorksheet: mockAddWorksheet,
        xlsx: { writeBuffer: mockWriteBuffer },
      };
      (ExcelJS.Workbook as any).mockImplementation(() => mockWorkbook);
    });

    it('should convert data to an Excel buffer', async () => {
      const buffer = await toExcel(sampleData, { format: ExportFormat.EXCEL });
      expect(ExcelJS.Workbook).toHaveBeenCalled();
      expect(mockAddWorksheet).toHaveBeenCalledWith('Sheet 1');
      expect(mockWorksheet.columns).toEqual([
         { header: 'id', key: 'id', width: 15 },
         { header: 'name', key: 'name', width: 15 },
         { header: 'email', key: 'email', width: 15 }
      ]);
      expect(mockAddRows).toHaveBeenCalledWith(sampleData);
      expect(mockWriteBuffer).toHaveBeenCalled();
      expect(buffer.toString()).toBe('excel-data');
    });

    it('should handle empty data for Excel', async () => {
      await toExcel([], { format: ExportFormat.EXCEL });
      expect(mockAddRows).not.toHaveBeenCalled();
      expect(mockWriteBuffer).toHaveBeenCalled(); 
    });
    
    it('should use sheetName from options if provided', async () => {
      await toExcel(sampleData, { format: ExportFormat.EXCEL, sheetName: 'MyData' } as any);
      expect(mockAddWorksheet).toHaveBeenCalledWith('MyData');
    });

    it('should call expandArrayFields when multiRowExpansion is true for Excel', async () => {
      const options: ExportOptions = { format: ExportFormat.EXCEL, multiRowExpansion: true, fieldsToExpand: ['tags'] };
      (processors.expandArrayFields as any).mockClear();
      await toExcel(sampleDataWithArrays, options);
      expect(processors.expandArrayFields).toHaveBeenCalledWith(sampleDataWithArrays, ['tags']);
    });
  });
});
