import { createVertex } from '@ai-sdk/google-vertex';

// Environment variables for Vertex AI configuration
const project = process.env.GOOGLE_VERTEX_PROJECT;
const location = process.env.GOOGLE_VERTEX_LOCATION || 'us-central1';

// Configuration for the optional Helicone proxy
const useHelicone = process.env.HELICONE_API_KEY ? true : false;
const heliconeHeaders = useHelicone
  ? {
      'Helicone-Auth': process.env.HELICONE_API_KEY,
      'Helicone-Property-Application': 'ingestio', // App identifier for Helicone
      'Helicone-Property-Session': 'true', // Track sessions in Helicone
      'Helicone-Cache-Enabled': 'true', // Enable caching to reduce costs
    }
  : {};

// Create the Vertex AI provider instance
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

// Helper function to get a model instance for text generation
export function getVertexModel(modelId: string) {
  // Common model IDs:
  // - gemini-2.5-pro
  // - gemini-2.0-flash
  return vertex(modelId);
}

// Helper function for structured JSON output generation
export function getVertexStructuredModel<T>(modelId: string) {
  // For structured output, we use the same underlying model
  // but configure it to parse the result as JSON
  return vertex(modelId, { structuredOutputs: true });
}

// Example usage in actions/ai files:
// import { getVertexModel, getVertexStructuredModel } from '@/lib/ai/vertex-client';
// 
// // For text generation:
// const model = getVertexModel('gemini-2.5-pro');
// const { text } = await generateText({
//   model,
//   prompt: 'Extract data from this document'
// });
//
// // For structured JSON output:
// const structuredModel = getVertexStructuredModel<MySchema>('gemini-2.5-pro');
// const result = await generateObject({
//   model: structuredModel,
//   schema: myZodSchema,
//   prompt: 'Extract structured data as JSON'
// }); 