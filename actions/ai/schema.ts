"use server";

import { getUserSubscriptionDataKVAction } from "@/actions/stripe/sync-actions";
import { getVertexStructuredModel, VERTEX_MODELS } from "@/lib/ai/vertex-client";
import { trackServerEvent } from "@/lib/analytics/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { checkRateLimit, SubscriptionTier } from "@/lib/rate-limiting/limiter";
import {
  generateJsonSchemaPrompt,
  generateTypeScriptInterfacePrompt,
  generateZodSchemaPrompt,
  SCHEMA_GEN_SYSTEM_PROMPT
} from "@/prompts/schemaGen";
import { ActionState } from "@/types/server-action-types";
import { generateObject } from "ai";
import { z } from "zod";

// Type declarations for handling AI SDK version compatibility
type VertexStructuredModel = ReturnType<typeof getVertexStructuredModel>;
type GenerateObjectParams = Parameters<typeof generateObject>[0];

// Define the input schema for schema generation
const schemaGenerationInputSchema = z.object({
  documentType: z.string().min(1),
  fieldDescriptions: z.array(z.string()).optional(),
  customInstructions: z.string().optional(),
  modelId: z.string().optional(),
  typescriptInterface: z.boolean().optional(),
  jsonSchema: z.boolean().optional()
});

// Define the output schema structure with refined validation
const generatedSchemaOutputSchema = z.object({
  zodSchema: z.string().optional(),
  jsonSchema: z.record(z.any()).optional(),
  typescriptInterface: z.string().optional()
}).refine(
  data => data.zodSchema || data.jsonSchema || data.typescriptInterface,
  { message: "At least one schema format must be provided" }
);

type SchemaGenerationInput = z.infer<typeof schemaGenerationInputSchema>;
type GeneratedSchemaOutput = z.infer<typeof generatedSchemaOutputSchema>;

/**
 * Generate a schema based on provided input
 * Applies rate limiting based on user's subscription tier
 */
export async function generateSchemaAction(
  input: SchemaGenerationInput
): Promise<ActionState<GeneratedSchemaOutput>> {
  try {
    // Authenticate user
    const userId = await getCurrentUser();
    
    // Get user's subscription data to determine tier (source of truth)
    const subscriptionResult = await getUserSubscriptionDataKVAction();
    if (!subscriptionResult.isSuccess) {
      return {
        isSuccess: false,
        message: "Unable to determine user subscription tier"
      };
    }
    
    // Determine tier based on subscription status and planId
    let tier: SubscriptionTier = "starter";
    if (subscriptionResult.data.status === 'active' && subscriptionResult.data.planId) {
      tier = subscriptionResult.data.planId as SubscriptionTier;
    }
    
    // Apply rate limiting
    const { success, reset } = await checkRateLimit(
      userId,
      tier,
      "schema_generation"
    );
    
    if (!success) {
      const retryAfter = Math.ceil((reset - Date.now()) / 1000);
      return {
        isSuccess: false, 
        message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`
      };
    }
    
    // Parse and validate input
    const validatedInput = schemaGenerationInputSchema.safeParse(input);
    if (!validatedInput.success) {
      return {
        isSuccess: false,
        message: `Invalid input: ${validatedInput.error.message}`
      };
    }
    
    // Prepare prompt for schema generation
    const { 
      documentType, 
      fieldDescriptions, 
      customInstructions, 
      modelId,
      typescriptInterface = false,
      jsonSchema = false
    } = validatedInput.data;
    
    // Track requested formats for analytics
    const requestedFormats = ["Zod schema"];
    if (typescriptInterface) requestedFormats.push("TypeScript interface");
    if (jsonSchema) requestedFormats.push("JSON Schema");
    
    // Build schema generation messages using structured prompts
    const messages = [
      {
        role: "system" as const,
        content: SCHEMA_GEN_SYSTEM_PROMPT
      },
      {
        role: "user" as const,
        content: `
${generateZodSchemaPrompt(documentType, fieldDescriptions, customInstructions)}

${typescriptInterface ? generateTypeScriptInterfacePrompt(documentType, fieldDescriptions, customInstructions) : ''}

${jsonSchema ? generateJsonSchemaPrompt(documentType, fieldDescriptions, customInstructions) : ''}

Return your response as a JSON object with the following structure:
{
  "zodSchema": "string containing the Zod schema code",
  ${typescriptInterface ? `"typescriptInterface": "string containing the TypeScript interface",` : ''}
  ${jsonSchema ? `"jsonSchema": { JSON Schema object },` : ''}
}
        `.trim()
      }
    ];
    
    // Choose model and generate schema
    const model = getVertexStructuredModel(modelId || VERTEX_MODELS.GEMINI_2_0_FLASH);
    
    // Generate the schema using Vertex AI
    // NOTE: Type cast needed due to version mismatch between AI SDK providers.
    // This is a known issue when using @ai-sdk/google-vertex with the Vercel AI SDK.
    const result = await generateObject({
      model: model as unknown as GenerateObjectParams["model"],
      schema: generatedSchemaOutputSchema,
      messages
    });
    
    // Validate the AI output
    const validatedOutput = generatedSchemaOutputSchema.safeParse(result.object);
    if (!validatedOutput.success) {
      console.error("AI output validation failed:", validatedOutput.error);
      return {
        isSuccess: false,
        message: "Failed to generate valid schema format"
      };
    }
    
    // Track API usage for analytics
    await trackServerEvent(
      "schema_generated", 
      userId, 
      { 
        documentType, 
        tier,
        formats: requestedFormats.join(',')
      }
    );
    
    return {
      isSuccess: true,
      message: "Schema generated successfully",
      data: validatedOutput.data
    };
    
  } catch (error) {
    console.error("Error generating schema:", error);
    return {
      isSuccess: false,
      message: "Failed to generate schema"
    };
  }
} 