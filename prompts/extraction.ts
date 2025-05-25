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
1. Adhere Strictly to User Request: Extract ONLY the fields and information explicitly mentioned or clearly implied by the user's prompt below. Do NOT include any extra fields, even if common for the document type, unless the user asks for 'all information' or similar broad terms.
2. Return results in properly formatted JSON.
3. Include confidence scores (0.0 to 1.0) for each extracted value.
4. For tables or lists, maintain their structure in the JSON output.
5. If requested information is not found, use null values rather than making up data.
6. Always validate that numeric values make sense (e.g., no negative quantities).
7. Format dates consistently as YYYY-MM-DD.
8. When extracting currency values, include the currency symbol/code if available.
`;

/**
 * Enhances a user prompt with system instructions, contextual hints,
 * and formatting requirements based on provided flags.
 * 
 * @param userPrompt - The base prompt (potentially enhanced by classification)
 * @param includeConfidence - Whether to request internal confidence scoring
 * @param detectedLanguage - Optional detected language hint
 * @returns Fully constructed prompt ready for the AI
 */
export function enhancePrompt(
  userPrompt: string,
  includeConfidence: boolean = true,

  detectedLanguage?: string
): string {
  console.log("[PROMPT DEBUG] Base user prompt for enhancement:", userPrompt);

  let finalPromptParts: string[] = [];

  // 1. Start with System Instructions
  finalPromptParts.push(SYSTEM_INSTRUCTIONS);

  // 2. Add Contextual Hints
  if (detectedLanguage) {
    finalPromptParts.push(`Context: The document appears to be in ${detectedLanguage}. The user's request is:`);
  } else {
    finalPromptParts.push("Context: The user's request is:");
  }

  // 3. Append the (potentially classification-enhanced) User Prompt
  finalPromptParts.push(userPrompt.trim());


  // 4. Add Internal AI Guidance based on flags
  let internalGuidance = [];
  if (includeConfidence) {
    internalGuidance.push("- Internally, assign a confidence score (0.0-1.0) to each extracted value.");
  }

  if (internalGuidance.length > 0) {
    finalPromptParts.push("\nInternal AI Guidance (Do NOT include this info in the final JSON output):\n" + internalGuidance.join("\n"));
  }

  // Construct the final prompt string
  const finalEnhancedPrompt = finalPromptParts.join("\n\n");

  console.log("[PROMPT DEBUG] Final enhanced prompt for AI:", finalEnhancedPrompt);

  return finalEnhancedPrompt;
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

/**
 * Parses the user prompt to identify specifically requested fields
 * @param prompt - The user's extraction prompt
 * @returns Array of requested field names, or null if the prompt is generic
 */
export function parseRequestedFields(prompt: string): string[] | null {
  if (!prompt) return null;
  
  const normalizedPrompt = prompt.toLowerCase();
  
  // Skip parsing for generic prompts
  if (
    normalizedPrompt.includes("extract all") || 
    normalizedPrompt.includes("extract everything") ||
    normalizedPrompt.includes("extract any")
  ) {
    console.log("[PROMPT PARSER] Generic extraction detected, no field filtering needed");
    return null;
  }
  
  const fieldPatterns = [
    // Pattern: "Extract [field1], [field2] and [field3]"
    /extract\s+(?:the\s+)?(?:following|)?\s*(?:information|data|fields|)?\s*(?::|)?\s*([^\.]+)/i,
    
    // Pattern: numbered or bulleted lists
    /(?:extract|get|find|identify)[^:]*:([^:]+?)(?:\.|$)/i,
    
    // Fallback pattern for explicit extraction requests
    /(?:extract|get|find|identify)[^:]*?(?:the|)\s+([a-z0-9\s,]+?)(?:from|in|of|and)/i
  ];
  
  let fieldsText: string | null = null;
  
  // Try each pattern until we find a match
  for (const pattern of fieldPatterns) {
    const match = prompt.match(pattern);
    if (match && match[1]) {
      fieldsText = match[1].trim();
      break;
    }
  }
  
  if (!fieldsText) {
    console.log("[PROMPT PARSER] No specific fields detected in prompt:", prompt);
    return null;
  }
  
  // Extract fields from the matched text
  const fields: string[] = [];
  
  // Check for numbered or bulleted list format
  if (/\d+\.\s+/.test(fieldsText)) {
    // Handle numbered list
    const listItems = fieldsText.split(/\d+\.\s+/).filter(Boolean);
    for (const item of listItems) {
      const trimmed = item.replace(/\([^)]*\)/g, '').trim();
      if (trimmed) fields.push(trimmed.toLowerCase());
    }
  } else if (/[-•*]\s+/.test(fieldsText)) {
    // Handle bulleted list
    const listItems = fieldsText.split(/[-•*]\s+/).filter(Boolean);
    for (const item of listItems) {
      const trimmed = item.replace(/\([^)]*\)/g, '').trim();
      if (trimmed) fields.push(trimmed.toLowerCase());
    }
  } else {
    // Handle comma-separated or "and" separated list
    const items = fieldsText
      .replace(/\s+and\s+/g, ',')
      .replace(/\s+or\s+/g, ',')
      .split(',')
      .map(item => item.replace(/\([^)]*\)/g, '').trim().toLowerCase())
      .filter(Boolean);
    
    fields.push(...items);
  }
  
  // Clean up field names
  const cleanedFields = fields.map(field => {
    return field
      .replace(/^the\s+/i, '')
      .replace(/\s+/g, '_')
      .replace(/[^\w_]/g, '');
  });
  
  console.log("[PROMPT PARSER] Extracted fields:", cleanedFields);
  return cleanedFields.length > 0 ? cleanedFields : null;
}

