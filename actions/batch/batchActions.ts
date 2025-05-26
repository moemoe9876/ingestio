"use server";

import { ZodError } from "zod";
// @ts-ignore - Suppress persistent type error for pdf-lib
import { and, asc, count, desc, eq, ilike } from 'drizzle-orm';
import { revalidatePath } from 'next/cache'; // Added for revalidation
import { PDFDocument } from 'pdf-lib';
import { v4 as uuidv4 } from 'uuid';

import { checkUserQuotaAction } from "@/actions/db/user-usage-actions"; // Assuming getUserSubscriptionDataKVAction exists or is similar to getProfileByUserIdAction for tier data
import { getUserSubscriptionDataKVAction } from "@/actions/stripe/sync-actions"; // Added for Recommendation 2
import { db } from "@/db/db";
import { documentsTable } from "@/db/schema/documents-schema";
import { extractionBatchesTable } from "@/db/schema/extraction-batches-schema";
import { trackServerEvent } from "@/lib/analytics/server"; // Corrected import path
import { getCurrentUser } from "@/lib/auth/utils";
import { subscriptionPlans } from "@/lib/config/subscription-plans";
import { checkRateLimit, SubscriptionTier, validateTier } from "@/lib/rate-limiting/limiter"; // Added validateTier and SubscriptionTier
import { uploadToStorage } from "@/lib/supabase/storage-utils";
import type { ActionState } from "@/types/server-action-types";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

// Define a type for the successful data payload
type CreateBatchUploadSuccessData = {
  batchId: string; 
};

// Helper function to process and prepare a single document
async function _processAndPrepareDocument(
  file: File,
  userId: string,
  currentBatchId: string,
  promptStrategy: 'global' | 'per_document' | 'auto',
  perDocPromptsMap: Record<string, string>,
  getPageCountFunc: (file: File, fileArrayBuffer?: ArrayBuffer) => Promise<number> // Pass getPageCount as an argument
): Promise<{ success: boolean; dbData?: typeof documentsTable.$inferInsert; pageCount?: number; error?: string }> {
  const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const uniqueFilename = `${uuidv4()}-${sanitizedFilename}`;
  const storagePath = `batches/${userId}/${currentBatchId}/${uniqueFilename}`;
  let fileNodeBuffer: Buffer;
  let pageCountValue: number;

  try {
    const fileArrayBuffer = await file.arrayBuffer();
    fileNodeBuffer = Buffer.from(fileArrayBuffer);
    pageCountValue = await getPageCountFunc(file, fileArrayBuffer);
  } catch (countError: any) {
    console.error(`Failed to get page count for ${file.name}:`, countError.message);
    return { success: false, error: `Page count failed for ${file.name}: ${countError.message}` };
  }

  try {
    const uploadResult = await uploadToStorage(
      process.env.DOCUMENTS_BUCKET!,
      storagePath,
      fileNodeBuffer,
      file.type
    );

    if (!uploadResult.success || !uploadResult.data?.path) {
      return { success: false, error: `Upload failed for ${file.name}: ${uploadResult.error || "Missing path"}`, pageCount: pageCountValue };
    }

    let docPrompt: string | null = null;
    if (promptStrategy === 'per_document') {
      docPrompt = perDocPromptsMap[file.name] || null;
      if (!docPrompt) {
        return { success: false, error: `Missing prompt for ${file.name} (per-document strategy)`, pageCount: pageCountValue };
      }
    }
    // For 'global' and 'auto' strategies, docPrompt remains null at this stage.
    // The global prompt is on the batch record, and auto-prompt is resolved by the background processor.

    return {
      success: true,
      dbData: {
        userId: userId,
        batchId: currentBatchId,
        originalFilename: file.name,
        storagePath: uploadResult.data.path,
        mimeType: file.type,
        fileSize: file.size,
        pageCount: pageCountValue,
        extractionPrompt: docPrompt,
        status: 'uploaded',
      },
      pageCount: pageCountValue,
    };

  } catch (fileProcessingError: any) {
     return { success: false, error: `File processing error for ${file.name}: ${fileProcessingError.message}`, pageCount: pageCountValue };
  }
}

