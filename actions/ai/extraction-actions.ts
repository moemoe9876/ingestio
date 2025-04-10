"use server";

import { getProfileByUserIdAction } from "@/actions/db/profiles-actions";
import { checkUserQuotaAction, incrementPagesProcessedAction } from "@/actions/db/user-usage-actions";
import { getVertexStructuredModel, VERTEX_MODELS } from "@/lib/ai/vertex-client";
import { trackServerEvent } from "@/lib/analytics/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { checkRateLimit, createRateLimiter, isBatchSizeAllowed, SubscriptionTier } from "@/lib/rate-limiting/limiter";
import { createServerClient } from "@/lib/supabase/server";
import { enhancePrompt, getDefaultPrompt, SYSTEM_INSTRUCTIONS } from "@/prompts/extraction";
import { ActionState } from "@/types/server-action-types";
import { generateObject, generateText } from "ai";
import { z } from "zod";

// Define input validation schema for text extraction
const extractTextSchema = z.object({
  documentBase64: z.string(),
  mimeType: z.string(),
  extractionPrompt: z.string().min(5).max(1000),
  batchSize: z.number().int().min(1).optional().default(1),
});

// Define input validation schema for structured extraction
const extractStructuredDataSchema = z.object({
  documentBase64: z.string(),
  mimeType: z.string(),
  extractionPrompt: z.string().min(5).max(1000),
  batchSize: z.number().int().min(1).optional().default(1),
});

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

// Resume schema for structured data extraction
const resumeSchema = z.object({
  personalInfo: z.object({
    name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    location: z.string().optional(),
    linkedin: z.string().url().optional(),
    website: z.string().url().optional(),
  }).optional(),
  education: z.array(
    z.object({
      institution: z.string().optional(),
      degree: z.string().optional(),
      fieldOfStudy: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      gpa: z.string().optional(),
    })
  ).optional(),
  workExperience: z.array(
    z.object({
      company: z.string().optional(),
      position: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      location: z.string().optional(),
      description: z.string().optional(),
    })
  ).optional(),
  skills: z.array(z.string()).optional(),
  certifications: z.array(
    z.object({
      name: z.string().optional(),
      issuer: z.string().optional(),
      date: z.string().optional(),
    })
  ).optional(),
  languages: z.array(
    z.object({
      language: z.string().optional(),
      proficiency: z.string().optional(),
    })
  ).optional(),
  confidence: z.number().optional(),
});

type ResumeData = z.infer<typeof resumeSchema>;

// Define input validation schema for document extraction
const extractDocumentSchema = z.object({
  documentId: z.string().uuid(),
  extractionPrompt: z.string().min(5).max(1000).optional(),
  includeConfidence: z.boolean().optional().default(true),
  includePositions: z.boolean().optional().default(false),
  documentType: z.string().optional()
});

/**
 * Apply rate limiting based on user's subscription tier
 * @param userId User ID
 * @param batchSize Number of pages to process
 */
async function applyRateLimiting(userId: string, batchSize: number = 1): Promise<{
  isAllowed: boolean;
  message?: string;
  retryAfter?: number;
  tier: SubscriptionTier;
}> {
  try {
    // Get user's profile to determine subscription tier
    const profileResult = await getProfileByUserIdAction(userId);
    if (!profileResult.isSuccess) {
      return {
        isAllowed: false,
        message: "Unable to determine user subscription tier",
        tier: "starter"
      };
    }
    
    const tier = (profileResult.data.membership || "starter") as SubscriptionTier;
    
    // Check if batch size is allowed for the tier
    if (!isBatchSizeAllowed(tier, batchSize)) {
      return {
        isAllowed: false,
        message: `Batch size exceeds ${tier} tier limit`,
        tier
      };
    }
    
    // Check if user has enough quota remaining
    const quotaResult = await checkUserQuotaAction(userId, batchSize);
    if (!quotaResult.isSuccess || !quotaResult.data.hasQuota) {
      return {
        isAllowed: false,
        message: `Page quota exceeded. You have ${quotaResult.data?.remaining || 0} pages remaining for this billing period`,
        tier
      };
    }
    
    // Apply rate limiting for API requests
    const rateLimiter = createRateLimiter(userId, tier, "extraction");
    const { success, reset } = await rateLimiter.limit(userId);
    
    if (!success) {
      const retryAfter = Math.ceil((reset - Date.now()) / 1000);
      return {
        isAllowed: false,
        message: `Rate limit exceeded. Too many requests at once. Please try again in ${retryAfter} seconds`,
        retryAfter,
        tier
      };
    }
    
    return {
      isAllowed: true,
      tier
    };
  } catch (error) {
    console.error("Error applying rate limiting:", error);
    return {
      isAllowed: false,
      message: "Error checking rate limits",
      tier: "starter"
    };
  }
}

