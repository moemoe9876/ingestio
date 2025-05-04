/**
 * Document Classification Prompts
 * 
 * This module provides prompts and utilities for the first stage of the two-stage extraction process.
 * It focuses on document type classification before targeted extraction.
 */

import { z } from "zod";

/**
 * Schema for the structured response expected from the classification AI call.
 */
export const ClassificationResponseSchema = z.object({
  documentType: z.string().min(1).describe("The specific type of the document (e.g., invoice, resume, shipping_manifest, research_paper). Be as specific as possible."),
  confidence: z.number().min(0).max(1).describe("The confidence score (0.0 to 1.0) for the classification."),
  reasoning: z.string().optional().describe("A brief explanation for the classification decision.")
});

export type ClassificationResponse = z.infer<typeof ClassificationResponseSchema>;

/**
 * System instructions for the classification model
 */
export const CLASSIFICATION_SYSTEM_INSTRUCTIONS = `You are an AI assistant specialized in accurately classifying document types based on their content and structure.
CRITICAL INSTRUCTIONS:
1. Examine the document carefully, considering layout, keywords, and typical content for various document types.
2. Determine the most specific document type (e.g., 'shipping_manifest', 'meeting_minutes', 'receipt', 'research_paper', 'invoice').
3. Provide a confidence score between 0.0 (uncertain) and 1.0 (certain) for your classification.
4. Briefly explain your reasoning based on document elements.
5. Return ONLY a single, valid JSON object conforming to the provided schema. Do NOT add explanations outside the JSON structure.`;

/**
 * Predefined document types for classification
 */
export const DOCUMENT_TYPES = [
  "invoice",
  "receipt",
  "purchase_order",
  "packing_slip",
  "manifest",
  "contract",
  "agreement",
  "resume",
  "cv",
  "business_card",
  "form",
  "report",
  "letter",
  "email",
  "other"
] as const;

export type DocumentType = typeof DOCUMENT_TYPES[number] | string;

/**
 * Creates a prompt for structured document classification
 * 
 * @returns The classification prompt requesting a structured JSON response
 */
export function getClassificationPrompt(): string {
  return `${CLASSIFICATION_SYSTEM_INSTRUCTIONS}

Analyze the provided document and return a JSON object with the following structure:
{
  "documentType": "<specific document type>",
  "confidence": <float 0.0-1.0>,
  "reasoning": "<brief explanation>"
}`;
}

/**
 * Gets the default extraction prompt based on the classified document type.
 * Handles both predefined types and novel types identified by the AI.
 * 
 * @param documentType The classified document type (can be any string)
 * @returns The default extraction prompt for the document type
 */
export function getDefaultPromptForType(documentType: string): string {
  const lowerCaseType = documentType.toLowerCase().trim();
  
  // Handle known, predefined types
  switch (lowerCaseType) {
    case "invoice":
      return "Extract all invoice information including invoice number, date, due date, vendor/seller details, customer/buyer details, line items (with description, quantity, unit price, and total), subtotal, tax, shipping, and total amount.";
    case "receipt":
      return "Extract all receipt information including merchant name, date, time, items purchased (with description, quantity, unit price, and total), payment method, subtotal, tax, and total amount.";
    case "purchase_order":
      return "Extract all purchase order information including PO number, order date, vendor/supplier details, delivery address, requested delivery date, line items (with description, quantity, unit price, and total), payment terms, subtotal, tax, and total amount.";
    case "packing_slip":
      return "Extract all packing slip information including order number, shipment date, vendor/shipper details, recipient details, items shipped (with description, quantity, and SKU/product code), shipping method, and tracking number.";
    case "shipping_manifest":
      return "Extract all shipping manifest information including manifest number, shipping date, origin, destination, carrier, tracking numbers, package details (quantity, dimensions, weight), and all items being shipped.";
    case "contract":
    case "agreement":
      return "Extract the contract information including contract type, title, parties involved (with full names and addresses), effective date, termination date, key clauses, and signatures.";
    case "resume":
    case "cv":
      return "Extract all resume information including personal details (name, contact information), professional summary, skills, work experience (with company names, positions, dates, and descriptions), education, certifications, and languages.";
    case "business_card":
      return "Extract all business card information including name, job title, company, email, phone number, address, website, and social media handles.";
    case "form": // Keep the generic form prompt
      return "Extract all form fields and their values, maintaining the form structure and organization of sections.";
    case "report":
      return "Extract report information including title, date, author, executive summary, main sections, key findings, and conclusions.";
    case "letter":
      return "Extract letter information including sender details, recipient details, date, subject, body content, and signature.";
    case "email":
      return "Extract email information including sender, recipient, cc, date, subject, and body content.";
    case "other": // Explicit 'other' type
    default: // Fallback for any unknown type identified by the AI
      console.warn(`[getDefaultPromptForType] Using generic default prompt for unknown or 'other' type: ${documentType}`);
      return "Extract all key information from this document, including titles, dates, names, addresses, monetary values, identifiers, and any structured data like tables or lists. Organize the output logically.";
  }
}

/**
 * Enhances a user prompt with classification context
 * 
 * @param userPrompt The original user prompt
 * @param documentType The classified document type
 * @returns Enhanced prompt with document type context
 */
export function enhancePromptWithClassification(
  userPrompt: string,
  documentType: DocumentType
): string {
  const normalizedUserPrompt = userPrompt.trim().toLowerCase();
  const contextPrefix = `Context: This appears to be a ${documentType} document.\n\n`;

  // Check for generic extraction requests
  const isGenericRequest = 
    normalizedUserPrompt.includes("extract all") || 
    normalizedUserPrompt.includes("get everything") || 
    normalizedUserPrompt.includes("pull all") ||
    normalizedUserPrompt.includes("relevant information") ||
    normalizedUserPrompt.length === 0; // Also treat empty prompt as generic

  if (isGenericRequest) {
    // For generic requests, use the default prompt for the type
    console.log(`[PROMPT ENHANCE] Generic request detected for type ${documentType}. Using default prompt.`);
    return getDefaultPromptForType(documentType);
  } else {
    // For specific requests, just add the context prefix
    console.log(`[PROMPT ENHANCE] Specific request detected for type ${documentType}. Prepending context only.`);
    return contextPrefix + userPrompt.trim();
  }
}