export async function createBatchUploadAction(
  formData: FormData
): Promise<ActionState<CreateBatchUploadSuccessData | null>> {
  try {
    // 1. Authentication
    const userId = await getCurrentUser();
    // Removed explicit error check for userId as getCurrentUser throws if not found

    // 2. FormData Parsing
    const files = formData.getAll("files") as File[];
    const batchName = (formData.get("batchName") as string) || null;
    const promptStrategy = formData.get("promptStrategy") as 'global' | 'per_document' | 'auto';
    const globalPrompt = formData.get("globalPrompt") as string | null;
    const perDocPromptsString = formData.get("perDocPrompts") as string | null;

    let perDocPromptsMap: Record<string, string> = {};
    if (promptStrategy === 'per_document' && perDocPromptsString) {
      try {
        perDocPromptsMap = JSON.parse(perDocPromptsString);
      } catch (error) {
        return {
          isSuccess: false,
          message: "Invalid format for per-document prompts.",
          error: "VALIDATION_ERROR_PER_DOC_PROMPT_FORMAT",
        };
      }
    }

    // 3. Subscription & Tier Validation
    // const subscriptionData = await getUserSubscriptionDataKVAction(userId); // Ideal, but action not fully defined in context
    // Using getProfileByUserIdAction as a substitute to get the tier (membership)
    // const profileResult = await getProfileByUserIdAction(userId);
    // if (!profileResult.isSuccess || !profileResult.data) {
    //   return {
    //     isSuccess: false,
    //     message: profileResult.message || "Failed to fetch user profile for tier validation.",
    //     error: profileResult.error || "PROFILE_FETCH_FAILED_TIER_VALIDATION",
    //   };
    // }
    // const userTier = validateTier(profileResult.data.membership) as SubscriptionTier;

    const subscriptionResult = await getUserSubscriptionDataKVAction(userId);
    if (!subscriptionResult.isSuccess || !subscriptionResult.data) { // Ensure data exists
      return {
        isSuccess: false,
        message: subscriptionResult.message || "Failed to fetch user subscription data for tier validation.",
        error: "SUBSCRIPTION_FETCH_FAILED_TIER_VALIDATION", // Use specific error from recommendation
      };
    }

    let userTier: SubscriptionTier = "starter"; // Default to starter
    const subData = subscriptionResult.data;

    if (subData.status === 'active' && subData.planId) {
        userTier = validateTier(subData.planId) as SubscriptionTier;
    } else if (subData.status === 'trialing' && subData.planId) {
        // Also consider 'trialing' as an active subscription for tier benefits
        userTier = validateTier(subData.planId) as SubscriptionTier;
    }
    // If status is 'none', 'canceled', 'past_due', etc., userTier remains 'starter'

    if (userTier === "starter") {
      return {
        isSuccess: false,
        message: "Batch processing is not available for the Starter tier.",
        error: "TIER_LIMIT_STARTER_BATCH_DENIED",
      };
    }

    const planDetails = subscriptionPlans[userTier];
    if (!planDetails) {
        return { isSuccess: false, message: "Invalid subscription plan details.", error: "INVALID_PLAN_DETAILS" };
    }
    const batchFileLimit = planDetails.batchProcessingLimit;

    if (files.length === 0) {
      return {
        isSuccess: false,
        message: "At least one file is required for batch upload.",
        error: "VALIDATION_ERROR_NO_FILES",
      };
    }

    if (files.length > batchFileLimit) {
      return {
        isSuccess: false,
        message: `You exceeded the file limit for your tier (${batchFileLimit} files for ${userTier} tier).`,
        error: "TIER_LIMIT_FILE_COUNT_EXCEEDED",
      };
    }

    // 4. Prompt Validation
    if (promptStrategy === 'global' && (!globalPrompt || globalPrompt.trim() === "")) {
      return {
        isSuccess: false,
        message: "Global prompt is required and cannot be empty for the 'global' strategy.",
        error: "VALIDATION_ERROR_GLOBAL_PROMPT_EMPTY",
      };
    }
    if (promptStrategy === 'per_document' && Object.keys(perDocPromptsMap).length === 0 && files.length > 0) {
        // This check might be too strict if some files are okay without prompts,
        // a more granular check is inside the loop.
        // For now, ensure the map isn't empty if strategy is per_document and files exist.
    }


    // 5. Server-Side File Validation
    const invalidFiles: { name: string, reason: string }[] = [];
    for (const file of files) {
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        invalidFiles.push({ name: file.name, reason: `Invalid file type: ${file.type}. Allowed: PDF, JPG, PNG.` });
        continue;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        invalidFiles.push({ name: file.name, reason: `File size exceeds ${MAX_FILE_SIZE_BYTES / (1024*1024)}MB limit.` });
      }
    }
    if (invalidFiles.length > 0) {
      return {
        isSuccess: false,
        message: "Some files are invalid: " + invalidFiles.map(f => `${f.name} (${f.reason})`).join("; "),
        error: "VALIDATION_ERROR_INVALID_FILES",
      };
    }

    // 6. Rate Limiting
    const rateLimitResult = await checkRateLimit(userId, userTier, 'batch_upload');
    if (!rateLimitResult.success) {
      return {
        isSuccess: false,
        message: (rateLimitResult as any).message || "Rate limit exceeded for batch uploads.",
        error: "RATE_LIMIT_EXCEEDED",
      };
    }

    // 7. Preliminary Quota Check
    const quotaCheckResult = await checkUserQuotaAction(userId, files.length);
    if (!quotaCheckResult.isSuccess) {
        // Using the `in` operator as a type guard, which is a standard TypeScript feature.
        // This explicitly checks for the presence of the `error` property and its type.
        let determinedErrorMessage = "QUOTA_CHECK_FAILED_PRELIMINARY"; // Default error code

        if (('error' in quotaCheckResult) &&        // Type guard: ensures 'error' property exists
            quotaCheckResult.error &&                 // Checks if the error message is truthy (not null, undefined, or empty string)
            typeof quotaCheckResult.error === 'string') { // Ensures it's a string
            determinedErrorMessage = quotaCheckResult.error;
        }

        return {
            isSuccess: false,
            message: quotaCheckResult.message || "Quota check failed.",
            error: determinedErrorMessage,
        };
    }
    // If isSuccess is true, quotaCheckResult.data will be used.
    // The check should be specifically on quotaCheckResult.data.hasQuota after confirming isSuccess is true.
    if (!quotaCheckResult.data.hasQuota) {
        return {
            isSuccess: false,
            message: quotaCheckResult.message || "Insufficient page quota for this batch (preliminary check).",
            error: "INSUFFICIENT_QUOTA_PRELIMINARY",
        };
    }

    // 8. Database Transaction
    let batchId: string | null = null;
    let successfulUploads = 0;
    let filesFailedInitialProcessing = 0; // Renamed for clarity
    let totalBatchPages = 0;

    try {
      batchId = await db.transaction(async (tx) => {
        const [newBatch] = await tx
          .insert(extractionBatchesTable)
          .values({
            userId: userId,
            name: batchName,
            promptStrategy: promptStrategy,
            extractionPrompt: promptStrategy === 'global' ? globalPrompt : null,
            status: 'pending_upload',
            documentCount: files.length,
            completedCount: 0,
            failedCount: 0,
            totalPages: 0,
          })
          .returning({ id: extractionBatchesTable.id });

        if (!newBatch?.id) {
          throw new Error("Failed to create batch record in transaction.");
        }
        const currentBatchId = newBatch.id;

        const documentInsertData: typeof documentsTable.$inferInsert[] = [];

        for (const file of files) {
          const processResult = await _processAndPrepareDocument(
            file,
            userId,
            currentBatchId,
            promptStrategy,
            perDocPromptsMap,
            getPageCount // Pass the existing getPageCount function
          );

          if (processResult.success && processResult.dbData && processResult.pageCount !== undefined) {
            documentInsertData.push(processResult.dbData);
            totalBatchPages += processResult.pageCount;
            successfulUploads++;
          } else {
            filesFailedInitialProcessing++;
            console.error(`Skipping file ${file.name} due to error: ${processResult.error}`);
            // If page count was determined before failure, and it's a failure that means the page won't be processed,
            // it should not contribute to totalBatchPages.
            // The current _processAndPrepareDocument adds pageCount to totalBatchPages only on success.
            // If pageCount was returned in processResult even on failure (e.g. upload failed after page count),
            // and if that pageCount was already added to a running total *before* this check,
            // it might need to be subtracted. However, our current flow only adds to totalBatchPages on full success.
          }
        }

        if (successfulUploads > 0) {
           await tx.insert(documentsTable).values(documentInsertData);
        }

        if (successfulUploads === 0 && files.length > 0) {
           await tx
             .update(extractionBatchesTable)
             .set({
               status: 'failed',
               failedCount: files.length,
               updatedAt: new Date(),
             })
             .where(eq(extractionBatchesTable.id, currentBatchId));
           throw new Error(`Batch ${currentBatchId}: All ${files.length} files failed during initial upload/processing stage.`);
        } else {
           await tx
             .update(extractionBatchesTable)
             .set({
               status: 'queued',
               totalPages: totalBatchPages,
               documentCount: successfulUploads,
               failedCount: filesFailedInitialProcessing,
               updatedAt: new Date(),
             })
             .where(eq(extractionBatchesTable.id, currentBatchId));
        }
        return currentBatchId;
      });

      if (!batchId) {
         throw new Error("Batch creation transaction did not return a valid ID.");
      }

      await trackServerEvent('batch_created', userId, {
        batchId: batchId,
        batchName: batchName || 'Untitled Batch',
        fileCount: successfulUploads,
        totalPages: totalBatchPages,
        promptStrategy: promptStrategy,
      });

      revalidatePath('/dashboard/batches');
      revalidatePath('/dashboard/history');

      return {
        isSuccess: true,
        message: `Batch '${batchName || batchId}' created. ${successfulUploads} documents queued. ${filesFailedInitialProcessing > 0 ? `${filesFailedInitialProcessing} files failed initial processing.` : ''}`,
        data: { batchId: batchId },
      };

    } catch (transactionError: any) {
       console.error("Batch creation transaction or post-transaction step failed:", transactionError.message);
       if (batchId) {
           try {
               await db.update(extractionBatchesTable)
                   .set({ status: 'failed', updatedAt: new Date() })
                   .where(eq(extractionBatchesTable.id, batchId));
               console.log(`Marked batch ${batchId} as failed due to error: ${transactionError.message}`);
           } catch (updateError: any) {
               console.error(`Failed to mark batch ${batchId} as failed after error: ${updateError.message}`);
           }
       }
       return {
           isSuccess: false,
           message: transactionError.message || "Failed to create batch due to a server error.",
           error: "TRANSACTION_OR_POST_TRANSACTION_ERROR",
       };
    }

  } catch (error: any) { // Outer catch for setup errors, initial validation, etc.
    console.error("Error creating batch upload:", error.message);
    if (error instanceof ZodError) {
      return {
        isSuccess: false,
        message: "Validation failed: " + error.errors.map((e) => e.message).join(", "),
        error: "ZOD_VALIDATION_ERROR",
      };
    }
    return {
      isSuccess: false,
      message: error.message || "An unexpected error occurred while preparing the batch.",
      error: "BATCH_PREPARATION_FAILED",
    };
  }
}

