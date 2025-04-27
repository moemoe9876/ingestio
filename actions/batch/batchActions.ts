"use server";

import { ZodError } from "zod";
// @ts-ignore - Suppress persistent type error for pdf-lib
import { PDFDocument } from 'pdf-lib';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';

import { getProfileByUserIdAction } from "@/actions/db/profiles-actions";
import { checkUserQuotaAction } from "@/actions/db/user-usage-actions";
import { db } from "@/db/db"; // Add db import
import { extractionBatchesTable } from "@/db/schema/extraction-batches-schema"; // Add batch schema import
import { documentsTable } from "@/db/schema/documents-schema"; // Add document schema import
import { getCurrentUser } from "@/lib/auth-utils";
import { subscriptionPlans } from "@/lib/config/subscription-plans";
import { uploadToStorage } from "@/lib/supabase/storage-utils"; // Add storage import
import { trackServerEvent } from "@/lib/analytics/server"; // Add analytics import
import { checkRateLimit } from "@/lib/rate-limiting/limiter";
import type { ActionState } from "@/types/server-action-types";


const BATCH_PROCESSING_LIMIT_PLUS = subscriptionPlans["plus"]?.batchProcessingLimit || 25;
const BATCH_PROCESSING_LIMIT_GROWTH = subscriptionPlans["growth"]?.batchProcessingLimit || 100;

// Define a type for the successful data payload (adjust as needed)
type CreateBatchUploadSuccessData = {
  batchId: string;
};

