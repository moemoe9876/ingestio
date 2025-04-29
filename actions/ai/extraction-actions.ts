"use server";

import { checkUserQuotaAction, incrementPagesProcessedAction } from "@/actions/db/user-usage-actions";
import { getUserSubscriptionDataKVAction } from "@/actions/stripe/sync-actions";
import { getVertexStructuredModel, VERTEX_MODELS } from "@/lib/ai/vertex-client";
import { getPostHogServerClient, trackServerEvent } from "@/lib/analytics/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { checkRateLimit, createRateLimiter, isBatchSizeAllowed, SubscriptionTier, validateTier } from "@/lib/rate-limiting/limiter";
import { createServerClient } from "@/lib/supabase/server";
import { enhancePrompt, filterExtractedData, getDefaultPrompt, parseRequestedFields, SYSTEM_INSTRUCTIONS } from "@/prompts/extraction";
import { ActionState } from "@/types/server-action-types";
import { withTracing } from '@posthog/ai'; // Import PostHog AI wrapper
import { generateObject, generateText } from "ai";
import { randomUUID } from 'crypto'; // For generating trace IDs
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Initialize PostHog client instance
const phClient = getPostHogServerClient();

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
  extractionPrompt: z.string().min(0).max(1000).optional(),
  includeConfidence: z.boolean().optional().default(true),
  includePositions: z.boolean().optional().default(true)
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
    // Get user's subscription data from KV store (source of truth)
    const subscriptionResult = await getUserSubscriptionDataKVAction();
    if (!subscriptionResult.isSuccess) {
      return {
        isAllowed: false,
        message: "Unable to determine user subscription tier",
        tier: "starter"
      };
    }
    
    // Determine tier based on subscription status and planId
    let tier: SubscriptionTier = "starter";
    if (subscriptionResult.data.status === 'active' && subscriptionResult.data.planId) {
      tier = subscriptionResult.data.planId as SubscriptionTier;
    }
    
    // Validate the tier to ensure it exists in RATE_LIMIT_TIERS
    tier = validateTier(tier);
    
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
 * @param input Extraction parameters conforming to extractDocumentSchema
 * @param invokedByBatchProcessor Optional flag to indicate if called by the batch processor (skips usage increment)
 * @returns Extracted data with action status
 */
