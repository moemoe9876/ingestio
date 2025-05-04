"use server";

import { checkUserQuotaAction, incrementPagesProcessedAction } from "@/actions/db/user-usage-actions";
import { getUserSubscriptionDataKVAction } from "@/actions/stripe/sync-actions";
import { getVertexStructuredModel, VERTEX_MODELS } from "@/lib/ai/vertex-client";
import { getPostHogServerClient, trackServerEvent } from "@/lib/analytics/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { mergeSegmentResults, segmentDocument, shouldSegmentDocument } from "@/lib/preprocessing/document-segmentation";
import { checkRateLimit, createRateLimiter, isBatchSizeAllowed, SubscriptionTier, validateTier } from "@/lib/rate-limiting/limiter";
import { createServerClient } from "@/lib/supabase/server";
import { enhancePrompt, SYSTEM_INSTRUCTIONS } from "@/prompts/extraction";
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
  includePositions: z.boolean().optional().default(true),
  useSegmentation: z.boolean().optional().default(true), // New option to enable/disable segmentation
  segmentationThreshold: z.number().optional().default(10), // Page threshold to trigger segmentation
  maxPagesPerSegment: z.number().optional().default(10), // Maximum pages per segment
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
    
    // Use the parsed input with our defaults
    const { 
      documentId, 
      extractionPrompt,
      useSegmentation,
      segmentationThreshold,
      maxPagesPerSegment
    } = parsedInput.data;
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
          useSegmentation,
          segmentationThreshold,
          maxPagesPerSegment
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

    // Prepare user prompt
    const userPromptText = extractionPrompt || "Extract all relevant information from this document.";
    const enhancedPrompt = enhancePrompt(
      userPromptText, 
      includeConfidence, 
      includePositions
    );
    
    // Prepare system instructions
    const contextualSystemInstructions = `${SYSTEM_INSTRUCTIONS}\nAnalyze the following document and extract the requested information.`;
    
    // Check if we should segment the document based on page count
    const shouldSegment = useSegmentation && shouldSegmentDocument(actualPageCount, segmentationThreshold);
    
    let extractedData: any;
    
    if (shouldSegment) {
      // Document segmentation path
      console.log(`Segmenting document ${documentId} with ${actualPageCount} pages`);
      
      // 1. Segment the document into smaller chunks
      const segments = await segmentDocument(documentId, actualPageCount, {
        maxPagesPerSegment: maxPagesPerSegment,
        useLogicalBreaks: false, // Default to simple page-based segmentation for now
      });
      
      // 2. Process each segment sequentially (could be parallelized in future)
      const segmentResults: any[] = [];
      
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        console.log(`Processing segment ${i + 1}/${segments.length}: pages ${segment.startPage}-${segment.endPage}`);
        
        // Download only the relevant segment of the document file
        // Note: This is a simplified approach - in a full implementation, we would extract specific pages
        // @ts-ignore - Potential storage path property issue
        const { data: fileData, error: fileError } = await supabase.storage
          .from('documents')
          .download(document.storage_path);
          
        if (fileError || !fileData) {
          // Log error but continue with other segments if possible
          console.error(`Failed to download segment ${i + 1}: ${fileError?.message || "Unknown error"}`);
          continue;
        }
        
        // Prepare segment-specific prompt with page range information
        const segmentPrompt = `${enhancedPrompt}\n\nFocus on extracting information from pages ${segment.startPage} to ${segment.endPage} of the document.`;
        
        // Process this segment
        const segmentResult = await processDocumentSegment(
          userId,
          fileData,
          segmentPrompt,
          contextualSystemInstructions,
          document.mime_type || 'application/octet-stream',
          traceId,
          tier,
          documentId,
          extractionJob.id
        );
        
        if (segmentResult) {
          segmentResults.push(segmentResult);
        }
      }
      
      // 3. Merge results from all segments
      if (segmentResults.length > 0) {
        extractedData = mergeSegmentResults(segmentResults);
      } else {
        throw new Error("All segments failed to process");
      }
    } else {
      // Standard (non-segmented) document processing path
      
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
      
      // Process the entire document as a single segment
      extractedData = await processDocumentSegment(
        userId,
        fileData,
        enhancedPrompt,
        contextualSystemInstructions,
        document.mime_type || 'application/octet-stream',
        traceId,
        tier,
        documentId,
        extractionJob.id
      );
      
      if (!extractedData) {
        throw new Error("Document processing failed");
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
      tier,
      pageCount: actualPageCount,
      segmented: shouldSegment,
      traceId
    });

    // Revalidate paths
    revalidatePath(`/dashboard/documents/${documentId}`);
    revalidatePath("/dashboard/documents");
    revalidatePath("/dashboard/metrics");

    // Return the extracted data
    return {
      isSuccess: true,
      message: "Document extraction completed successfully",
      data: extractedData,
    };
  } catch (error) {
    console.error("Error in extractDocumentDataAction:", error);
    
    // Return a friendly error message to the client
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "An unexpected error occurred during extraction"
    };
  }
}

