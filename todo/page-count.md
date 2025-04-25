Okay, Engineer. Let's tackle this critical page counting discrepancy. Incorrect usage metering undermines user trust and billing accuracy – it's unacceptable for a production application.

**Problem Analysis:**

The core issue is that processing a single-page document (PDF or image) consistently results in the `user_usage.pages_processed` counter incrementing by 2 instead of 1.

**Most Probable Cause (Based on Code Analysis):**

The current workflow appears to increment the usage counter at *two distinct points* for a single document upload:

1.  **During Initial Upload:** `actions/db/documents.ts` -> `uploadDocumentAction` calls `incrementPagesProcessedAction(userId, pageCount)`. In the single upload flow (`app/(dashboard)/dashboard/upload/page.tsx`), `pageCount` is likely being passed as `1` (the client-side estimate).
2.  **After Successful Extraction:** `actions/ai/extraction-actions.ts` -> `extractDocumentDataAction` *also* calls `incrementPagesProcessedAction(userId, 1)` (currently hardcoded to 1) after the AI successfully processes the document.

This results in a `1 + 1 = 2` increment for a single-page document processed via the standard upload flow.

**Architectural Solution:**

Usage should be incremented **only once** per document and **only after successful processing** by the AI. The increment amount **must** reflect the **actual page count** of the document, determined reliably on the server-side.

**Implementation Plan to Fix Page Counting:**

Here are the precise, architected tasks to permanently resolve this issue:

---

### Step P1: Implement Reliable Server-Side Page Counting

*   **Task**: Modify the document upload process to accurately determine the page count on the server *after* the file is uploaded to storage but *before* it's queued for extraction. Store this count in the `documents` table.
*   **Goal**: Ensure the `documents.page_count` field contains the definitive, server-verified page count for every document.
*   **Modules**:
    *   **P1.1: Integrate Page Counting Library**:
        *   **Action**: Add a robust server-side library capable of counting pages in PDFs (e.g., `pdf-lib`) and potentially other formats if needed (though images are typically 1 page).
        *   **Files**: `package.json`, potentially a new utility file `lib/utils/document-utils.ts`.
        *   **Instructions**: Install `pdf-lib` (`pnpm add pdf-lib`). Create a helper function `getServerSidePageCount(fileBuffer: Buffer, mimeType: string): Promise<number>` in `lib/utils/document-utils.ts`. This function should use `pdf-lib` to load the PDF buffer and get the page count. For common image `mimeType`s (jpeg, png, webp, gif), return 1. Handle errors gracefully (e.g., return 1 or throw a specific error if counting fails).
    *   **P1.2: Modify Upload Action (`uploadDocumentAction`)**:
        *   **Action**: Update `uploadDocumentAction` to call the server-side page counting function *after* uploading to storage and *before* inserting the document record. Remove the `pageCount` parameter from the action's input.
        *   **Files**: `actions/db/documents.ts`.
        *   **Instructions**:
            *   Remove the `pageCount` parameter from the `uploadDocumentAction` function signature.
            *   After the `uploadToStorage` call is successful, use the downloaded `fileBuffer` (or re-download if necessary, though less efficient) and `fileData.type` to call `getServerSidePageCount`.
            *   Store the result in the `pageCount` field when inserting into `documentsTable`.
            *   **Crucially, REMOVE the call to `incrementPagesProcessedAction` from within `uploadDocumentAction`.** Usage will be incremented later.
    *   **P1.3: Update Calling Code**:
        *   **Action**: Modify the client-side code that calls `uploadDocumentAction` to no longer pass the estimated page count.
        *   **Files**: `app/(dashboard)/dashboard/upload/page.tsx`.
        *   **Instructions**: Remove the `estimatedPageCount` variable and argument when calling `uploadDocumentAction`.
*   **Dependencies**: Base DB setup, Storage Utils.

---

### Step P2: Correct Usage Increment Logic

