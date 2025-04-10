/**
 * Prompts for schema generation
 * These can be used to customize the schema generation process
 */

/**
 * System prompt for schema generation
 */
export const SCHEMA_GEN_SYSTEM_PROMPT = `
You are a schema generation expert. Your task is to create structured data schemas based on user requests.
Follow these guidelines:
1. Create clean, well-structured schemas with appropriate types
2. Include documentation for each field
3. Mark required/optional fields appropriately
4. Use enum types where appropriate for finite value sets
5. Add appropriate validation constraints
6. Structure nested objects logically
7. Make field names camelCase and descriptive
`;

/**
 * Template for generating a Zod schema
 * @param documentType The type of document to create a schema for
 * @param fields An array of field descriptions
 * @param additionalInstructions Any additional instructions
 */
export function generateZodSchemaPrompt(
  documentType: string,
  fields?: string[],
  additionalInstructions?: string
): string {
  return `
Generate a Zod schema for a ${documentType}${
    fields?.length
      ? ` with the following fields:\n${fields.map(f => `- ${f}`).join("\n")}`
      : ""
  }
${additionalInstructions ? `\nAdditional requirements: ${additionalInstructions}` : ""}

The schema should:
- Use appropriate Zod validators
- Include documentation using .describe()
- Mark required fields with .required()
- Have meaningful error messages using .refine() where needed
- Export a type using z.infer<>

Return only valid TypeScript code for the Zod schema.
`;
}

/**
 * Template for generating a TypeScript interface
 * @param documentType The type of document to create a schema for
 * @param fields An array of field descriptions
 * @param additionalInstructions Any additional instructions
 */
export function generateTypeScriptInterfacePrompt(
  documentType: string,
  fields?: string[],
  additionalInstructions?: string
): string {
  return `
Generate a TypeScript interface for a ${documentType}${
    fields?.length
      ? ` with the following fields:\n${fields.map(f => `- ${f}`).join("\n")}`
      : ""
  }
${additionalInstructions ? `\nAdditional requirements: ${additionalInstructions}` : ""}

The interface should:
- Use proper TypeScript types
- Include JSDoc comments for all fields
- Use optional properties where appropriate
- Use union types, enums, or literals where they make sense

Return only valid TypeScript code for the interface.
`;
}

/**
 * Template for generating a JSON Schema
 * @param documentType The type of document to create a schema for
 * @param fields An array of field descriptions
 * @param additionalInstructions Any additional instructions
 */
export function generateJsonSchemaPrompt(
  documentType: string,
  fields?: string[],
  additionalInstructions?: string
): string {
  return `
Generate a JSON Schema for a ${documentType}${
    fields?.length
      ? ` with the following fields:\n${fields.map(f => `- ${f}`).join("\n")}`
      : ""
  }
${additionalInstructions ? `\nAdditional requirements: ${additionalInstructions}` : ""}

The schema should:
- Follow JSON Schema specification
- Include title, description, and type for each property
- Specify required properties
- Add appropriate format validators
- Include examples where helpful

Return only valid JSON Schema.
`;
} 