import { generateSchemaAction } from "@/actions/ai/schema";
import { getProfileByUserIdAction } from "@/actions/db/profiles-actions";
import { trackServerEvent } from "@/lib/analytics/server";
import { getCurrentUser } from "@/lib/auth/utils";
import { checkRateLimit } from "@/lib/rate-limiting/limiter";
import { generateObject } from "ai";
import { beforeEach, describe, expect, test, vi, type Mock } from "vitest";

// Required for Next.js compatibility
vi.mock("server-only", () => ({}));

// Mock dependencies
vi.mock("@/lib/auth/utils", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/actions/db/profiles-actions", () => ({
  getProfileByUserIdAction: vi.fn(),
}));

vi.mock("@/lib/rate-limiting/limiter", () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock("@/lib/analytics/server", () => ({
  trackServerEvent: vi.fn(),
}));

vi.mock("ai", () => ({
  generateObject: vi.fn(),
}));

// Mock the Vertex client
vi.mock("@/lib/ai/vertex-client", () => ({
  getVertexStructuredModel: vi.fn(() => "mocked-vertex-model"),
  VERTEX_MODELS: {
    GEMINI_2_0_FLASH: "gemini-2.0-flash"
  }
}));

// Mock the schema prompts
vi.mock("@/prompts/schemaGen", () => ({
  SCHEMA_GEN_SYSTEM_PROMPT: "You are a schema generation expert",
  generateZodSchemaPrompt: vi.fn((docType) => `Generate Zod schema for ${docType}`),
  generateTypeScriptInterfacePrompt: vi.fn((docType) => `Generate TypeScript interface for ${docType}`),
  generateJsonSchemaPrompt: vi.fn((docType) => `Generate JSON Schema for ${docType}`)
}));

// Skip tests unless explicitly running AI tests
const isAiTest = process.env.RUN_AI_TESTS === "true";

describe.skipIf(!isAiTest)("generateSchemaAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper function for test user
  function getUser() {
    return "user_test_123";
  }

  // Helper function for test profile
  function getProfile() {
    return {
      userId: "user_test_123",
      membership: "plus",
      stripeCustomerId: "cus_123",
      stripeSubscriptionId: "sub_123",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  // Helper function for test input
  function getTestInput(overrides = {}) {
    return {
      documentType: "Invoice",
      fieldDescriptions: ["invoice number", "date", "total amount"],
      customInstructions: "Include GST field",
      ...overrides
    };
  }

  // Helper function for test output
  function getTestOutput(overrides = {}) {
    return {
      zodSchema: 'z.object({\n  invoiceNumber: z.string(),\n  date: z.string(),\n  totalAmount: z.number(),\n  gst: z.number()\n})',
      typescriptInterface: 'interface Invoice {\n  invoiceNumber: string;\n  date: string;\n  totalAmount: number;\n  gst: number;\n}',
      ...overrides
    };
  }

  test("successfully generates schema with valid input", async () => {
    // Mock dependencies
    (getCurrentUser as Mock).mockResolvedValue(getUser());
    (getProfileByUserIdAction as Mock).mockResolvedValue({
      isSuccess: true,
      message: "Profile retrieved successfully",
      data: getProfile()
    });
    (checkRateLimit as Mock).mockResolvedValue({
      success: true,
      limit: 20,
      remaining: 19,
      reset: Date.now() + 60000
    });
    (generateObject as Mock).mockResolvedValue({ object: getTestOutput() });
    (trackServerEvent as Mock).mockResolvedValue(undefined);

    // Call the function
    const result = await generateSchemaAction(getTestInput());

    // Verify the result
    expect(result).toEqual({
      isSuccess: true,
      message: "Schema generated successfully",
      data: getTestOutput()
    });

    // Verify the dependencies were called with expected arguments
    expect(getCurrentUser).toHaveBeenCalled();
    expect(getProfileByUserIdAction).toHaveBeenCalledWith(getUser());
    expect(checkRateLimit).toHaveBeenCalledWith(getUser(), "plus", "schema_generation");
    expect(generateObject).toHaveBeenCalled();
    expect(trackServerEvent).toHaveBeenCalledWith(
      "schema_generated",
      getUser(),
      expect.objectContaining({ 
        documentType: "Invoice", 
        tier: "plus",
        formats: "Zod schema"
      })
    );

    // Output the generated schema for debugging
    console.debug("Generated schema:", result.data?.zodSchema);
  }, 15000);

  test("successfully generates multiple schema formats", async () => {
    // Mock dependencies
    (getCurrentUser as Mock).mockResolvedValue(getUser());
    (getProfileByUserIdAction as Mock).mockResolvedValue({
      isSuccess: true,
      message: "Profile retrieved successfully",
      data: getProfile()
    });
    (checkRateLimit as Mock).mockResolvedValue({
      success: true,
      limit: 20,
      remaining: 19,
      reset: Date.now() + 60000
    });
    (generateObject as Mock).mockResolvedValue({ object: getTestOutput() });
    (trackServerEvent as Mock).mockResolvedValue(undefined);

    // Call the function with multiple format options
    const result = await generateSchemaAction({
      ...getTestInput(),
      typescriptInterface: true,
      jsonSchema: true
    });

    // Verify the result
    expect(result).toEqual({
      isSuccess: true,
      message: "Schema generated successfully",
      data: getTestOutput()
    });

    // Verify format tracking in analytics
    expect(trackServerEvent).toHaveBeenCalledWith(
      "schema_generated",
      getUser(),
      expect.objectContaining({ 
        formats: "Zod schema,TypeScript interface,JSON Schema"
      })
    );

    // Verify that the right prompts were included
    expect(generateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: "user",
            content: expect.stringContaining("Generate Zod schema for Invoice")
          })
        ])
      })
    );
  });

  test("returns error when rate limit is exceeded", async () => {
    // Mock dependencies
    (getCurrentUser as Mock).mockResolvedValue(getUser());
    (getProfileByUserIdAction as Mock).mockResolvedValue({
      isSuccess: true,
      message: "Profile retrieved successfully",
      data: getProfile()
    });
    (checkRateLimit as Mock).mockResolvedValue({
      success: false,
      limit: 20,
      remaining: 0,
      reset: Date.now() + 30000
    });

    // Call the function
    const result = await generateSchemaAction(getTestInput());

    // Verify the result
    expect(result).toEqual({
      isSuccess: false,
      message: expect.stringContaining("Rate limit exceeded")
    });

    // Verify dependencies
    expect(getCurrentUser).toHaveBeenCalled();
    expect(getProfileByUserIdAction).toHaveBeenCalledWith(getUser());
    expect(checkRateLimit).toHaveBeenCalledWith(getUser(), "plus", "schema_generation");
    expect(generateObject).not.toHaveBeenCalled();
    expect(trackServerEvent).not.toHaveBeenCalled();
  });

  test("returns error when user profile cannot be retrieved", async () => {
    // Mock dependencies
    (getCurrentUser as Mock).mockResolvedValue(getUser());
    (getProfileByUserIdAction as Mock).mockResolvedValue({
      isSuccess: false,
      message: "Profile not found"
    });

    // Call the function
    const result = await generateSchemaAction(getTestInput());

    // Verify the result
    expect(result).toEqual({
      isSuccess: false,
      message: "Unable to determine user subscription tier"
    });

    // Verify dependencies
    expect(getCurrentUser).toHaveBeenCalled();
    expect(getProfileByUserIdAction).toHaveBeenCalledWith(getUser());
    expect(checkRateLimit).not.toHaveBeenCalled();
    expect(generateObject).not.toHaveBeenCalled();
    expect(trackServerEvent).not.toHaveBeenCalled();
  });

  test("returns error when input validation fails", async () => {
    // Mock dependencies
    (getCurrentUser as Mock).mockResolvedValue(getUser());
    (getProfileByUserIdAction as Mock).mockResolvedValue({
      isSuccess: true,
      message: "Profile retrieved successfully",
      data: getProfile()
    });
    (checkRateLimit as Mock).mockResolvedValue({
      success: true,
      limit: 20,
      remaining: 19,
      reset: Date.now() + 60000
    });

    // Call the function with invalid input
    const result = await generateSchemaAction({
      documentType: "", // Empty string fails validation
      fieldDescriptions: []
    });

    // Verify the result
    expect(result).toEqual({
      isSuccess: false,
      message: expect.stringContaining("Invalid input")
    });

    // Verify dependencies
    expect(getCurrentUser).toHaveBeenCalled();
    expect(getProfileByUserIdAction).toHaveBeenCalledWith(getUser());
    expect(checkRateLimit).toHaveBeenCalledWith(getUser(), "plus", "schema_generation");
    expect(generateObject).not.toHaveBeenCalled();
    expect(trackServerEvent).not.toHaveBeenCalled();
  });

  test("handles AI generation errors gracefully", async () => {
    // Mock dependencies
    (getCurrentUser as Mock).mockResolvedValue(getUser());
    (getProfileByUserIdAction as Mock).mockResolvedValue({
      isSuccess: true,
      message: "Profile retrieved successfully",
      data: getProfile()
    });
    (checkRateLimit as Mock).mockResolvedValue({
      success: true,
      limit: 20,
      remaining: 19,
      reset: Date.now() + 60000
    });
    (generateObject as Mock).mockRejectedValue(new Error("AI model error"));

    // Call the function
    const result = await generateSchemaAction(getTestInput());

    // Verify the result
    expect(result).toEqual({
      isSuccess: false,
      message: "Failed to generate schema"
    });

    // Verify dependencies
    expect(getCurrentUser).toHaveBeenCalled();
    expect(getProfileByUserIdAction).toHaveBeenCalledWith(getUser());
    expect(checkRateLimit).toHaveBeenCalledWith(getUser(), "plus", "schema_generation");
    expect(generateObject).toHaveBeenCalled();
    expect(trackServerEvent).not.toHaveBeenCalled();
  });
}); 