// Helper function to get page count, now accepts optional buffer
async function getPageCount(file: File, fileArrayBuffer?: ArrayBuffer): Promise<number> {
  if (file.type === 'application/pdf') {
    try {
      const arrayBufferToLoad = fileArrayBuffer || await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBufferToLoad, { ignoreEncryption: true });
      return pdfDoc.getPageCount();
    } catch (error: any) {
      console.error(`Error counting pages for PDF ${file.name}:`, error.message);
      throw new Error(`Failed to process PDF pages for ${file.name}. It might be corrupted or encrypted. Error: ${error.message}`);
    }
  } else if (ALLOWED_MIME_TYPES.includes(file.type) && file.type.startsWith('image/')) {
    return 1;
  } else {
    console.warn(`Unsupported file type for page counting: ${file.type} (${file.name}). Defaulting to 1 page.`);
    return 1; // Default to 1 for other allowed (image) types or if somehow an unallowed type slips through
  }
}
// Batch fetching actions for UI

type FetchBatchesOptions = {
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'name' | 'status';
  sortOrder?: 'asc' | 'desc';
  statusFilter?: string;
  nameFilter?: string;
};

export async function fetchUserBatchListAction(
  options: FetchBatchesOptions = {}
): Promise<ActionState<{ batches: any[], totalCount: number }>> {
  const userId = await getCurrentUser();
  // Removed explicit error check for userId as getCurrentUser throws if not found

  const { 
    page = 1, 
    limit = 10, 
    sortBy = 'createdAt', 
    sortOrder = 'desc', 
    statusFilter,
    nameFilter 
  } = options;

  try {
    const conditions = [eq(extractionBatchesTable.userId, userId)];
    if (statusFilter && statusFilter !== "all") {
      conditions.push(eq(extractionBatchesTable.status, statusFilter as any));
    }
    if (nameFilter) {
      conditions.push(ilike(extractionBatchesTable.name, `%${nameFilter}%`));
    }

    const batchQuery = db
      .select({
        id: extractionBatchesTable.id,
        name: extractionBatchesTable.name,
        status: extractionBatchesTable.status,
        documentCount: extractionBatchesTable.documentCount,
        completedCount: extractionBatchesTable.completedCount,
        failedCount: extractionBatchesTable.failedCount,
        totalPages: extractionBatchesTable.totalPages,
        createdAt: extractionBatchesTable.createdAt,
        completedAt: extractionBatchesTable.completedAt,
      })
      .from(extractionBatchesTable)
      .where(and(...conditions))
      .limit(limit)
      .offset((page - 1) * limit);

    // Apply sorting
    const sortColumn = extractionBatchesTable[sortBy as keyof typeof extractionBatchesTable.$inferSelect];
    if (sortColumn) {
        batchQuery.orderBy(sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn));
    } else {
        // Default sort if sortBy is invalid or not provided
        batchQuery.orderBy(desc(extractionBatchesTable.createdAt));
    }

    const batches = await batchQuery;

    const totalCountResult = await db
      .select({ count: count() })
      .from(extractionBatchesTable)
      .where(and(...conditions));
      
    const totalCount = totalCountResult[0]?.count || 0;

    return { isSuccess: true, data: { batches, totalCount }, message: "Batches fetched successfully." };
  } catch (error: any) {
    console.error("Failed to fetch user batches:", error);
    return { isSuccess: false, message: error.message || "Failed to fetch batches.", error: "DB_FETCH_ERROR" };
  }
}

