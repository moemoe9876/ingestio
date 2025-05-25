import { db } from '@/db/db'; // Corrected: Assuming db is exported from @/db/db based on batchActions.ts
import { documentsTable } from '@/db/schema/documents-schema';
import { extractionBatchesTable, type SelectExtractionBatch } from '@/db/schema/extraction-batches-schema';
// import { extractionJobsTable } from '@/db/schema/extraction-jobs-schema'; // extractionDocumentDataAction should handle job creation/linking
import { extractDocumentDataAction } from '@/actions/ai/extraction-actions';
import { checkUserQuotaAction, incrementPagesProcessedAction } from '@/actions/db/user-usage-actions';
import { downloadFromStorage } from '@/lib/supabase/storage-utils'; // Ensure this utility exists and path is correct
import { classifyDocument, getDefaultPromptForType } from '@/prompts/classification'; // Ensure path and func names are correct
import { and, eq, sql } from 'drizzle-orm';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const CRON_SECRET = process.env.CRON_SECRET;
const DOCUMENTS_BUCKET = process.env.DOCUMENTS_BUCKET; // Added
const MAX_BATCHES_PER_RUN = 5; // Number of batches to process in one cron execution
const MAX_DOCS_PER_BATCH_RUN = 10; // Number of documents to process per batch in one cron execution