*   **Task**: Ensure `pages_processed` is incremented exactly once per document, using the correct page count, and only after successful AI extraction.
*   **Goal**: Implement accurate and atomic usage tracking tied directly to successful processing completion.
*   **Modules**:
    *   **P2.1: Modify Extraction Action (`extractDocumentDataAction`)**:
        *   **Action**: Update `extractDocumentDataAction` to fetch the document's actual `pageCount` and call `incrementPagesProcessedAction` with that count *only* upon successful extraction.
        *   **Files**: `actions/ai/extraction-actions.ts`, `actions/db/user-usage-actions.ts`.
        *   **Instructions**:
            *   Inside `extractDocumentDataAction`, *before* calling the AI: Fetch the `document` record from the database using `documentId` to get the `actualPageCount = document.pageCount`.
            *   Locate the existing `incrementPagesProcessedAction(userId, 1)` call (which happens *after* successful AI processing and data saving).
            *   **Modify this call** to use the fetched `actualPageCount`: `incrementPagesProcessedAction(userId, actualPageCount)`.
            *   Ensure this increment call only happens within the success path of the AI processing and data saving logic.
    *   **P2.2: Modify Background Processor (Batch)**:
        *   **Action**: Ensure the background batch processor uses the correct `pageCount` when incrementing usage for each successfully processed document within a batch.
        *   **Files**: `app/api/batch-processor/route.ts` (as planned in Step 8.3.4).
        *   **Instructions**: When looping through documents fetched for a batch:
            *   Ensure the fetched document data includes the `pageCount`.
            *   Inside the success handler (after `extractDocumentDataAction` returns success for a document), call `incrementPagesProcessedAction(document.userId, document.pageCount)`.
            *   **Verify:** Double-check that `extractDocumentDataAction` itself *does not* increment usage when called in this context (it should only be incremented here by the processor).
*   **Dependencies**: P1 (Server-Side Page Counting), AI Action, Usage Action, Batch Processor (Step 8.3).

---

### Step P3: Verification and Testing

*   **Task**: Add specific logging and tests to verify the page counting and usage increment logic is correct.
*   **Goal**: Confirm that the "1 page processed as 2" bug is fixed and usage is tracked accurately for single and multi-page documents.
*   **Modules**:
    *   **P3.1: Add Diagnostic Logging**:
        *   **Action**: Temporarily add detailed server-side logs at critical points.
        *   **Files**: `actions/db/documents.ts`, `actions/ai/extraction-actions.ts`, `actions/db/user-usage-actions.ts`, `app/api/batch-processor/route.ts`.
        *   **Instructions**:
            *   In `uploadDocumentAction`: Log the result of `getServerSidePageCount`.
            *   In `extractDocumentDataAction`: Log the fetched `actualPageCount` before incrementing.
            *   In `incrementPagesProcessedAction`: Log the `userId` and `count` being received.
            *   In the batch processor: Log the `document.pageCount` before calling increment.
    *   **P3.2: Write Unit/Integration Tests**:
        *   **Action**: Create tests specifically verifying the usage increment flow.
        *   **Files**: `__tests__/actions/user-usage.test.ts` (new or existing), `__tests__/actions/extraction-actions.test.ts`.
        *   **Instructions**:
            *   Test `incrementPagesProcessedAction`: Mock the DB update and verify it's called with the correct increment value.
            *   Test `extractDocumentDataAction`: Mock dependencies (`getCurrentUser`, DB fetches for document/pageCount, AI call, `incrementPagesProcessedAction`). Trigger the action, simulate successful AI processing, and assert that `incrementPagesProcessedAction` was called exactly once with the correct mocked `pageCount`.
    *   **P3.3: Perform Manual E2E Tests**:
        *   **Action**: Manually test the single and batch upload flows with documents of known page counts (1-page PDF, 1-page image, 5-page PDF).
        *   **Instructions**:
            1.  Check initial `pages_processed` in `user_usage` table for the test user.
            2.  Upload a 1-page PDF via the single upload UI. Wait for completion.
            3.  Check `user_usage` table: `pages_processed` should have increased by exactly 1.
            4.  Upload a 1-page Image. Wait for completion.
            5.  Check `user_usage` table: `pages_processed` should have increased by exactly 1 again.
            6.  Upload a 5-page PDF. Wait for completion.
            7.  Check `user_usage` table: `pages_processed` should have increased by exactly 5.
            8.  If batch is implemented: Upload a batch containing a 1-page and a 3-page document. Wait for completion. Check `user_usage`: `pages_processed` should have increased by exactly 4 (1 + 3).
            9.  Remove diagnostic logs after verification.
*   **Dependencies**: P1, P2, Testing setup.

---