/**
 * Helper function to process a document segment with the AI model
 * 
 * @param userId - User ID for tracking
 * @param fileData - Blob of the document data
 * @param prompt - Enhanced prompt for extraction
 * @param systemInstructions - System instructions for the AI
 * @param mimeType - Document MIME type
 * @param traceId - Trace ID for PostHog tracking
 * @param tier - User subscription tier
 * @param documentId - Document ID
 * @param extractionJobId - Extraction job ID
 * @returns The extracted data or null if failed
 */
async function processDocumentSegment(
  userId: string,
  fileData: Blob,
  prompt: string,
  systemInstructions: string,
  mimeType: string,
  traceId: string,
  tier: SubscriptionTier,
  documentId: string,
  extractionJobId: string
): Promise<any | null> {
  try {
    // Prepare for AI processing
    const arrayBuffer = await fileData.arrayBuffer();
    const fileBase64 = Buffer.from(arrayBuffer).toString('base64');
    
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
          actionName: "processDocumentSegment",
          promptUsed: prompt,
          extractionJobId: extractionJobId,
          tier: tier,
          mimeType: mimeType
        }
      }
    );
    
    let segmentData: any;
    
    try {
      // @ts-ignore - Type compatibility issue between AI SDK versions and PostHog wrapper
      const result = await generateObject({
        model: observableModel,
        messages: [
          {
            role: "system",
            content: systemInstructions
          },
          {
            role: "user",
            content: [
              { type: "text", text: `${prompt}\n\nThe document is provided as a base64 encoded file with MIME type: ${mimeType}` },
              { type: "file", data: Buffer.from(fileBase64, 'base64'), mimeType: mimeType }
            ]
          }
        ],
        schema: z.record(z.any())
      });
      
      // Process results
      segmentData = result.object;
    } catch (structuredError) {
      // Handle specific error types and fall back to text generation if needed
      const errorMessage = structuredError instanceof Error ? structuredError.message : String(structuredError);
      
      // Check for permission errors
      if (errorMessage.includes('permission') || errorMessage.includes('access denied')) {
        throw new Error(`AI model access denied: ${errorMessage}`);
      }
      
      // Fall back to text generation with PostHog tracing
      console.warn("Structured generation failed, falling back to text generation:", structuredError);
      
      // @ts-ignore - Type compatibility issue with PostHog wrapper
      const textResult = await generateText({
        model: observableModel,
        messages: [
          {
            role: "system",
            content: systemInstructions
          },
          {
            role: "user",
            content: [
              { type: "text", text: `${prompt}\n\nThe document is provided as a base64 encoded file with MIME type: ${mimeType}` },
              { type: "file", data: Buffer.from(fileBase64, 'base64'), mimeType: mimeType }
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
        segmentData = rawData;
      } catch (parseError) {
        segmentData = { raw_text: textResult.text };
      }
    }
    
    return segmentData;
  } catch (error) {
    console.error("Error processing document segment:", error);
    return null;
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
  return extractDocumentDataAction({
    documentId,
    extractionPrompt: extractionPrompt || "Extract all invoice information including vendor details, invoice number, date, amount, line items, and payment terms.",
    includeConfidence: true,
    includePositions: false,
    useSegmentation: true,
    segmentationThreshold: 10,
    maxPagesPerSegment: 10
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
  return extractDocumentDataAction({
    documentId,
    extractionPrompt: extractionPrompt || "Extract all resume information including personal details, education, work experience, skills, and certifications.",
    includeConfidence: true,
    includePositions: false,
    useSegmentation: true,
    segmentationThreshold: 10,
    maxPagesPerSegment: 10
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
  return extractDocumentDataAction({
    documentId,
    extractionPrompt: extractionPrompt || "Extract all receipt information including store name, date, time, items purchased, prices, subtotal, tax, and total amount.",
    includeConfidence: true,
    includePositions: false,
    useSegmentation: true,
    segmentationThreshold: 10,
    maxPagesPerSegment: 10
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
  return extractDocumentDataAction({
    documentId,
    extractionPrompt: extractionPrompt || "Extract all form fields and their values, including any checkbox or radio button selections.",
    includeConfidence: true,
    includePositions: true,
    useSegmentation: true,
    segmentationThreshold: 10,
    maxPagesPerSegment: 10
  });
}