/**
 * Filters extracted data to include only fields that were specifically requested
 * @param data - The extracted data from the AI
 * @param requestedFields - Array of field names requested by the user
 * @returns Filtered data containing only requested fields
 */
export function filterExtractedData(data: any, requestedFields: string[] | null): any {
  // If no specific fields were requested, return all data
  if (!requestedFields || requestedFields.length === 0) {
    return data;
  }
  
  console.log("[DATA FILTER] Filtering extraction to include only:", requestedFields);
  
  // If data is not an object, return as is
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const result: Record<string, any> = {};
  
  // Function to normalize keys for comparison
  const normalizeKey = (key: string): string => {
    return key.toLowerCase().replace(/\s+/g, '_').replace(/[^\w_]/g, '');
  };
  
  // Create a map of normalized requested fields for lookup
  const normalizedFields = new Set(requestedFields.map(normalizeKey));
  
  // First pass - check for exact matches
  for (const key in data) {
    const normalizedKey = normalizeKey(key);
    if (normalizedFields.has(normalizedKey)) {
      result[key] = data[key];
    } else if (key === 'line_items' && 
              (normalizedFields.has('line_items') || 
               normalizedFields.has('items') || 
               normalizedFields.has('products'))) {
      // Special handling for line items/products
      result[key] = data[key];
    }
  }
  
  // Special handling for fields that might be mapped differently
  // Check for name variations if main fields weren't found
  const fieldMappings: Record<string, string[]> = {
    'line_items': ['items', 'products', 'line_items', 'services', 'line'],
    'total': ['total_amount', 'amount', 'price', 'sum', 'cost'],
    'name': ['full_name', 'customer_name', 'person_name', 'contact_name']
  };
  
  // Add any missing fields based on synonyms
  for (const requestedField of requestedFields) {
    const normalizedRequest = normalizeKey(requestedField);
    
    // Skip if already added
    if (Object.keys(result).some(k => normalizeKey(k) === normalizedRequest)) {
      continue;
    }
    
    // Check various mappings
    for (const [dataKey, synonyms] of Object.entries(fieldMappings)) {
      if (synonyms.includes(normalizedRequest) && data[dataKey]) {
        result[dataKey] = data[dataKey];
        break;
      }
    }
    
    // Do fuzzy matching as last resort
    if (!Object.keys(result).some(k => normalizeKey(k) === normalizedRequest)) {
      for (const key in data) {
        if (normalizeKey(key).includes(normalizedRequest) || 
            normalizedRequest.includes(normalizeKey(key))) {
          result[key] = data[key];
          break;
        }
      }
    }
  }
  
  console.log("[DATA FILTER] Filtered data contains fields:", Object.keys(result));
  return Object.keys(result).length > 0 ? result : data;
} 