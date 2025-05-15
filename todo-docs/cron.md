Okay, let's create a plan to implement the necessary changes in `app/api/batch-processor/route.ts` to correctly handle partially processed batches and ensure large batches are completed over multiple cron runs.

**Goal:** Refactor the batch processor API route to reliably pick up and continue processing batches that are in a `'processing'` state but still have documents in an `'uploaded'` state, in addition to picking up newly `'queued'` batches.

**Plan:**

**Step 1: Modsteify Batch Fetching Logic in `app/api/batch-processor/route.ts`**

*   **Task:** Update the Drizzle query that selects batches to include those in `'processing'` status if they still have unprocessed documents.
*   **File:** `app/api/batch-processor/route.ts`
*   **Current Logic (Simplified):**
    ```typescript
    const queuedBatches = await db
      .select()
      .from(extractionBatchesTable)
      .where(eq(extractionBatchesTable.status, 'queued'))
      // ...
    ```
*   **New Logic to Implement:**
    ```typescript
    // Inside the GET function, after security check:
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

    // Rename queuedBatches to batchesToProcess or similar for clarity
    // const batchesToProcess = batchesToConsider; 
    // Then loop through batchesToProcess
    ```
    *   **Explanation of `EXISTS` subquery:**
        *   `SELECT 1 FROM ${documentsTable} WHERE ${documentsTable.batchId} = ${extractionBatchesTable.id} AND ${documentsTable.status} = 'uploaded'` checks if there's at least one document associated with the current batch (`extractionBatchesTable.id`) that still has a status of `'uploaded'`.
        *   `EXISTS (...)` returns `true` if the subquery finds any rows, `false` otherwise.
        *   This ensures that a batch in `'processing'` state is only picked up again if it actually has work left to do (documents in `'uploaded'` state).

**Step 2: Modify Atomic Batch Locking Logic**

*   **Task:** Adjust the atomic update (locking mechanism) to correctly handle batches that might already be in `'processing'` state (but are being picked up again because they have more work). The goal is to ensure it's still a valid candidate for processing and to refresh its `updatedAt` timestamp.
*   **File:** `app/api/batch-processor/route.ts`
*   **Current Locking Logic (Simplified):**
    ```typescript
    const updatedBatchResult = await db.update(extractionBatchesTable)
      .set({ status: 'processing', updatedAt: new Date() })
      .where(and(eq(extractionBatchesTable.id, batch.id), eq(extractionBatchesTable.status, 'queued')))
      .returning({ id: extractionBatchesTable.id });
    ```
*   **New Locking Logic to Implement:**
    ```typescript
    // Inside the loop: for (const batch of batchesToConsider)
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
      continue; 
    }
    ```
    *   **Explanation:**
        *   We still set the status to `'processing'` (it might already be, which is fine) and update `updatedAt`.
        *   The `WHERE` clause now checks if the status is *either* `'queued'` (for new batches) or `'processing'` (for batches being continued). The initial fetch query already ensures that if it's `'processing'`, it has pending `'uploaded'` documents.

**Step 3: Review `updateBatchAggregateStatus` Function**

*   **Task:** Ensure the `updateBatchAggregateStatus` function correctly handles the final state of a batch, especially when all documents are processed over multiple cron runs.
*   **File:** `app/api/batch-processor/route.ts`
*   **Current Logic (Seems mostly okay, but review context):**
    ```typescript
    async function updateBatchAggregateStatus(batchId: string, totalDocsInBatch: number) {
      // ... (fetches completedCount, failedCount from documentsTable) ...
      const totalProcessedInDb = completedCount + failedCount;

      if (totalDocsInBatch > 0 && totalProcessedInDb >= totalDocsInBatch) {
        // ... logic to set finalBatchStatus ('completed', 'partially_completed', 'failed') and completedAt ...
      } else {
        // Batch still processing
        finalBatchStatus = 'processing'; // This is implicitly handled by not changing it from 'processing'
      }
      
      // ... (update extractionBatchesTable) ...
      // The safeguard: if (finalBatchStatus !== 'processing' || (completedCount > 0 || failedCount > 0))
      // is important to prevent a completed batch from being set back to 'processing' if the cron
      // runs again and finds no 'uploaded' documents for that batch.
    }
    ```
*   **Confirmation/Refinement:**
    *   The existing logic where `finalBatchStatus` defaults to `'processing'` (or rather, the batch's status isn't changed from `'processing'` unless all documents are accounted for) is correct.
    *   The condition `totalProcessedInDb >= totalDocsInBatch` correctly identifies when all documents initially part of the batch have reached a terminal state (`completed` or `failed`).
    *   The safeguard `if (finalBatchStatus !== 'processing' || (completedCount > 0 || failedCount > 0))` before the final `db.update` on `extractionBatchesTable` is good. It ensures that if a batch is already, say, `'completed'`, and the cron job runs again and finds no more `'uploaded'` documents for it, it doesn't unnecessarily try to update the batch record again or flip its status back.
    *   **No major changes seem needed here based on the previous analysis, but it's good to re-confirm its behavior in light of the updated fetching/locking.**

**Step 4: Testing Strategy**

*   **Task:** Define how to test this multi-run processing.
*   **Scenarios:**
    1.  **Small Batch:** Create a batch with fewer documents than `MAX_DOCS_PER_BATCH_RUN` (e.g., 3 docs if limit is 10). Verify it's processed in one cron cycle and batch status becomes `completed` (or `failed`/`partially_completed`).
    2.  **Large Batch:** Create a batch with more documents than `MAX_DOCS_PER_BATCH_RUN` (e.g., 25 docs if limit is 10).
        *   **Cron Run 1:** Verify first 10 docs are processed, `user_usage` updated for 10, batch status remains `processing`, `completed_count` (on batch) is 10.
        *   **Cron Run 2:** Verify next 10 docs are processed, `user_usage` updated for another 10, batch status remains `processing`, `completed_count` is 20.
        *   **Cron Run 3:** Verify last 5 docs are processed, `user_usage` updated for last 5, batch status becomes `completed`, `completed_count` is 25, `completed_at` is set.
    3.  **Batch with Failures:** Create a large batch where some documents will intentionally fail (e.g., due to quota after some successes, or simulated AI error). Verify `partially_completed` or `failed` status as appropriate.
    4.  **Multiple Queued Batches:** Create several small batches. Verify `MAX_BATCHES_PER_RUN` are picked up and processed.

**Step 5: Code Implementation and Deployment**

*   Implement changes from Step 1 and Step 2 in `app/api/batch-processor/route.ts`.
*   Deploy the changes.
*   Set/confirm `CRON_SECRET` in Vercel environment variables.
*   Monitor Vercel logs for the cron job executions and your application logs.

This plan focuses on modifying the batch processor to correctly handle the lifecycle of larger batches across multiple cron invocations.