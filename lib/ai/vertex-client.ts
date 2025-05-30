import { createVertex } from '@ai-sdk/google-vertex';

// Environment variables for Vertex AI configuration
const project = process.env.GOOGLE_VERTEX_PROJECT;
const location = process.env.GOOGLE_VERTEX_LOCATION || 'us-central1';

// Log configuration details
console.log(`Vertex AI Configuration:
- Project: ${project || 'UNDEFINED - MISSING ENV VAR'}
- Location: ${location}
`);

/**
 * AUTHENTICATION STRATEGY
 * ======================
 * 
 * This section implements a priority-based credential handling system for Google Vertex AI.
 * In serverless environments like Vercel, proper authentication is critical since we don't
 * have persistent filesystem access in production.
 * 
 * The authentication process follows this priority order:
 * 1. Direct service account credentials via environment variables (most reliable for serverless)
 * 2. JSON credentials string (alternative approach)
 * 3. Credentials file path (works locally, not in serverless production)
 * 4. Application Default Credentials (ADC) as fallback
 * 
 * This approach solves the common "Permission denied" errors that occur when Cloud Functions
 * or serverless environments try to use the default compute service account which lacks
 * the necessary Vertex AI permissions.
 */

// Parse credentials from environment if available
let googleAuthOptions = undefined;

// Priority 1: Check for direct client_email and private_key environment variables
// This is the RECOMMENDED approach for serverless environments like Vercel
if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
  try {
    // NOTE: The private_key from Google contains actual newlines, but environment
    // variables typically encode these as \n, so we need to replace them
    googleAuthOptions = {
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }
    };
    console.log(`Using Google credentials from GOOGLE_CLIENT_EMAIL for service account: ${process.env.GOOGLE_CLIENT_EMAIL}`);
  } catch (e) {
    console.error("Failed to configure credentials from GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY", e);
    console.error("⚠️ This will likely cause authentication errors with Vertex AI API");
  }
} 
// Priority 2: Check for JSON credentials string
// This is useful when you want to store the entire credentials JSON as a single environment variable
else if (process.env.GOOGLE_CREDENTIALS) {
  try {
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    googleAuthOptions = { credentials };
    console.log(`Using Google credentials from GOOGLE_CREDENTIALS env var for service account: ${credentials.client_email}`);
  } catch (e) {
    console.error("Failed to parse GOOGLE_CREDENTIALS JSON", e);
    console.error("⚠️ This will likely cause authentication errors with Vertex AI API");
  }
} 
// Priority 3: Check for credentials file path
// This works for local development but NOT in serverless environments like Vercel
else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.log(`Using Google credentials from GOOGLE_APPLICATION_CREDENTIALS path: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
  // Default behavior will use the file path, no need to set options explicitly
} else {
  // Priority 4: Fall back to Application Default Credentials
  // This relies on the environment's default service account, which may not have Vertex AI permissions
  console.warn("⚠️ No Google credentials found in environment variables. Attempting default ADC.");
  console.warn("⚠️ This may cause authentication errors if ADC is not configured.");
}

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

// Debug flag to log API requests
const debugMode = process.env.VERTEX_DEBUG === 'true';

/**
 * Create and configure the Vertex AI provider instance
 * This is the main entry point for interacting with Google Vertex AI
 * 
 * IMPORTANT: The googleAuthOptions object is passed here to ensure we're using
 * our custom service account with Vertex AI permissions instead of the default
 * compute service account which may lack necessary permissions.
 */
export const vertex = createVertex({
  project,
  location,
  headers: {
    ...heliconeHeaders,
  },
  // Use explicit credentials if available
  googleAuthOptions,
});

/**
 * Available Gemini models for different use cases
 */
export const VERTEX_MODELS = {
  // Recommended models for document extraction tasks
GEMINI_2_0_FLASH: 'gemini-2.0-flash-001'


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
    
  if (debugMode) {
    console.log(`Getting Vertex text model: ${modelName}`);
  }
  
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
    
  if (debugMode) {
    console.log(`Getting Vertex structured model: ${modelName}`);
  }
  
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