export async function createBatchUploadAction(
  formData: FormData
): Promise<ActionState<CreateBatchUploadSuccessData | null>> {
  try {
    // 1. Get User ID
    const userId = await getCurrentUser();
    if (!userId) {
      return {
        isSuccess: false,
        message: "Authentication failed. Please log in.",
        error: "AUTH_ERROR",
      };
    }

    // 2. Extract Data from FormData
    const files = formData.getAll("files") as File[];
    const batchName = (formData.get("batchName") as string) || null; // Optional
    const extractionPrompt = formData.get("extractionPrompt") as string;

    // 3. Basic Validation
    if (!extractionPrompt) {
      return {
        isSuccess: false,
        message: "Extraction prompt is required.",
        error: "VALIDATION_ERROR_PROMPT_REQUIRED",
      };
    }

    if (files.length === 0) {
      return {
        isSuccess: false,
        message: "At least one file is required for batch upload.",
        error: "VALIDATION_ERROR_NO_FILES",
      };
    }

    // 4. Fetch User Profile & Validate Tier
    const profileResult = await getProfileByUserIdAction(userId);
    if (!profileResult.isSuccess || !profileResult.data) {
      // Handle profile fetch failure or missing data
      return {
        isSuccess: false,
        message: profileResult.message || "Failed to fetch user profile.",
        error: profileResult.error || "PROFILE_FETCH_FAILED",
      };
    }
    const userProfile = profileResult.data; // Access the actual profile data

    if (userProfile.membership === "starter") {
      return {
        isSuccess: false,
        message: "Batch processing is not available for your current Starter tier.",
        error: "TIER_LIMIT_STARTER",
      };
    }

    // 5. Validate File Count Against Tier Limit
    const maxFiles = userProfile.membership === "plus"
      ? BATCH_PROCESSING_LIMIT_PLUS
      : BATCH_PROCESSING_LIMIT_GROWTH;

    if (files.length > maxFiles) {
      return {
        isSuccess: false,
        message: `You exceeded the file limit for your tier (${maxFiles} files).`,
        error: "TIER_LIMIT_FILE_COUNT",
      };
    }

    // --- Step 8.2.2: Implement Quota & Rate Limiting checks ---

    // Rate Limit Check
    // Rate Limit Check
    // Assuming checkRateLimit returns { success: boolean, message?: string }
    const rateLimitResult = await checkRateLimit(userId, userProfile.membership, 'batch_upload');
    if (!rateLimitResult.success) {
      return {
        isSuccess: false,
        // Provide a default message if rateLimitResult.message is not available
        message: (rateLimitResult as any).message || "Rate limit exceeded for batch uploads.",
        error: "RATE_LIMIT_EXCEEDED",
      };
    }

    // Quota Check (using file count as initial estimate)
    const quotaCheckResult = await checkUserQuotaAction(userId, files.length);
    if (!quotaCheckResult.isSuccess) {
        return {
            isSuccess: false,
            message: quotaCheckResult.message || "Quota check failed.",
            // Rely only on message if isSuccess is false, as 'error' might not exist
            error: "QUOTA_CHECK_FAILED",
        };
    }
    // Use 'hasQuota' based on the TS error feedback
    if (!quotaCheckResult.data?.hasQuota) {
        return {
            isSuccess: false,
            // Use the message from the successful result if available
            message: quotaCheckResult.message || "Insufficient page quota for this batch size.",
            error: "INSUFFICIENT_QUOTA",
        };
    }

    // --- Step 8.2.3: Implement File Processing & DB Transaction ---
    let batchId: string | null = null;
    let filesProcessedSuccessfully = 0;
    let filesFailedProcessing = 0;

    try {
      batchId = await db.transaction(async (tx) => {
        // Create initial batch record
        const [newBatch] = await tx
          .insert(extractionBatchesTable)
          .values({
            userId: userId,
            name: batchName,
            extractionPrompt: extractionPrompt,
            status: 'pending_upload', // Initial status
            documentCount: files.length, // Total files intended
            completedCount: 0,
            failedCount: 0,
            totalPages: 0, // Will be updated later
          })
          .returning({ id: extractionBatchesTable.id });

        if (!newBatch?.id) {
          throw new Error("Failed to create batch record.");
        }
        const currentBatchId = newBatch.id;

        let totalBatchPages = 0;
        const documentInsertPromises = [];

        for (const file of files) {
          const uniqueFilename = `${uuidv4()}-${file.name}`;
          const storagePath = `batches/${userId}/${currentBatchId}/${uniqueFilename}`;

          try {
            // Upload file
            const uploadResult = await uploadToStorage(
              process.env.NEXT_PUBLIC_SUPABASE_DOCUMENTS_BUCKET!, // Ensure bucket name is in env
              storagePath,
              file
            );

            // Adjust check based on expected return type { success: boolean, data?: { path: string }, error?: string }
            if (!uploadResult.success || !uploadResult.data?.path) {
              console.error(`Failed to upload file ${file.name}:`, uploadResult.error || "Missing path in upload result data.");
              filesFailedProcessing++;
              continue; // Skip to next file
            }

            // Determine Page Count
            const pageCount = await getPageCount(file);
            totalBatchPages += pageCount;

            // Prepare document record insert (execute later)
            documentInsertPromises.push(
              tx.insert(documentsTable).values({
                userId: userId,
                batchId: currentBatchId,
                originalFilename: file.name,
                storagePath: uploadResult.data.path, // Use path from upload result data
                mimeType: file.type,
                fileSize: file.size,
                pageCount: pageCount,
                status: 'uploaded', // Correct initial document status
              })
            );
            filesProcessedSuccessfully++;

          } catch (fileProcessingError) {
             console.error(`Error processing file ${file.name}:`, fileProcessingError);
             filesFailedProcessing++;
             // Skip this file
             continue;
          }
        }

        // Insert all document records that were processed successfully
        if (documentInsertPromises.length > 0) {
           await Promise.all(documentInsertPromises);
        }

        if (filesProcessedSuccessfully === 0 && files.length > 0) {
           // All files failed, mark batch as failed immediately
           await tx
             .update(extractionBatchesTable)
             .set({
               status: 'failed',
               failedCount: files.length,
               updatedAt: new Date(),
             })
             .where(eq(extractionBatchesTable.id, currentBatchId));
           // Throw an error to rollback any potential partial inserts (though none should happen here)
           // and signal failure to the outer catch block.
           throw new Error(`Batch ${currentBatchId}: All files failed during upload or page counting.`);
        } else {
           // Update batch record with final status and page count
           await tx
             .update(extractionBatchesTable)
             .set({
               status: 'queued', // Final status after upload
               totalPages: totalBatchPages,
               failedCount: filesFailedProcessing, // Record files that failed upload/page count
               updatedAt: new Date(),
             })
             .where(eq(extractionBatchesTable.id, currentBatchId));
        }

        return currentBatchId; // Return batchId on successful transaction
      });

      if (!batchId) {
         // This case should ideally be handled by the error thrown if all files fail
         throw new Error("Batch creation transaction completed but failed to return a valid ID.");
      }

      // --- Step 8.2.4: Finalize Action (Analytics, Revalidation, Return) ---
      // TODO (8.2.4): Implement Analytics Tracking
      // TODO (8.2.4): Implement Revalidation

      console.log(`Batch ${batchId} created successfully.`);
      return {
        isSuccess: true,
        message: `Batch '${batchName || batchId}' created successfully with ${filesProcessedSuccessfully} documents queued.`,
        data: { batchId: batchId },
      };

    } catch (transactionError: any) {
       console.error("Batch creation transaction failed:", transactionError);
       // If batchId was created before error, mark its status as 'failed'
       // This handles errors during the transaction itself (e.g., DB constraint violation)
       // or the specific error thrown if all files failed processing.
       if (batchId) {
           try {
               await db.update(extractionBatchesTable)
                   .set({ status: 'failed', updatedAt: new Date() })
                   .where(eq(extractionBatchesTable.id, batchId));
               console.log(`Marked batch ${batchId} as failed due to transaction error.`);
           } catch (updateError) {
               console.error(`Failed to mark batch ${batchId} as failed after transaction error:`, updateError);
           }
       }
       return {
           isSuccess: false,
           message: transactionError.message || "Failed to create batch due to a transaction error.",
           error: "TRANSACTION_ERROR",
       };
    }

  } catch (error) { // Outer catch for initial validation errors etc.
    console.error("Error creating batch upload:", error);

    if (error instanceof ZodError) {
      return {
        isSuccess: false,
        message: "Validation failed.",
        error: error.errors.map((e) => e.message).join(", "),
      };
    }

    return {
      isSuccess: false,
      message: "An unexpected error occurred while creating the batch.",
      error: "BATCH_CREATION_FAILED",
    };
  }
}

// Helper function to get page count
async function getPageCount(file: File): Promise<number> {
  if (file.type === 'application/pdf') {
    try {
      const arrayBuffer = await file.arrayBuffer();
      // Attempt to load with encryption ignored first
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      return pdfDoc.getPageCount();
    } catch (error: any) {
      // Log the specific error for debugging
      console.error(`Error counting pages for PDF ${file.name}:`, error.message);
      // Rethrow a more specific error or handle based on error type if needed
      // e.g., check if it's an encryption error that requires a password (not handled here)
      throw new Error(`Failed to process PDF pages for ${file.name}. It might be corrupted or encrypted.`);
    }
  } else if (file.type.startsWith('image/')) {
    return 1; // Assume 1 page for images
  } else {
    console.warn(`Unsupported file type for page counting: ${file.type} (${file.name})`);
    // Decide on default behavior for unsupported types
    // Option 1: Throw an error
    // throw new Error(`Unsupported file type for page counting: ${file.type}`);
    // Option 2: Return a default (e.g., 1 or 0) - returning 1 for now
    return 1;
  }
}


// TODO (8.4.1): Implement fetchUserBatchesAction
// TODO (8.4.2): Implement fetchBatchDetailsAction