/**
 * Server action to extract data from a document using Vertex AI
 * @param input Extraction parameters
 * @returns Extracted data with action status
 */
export async function extractDocumentDataAction(
  input: z.infer<typeof extractDocumentSchema>
): Promise<ActionState<any>> {
  try {
    // 1. Authentication Check
    const userId = await getCurrentUser();
    
    // 2. Input Validation
    const parsedInput = extractDocumentSchema.safeParse(input);
    if (!parsedInput.success) {
      return {
        isSuccess: false,
        message: `Invalid input: ${parsedInput.error.message}`,
      };
    }
    const { documentId, extractionPrompt, includeConfidence, includePositions, documentType } = parsedInput.data;
    
    // 3. Get User Profile & Tier
    const profileResult = await getProfileByUserIdAction(userId);
    if (!profileResult.isSuccess) {
      return {
        isSuccess: false,
        message: "Failed to retrieve user profile"
      };
    }
    const tier = profileResult.data.membership as SubscriptionTier;
    
    // 4. Rate Limit Check
    const rateLimitResult = await checkRateLimit(userId, tier, "extraction");
    if (!rateLimitResult.success) {
      // Track rate limited event
      await trackServerEvent("extraction_rate_limited", userId, {
        documentId,
        tier
      });
      
      return {
        isSuccess: false,
        message: "Rate limit exceeded. Please try again later."
      };
    }
    
    // 5. Quota Check
    const quotaResult = await checkUserQuotaAction(userId, 1); // 1 page for now
    if (!quotaResult.isSuccess || !quotaResult.data.hasQuota) {
      // Track quota exceeded event
      await trackServerEvent("extraction_quota_exceeded", userId, {
        documentId,
        tier,
        remaining: quotaResult.data?.remaining || 0
      });
      
      return {
        isSuccess: false,
        message: `Page quota exceeded. You have ${quotaResult.data?.remaining || 0} pages remaining for this billing period.`
      };
    }
    
    // 6. Get Document
    const supabase = createServerClient();
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single();
      
    if (docError || !document) {
      return {
        isSuccess: false,
        message: `Document not found: ${docError?.message || "Unknown error"}`
      };
    }
    
    // 7. Create Extraction Job
    const { data: extractionJob, error: jobError } = await supabase
      .from('extraction_jobs')
      .insert({
        user_id: userId,
        document_id: documentId,
        status: "processing",
        extraction_prompt: extractionPrompt,
        extraction_options: {
          includeConfidence,
          includePositions,
          documentType
        }
      })
      .select()
      .single();
    
    if (jobError || !extractionJob) {
      return {
        isSuccess: false,
        message: `Failed to create extraction job: ${jobError?.message || "Unknown error"}`
      };
    }
    
    // 8. Get document file
    const { data: fileData, error: fileError } = await supabase.storage
      .from('documents')
      .download(document.storage_path);
      
    if (fileError || !fileData) {
      // Update job status to failed
      await supabase
        .from('extraction_jobs')
        .update({
          status: "failed",
          error_message: `Failed to download document: ${fileError?.message || "Unknown error"}`
        })
        .eq('id', extractionJob.id);
        
      return {
        isSuccess: false,
        message: `Failed to download document: ${fileError?.message || "Unknown error"}`
      };
    }
    
    // 9. Prepare for AI processing
    // Convert file to base64 using Buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const fileBase64 = Buffer.from(arrayBuffer).toString('base64');
    
    // 9.5 Detect document type if not provided
    let detectedType = documentType;
    if (!detectedType || detectedType === 'unknown') {
      detectedType = await detectDocumentTypeAction(fileBase64, document.mime_type);
      
      // Update extraction job with detected type
      await supabase
        .from('extraction_jobs')
        .update({
          extraction_options: {
            ...(extractionJob.extraction_options as Record<string, any> || {}),
            detectedDocumentType: detectedType
          }
        })
        .eq('id', extractionJob.id);
    }
    
    // 10. Prepare Prompt
    const userPromptText = extractionPrompt || getDefaultPrompt(detectedType);
    const enhancedPrompt = enhancePrompt(
      userPromptText, 
      includeConfidence, 
      includePositions
    );
    
    // Add context about document type
    const contextualSystemInstructions = `${SYSTEM_INSTRUCTIONS}\nAnalyze the following document (likely a ${detectedType}).`;
    
    // 11. Call Vertex API
    try {
      // Select appropriate schema based on document type
      let schema;
      switch (detectedType) {
        case 'invoice':
          schema = invoiceSchema;
          break;
        case 'resume':
          schema = resumeSchema;
          break;
        default:
          // For other document types, use a generic record schema
          schema = z.record(z.any());
          break;
      }
      
      // Use structured output model
      const model = getVertexStructuredModel(VERTEX_MODELS.GEMINI_2_0_FLASH);
      
      let extractedData: any;
      
      // Try using generateObject with appropriate schema
      try {
        const result = await generateObject({
          // @ts-ignore - Type compatibility issue between AI SDK versions
          model,
          schema,
          messages: [
            {
              role: "system",
              content: contextualSystemInstructions
            },
            {
              role: "user",
              // @ts-ignore - Type compatibility issue
              content: [
                { type: "text", text: enhancedPrompt },
                { 
                  type: "image", 
                  source: {
                    type: "base64",
                    media_type: document.mime_type,
                    data: fileBase64
                  }
                }
              ]
            }
          ]
        });
        
        // Use the structured object result
        extractedData = result.object;
      } catch (structuredError) {
        // Fall back to generateText if structured generation fails
        console.warn("Structured generation failed, falling back to text generation:", structuredError);
        
        const textResult = await generateText({
          // @ts-ignore - Type compatibility issue between AI SDK versions
          model,
          messages: [
            {
              role: "system",
              content: contextualSystemInstructions
            },
            {
              role: "user",
              // @ts-ignore - Type compatibility issue
              content: [
                { type: "text", text: enhancedPrompt },
                { 
                  type: "image", 
                  source: {
                    type: "base64",
                    media_type: document.mime_type,
                    data: fileBase64
                  }
                }
              ]
            }
          ]
        });
        
        // Try to parse JSON from the text response
        try {
          // Clean the response text (remove markdown code blocks)
          const cleanedResponse = textResult.text
            .replace(/^```json\s*/, '')
            .replace(/^```\s*/, '')
            .replace(/```\s*$/, '')
            .trim();
            
          extractedData = JSON.parse(cleanedResponse);
        } catch (parseError) {
          // If parsing fails, use the raw text
          extractedData = { raw_text: textResult.text };
        }
      }
      
      // 13. Save Extraction Data
      const { data: extractedDataRecord, error: extractionDataError } = await supabase
        .from('extracted_data')
        .insert({
          extraction_job_id: extractionJob.id,
          document_id: documentId,
          user_id: userId,
          data: extractedData,
          document_type: detectedType
        })
        .select()
        .single();
      
      if (extractionDataError) {
        throw new Error(`Failed to save extracted data: ${extractionDataError.message}`);
      }
      
      // 14. Update Extraction Job Status
      await supabase
        .from('extraction_jobs')
        .update({
          status: "completed"
        })
        .eq('id', extractionJob.id);
      
      // 15. Update Document Status
      await supabase
        .from('documents')
        .update({
          status: "completed"
        })
        .eq('id', documentId);
      
      // 16. Update Usage
      await incrementPagesProcessedAction(userId, 1);
      
      // 17. Track Analytics Event
      await trackServerEvent("extraction_completed", userId, {
        documentId,
        extractionJobId: extractionJob.id,
        tier,
        documentType: detectedType,
        pageCount: document.page_count || 1
      });
      
      // 18. Return Success
      return {
        isSuccess: true,
        message: "Document extraction completed successfully",
        data: extractedData
      };
      
    } catch (aiError: unknown) {
      // Handle AI extraction error
      console.error("AI extraction error:", aiError);
      
      // Update job status to failed
      if (extractionJob) {
        await supabase
          .from('extraction_jobs')
          .update({
            status: "failed",
            error_message: `AI extraction failed: ${aiError instanceof Error ? aiError.message : "Unknown AI error"}`
          })
          .eq('id', extractionJob.id);
      }
        
      // Track error event
      await trackServerEvent("extraction_failed", userId, {
        documentId,
        extractionJobId: extractionJob?.id,
        error: aiError instanceof Error ? aiError.message : "Unknown AI error",
        tier
      });
      
      return {
        isSuccess: false,
        message: `AI extraction failed: ${aiError instanceof Error ? aiError.message : "Unknown AI error"}`
      };
    }
  } catch (error) {
    // Track error event if possible
    try {
      const userId = await getCurrentUser();
      await trackServerEvent("extraction_error", userId, {
        documentId: input.documentId,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    } catch (trackError) {
      console.error("Failed to track error event:", trackError);
    }
    
    console.error("Document extraction error:", error);
    return {
      isSuccess: false,
      message: `Document extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`
    };
  }
}

/**
 * Action to extract text from a document
 * This is a specialized version of extractDocumentDataAction specifically for text extraction
 */
export async function extractTextAction(
  documentId: string,
  extractionPrompt?: string
): Promise<ActionState<{ text: string }>> {
  // Use the generic extraction with text-specific prompt
  const result = await extractDocumentDataAction({
    documentId,
    extractionPrompt: extractionPrompt || "Extract all text content from this document.",
    includeConfidence: false,
    includePositions: false,
    documentType: "text"
  });
  
  // Convert result to text-specific format
  if (result.isSuccess) {
    return {
      isSuccess: true,
      message: result.message,
      data: { 
        text: typeof result.data === 'string' 
          ? result.data 
          : result.data.raw_text || JSON.stringify(result.data) 
      }
    };
  } else {
    return result;
  }
}

/**
 * Action to extract invoice data from a document
 * This is a specialized version of extractDocumentDataAction specifically for invoices
 */
export async function extractInvoiceDataAction(
  documentId: string,
  extractionPrompt?: string
): Promise<ActionState<any>> {
  // Use the generic extraction with invoice-specific settings
  return extractDocumentDataAction({
    documentId,
    extractionPrompt: extractionPrompt || getDefaultPrompt("invoice"),
    includeConfidence: true,
    includePositions: false,
    documentType: "invoice"
  });
}

/**
 * Action to extract resume data from a document
 * This is a specialized version of extractDocumentDataAction specifically for resumes
 */
export async function extractResumeDataAction(
  documentId: string,
  extractionPrompt?: string
): Promise<ActionState<any>> {
  // Use the generic extraction with resume-specific settings
  return extractDocumentDataAction({
    documentId,
    extractionPrompt: extractionPrompt || getDefaultPrompt("resume"),
    includeConfidence: true,
    includePositions: false,
    documentType: "resume"
  });
}

/**
 * Action to extract receipt data from a document
 * This is a specialized version of extractDocumentDataAction specifically for receipts
 */
export async function extractReceiptDataAction(
  documentId: string,
  extractionPrompt?: string
): Promise<ActionState<any>> {
  // Use the generic extraction with receipt-specific settings
  return extractDocumentDataAction({
    documentId,
    extractionPrompt: extractionPrompt || getDefaultPrompt("receipt"),
    includeConfidence: true,
    includePositions: false,
    documentType: "receipt"
  });
}

/**
 * Action to extract form data from a document
 * This is a specialized version of extractDocumentDataAction specifically for forms
 */
export async function extractFormDataAction(
  documentId: string,
  extractionPrompt?: string
): Promise<ActionState<any>> {
  // Use the generic extraction with form-specific settings
  return extractDocumentDataAction({
    documentId,
    extractionPrompt: extractionPrompt || getDefaultPrompt("form"),
    includeConfidence: true,
    includePositions: true, // Include positions for form fields
    documentType: "form"
  });
}

/**
 * Function to detect document type using AI
 * @param fileBase64 Base64 encoded file data
 * @param mimeType MIME type of the file
 * @returns Detected document type or 'unknown'
 */
async function detectDocumentTypeAction(
  fileBase64: string,
  mimeType: string
): Promise<string> {
  try {
    // Use a lightweight model for quick detection
    const model = getVertexStructuredModel(VERTEX_MODELS.GEMINI_2_0_FLASH);
    
    const result = await generateText({
      // @ts-ignore - Type compatibility issue between AI SDK versions
      model,
      messages: [
        {
          role: "system",
          content: "You are a document classifier. Analyze the document and identify its type. Respond with a single word: 'invoice', 'resume', 'receipt', 'form', or 'text'."
        },
        {
          role: "user",
          // @ts-ignore - Type compatibility issue
          content: [
            { type: "text", text: "What type of document is this? Respond with only one word." },
            { 
              type: "image", 
              source: {
                type: "base64",
                media_type: mimeType,
                data: fileBase64
              }
            }
          ]
        }
      ]
    });
    
    // Clean and normalize the response
    const detectedType = result.text.trim().toLowerCase();
    
    // Validate the detected type
    if (['invoice', 'resume', 'receipt', 'form'].includes(detectedType)) {
      return detectedType;
    }
    
    return 'text'; // Default to text if we can't detect a specific type
  } catch (error) {
    console.error("Error detecting document type:", error);
    return 'unknown';
  }
} 