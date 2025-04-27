import { PDFDocument } from 'pdf-lib';

/**
 * Calculates the page count of a document server-side.
 * Uses pdf-lib for PDFs and assumes 1 page for common image types.
 *
 * @param fileBuffer The file content as a Buffer.
 * @param mimeType The MIME type of the file.
 * @returns A promise resolving to the page count. Returns 1 if counting fails or for unsupported types.
 */
export async function getServerSidePageCount(
  fileBuffer: Buffer,
  mimeType: string,
): Promise<number> {
  if (mimeType === 'application/pdf') {
    try {
       const pdfDoc = await PDFDocument.load(fileBuffer, {
         // Ignore minor errors that don't prevent page count retrieval
         ignoreEncryption: true,
         // ignoreXrefParsingErrors: true, // This option is not valid
       });
       const count = pdfDoc.getPageCount();
       // Handle potential zero-page PDFs (though unlikely)
       return count > 0 ? count : 1;
     } catch (error) {
       console.error('Failed to count PDF pages', { // Using console.error temporarily
         error: error instanceof Error ? error.message : String(error), // Log error message
         mimeType,
         bufferLength: fileBuffer.length,
       });
       // Gracefully return 1 page if counting fails
       return 1;
     }
  } else if (
    [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/tiff', // Added TIFF as another common image format
    ].includes(mimeType)
  ) {
    // Assume images are single-page
     return 1;
   } else {
     // Default to 1 page for unknown or unsupported types
     console.warn('Unsupported MIME type for page counting, defaulting to 1 page', { // Using console.warn temporarily
       mimeType,
     });
     return 1;
   }
}
