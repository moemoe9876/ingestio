import { createVertex } from '@ai-sdk/google-vertex';

// Environment variables for Vertex AI configuration
const project = process.env.GOOGLE_VERTEX_PROJECT;
const location = process.env.GOOGLE_VERTEX_LOCATION || 'us-central1';

/**
 * Configuration for Helicone analytics and proxy
 * Enables tracking AI model usage, performance, and costs
 */
const useHelicone = process.env.HELICONE_API_KEY ? true : false;
const heliconeHeaders = useHelicone
  ? {
      'Helicone-Auth': process.env.HELICONE_API_KEY,
      'Helicone-Property-Application': 'ingestio', // App identifier for Helicone
      'Helicone-Property-Session': 'true', // Track sessions in Helicone
      'Helicone-Cache-Enabled': 'true', // Enable caching to reduce costs
    }
  : {};

/**
 * Create and configure the Vertex AI provider instance
 * This is the main entry point for interacting with Google Vertex AI
 */
export const vertex = createVertex({
  project,
  location,
  headers: {
    ...heliconeHeaders,
  },
  // The default auth method uses GOOGLE_APPLICATION_CREDENTIALS env var
  // For custom auth, uncomment and configure:
  // googleAuthOptions: {
  //   credentials: {
  //     client_email: process.env.GOOGLE_CLIENT_EMAIL,
  //     private_key: process.env.GOOGLE_PRIVATE_KEY,
  //   },
  // },
});

/**
 * Available Gemini models for different use cases
 */
export const VERTEX_MODELS = {
  // Recommended models for document extraction tasks
  GEMINI_2_5_PRO: 'gemini-2.5-pro',
  GEMINI_2_0_FLASH: 'gemini-2.0-flash',
  GEMINI_2_0_FLASH_EXP: 'gemini-2.0-flash-exp', 

} as const;

export type VertexModelId = (typeof VERTEX_MODELS)[keyof typeof VERTEX_MODELS] | string;

/**
 * Get a model instance configured for text generation
 * @param modelId - The ID of the model to use (from VERTEX_MODELS or custom ID)
 * @param options - Optional configuration to override defaults
 * @returns A configured model instance
 */
export function getVertexModel(modelId: VertexModelId, options = {}) {
  const modelName = typeof modelId === 'string' && modelId in VERTEX_MODELS 
    ? VERTEX_MODELS[modelId as keyof typeof VERTEX_MODELS] 
    : modelId;
    
  return vertex(modelName, options);
}

/**
 * Get a model instance configured for structured JSON output generation
 * @param modelId - The ID of the model to use (from VERTEX_MODELS or custom ID)
 * @param options - Optional configuration to override defaults
 * @returns A configured model instance for structured output
 */
export function getVertexStructuredModel(modelId: VertexModelId, options = {}) {
  const modelName = typeof modelId === 'string' && modelId in VERTEX_MODELS 
    ? VERTEX_MODELS[modelId as keyof typeof VERTEX_MODELS] 
    : modelId;
    
  return vertex(modelName, {
    structuredOutputs: true,
    ...options
  });
}

// Example usage in actions/ai files:
/**
 * Example: Using the Vertex client with the Vercel AI SDK
 * 
 * Import statements:
 * import { getVertexModel, getVertexStructuredModel, VERTEX_MODELS } from '@/lib/ai/vertex-client';
 * import { generateText, generateObject } from 'ai';
 * import { z } from 'zod';
 * 
 * For text generation:
 * const model = getVertexModel(VERTEX_MODELS.GEMINI_2_0_FLASH);
 * const { text } = await generateText({
 *   model,
 *   prompt: 'Extract invoice details from this document',
 * });
 *
 * For text extraction from files:
 * const model = getVertexModel(VERTEX_MODELS.GEMINI_2_0_FLASH);
 * const { text } = await generateText({
 *   model,
 *   messages: [
 *     {
 *       role: 'user',
 *       content: [
 *         { type: 'text', text: 'Extract all invoice details from this document' },
 *         { type: 'file', data: Buffer.from(fileBase64, 'base64'), mimeType: 'application/pdf' }
 *       ],
 *     },
 *   ],
 * });
 *
 * For structured data extraction with a schema:
 * const invoiceSchema = z.object({
 *   invoiceNumber: z.string(),
 *   date: z.string(),
 *   amount: z.number(),
 *   vendor: z.string(),
 *   lineItems: z.array(
 *     z.object({
 *       description: z.string(),
 *       quantity: z.number(),
 *       unitPrice: z.number(),
 *       totalPrice: z.number(),
 *     })
 *   ),
 * });
 *
 * const model = getVertexStructuredModel(VERTEX_MODELS.GEMINI_2_0_FLASH);
 * const { data } = await generateObject({
 *   model,
 *   schema: invoiceSchema,
 *   messages: [
 *     {
 *       role: 'user',
 *       content: [
 *         { type: 'text', text: 'Extract all invoice details from this document' },
 *         { type: 'file', data: Buffer.from(fileBase64, 'base64'), mimeType: 'application/pdf' }
 *       ],
 *     },
 *   ],
 * });
 */ 