export async function fetchBatchDetailAction(
  batchId: string
): Promise<ActionState<{ batch: any; documents: any[]; totalDocuments: number }>> {
  const userId = await getCurrentUser();
  // Removed explicit error check for userId as getCurrentUser throws if not found

  if (!batchId) {
    return { isSuccess: false, message: "Batch ID is required.", error: "VALIDATION_ERROR_BATCH_ID_MISSING" };
  }

  try {
    const batchResult = await db
      .select()
      .from(extractionBatchesTable)
      .where(and(eq(extractionBatchesTable.id, batchId), eq(extractionBatchesTable.userId, userId)));

    if (batchResult.length === 0) {
      return { isSuccess: false, message: "Batch not found or access denied.", error: "NOT_FOUND" };
    }
    const batch = batchResult[0];

    // Fetch initial page of documents for this batch
    const documentsResult = await db
      .select()
      .from(documentsTable)
      .where(eq(documentsTable.batchId, batchId))
      .orderBy(desc(documentsTable.createdAt))
      .limit(10); // Initial limit, client can fetch more

    const totalDocumentsResult = await db
      .select({ count: count() })
      .from(documentsTable)
      .where(eq(documentsTable.batchId, batchId));
    
    const totalDocuments = totalDocumentsResult[0]?.count || 0;

    return { 
      isSuccess: true, 
      data: { batch, documents: documentsResult, totalDocuments }, 
      message: "Batch details fetched successfully." 
    };
  } catch (error: any) {
    console.error(`Failed to fetch batch details for ${batchId}:`, error);
    return { 
      isSuccess: false, 
      message: error.message || "Failed to fetch batch details.", 
      error: "DB_FETCH_ERROR" 
    };
  }
}

