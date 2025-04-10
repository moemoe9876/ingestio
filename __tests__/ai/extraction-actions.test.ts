import { auth } from "@clerk/nextjs/server";
import { generateObject } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Required for Next.js compatibility
vi.mock("server-only", () => ({}));

// Mock auth
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

// Mock database actions
vi.mock("../../actions/db/profiles-actions", () => ({
  getProfileByUserIdAction: vi.fn(),
}));

vi.mock("../../actions/db/user-usage-actions", () => ({
  checkUserQuotaAction: vi.fn(),
  incrementPagesProcessedAction: vi.fn(),
}));

// Mock rate limiting
vi.mock("../../lib/rate-limiting", () => ({
  createRateLimiter: vi.fn(() => ({
    limit: vi.fn(),
  })),
  isBatchSizeAllowed: vi.fn(),
}));

// Mock AI functions
vi.mock("ai", () => ({
  generateText: vi.fn(),
  generateObject: vi.fn(),
}));

vi.mock("../../lib/ai/vertex-client", () => ({
  getVertexModel: vi.fn(),
  getVertexStructuredModel: vi.fn(),
  VERTEX_MODELS: {
    GEMINI_2_0_FLASH: "gemini-2.0-flash",
  },
}));

// Mock monitoring
vi.mock("../../lib/monitoring/rate-limit-monitor", () => ({
  trackApiUsage: vi.fn(),
}));

// Now import the actual function after mocks are defined
import { extractResumeDataAction } from "../../actions/ai/extraction-actions";
import { getProfileByUserIdAction } from "../../actions/db/profiles-actions";
import { checkUserQuotaAction, incrementPagesProcessedAction } from "../../actions/db/user-usage-actions";
import { getVertexStructuredModel } from "../../lib/ai/vertex-client";
import { trackApiUsage } from "../../lib/monitoring/rate-limit-monitor";
import { createRateLimiter, isBatchSizeAllowed } from "../../lib/rate-limiting";

// Helper function for test data
function getTestDocument() {
  return {
    documentBase64: "dGVzdCBkb2N1bWVudCBjb250ZW50", // "test document content" in base64
    mimeType: "application/pdf",
    extractionPrompt: "Extract resume data from this document",
    batchSize: 1,
  };
}