export async function extractDocumentDataAction(
  input: z.infer<typeof extractDocumentSchema>,
  invokedByBatchProcessor: boolean = false // Default to false for single extractions
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
    
    // Use the parsed input but apply our defaults
    const { documentId, extractionPrompt } = parsedInput.data;
    const includeConfidence = true;  // Always include confidence
    const includePositions = true;   // Always include positions
    
    // Generate trace ID for PostHog LLM tracking
    const traceId = randomUUID();
    
    // Get User Subscription Data & Tier
    const subscriptionResult = await getUserSubscriptionDataKVAction();
    if (!subscriptionResult.isSuccess) {
      return {
        isSuccess: false,
        message: "Failed to retrieve user subscription data"
      };
    }
    
    // Determine tier based on subscription status and planId
    let tier: SubscriptionTier = "starter";
    if (subscriptionResult.data.status === 'active' && subscriptionResult.data.planId) {
      tier = subscriptionResult.data.planId as SubscriptionTier;
    }
    tier = validateTier(tier);

    // Get document details first to check page count for quota
    const supabase = await createServerClient();
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*') // Select all columns to get page_count
      .eq('id', documentId)
      .eq('user_id', userId)
      .single();

    if (docError || !document) {
      return {
        isSuccess: false,
        message: `Document not found or access denied: ${docError?.message || "Unknown error"}`
      };
    }

    const actualPageCount = document.page_count;

    // Rate limit check (can happen before quota check)
    const rateLimitResult = await checkRateLimit(userId, tier, "extraction");
    if (!rateLimitResult.success) {
      await trackServerEvent("extraction_rate_limited", userId, {
        documentId,
        tier,
        traceId
      });
      return {
        isSuccess: false,
        message: "Rate limit exceeded. Please try again later."
      };
    }

    // Quota check using actual page count *before* AI call
    const quotaResult = await checkUserQuotaAction(userId, actualPageCount);
    if (!quotaResult.isSuccess || !quotaResult.data.hasQuota) {
      return {
        isSuccess: false,
        message: `Page quota exceeded. You have ${quotaResult.data?.remaining || 0} pages remaining for this billing period.`
      };
    }

    // Create extraction job
    // @ts-ignore - Potential schema type mismatch 
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
    
    // Download document file
    // @ts-ignore - Potential storage path property issue
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
    
    // Prepare for AI processing
    const arrayBuffer = await fileData.arrayBuffer();
    const fileBase64 = Buffer.from(arrayBuffer).toString('base64');
    
    // Prepare prompt
    const userPromptText = extractionPrompt || "Extract all relevant information from this document.";
    const enhancedPrompt = enhancePrompt(
      userPromptText, 
      includeConfidence, 
      includePositions
    );
    
    // Parse requested fields from prompt
    const requestedFields = parseRequestedFields(userPromptText);
    
    // Prepare system instructions
    const contextualSystemInstructions = `${SYSTEM_INSTRUCTIONS}\nAnalyze the following document and extract the requested information.`;
    
    // Call Vertex API with PostHog LLM tracing
    try {
      // Get base model
      const baseModel = getVertexStructuredModel(VERTEX_MODELS.GEMINI_2_0_FLASH);
      
      // Wrap with PostHog tracing
      // @ts-ignore - Type incompatibility between AI SDK and PostHog wrapper
      const observableModel = withTracing(
        baseModel as any,
        phClient,
        {
          posthogDistinctId: userId,
          posthogTraceId: traceId,
          posthogProperties: {
            documentId: documentId,
            actionName: "extractDocumentDataAction",
            promptUsed: enhancedPrompt,
            extractionJobId: extractionJob.id,
            tier: tier,
            requestedFields: (requestedFields || []).join(', ') || 'all',
            includeConfidence,
            includePositions,
            // @ts-ignore - MIME type property might not exist
            mimeType: document.mime_type || 'application/octet-stream'
          }
        }
      );
      
      let extractedData: any;
      
      try {
        // @ts-ignore - Type compatibility issue between AI SDK versions and PostHog wrapper
        const result = await generateObject({
          model: observableModel,
          schema: z.record(z.any()),
          messages: [
            {
              role: "system",
              content: contextualSystemInstructions
            },
            {
              role: "user",
              content: [
                // @ts-ignore - MIME type property might not exist
                { type: "text", text: `${enhancedPrompt}\n\nThe document is provided as a base64 encoded file with MIME type: ${document.mime_type || 'application/octet-stream'}` },
                // @ts-ignore - MIME type property might not exist
                { type: "file", data: Buffer.from(fileBase64, 'base64'), mimeType: document.mime_type || 'application/octet-stream' }
              ]
            }
          ]
        });
        
        // Process results
        const rawExtractedData = result.object;
        extractedData = filterExtractedData(rawExtractedData, requestedFields);
        
      } catch (structuredError) {
        // Handle specific error types and fall back to text generation if needed
        const errorMessage = structuredError instanceof Error ? structuredError.message : String(structuredError);
        
        // Check for permission errors
        if (errorMessage.includes("Permission") && errorMessage.includes("denied")) {
          console.error("Vertex AI permission error:", errorMessage);
          
          // Update job with error
          await supabase
            .from('extraction_jobs')
            .update({
              status: "failed",
              error_message: `Vertex AI permission error: ${errorMessage}. Please check service account permissions.`
            })
            .eq('id', extractionJob.id);
            
          throw new Error(`Vertex AI permission error: ${errorMessage}. Please ensure the service account has 'roles/aiplatform.user' role.`);
        }
        
        // Fall back to text generation with PostHog tracing
        console.warn("Structured generation failed, falling back to text generation:", structuredError);
        
        // @ts-ignore - Type compatibility issue with PostHog wrapper
        const textResult = await generateText({
          model: observableModel,
          messages: [
            {
              role: "system",
              content: contextualSystemInstructions
            },
            {
              role: "user",
              content: [
                // @ts-ignore - MIME type property might not exist
                { type: "text", text: `${enhancedPrompt}\n\nThe document is provided as a base64 encoded file with MIME type: ${document.mime_type || 'application/octet-stream'}` },
                // @ts-ignore - MIME type property might not exist
                { type: "file", data: Buffer.from(fileBase64, 'base64'), mimeType: document.mime_type || 'application/octet-stream' }
              ]
            }
          ]
        });
        
        // Try to parse JSON from the text response
        try {
          const cleanedResponse = textResult.text
            .replace(/^```json\s*/, '')
            .replace(/^```\s*/, '')
            .replace(/```\s*$/, '')
            .trim();
            
          const rawData = JSON.parse(cleanedResponse);
          extractedData = filterExtractedData(rawData, requestedFields);
        } catch (parseError) {
          extractedData = { raw_text: textResult.text };
        }
      }
      
      // Save extraction data and update job status
      // @ts-ignore - Table structure might differ
      const { data: extractedDataRecord, error: extractionDataError } = await supabase
        .from('extracted_data')
        .insert({
          extraction_job_id: extractionJob.id,
          document_id: documentId,
          user_id: userId,
          data: extractedData,
        })
        .select()
        .single();
      
      if (extractionDataError) {
        throw new Error(`Failed to save extracted data: ${extractionDataError.message}`);
      }
      
      // Update job status
      const { data: updatedJob, error: updateError } = await supabase
        .from('extraction_jobs')
        .update({
          status: "completed",
          updated_at: new Date().toISOString()
        })
        .eq('id', extractionJob.id)
        .select()
        .single();
      
      if (updateError) {
        console.error("Failed to update extraction job:", updateError);
      }
      
      // Update document status
      await supabase
        .from('documents')
        .update({
          status: "completed",
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId);

      // Update usage *only after success* and use the *actual page count*,
      // *unless* invoked by the batch processor (which handles its own increments)
      if (!invokedByBatchProcessor) {
        await incrementPagesProcessedAction(userId, actualPageCount);
      }

      // Track success event (in addition to automatic tracing from PostHog)
      await trackServerEvent("extraction_completed", userId, {
        documentId,
        extractionJobId: extractionJob.id,
        tier,
        traceId,
        pageCount: actualPageCount // Use the correct page count here too
      });

      // Revalidate paths
      revalidatePath(`/dashboard/documents/${documentId}`);
      revalidatePath("/dashboard/documents");
      revalidatePath("/dashboard/metrics");
      
      return {
        isSuccess: true,
        message: "Document extraction completed successfully",
        data: extractedData
      };
      
    } catch (aiError: unknown) {
      // Handle AI extraction error - PostHog tracing already captures errors
      const errorMessage = aiError instanceof Error ? aiError.message : String(aiError);
      console.error("AI extraction error:", errorMessage);
      
      // Update job status
      if (extractionJob) {
        await supabase
          .from('extraction_jobs')
          .update({
            status: "failed",
            error_message: `AI extraction failed: ${errorMessage}`
          })
          .eq('id', extractionJob.id);
      }
        
      // Track error event (in addition to automatic tracing from PostHog)
      await trackServerEvent("extraction_failed", userId, {
        documentId,
        extractionJobId: extractionJob?.id,
        error: errorMessage,
        traceId,
        tier
      });
      
      return {
        isSuccess: false,
        message: `AI extraction failed: ${errorMessage}`
      };
    }
  } catch (error) {
    // Generic error handling
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
 * Action to extract text from a document with PostHog LLM tracing
 */
export async function extractTextAction(
  documentId: string,
  extractionPrompt?: string
): Promise<ActionState<{ text: string }>> {
  try {
    // Authentication check
    const userId = await getCurrentUser();
    if (!userId) {
      return { isSuccess: false, message: "User not authenticated" };
    }
    
    // Generate trace ID for tracking
    const traceId = randomUUID();
    
    // Retrieve document
    const supabase = await createServerClient();
    // @ts-ignore - Potential schema mismatch
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single();
      
    if (docError || !document) {
      return {
        isSuccess: false,
        message: "Document not found or access denied"
      };
    }
    
    // Get User Subscription Data & Tier
    const subscriptionResult = await getUserSubscriptionDataKVAction();
    if (!subscriptionResult.isSuccess) {
      return {
        isSuccess: false,
        message: "Failed to retrieve user subscription data"
      };
    }
    
    // Determine tier based on subscription status and planId
    let tier: SubscriptionTier = "starter";
    if (subscriptionResult.data.status === 'active' && subscriptionResult.data.planId) {
      tier = subscriptionResult.data.planId as SubscriptionTier;
    }
    tier = validateTier(tier);
    
    // Get document file
    // @ts-ignore - Potential storage path property issue
    const { data: fileData, error: fileError } = await supabase.storage
      .from('documents')
      .download(document.storage_path);
      
    if (fileError || !fileData) {
      return {
        isSuccess: false,
        message: `Failed to download document: ${fileError?.message || "Unknown error"}`
      };
    }
    
    // Prepare for AI processing
    const arrayBuffer = await fileData.arrayBuffer();
    const fileBase64 = Buffer.from(arrayBuffer).toString('base64');
    
    // Text-specific prompt
    const textPrompt = extractionPrompt || "Extract all text content from this document.";
    
    try {
      // Get base model
      const baseModel = getVertexStructuredModel(VERTEX_MODELS.GEMINI_2_0_FLASH);
      
      // Wrap with PostHog tracing
      // @ts-ignore - Type incompatibility between AI SDK and PostHog wrapper
      const observableModel = withTracing(
        baseModel as any,
        phClient,
        {
          posthogDistinctId: userId,
          posthogTraceId: traceId,
          posthogProperties: {
            documentId: documentId,
            actionName: "extractTextAction",
            promptUsed: textPrompt,
            tier: tier,
            // @ts-ignore - MIME type property might not exist
            mimeType: document.mime_type || 'application/octet-stream'
          }
        }
      );
      
      // Generate text with wrapped model
      // @ts-ignore - Type compatibility issue with PostHog wrapper
      const textResult = await generateText({
        model: observableModel,
        messages: [
          {
            role: "user",
            content: [
              // @ts-ignore - MIME type property might not exist
              { type: "text", text: `${textPrompt}\n\nThe document is provided as a base64 encoded file with MIME type: ${document.mime_type || 'application/octet-stream'}` },
              // @ts-ignore - MIME type property might not exist
              { type: "file", data: Buffer.from(fileBase64, 'base64'), mimeType: document.mime_type || 'application/octet-stream' }
            ]
          }
        ]
      });
      
      // Update usage
      await incrementPagesProcessedAction(userId, 1);
      
      // Track success (in addition to PostHog automatic tracing)
      await trackServerEvent("text_extraction_completed", userId, {
        documentId,
        traceId,
        tier
      });
      
      // Return extracted text
      return {
        isSuccess: true,
        message: "Text extraction completed successfully",
        data: { text: textResult.text }
      };
      
    } catch (aiError: unknown) {
      // Error is automatically captured by PostHog tracing
      const errorMessage = aiError instanceof Error ? aiError.message : String(aiError);
      console.error("AI text extraction error:", errorMessage);
      
      // Track error event (in addition to automatic tracing from PostHog)
      await trackServerEvent("text_extraction_failed", userId, {
        documentId,
        error: errorMessage,
        traceId,
        tier
      });
      
      return {
        isSuccess: false,
        message: `AI text extraction failed: ${errorMessage}`
      };
    }
    
  } catch (error) {
    console.error("Text extraction error:", error);
    return {
      isSuccess: false,
      message: `Text extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`
    };
  }
}

/**
 * Action to extract invoice data from a document
 * This is a specialized version of extractDocumentDataAction specifically for invoices.
 * It calls the main action, ensuring usage is incremented (invokedByBatchProcessor defaults to false).
 */
export async function extractInvoiceDataAction(
  documentId: string,
  extractionPrompt?: string
): Promise<ActionState<any>> {
  // Use the generic extraction with invoice-specific settings
  return extractDocumentDataAction({ // invokedByBatchProcessor defaults to false
    documentId,
    extractionPrompt: extractionPrompt || getDefaultPrompt("invoice"),
    includeConfidence: true,
    includePositions: false,
  });
}

/**
 * Action to extract resume data from a document
 * This is a specialized version of extractDocumentDataAction specifically for resumes.
 * It calls the main action, ensuring usage is incremented (invokedByBatchProcessor defaults to false).
 */
export async function extractResumeDataAction(
  documentId: string,
  extractionPrompt?: string
): Promise<ActionState<any>> {
  // Use the generic extraction with resume-specific settings
  return extractDocumentDataAction({ // invokedByBatchProcessor defaults to false
    documentId,
    extractionPrompt: extractionPrompt || getDefaultPrompt("resume"),
    includeConfidence: true,
    includePositions: false,
  });
}

/**
 * Action to extract receipt data from a document
 * This is a specialized version of extractDocumentDataAction specifically for receipts.
 * It calls the main action, ensuring usage is incremented (invokedByBatchProcessor defaults to false).
 */
export async function extractReceiptDataAction(
  documentId: string,
  extractionPrompt?: string
): Promise<ActionState<any>> {
  // Use the generic extraction with receipt-specific settings
  return extractDocumentDataAction({ // invokedByBatchProcessor defaults to false
    documentId,
    extractionPrompt: extractionPrompt || getDefaultPrompt("receipt"),
    includeConfidence: true,
    includePositions: false,
  });
}

/**
 * Action to extract form data from a document
 * This is a specialized version of extractDocumentDataAction specifically for forms.
 * It calls the main action, ensuring usage is incremented (invokedByBatchProcessor defaults to false).
 */
export async function extractFormDataAction(
  documentId: string,
  extractionPrompt?: string
): Promise<ActionState<any>> {
  // Use the generic extraction with form-specific settings
  return extractDocumentDataAction({ // invokedByBatchProcessor defaults to false
    documentId,
    extractionPrompt: extractionPrompt || getDefaultPrompt("form"),
    includeConfidence: true,
    includePositions: true, // Include positions for form fields
  });
}
