/**
 * Default extraction prompts for different document types
 * These are used as fallbacks when no specific user prompt is provided
 */

export const DEFAULT_TEXT_EXTRACTION_PROMPT = `
Extract all text content from this document.
Return the results in a structured JSON format.
Include a confidence score (0.0 to 1.0) for each extracted field.
`;

export const DEFAULT_INVOICE_EXTRACTION_PROMPT = `
Extract the following information from this invoice:
1. Invoice number
2. Invoice date
3. Due date (if available)
4. Vendor name and contact details
5. Customer name and contact details (if available)
6. Total amount
7. Tax amount (if available)
8. Line items (including description, quantity, unit price, and total price)

Return the results in a structured JSON format. Include a confidence score (0.0 to 1.0) for each extracted field.
`;

export const DEFAULT_RESUME_EXTRACTION_PROMPT = `
Extract the following information from this resume:
1. Full name
2. Contact information (email, phone, address)
3. Professional summary or objective
4. Skills (technical and soft skills)
5. Work experience (company names, titles, dates, descriptions)
6. Education history (institutions, degrees, dates)
7. Certifications or licenses (if available)
8. Languages (if mentioned)

Return the results in a structured JSON format. Include a confidence score (0.0 to 1.0) for each extracted field.
`;

export const DEFAULT_RECEIPT_EXTRACTION_PROMPT = `
Extract the following information from this receipt:
1. Merchant/store name
2. Date and time of purchase
3. Total amount
4. Payment method (if available)
5. Tax amount (if available)
6. Items purchased (with prices and quantities if available)
7. Discount information (if available)

Return the results in a structured JSON format. Include a confidence score (0.0 to 1.0) for each extracted field.
`;

export const DEFAULT_FORM_EXTRACTION_PROMPT = `
Extract all form fields and their values from this document.
Identify labels and their corresponding values.
Organize the data in a logical structure based on the form sections.

Return the results in a structured JSON format. Include a confidence score (0.0 to 1.0) for each extracted field.
`;

export const SYSTEM_INSTRUCTIONS = `
You are an AI assistant specialized in extracting structured data from documents.
Follow these guidelines:
1. Extract information according to the user's instructions.
2. Return results in properly formatted JSON.
3. Include confidence scores (0.0 to 1.0) for each extracted value.
4. For tables or lists, maintain their structure in the JSON output.
5. If requested information is not found, use null values rather than making up data.
6. Always validate that numeric values make sense (e.g., no negative quantities).
7. Format dates consistently as YYYY-MM-DD.
8. When extracting currency values, include the currency symbol/code if available.
`;

/**
 * Enhances a user prompt with system instructions and formatting requirements
 * @param userPrompt - The prompt provided by the user
 * @param includeConfidence - Whether to add instructions for confidence scores
 * @param includePositions - Whether to add instructions for position data
 * @returns Enhanced prompt with system instructions
 */
export function enhancePrompt(
  userPrompt: string,
  includeConfidence: boolean = true,
  includePositions: boolean = false
): string {
  let enhancedPrompt = userPrompt.trim();

  // Add JSON structure guidance if not already present
  if (!enhancedPrompt.toLowerCase().includes('json') && !enhancedPrompt.toLowerCase().includes('structure')) {
    enhancedPrompt += ' Return the results in a structured JSON format.';
  }
  
  // Add confidence score instruction if requested
  if (includeConfidence && !enhancedPrompt.toLowerCase().includes('confidence')) {
    enhancedPrompt += ' Include a confidence score (0.0 to 1.0) for each extracted field.';
  }
  
  // Add position data instruction if requested
  if (includePositions && !enhancedPrompt.toLowerCase().includes('position')) {
    enhancedPrompt += ' Include position data (page number and bounding box coordinates) for each extracted field.';
  }
  
  return enhancedPrompt;
}

/**
 * Gets a default prompt based on document type
 * @param documentType - Type of document (invoice, resume, receipt, etc.)
 * @returns The corresponding default prompt
 */
export function getDefaultPrompt(documentType?: string): string {
  switch (documentType?.toLowerCase()) {
    case 'invoice':
      return DEFAULT_INVOICE_EXTRACTION_PROMPT;
    case 'resume':
      return DEFAULT_RESUME_EXTRACTION_PROMPT;
    case 'receipt':
      return DEFAULT_RECEIPT_EXTRACTION_PROMPT;
    case 'form':
      return DEFAULT_FORM_EXTRACTION_PROMPT;
    default:
      return DEFAULT_TEXT_EXTRACTION_PROMPT;
  }
} 