export async function fetchDocumentsForBatchAction(
  batchId: string,
  options: { 
    page?: number; 
    limit?: number; 
    statusFilter?: string;
    // sortBy?: 'createdAt' | 'originalFilename' | 'status'; // Corrected type for sortBy
    sortBy?: keyof typeof documentsTable.$inferSelect; // More flexible
    sortOrder?: 'asc' | 'desc';
  } = {}
): Promise<ActionState<{ documents: any[]; totalCount: number }>> {
  const userId = await getCurrentUser();
  // Removed explicit error check for userId as getCurrentUser throws if not found

  const { 
    page = 1, 
    limit = 10, 
    statusFilter, 
    sortBy = 'createdAt', 
    sortOrder = 'desc' 
  } = options;

  if (!batchId) {
    return { isSuccess: false, message: "Batch ID is required to fetch documents.", error: "VALIDATION_ERROR_BATCH_ID_MISSING" };
  }

  try {
    // First, verify the user has access to the batch itself
    const batchCheck = await db
      .select({ id: extractionBatchesTable.id })
      .from(extractionBatchesTable)
      .where(and(eq(extractionBatchesTable.id, batchId), eq(extractionBatchesTable.userId, userId)));

    if (batchCheck.length === 0) {
      return { isSuccess: false, message: "Batch not found or access denied.", error: "FORBIDDEN" };
    }

    const conditions = [eq(documentsTable.batchId, batchId)];
    if (statusFilter && statusFilter !== "all") {
      conditions.push(eq(documentsTable.status, statusFilter as any));
    }

    const documentsQuery = db
      .select()
      .from(documentsTable)
      .where(and(...conditions))
      .limit(limit)
      .offset((page - 1) * limit);

    // Apply sorting
    const sortColumn = documentsTable[sortBy as keyof typeof documentsTable.$inferSelect];
    if (sortColumn) {
        documentsQuery.orderBy(sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn));
    } else {
        documentsQuery.orderBy(desc(documentsTable.createdAt)); // Default sort
    }
    
    const documents = await documentsQuery;

    const totalCountResult = await db
      .select({ count: count() })
      .from(documentsTable)
      .where(and(...conditions));
      
    const totalCount = totalCountResult[0]?.count || 0;

    return { isSuccess: true, data: { documents, totalCount }, message: "Documents fetched successfully." };
  } catch (error: any) {
    console.error(`Failed to fetch documents for batch ${batchId}:`, error);
    return { 
      isSuccess: false, 
      message: error.message || "Failed to fetch documents.", 
      error: "DB_FETCH_ERROR" 
    };
  }
}
