"use server";

import { getVertexModel, getVertexStructuredModel, VERTEX_MODELS } from "@/lib/ai/vertex-client";
import { ActionState } from "@/types";
import { auth } from "@clerk/nextjs/server";
import { generateObject, generateText } from "ai";
import { z } from "zod";

// Define input validation schema for text extraction
const extractTextSchema = z.object({
  documentBase64: z.string(),
  mimeType: z.string(),
  extractionPrompt: z.string().min(5).max(1000),
});

// Define input validation schema for structured extraction
const extractStructuredDataSchema = z.object({
  documentBase64: z.string(),
  mimeType: z.string(),
  extractionPrompt: z.string().min(5).max(1000),
});

/**
 * Action to extract text from a document using Vertex AI
 */
export async function extractTextAction(
  input: z.infer<typeof extractTextSchema>
): Promise<ActionState<{ text: string }>> {
  // Validate authentication
  const authResult = await auth();
  const { userId } = authResult;
  if (!userId) {
    return { isSuccess: false, message: "Unauthorized" };
  }

  try {
    // Validate input
    const parsedInput = extractTextSchema.safeParse(input);
    if (!parsedInput.success) {
      return {
        isSuccess: false,
        message: `Invalid input: ${parsedInput.error.message}`,
      };
    }

    const { documentBase64, mimeType, extractionPrompt } = parsedInput.data;

    // Get Vertex model
    const model = getVertexModel(VERTEX_MODELS.GEMINI_2_0_FLASH, {
      temperature: 0.1,  // Lower temperature for more deterministic extraction
    });

    // Extract text from document
    const result = await generateText({
      // @ts-ignore - Type mismatch between AI SDK versions
      model,
      messages: [
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: extractionPrompt 
            },
            { 
              type: "file", 
              data: Buffer.from(documentBase64, "base64"), 
              mimeType 
            }
          ],
        },
      ],
    });

    return {
      isSuccess: true,
      message: "Text extracted successfully",
      data: { text: result.text }
    };
  } catch (error) {
    console.error("Error extracting text:", error);
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to extract text"
    };
  }
}

// Sample invoice schema for structured data extraction
const invoiceSchema = z.object({
  invoiceNumber: z.string().optional(),
  date: z.string().optional(),
  dueDate: z.string().optional(),
  totalAmount: z.number().optional(),
  vendor: z.object({
    name: z.string().optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
  }).optional(),
  customer: z.object({
    name: z.string().optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
  }).optional(),
  lineItems: z.array(
    z.object({
      description: z.string().optional(),
      quantity: z.number().optional(),
      unitPrice: z.number().optional(),
      totalPrice: z.number().optional(),
    })
  ).optional(),
  confidence: z.number().optional(),
});

type InvoiceData = z.infer<typeof invoiceSchema>;

/**
 * Action to extract structured data from a document using Vertex AI
 */
export async function extractInvoiceDataAction(
  input: z.infer<typeof extractStructuredDataSchema>
): Promise<ActionState<InvoiceData>> {
  // Validate authentication
  const authResult = await auth();
  const { userId } = authResult;
  if (!userId) {
    return { isSuccess: false, message: "Unauthorized" };
  }

  try {
    // Validate input
    const parsedInput = extractStructuredDataSchema.safeParse(input);
    if (!parsedInput.success) {
      return {
        isSuccess: false,
        message: `Invalid input: ${parsedInput.error.message}`,
      };
    }

    const { documentBase64, mimeType, extractionPrompt } = parsedInput.data;

    // Get Vertex structured model
    const model = getVertexStructuredModel(VERTEX_MODELS.GEMINI_2_0_FLASH, {
      temperature: 0.0,  // Very low temperature for deterministic JSON output
    });

    // Extract structured data from document
    const result = await generateObject({
      // @ts-ignore - Type mismatch between AI SDK versions
      model,
      schema: invoiceSchema,
      messages: [
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: `${extractionPrompt}. Return results as structured JSON.` 
            },
            { 
              type: "file", 
              data: Buffer.from(documentBase64, "base64"), 
              mimeType 
            }
          ],
        },
      ],
    });

    return {
      isSuccess: true,
      message: "Invoice data extracted successfully",
      data: result as unknown as InvoiceData
    };
  } catch (error) {
    console.error("Error extracting structured data:", error);
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to extract structured data"
    };
  }
} 