export async function GET(request: NextRequest) {
  // 1. Security Check
  if (!CRON_SECRET) {
    console.error("CRON_SECRET is not set. Denying access.");
    return new Response('Unauthorized: CRON_SECRET not configured', { status: 401 });
  }
  // Added: Validate DOCUMENTS_BUCKET
  if (!DOCUMENTS_BUCKET) {
    console.error("DOCUMENTS_BUCKET is not set. Halting execution.");
    return new Response('Configuration error: DOCUMENTS_BUCKET not configured', { status: 500 });
  }
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    console.warn("CRON job: Invalid or missing authorization header.");
    return new Response('Unauthorized', { status: 401 });
  }

  console.log("Batch processor cron job started.");

  try {
    // 2. Fetch Batches to Consider
    const batchesToConsider = await db
      .select()
      .from(extractionBatchesTable)
      .where(
        sql`${extractionBatchesTable.status} = 'queued' OR 
             (${extractionBatchesTable.status} = 'processing' AND 
              EXISTS (SELECT 1 FROM ${documentsTable} 
                      WHERE ${documentsTable.batchId} = ${extractionBatchesTable.id} 
                      AND ${documentsTable.status} = 'uploaded'))`
      )
      .orderBy(extractionBatchesTable.createdAt) // Prioritize older batches
      .limit(MAX_BATCHES_PER_RUN);

    if (batchesToConsider.length === 0) {
      console.log("No batches to process at this time (queued or partially processed).");
      return NextResponse.json({ success: true, message: "No batches to process at this time." });
    }

    console.log(`Found ${batchesToConsider.length} batches to consider for processing.`);

    // 3. Loop Through Batches
    for (const batch of batchesToConsider) {
      console.log(`Attempting to lock batch ${batch.id} (current status: ${batch.status})`);
      // Atomic Batch Locking
      const updatedBatchResult = await db.update(extractionBatchesTable)
        .set({ 
            status: 'processing', // Ensure it's (or stays) 'processing'
            updatedAt: new Date()  // Refresh updatedAt timestamp
        })
        .where(and(
          eq(extractionBatchesTable.id, batch.id),
          // Allow re-locking if it's 'queued' OR if it's 'processing' (and we know it has uploaded docs from the fetch query)
          sql`${extractionBatchesTable.status} IN ('queued', 'processing')` 
        ))
        .returning({ id: extractionBatchesTable.id });

      if (updatedBatchResult.length === 0) {
        console.log(`Batch ${batch.id} was locked by another process, its status changed, or no longer meets processing criteria. Skipping.`);
        continue; // Batch was likely picked up by another concurrent cron run or status changed
      }
      console.log(`Successfully locked batch ${batch.id}. Status set to 'processing'.`);

      // Fetch Documents for the Batch
      const documentsToProcess = await db
        .select()
        .from(documentsTable)
        .where(and(eq(documentsTable.batchId, batch.id), eq(documentsTable.status, 'uploaded')))
        .limit(MAX_DOCS_PER_BATCH_RUN);

      if (documentsToProcess.length === 0) {
        console.log(`No documents in 'uploaded' state for batch ${batch.id} in this run.`);
        // Potentially check if all documents are processed and update batch status here if no docs are left.
        // This is also handled later by aggregating counts.
        // If no docs to process, and it wasn't picked by another process, ensure final status update.
        await updateBatchAggregateStatus(batch.id, batch.documentCount);
        continue;
      }
      console.log(`Processing ${documentsToProcess.length} documents for batch ${batch.id}.`);


      for (const doc of documentsToProcess) {
        let docProcessingError: string | null = null;
        try {
          // Per-Document Quota Check
          console.log(`Checking quota for document ${doc.id}, user ${doc.userId}, pages ${doc.pageCount}`);
          const quotaResult = await checkUserQuotaAction(doc.userId, doc.pageCount);
          if (!quotaResult.isSuccess || !quotaResult.data?.hasQuota) { // Check data.hasQuota
            docProcessingError = quotaResult.message || "Quota exceeded or quota check failed.";
            console.warn(`Quota check failed for doc ${doc.id}: ${docProcessingError}`);
            await db.update(documentsTable)
              .set({ 
                status: 'failed', 
                updatedAt: new Date(),
                errorMessage: docProcessingError.substring(0, 1000) // Store the error
              })
              .where(eq(documentsTable.id, doc.id));
            continue; // To the next document
          }
          console.log(`Quota check passed for document ${doc.id}.`);

          // Update Document Status (Processing)
          await db.update(documentsTable)
            .set({ status: 'processing', updatedAt: new Date() })
            .where(eq(documentsTable.id, doc.id));
          console.log(`Document ${doc.id} status updated to 'processing'.`);

          // Resolve Prompt
          let resolvedPrompt: string | null = null;
          if (batch.promptStrategy === 'global') {
            resolvedPrompt = batch.extractionPrompt;
          } else if (batch.promptStrategy === 'per_document') {
            resolvedPrompt = doc.extractionPrompt;
            if (!resolvedPrompt) {
              docProcessingError = "Missing prompt for per-document strategy.";
              console.warn(`Missing prompt for doc ${doc.id} (per-document strategy).`);
              // Mark doc failed handled in the outer catch for this iteration
            }
          } else if (batch.promptStrategy === 'auto') {
            if (doc.extractionPrompt) { // If prompt was already determined (e.g., retry)
              resolvedPrompt = doc.extractionPrompt;
            } else {
              console.log(`Auto-detecting prompt for doc ${doc.id}, path: ${doc.storagePath}`);
              const downloadResult = await downloadFromStorage(DOCUMENTS_BUCKET, doc.storagePath);
              
              if (!downloadResult.success || !downloadResult.data) {
                 docProcessingError = downloadResult.error || "Failed to download document for auto-prompt classification.";
                 console.error(docProcessingError + ` (Doc ID: ${doc.id})`);
              } else {
                const fileBlob = downloadResult.data; // Extract the Blob
                const classifyResult = await classifyDocument(fileBlob, doc.mimeType); // Ensure classifyDocument handles Blob
                resolvedPrompt = getDefaultPromptForType(classifyResult.documentType);
                await db.update(documentsTable)
                  .set({ extractionPrompt: resolvedPrompt, updatedAt: new Date() })
                  .where(eq(documentsTable.id, doc.id));
                console.log(`Auto-detected prompt for doc ${doc.id}: ${classifyResult.documentType} -> ${resolvedPrompt?.substring(0,50)}...`);
              }
            }
          }
          
          if (docProcessingError) { // If prompt resolution failed
            // The error is already in docProcessingError, store it and throw to be caught by main doc catch block
            await db.update(documentsTable)
              .set({ status: 'failed', updatedAt: new Date(), errorMessage: docProcessingError.substring(0,1000) })
              .where(eq(documentsTable.id, doc.id));
            throw new Error(docProcessingError);
          }

          if (!resolvedPrompt) {
             // This case should ideally be caught by specific strategy logic,
             // but as a fallback if a prompt is still null and strategy is not 'auto' that might set it.
             // For 'auto' that fails classification, it might also fall here if not handled above.
             docProcessingError = "Failed to resolve extraction prompt for document.";
             console.error(docProcessingError + ` (Doc ID: ${doc.id}, Strategy: ${batch.promptStrategy})`);
             throw new Error(docProcessingError);
          }
          console.log(`Resolved prompt for doc ${doc.id}. Calling AI extraction.`);

          // Call AI Extraction
          const aiResult = await extractDocumentDataAction(
            {
              documentId: doc.id,
              extractionPrompt: resolvedPrompt,
              batchId: batch.id, // Pass batchId so extraction job can be linked
              // Provide default values for other schema fields as the action expects them
              includeConfidence:false, 
              useSegmentation: false, 
              segmentationThreshold: 10, 
              maxPagesPerSegment: 10, 
              skipClassification: true, // Batch processor usually relies on its own classification or resolved prompt
            },
            true // invokedByBatchProcessor = true
          );

          if (aiResult.isSuccess) {
            await db.update(documentsTable)
              .set({ status: 'completed', updatedAt: new Date() })
              .where(eq(documentsTable.id, doc.id));
            await incrementPagesProcessedAction(doc.userId, doc.pageCount);
            console.log(`Document ${doc.id} processed successfully. Usage incremented.`);
          } else {
            docProcessingError = aiResult.message || "AI extraction failed.";
            console.error(`AI extraction failed for doc ${doc.id}: ${docProcessingError}`);
            // Error stored by extractDocumentDataAction on the job, document marked failed below.
            throw new Error(docProcessingError);
          }

        } catch (error: any) {
          console.error(`Error processing document ${doc.id} in batch ${batch.id}:`, error.message);
          const errorMessageToStore = error.message ? error.message.substring(0, 1000) : "Unknown processing error";
          await db.update(documentsTable)
            .set({ 
              status: 'failed', 
              updatedAt: new Date(),
              errorMessage: errorMessageToStore // Store the error
            })
            .where(eq(documentsTable.id, doc.id));
        }
      } // End loop through documents

      // Aggregate Batch Status (after processing a chunk of documents for this batch)
      await updateBatchAggregateStatus(batch.id, batch.documentCount);

    } // End loop through batches

    console.log("Batch processor cron job finished successfully.");
    return NextResponse.json({ success: true, message: "Batch processing cycle complete." });

  } catch (error: any) {
    console.error("Error in batch processor cron job:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

async function updateBatchAggregateStatus(batchId: string, totalDocsInBatch: number) {
  try {
    console.log(`Updating aggregate status for batch ${batchId}. Total docs in batch: ${totalDocsInBatch}`);
    const countsResult = await db
      .select({
        completed: sql<number>`SUM(CASE WHEN ${documentsTable.status} = 'completed' THEN 1 ELSE 0 END)`.mapWith(Number),
        failed: sql<number>`SUM(CASE WHEN ${documentsTable.status} = 'failed' THEN 1 ELSE 0 END)`.mapWith(Number),
      })
      .from(documentsTable)
      .where(eq(documentsTable.batchId, batchId));

    const completedCount = countsResult[0]?.completed || 0;
    const failedCount = countsResult[0]?.failed || 0;
    const totalProcessedInDb = completedCount + failedCount;

    console.log(`Batch ${batchId}: DB counts - Completed: ${completedCount}, Failed: ${failedCount}, Total Processed in DB: ${totalProcessedInDb}`);

    let finalBatchStatus: SelectExtractionBatch['status'] = 'processing'; // Keep as processing unless all docs are done
    let completedAt: Date | null = null;

    if (totalDocsInBatch > 0 && totalProcessedInDb >= totalDocsInBatch) { // All documents originally in the batch have been attempted
      if (failedCount === 0) {
        finalBatchStatus = 'completed';
      } else if (completedCount > 0 && failedCount > 0) {
        finalBatchStatus = 'partially_completed';
      } else { // All failed (completedCount === 0 && failedCount > 0)
        finalBatchStatus = 'failed';
      }
      completedAt = new Date();
      console.log(`Batch ${batchId} final status determined: ${finalBatchStatus}`);
    } else {
      console.log(`Batch ${batchId} still processing. Total processed in DB ${totalProcessedInDb} out of ${totalDocsInBatch}`);
      // If there are no more 'uploaded' documents, but totalProcessedInDb < totalDocsInBatch, it might mean some are still 'processing'
      // or an issue occurred. The current logic correctly keeps it 'processing'.
      // If it's stuck, manual intervention or more sophisticated timeout/retry logic at batch level would be needed.
    }
    
    const updatePayload: Partial<SelectExtractionBatch> = {
        completedCount: completedCount,
        failedCount: failedCount,
        updatedAt: new Date(),
    };

    if (finalBatchStatus !== 'processing') { // Only set final status if it's determined
        updatePayload.status = finalBatchStatus;
        if (completedAt) {
            updatePayload.completedAt = completedAt;
        }
    }
    
    // Only update status if it's truly final or if there are counts to update
    // This prevents flipping a 'completed' batch back to 'processing' if cron runs again and finds no docs.
    if (finalBatchStatus !== 'processing' || (completedCount > 0 || failedCount > 0)) {
         await db.update(extractionBatchesTable)
            .set(updatePayload)
            .where(eq(extractionBatchesTable.id, batchId));
        console.log(`Batch ${batchId} aggregate status updated in DB.`);
    } else {
        console.log(`Batch ${batchId}: No final status determined, and no count changes requiring immediate DB update for batch record.`);
    }

  } catch (error) {
    console.error(`Error updating aggregate status for batch ${batchId}:`, error);
    // Don't let this error stop the whole cron job if other batches can be processed.
  }
} 