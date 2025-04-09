"use server";

import fs from "fs/promises";
import path from "path";
import { extractInvoiceDataAction, extractTextAction } from "./extraction-actions";

/**
 * Test function to demonstrate document text extraction
 * This is for testing purposes only and should not be used in production
 */
export async function testTextExtraction(filePath: string) {
  try {
    // Read the file
    const fileBuffer = await fs.readFile(filePath);
    const fileBase64 = fileBuffer.toString("base64");
    
    // Determine MIME type based on file extension
    const mimeType = getMimeType(filePath);
    
    // Call the extraction action
    const result = await extractTextAction({
      documentBase64: fileBase64,
      mimeType,
      extractionPrompt: "Extract all text content from this document. Organize it by sections if applicable."
    });
    
    return result;
  } catch (error) {
    console.error("Test extraction error:", error);
    return {
      isSuccess: false,
      message: `Test failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Test function to demonstrate document structured data extraction
 * This is for testing purposes only and should not be used in production
 */
export async function testInvoiceExtraction(filePath: string) {
  try {
    // Read the file
    const fileBuffer = await fs.readFile(filePath);
    const fileBase64 = fileBuffer.toString("base64");
    
    // Determine MIME type based on file extension
    const mimeType = getMimeType(filePath);
    
    // Call the extraction action
    const result = await extractInvoiceDataAction({
      documentBase64: fileBase64,
      mimeType,
      extractionPrompt: "Extract all invoice details including invoice number, date, due date, vendor, customer, line items, and total amount."
    });
    
    return result;
  } catch (error) {
    console.error("Test invoice extraction error:", error);
    return {
      isSuccess: false,
      message: `Test failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Helper function to determine MIME type from file extension
 */
function getMimeType(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();
  
  switch (extension) {
    case ".pdf":
      return "application/pdf";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".txt":
      return "text/plain";
    case ".doc":
      return "application/msword";
    case ".docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    default:
      return "application/octet-stream";
  }
} 