describe("AI Extraction Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    vi.mocked(auth).mockResolvedValue({
      userId: "test-user-id",
      sessionId: "test-session-id",
      getToken: vi.fn(),
    } as any);
    
    vi.mocked(getProfileByUserIdAction).mockResolvedValue({
      isSuccess: true,
      message: "Profile found",
      data: { 
        membership: "plus", 
        userId: "test-user-id",
        createdAt: new Date(),
        updatedAt: new Date(),
        stripeCustomerId: "cus_test123",
        stripeSubscriptionId: "sub_test123"
      },
    });
    
    vi.mocked(checkUserQuotaAction).mockResolvedValue({
      isSuccess: true,
      message: "User has quota",
      data: { 
        hasQuota: true, 
        remaining: 100,
        usage: {
          userId: "test-user-id",
          createdAt: new Date(),
          updatedAt: new Date(),
          id: "usage-test-id",
          billingPeriodStart: new Date(),
          billingPeriodEnd: new Date(),
          pagesProcessed: 10,
          pagesLimit: 200
        }
      },
    });
    
    vi.mocked(createRateLimiter).mockReturnValue({
      limit: vi.fn().mockResolvedValue({ success: true }),
    } as any);
    
    vi.mocked(isBatchSizeAllowed).mockReturnValue(true);
    
    vi.mocked(incrementPagesProcessedAction).mockResolvedValue({
      isSuccess: true,
      message: "Pages incremented",
      data: {
        userId: "test-user-id",
        createdAt: new Date(),
        updatedAt: new Date(),
        id: "usage-test-id",
        billingPeriodStart: new Date(),
        billingPeriodEnd: new Date(),
        pagesProcessed: 11,
        pagesLimit: 200
      },
    });
    
    vi.mocked(trackApiUsage).mockResolvedValue({
      rpm: 0.5,
      rpd: 0.3,
      tpm: 0.2
    });
    
    vi.mocked(getVertexStructuredModel).mockReturnValue("mocked-model" as any);

    const mockResumeData = {
      personalInfo: {
        name: "John Doe",
        email: "john@example.com",
        phone: "123-456-7890",
      },
      education: [
        {
          institution: "Test University",
          degree: "Bachelor's",
          fieldOfStudy: "Computer Science",
        },
      ],
      workExperience: [
        {
          company: "Tech Corp",
          position: "Software Engineer",
          startDate: "2020-01",
          endDate: "Present",
        },
      ],
      skills: ["JavaScript", "TypeScript", "React"],
    };
    
    vi.mocked(generateObject).mockResolvedValue({
      object: mockResumeData,
    } as any);
  });
  
  describe("extractResumeDataAction", () => {
    it("should extract resume data successfully", async () => {
      // Test input
      const input = getTestDocument();
      
      // Call the action
      const result = await extractResumeDataAction(input);
      
      // Assertions
      expect(result.isSuccess).toBe(true);
      expect(result.message).toBe("Resume data extracted successfully");
      expect(result.data).toBeDefined();
      
      // Verify dependencies were called properly
      expect(auth).toHaveBeenCalled();
      expect(getProfileByUserIdAction).toHaveBeenCalledWith("test-user-id");
      expect(checkUserQuotaAction).toHaveBeenCalledWith("test-user-id", 1);
      expect(getVertexStructuredModel).toHaveBeenCalled();
      expect(generateObject).toHaveBeenCalled();
      expect(trackApiUsage).toHaveBeenCalled();
      expect(incrementPagesProcessedAction).toHaveBeenCalledWith("test-user-id", 1);
    });
    
    it("should handle unauthorized users", async () => {
      // Mock unauthorized user
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        sessionId: null,
        getToken: vi.fn(),
      } as any);
      
      // Call the action
      const result = await extractResumeDataAction(getTestDocument());
      
      // Assertions
      expect(result.isSuccess).toBe(false);
      expect(result.message).toBe("Unauthorized");
      expect(result.data).toBeUndefined();
      
      // Verify dependencies were not called
      expect(getProfileByUserIdAction).not.toHaveBeenCalled();
      expect(checkUserQuotaAction).not.toHaveBeenCalled();
      expect(generateObject).not.toHaveBeenCalled();
    });
    
    it("should handle rate limiting", async () => {
      // Mock rate limiting
      vi.mocked(createRateLimiter).mockReturnValue({
        limit: vi.fn().mockResolvedValue({ 
          success: false, 
          reset: Date.now() + 60000 
        }),
      } as any);
      
      // Call the action
      const result = await extractResumeDataAction(getTestDocument());
      
      // Assertions
      expect(result.isSuccess).toBe(false);
      expect(result.message).toContain("Rate limit exceeded");
      
      // Verify some dependencies were called but not AI
      expect(auth).toHaveBeenCalled();
      expect(getProfileByUserIdAction).toHaveBeenCalled();
      expect(generateObject).not.toHaveBeenCalled();
    });
    
    it("should handle batch size limits", async () => {
      // Mock batch size limit check
      vi.mocked(isBatchSizeAllowed).mockReturnValue(false);
      
      // Call the action
      const result = await extractResumeDataAction({
        ...getTestDocument(),
        batchSize: 100 // Large batch size
      });
      
      // Assertions
      expect(result.isSuccess).toBe(false);
      expect(result.message).toContain("Batch size exceeds");
      
      // Verify dependencies
      expect(auth).toHaveBeenCalled();
      expect(getProfileByUserIdAction).toHaveBeenCalled();
      expect(generateObject).not.toHaveBeenCalled();
    });
    
    it("should handle quota limits", async () => {
      // Mock quota check
      vi.mocked(checkUserQuotaAction).mockResolvedValue({
        isSuccess: true,
        message: "No quota",
        data: { 
          hasQuota: false, 
          remaining: 0,
          usage: {
            userId: "test-user-id",
            createdAt: new Date(),
            updatedAt: new Date(),
            id: "usage-test-id",
            billingPeriodStart: new Date(),
            billingPeriodEnd: new Date(),
            pagesProcessed: 200,
            pagesLimit: 200
          }
        },
      });
      
      // Call the action
      const result = await extractResumeDataAction(getTestDocument());
      
      // Assertions
      expect(result.isSuccess).toBe(false);
      expect(result.message).toContain("Page quota exceeded");
      
      // Verify dependencies
      expect(auth).toHaveBeenCalled();
      expect(getProfileByUserIdAction).toHaveBeenCalled();
      expect(checkUserQuotaAction).toHaveBeenCalled();
      expect(generateObject).not.toHaveBeenCalled();
    });
    
    it("should handle AI extraction errors", async () => {
      // Mock AI error
      vi.mocked(generateObject).mockRejectedValue(new Error("AI extraction failed"));
      
      // Call the action
      const result = await extractResumeDataAction(getTestDocument());
      
      // Assertions
      expect(result.isSuccess).toBe(false);
      expect(result.message).toBe("AI extraction failed");
      
      // Verify dependencies
      expect(auth).toHaveBeenCalled();
      expect(getProfileByUserIdAction).toHaveBeenCalled();
      expect(checkUserQuotaAction).toHaveBeenCalled();
      expect(generateObject).toHaveBeenCalled();
      expect(incrementPagesProcessedAction).not.toHaveBeenCalled();
    });
    
    it("should handle profile retrieval errors", async () => {
      // Mock profile error
      vi.mocked(getProfileByUserIdAction).mockResolvedValue({
        isSuccess: false,
        message: "Failed to retrieve profile",
      });
      
      // Call the action
      const result = await extractResumeDataAction(getTestDocument());
      
      // Assertions
      expect(result.isSuccess).toBe(false);
      expect(result.message).toContain("Unable to determine user subscription tier");
      
      // Verify dependencies
      expect(auth).toHaveBeenCalled();
      expect(getProfileByUserIdAction).toHaveBeenCalled();
      expect(generateObject).not.toHaveBeenCalled();
    });
    
    it("should handle invalid input", async () => {
      // Call the action with invalid input that will fail schema validation
      const result = await extractResumeDataAction({
        documentBase64: "valid-base64",
        mimeType: "application/pdf",
        extractionPrompt: "a", // Too short (schema requires min 5 chars)
        batchSize: 0 // Invalid - schema requires min 1
      } as any);
      
      // Assertions
      expect(result.isSuccess).toBe(false);
      expect(result.message).toContain("Invalid input");
    });
  });
}); 