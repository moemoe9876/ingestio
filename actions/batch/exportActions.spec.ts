import { vi } from 'vitest';
import { exportDocuments } from './exportActions'; 
import { ExportFormat, ExportOptions } from '../../types/export-types';
import * as formatters from '../../lib/export/formatters'; 
import * as processors from '../../lib/export/processors'; 

// Mock the entire modules
vi.mock('../../lib/export/formatters');
vi.mock('../../lib/export/processors');

// Cast to Vitest's Mocked type for type safety with mocks
const mockFormatters = formatters as vi.Mocked<typeof formatters>;
const mockProcessors = processors as vi.Mocked<typeof processors>;
   
describe('actions/batch/exportActions', () => {
  const batchId = 'testBatch123'; // This will use the default mock data in getDocumentsForBatch
  const sampleDocsForDefaultBatch = [ 
     { id: 1, name: 'Document 1', category: 'X', value: 100 },
     { id: 2, name: 'Document 2', category: 'Y', value: 200 },
  ];

  beforeEach(() => {
    // Reset mocks before each test
    vi.resetAllMocks();

    // Setup default mock implementations
    mockFormatters.toJson.mockReturnValue('json_data');
    mockFormatters.toCsv.mockReturnValue('csv_data');
    mockFormatters.toExcel.mockResolvedValue(Buffer.from('excel_data'));
    // Default mock for expandArrayFields returns data as is
    mockProcessors.expandArrayFields.mockImplementation((data, _fields) => data);
  });

  it('should export documents as JSON successfully', async () => {
    const options: ExportOptions = { format: ExportFormat.JSON };
    const result = await exportDocuments(batchId, ExportFormat.JSON, options);

    expect(result.success).toBe(true);
    expect(result.data).toBe('json_data');
    // getDocumentsForBatch will be called internally by exportDocuments
    expect(mockFormatters.toJson).toHaveBeenCalledWith(sampleDocsForDefaultBatch);
    expect(result.progress?.status).toBe('completed');
  });

  it('should export documents as CSV successfully', async () => {
    const options: ExportOptions = { format: ExportFormat.CSV };
    const result = await exportDocuments(batchId, ExportFormat.CSV, options);

    expect(result.success).toBe(true);
    expect(result.data).toBe('csv_data');
    expect(mockFormatters.toCsv).toHaveBeenCalledWith(sampleDocsForDefaultBatch, options);
    expect(result.progress?.status).toBe('completed');
  });

  it('should export documents as EXCEL successfully', async () => {
    const options: ExportOptions = { format: ExportFormat.EXCEL };
    const result = await exportDocuments(batchId, ExportFormat.EXCEL, options);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(Buffer.from('excel_data'));
    expect(mockFormatters.toExcel).toHaveBeenCalledWith(sampleDocsForDefaultBatch, options);
    expect(result.progress?.status).toBe('completed');
  });
  
  it('should use expandArrayFields when multiRowExpansion is true', async () => {
     const multiRowBatchId = 'batch123_multirow'; 
     // This is the data getDocumentsForBatch(multiRowBatchId) will return
     const initialMultiRowData = [ 
         { id: 1, name: 'Document A', tags: ['important', 'review'], related_ids: [101, 102] },
         { id: 2, name: 'Document B', tags: ['final'], related_ids: [103] },
         { id: 3, name: 'Document C', tags: [], related_ids: [] },
     ];
     const expandedDataMock = initialMultiRowData.map(d => ({...d, expanded_by_mock: true})); // Simulate data after expansion
     mockProcessors.expandArrayFields.mockReturnValueOnce(expandedDataMock);

     const options: ExportOptions = { 
         format: ExportFormat.CSV, 
         multiRowExpansion: true, 
         fieldsToExpand: ['tags'] 
     };
     await exportDocuments(multiRowBatchId, ExportFormat.CSV, options);
     
     expect(mockProcessors.expandArrayFields).toHaveBeenCalledWith(initialMultiRowData, ['tags']);
     expect(mockFormatters.toCsv).toHaveBeenCalledWith(expandedDataMock, options);
  });

  it('should handle errors from data fetching gracefully (using batch1_error)', async () => {
    const errorBatchId = 'batch1_error'; // This ID makes getDocumentsForBatch throw an error
    const options: ExportOptions = { format: ExportFormat.JSON };
    const result = await exportDocuments(errorBatchId, ExportFormat.JSON, options);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Simulated data fetching error');
    expect(result.progress?.status).toBe('failed');
  });
  
  it('should handle empty documents array correctly (using batch123_empty)', async () => {
     const emptyBatchId = 'batch123_empty'; // This ID makes getDocumentsForBatch return []
     
     const optionsJSON: ExportOptions = { format: ExportFormat.JSON };
     const jsonResult = await exportDocuments(emptyBatchId, ExportFormat.JSON, optionsJSON);
     expect(jsonResult.success).toBe(true);
     expect(jsonResult.data).toBe('[]');
     expect(jsonResult.message).toBe('No documents found in the batch to export.');
     expect(mockFormatters.toJson).not.toHaveBeenCalled(); 

     const optionsCSV: ExportOptions = { format: ExportFormat.CSV };
     const csvResult = await exportDocuments(emptyBatchId, ExportFormat.CSV, optionsCSV);
     expect(csvResult.success).toBe(true);
     expect(csvResult.data).toBe('');
     expect(mockFormatters.toCsv).not.toHaveBeenCalled(); 
     
     // For Excel, toExcel is expected to be called with empty array
     const optionsExcel: ExportOptions = { format: ExportFormat.EXCEL };
     // Specific mock for this one call, as toExcel IS called for empty data to produce an empty Excel file
     mockFormatters.toExcel.mockResolvedValueOnce(Buffer.from('mock_empty_excel_buffer')); 
     const excelResult = await exportDocuments(emptyBatchId, ExportFormat.EXCEL, optionsExcel);
     expect(excelResult.success).toBe(true);
     expect(excelResult.data).toEqual(Buffer.from('mock_empty_excel_buffer'));
     expect(mockFormatters.toExcel).toHaveBeenCalledWith([], optionsExcel);
  });

  it('should return error for invalid format', async () => {
    const options: ExportOptions = { format: 'invalid' as ExportFormat }; // Force invalid format
    const result = await exportDocuments(batchId, 'invalid' as ExportFormat, options);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid export format specified.');
    expect(result.progress?.status).toBe('failed');
  });
});
