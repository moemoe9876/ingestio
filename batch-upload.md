
**Redesigned Batch Upload Implementation Plan**

**Key Strengths of this Redesign:**

*   **Flexible Prompting:** Caters to diverse user needs by offering "Global," "Per-Document," and "Auto-Detect & Prompt" strategies.
*   **Leverages Existing Classification:** Intelligently reuses the `classifyDocument` function for the "Auto" strategy, promoting code reuse and consistency.
*   **Accurate Data Association:** Stores the `extraction_prompt` per document when necessary, ensuring the correct context is used during processing.
*   **Clear User Experience:** Implements a guided 3-step wizard flow (Files -> Prompts -> Review) for better usability.
*   **Accurate Quota Handling:** Mandates server-side page counting during batch creation and accurate per-document quota checks by the background processor *before* AI processing.
*   **Separation of Concerns:** Maintains a clear distinction between the batch orchestration logic and the core single-document extraction action.

---

**Production-Ready MVP Plan: Batch File Upload Feature**

**Phase:** MVP (Minimum Viable Product)

**Goal:** Establish core, reliable multi-file upload functionality with flexible prompt handling (Global, Per-Document, Auto-Detect) and accurate page-based quota enforcement.

**Guiding Principles (from Research Report):** User-Centricity, Scalability (Foundation), Robustness & Reliability (Core), Security, Extensibility (Considered).

**Key Strengths:**

*   **Flexible Prompting:** Addresses the core challenge via "Global," "Per-Document," and "Auto-Detect & Prompt" strategies.
*   **Leverages Existing Classification:** Reuses `classifyDocument` for the "Auto" strategy.
*   **Accurate Data Association:** Stores prompts per document where needed.
*   **Clear UX:** Implements a guided 3-step wizard.
*   **Accurate Quota Handling:** Uses server-side page counting and per-document quota checks *before* AI processing.
*   **Separation of Concerns:** Keeps batch orchestration separate from single-document extraction.

---

**Step 8.0: Database Schema Setup & Migration**

*   **Task**: Modify the database schema using Drizzle ORM to support batch uploads, prompt strategies, and per-document prompts.
*   **Goal**: Ensure the database structure aligns with the feature requirements, maintaining data integrity and compatibility with RLS.
*   **Method**: Define changes in Drizzle schema files (`db/schema/*.ts`), generate migration using `pnpm drizzle-kit generate`, review SQL, apply using `pnpm drizzle-kit migrate` (or manually apply generated SQL in production).
*   **Modules**:
    *  [x] **8.0.1: Define/Verify Enums**:
        *   **Action**: Centralize enums in `db/schema/enums.ts`. Define `prompt_strategy_enum` ('global', 'per_document', 'auto'). Verify `batch_status_enum` and `document_status_enum` include necessary values (`pending_upload`, `queued`, `processing`, `completed`, `partially_completed`, `failed` for batch; `uploaded`, `processing`, `completed`, `failed` for document).
        *   **Files**: `db/schema/enums.ts` (Create/Modify), `db/schema/extraction-batches-schema.ts` (Modify Imports), `db/schema/documents-schema.ts` (Modify Imports).
        *   **Code Snippet (`enums.ts`)**:
            ```typescript
            import { pgEnum } from "drizzle-orm/pg-core";
            export const promptStrategyEnum = pgEnum("prompt_strategy_enum", ["global", "per_document", "auto"]);
            export const batchStatusEnum = pgEnum("batch_status_enum", ["pending_upload", "queued", "processing", "completed", "partially_completed", "failed"]);
            export const documentStatusEnum = pgEnum("document_status", ["uploaded", "processing", "completed", "failed"]);
            // ... other enums ...
            ```
    *  [x] **8.0.2: Update `extraction_batches` Table**:
        *   **Action**: Add `prompt_strategy` (enum, NOT NULL, default 'global'), make `extraction_prompt` (text) NULLABLE, add `total_pages` (integer, NOT NULL, default 0).
        *   **Files**: `db/schema/extraction-batches-schema.ts`.
        *   **Code Snippet (Drizzle Schema)**:
            ```typescript
            // ... inside pgTable definition ...
            promptStrategy: promptStrategyEnum("prompt_strategy").notNull().default("global"),
            extractionPrompt: text("extraction_prompt").nullable(),
            totalPages: integer("total_pages").default(0).notNull(),
            // ... other columns ...
            ```
    *  [x] **8.0.3: Update `documents` Table**:
        *   **Action**: Add `extraction_prompt` (text, NULLABLE), ensure `batch_id` (uuid, NULLABLE) FK references `extraction_batches` with `ON DELETE SET NULL`, ensure `page_count` (integer) is `NOT NULL`, set default `status` to `'uploaded'`.
        *   **Files**: `db/schema/documents-schema.ts`.
        *   **Code Snippet (Drizzle Schema)**:
            ```typescript
            // ... inside pgTable definition ...
            batchId: uuid("batch_id").references(() => extractionBatchesTable.id, { onDelete: "set null" }),
            extractionPrompt: text("extraction_prompt").nullable(),
            pageCount: integer("page_count").notNull(),
            status: documentStatusEnum("status").default("uploaded").notNull(),
            // ... other columns ...
            ```
    *  [x] **8.0.4: Update `extraction_jobs` Table**:
        *   **Action**: Ensure `batch_id` FK references `extraction_batches` with `ON DELETE CASCADE`.
        *   **Files**: `db/schema/extraction-jobs-schema.ts`.
        *   **Code Snippet (Drizzle Schema)**:
            ```typescript
            // ... inside pgTable definition ...
            batchId: uuid("batch_id").references(() => extractionBatchesTable.id, { onDelete: "cascade" }),
            // ... other columns ...
            ```
    *  [x] **8.0.5: Generate & Apply Migration**:
        *   **Action**: instruct user to run the command `pnpm drizzle-kit generate` (YOU CAN NOT RUN ANY TERMINAL COMMAND !!!), review the generated SQL migration file, and apply it using `pnpm drizzle-kit migrate` (dev/staging) or manually executing the SQL (production).
        *   **Files**: Terminal, Generated Migration File, `db/migrations/meta/_journal.json`.
    *  [x] **8.0.6: RLS Policy Review**:
        *   **Action**: Verify that existing RLS policies based on `user_id` implicitly cover the new columns correctly and that `service_role` has necessary permissions.
        *   **Files**: Supabase SQL Editor (for verification).
        *   **Instructions**: Confirm policies for `extraction_batches` and `documents` still correctly restrict access based on `user_id`. No RLS changes are anticipated for this step.

---

**Step 8.1: Implement Batch Upload UI (3-Step Wizard)**

*   **Task**: Develop the multi-step frontend interface (Wizard) for batch uploads.
*   **Goal**: Provide an intuitive, accessible, and informative UI based on research report best practices (Sec 2.1-2.6), guiding users through file selection, prompt configuration, and submission, while respecting tier limits derived from the KV store.
*   **Modules**:
    *   **8.1.1: Create Batch Upload Page & Wizard Wrapper**:
        *   **Action**: Set up `app/(dashboard)/dashboard/batch-upload/page.tsx` and `components/batch/BatchUploadWizard.tsx`. Implement tier-based access control using KV data.
        *   **Files**: `app/(dashboard)/dashboard/batch-upload/page.tsx`, `components/batch/BatchUploadWizard.tsx` (New), `actions/stripe/sync-actions.ts`, `lib/config/subscription-plans.ts`.
        *   **Instructions**:
            1.  `BatchUploadWizard.tsx` (`"use client"`): Manage wizard step (`useState<'files' | 'prompts' | 'review'>`).
            2.  `useEffect`: Fetch subscription data (`planId`, `status`) via `getUserSubscriptionDataKVAction`. Handle loading/error.
            3.  Determine eligibility (`status` active/trialing, `planId` plus/growth). If ineligible, render "Upgrade Required" message.
            4.  If eligible, store `planId` and `batchLimit` in state. Display `batchLimit` clearly.
            5.  Render current step component. Add Next/Previous/Submit buttons.
            6.  Implement basic state management (`useState`) for wizard data (`selectedFiles`, `promptStrategy`, `globalPrompt`, `perDocPrompts`).
    *   **8.1.2: Implement Step 1: File Selection**:
        *   **Action**: Integrate `BatchFileUpload` component. Handle file selection and validation feedback.
        *   **Files**: `components/batch/BatchUploadWizard.tsx`, `components/utilities/BatchFileUpload.tsx`.
        *   **Instructions**:
            1.  Render `BatchFileUpload` in the 'files' step.
            2.  Pass `batchLimit` as `maxFiles`. Configure `allowedMimeTypes` (PDF, JPG, PNG for MVP) and `maxFileSize` (e.g., 50MB from report).
            3.  Use `onFilesChange` to update wizard's `selectedFiles` state.
            4.  Display constraints clearly near the dropzone (Report Sec 2.5).
            5.  Show immediate feedback for rejected files (Report Sec 2.5).
            6.  Display selected files list with name, size, and a remove button (Report Sec 2.2). Add simple file type icons (Report Sec 2.4).
            7.  Disable "Next" if no files selected.
            8.  Ensure keyboard navigation and screen reader support (Report Sec 2.6).
    *   **8.1.3: Implement Step 2: Prompt Configuration**:
        *   **Action**: Allow selection of prompt strategy and input of prompts.
        *   **Files**: `components/batch/BatchUploadWizard.tsx`.
        *   **Instructions**:
            1.  Add state: `promptStrategy` (default 'global'), `globalPrompt`, `perDocPrompts` (map `File.name` -> `prompt`).
            2.  Use `RadioGroup` or similar for strategy selection.
            3.  Conditionally render:
                *   `Global`: Single `Textarea` bound to `globalPrompt`.
                *   `Per-Document`: Map `selectedFiles`, rendering each filename with an associated `Textarea` bound to `perDocPrompts[file.name]`. Use a `ScrollArea` if the list is long.
                *   `Auto-Detect`: Informational text: "IngestIO will automatically detect the document type and apply the best extraction settings."
            4.  **UI Hint:** Add clear text explaining the behavior of each strategy.
            5.  Validate inputs: Disable "Next" if 'global' strategy is chosen but `globalPrompt` is empty, or if 'per_document' is chosen and any file lacks a prompt.
    *   **8.1.4: Implement Step 3: Review & Submit**:
        *   **Action**: Show summary and handle form submission via Server Action.
        *   **Files**: `components/batch/BatchUploadWizard.tsx`, `actions/batch/batchActions.ts`.
        *   **Instructions**:
            1.  Display summary: Number of files, selected strategy, prompt details.
            2.  Add "Submit Batch" button. Use `useTransition` for `isSubmitting` state. Disable button when `isSubmitting`.
            3.  `onSubmit` handler:
                *   Create `FormData`. Append `files`, `promptStrategy`, `batchName` (optional).
                *   Append `globalPrompt` if strategy is 'global'.
                *   Append `JSON.stringify(perDocPrompts)` if strategy is 'per_document'.
                *   Call `createBatchUploadAction(formData)` within `startTransition`.
                *   Handle `ActionState` response: Show success/error `toast`. On success, redirect to `/dashboard/batches` (or detail page).
    *   **8.1.5: Update Sidebar Navigation**:
        *   **Action**: Add link to `/dashboard/batch-upload`.
        *   **Files**: `components/utilities/app-sidebar.tsx`.
        *   **Instructions**: Add `SidebarMenuItem` with `Layers` icon.

---

**Step 8.2: Implement Batch Creation Server Action**

*   **Task**: Develop `createBatchUploadAction` for secure, atomic batch creation, including validation, file upload, server-side page counting, and prompt association.
*   **Goal**: Reliably persist batch metadata and uploaded documents, enforcing business rules and preparing for background processing.
*   **Modules**:
    *   **8.2.1: Define Action & Validation**:
        *   **Action**: Create/update `createBatchUploadAction` in `actions/batch/batchActions.ts`.
        *   **Files**: `actions/batch/batchActions.ts`, `actions/stripe/sync-actions.ts`, `lib/auth-utils.ts`, `lib/config/subscription-plans.ts`, `zod`.
        *   **Instructions**:
            1.  `"use server"`. Get `userId`. Extract `FormData` fields. Parse `perDocPromptsMap` if present.
            2.  **Fetch Subscription (KV):** Get `planId`/`status`. Handle errors.
            3.  **Validate Tier/Limits:** Determine `tier`. Check eligibility (`planId`, `status`). Check `files.length` against `batchLimit`. Validate `promptStrategy` and associated prompt data (e.g., `globalPrompt` required for 'global'). Return failure `ActionState` on validation errors.
            4.  **Server-Side File Validation (Security):** Loop through `files` and validate MIME type against allowlist (PDF, JPG, PNG) and size against `maxFileSize`. Aggregate errors. Return failure `ActionState` if any file is invalid (Report Sec 4.4).
    *   **8.2.2: Implement Quota & Rate Limiting**:
        *   **Action**: Perform pre-transaction checks.
        *   **Files**: `actions/batch/batchActions.ts`, `lib/rate-limiting/limiter.ts`, `actions/db/user-usage-actions.ts`.
        *   **Instructions**:
            1.  Call `checkRateLimit(userId, tier, 'batch_upload')`. Handle failure.
            2.  **Preliminary Quota Check:** Call `checkUserQuotaAction(userId, files.length)`. Handle failure.
    *   **8.2.3: Implement File Processing & DB Transaction**:
        *   **Action**: Atomically upload files, count pages, determine prompts, create DB records.
        *   **Files**: `actions/batch/batchActions.ts`, `lib/supabase/storage-utils.ts`, `db/db.ts`, schema files, `lib/utils/document-utils.ts`, `uuid`.
        *   **Instructions**:
            *   `db.transaction(async (tx) => { ... })`.
            *   Inside transaction:
                *   Create `extraction_batches` record (using `tx`): `userId`, `name`, `prompt_strategy`, `extraction_prompt` (only if global), `status: 'pending_upload'`. Get `newBatchId`.
                *   Init counters/arrays: `totalBatchPages = 0`, `successCount = 0`, `failCount = 0`, `docInserts = []`.
                *   Loop `files` (with index `i`):
                    *   `try...catch` per file.
                    *   Read `file` to `Buffer`.
                    *   Generate unique filename using `uuidv4()`. Define `storagePath` (`batches/{userId}/{newBatchId}/{uuid}-{originalFilename}`).
                    *   Upload: `uploadResult = await uploadToStorage(...)`. If error, `failCount++`, log, `continue`.
                    *   Page Count: `pageCount = await getServerSidePageCount(...)`. If error, `failCount++`, log, `continue`.
                    *   Add `pageCount` to `totalBatchPages`.
                    *   Determine `effectivePrompt` based on `promptStrategy` and `perDocPromptsMap[file.name]`. If 'per_document' and prompt missing, `failCount++`, log, `continue`.
                    *   Prepare `documents` insert data: `userId`, `batch_id: newBatchId`, `pageCount`, `extraction_prompt: effectivePrompt`, `status: 'uploaded'`, other metadata. Add to `docInserts` array.
                    *   `successCount++`.
                    *   On error in loop: catch, `failCount++`, log, `continue`.
                *   If `successCount > 0`, bulk insert documents: `await tx.insert(documentsTable).values(docInserts)`.
                *   If `successCount === 0` and `files.length > 0`, update batch status to `'failed'` (using `tx`), throw error "All files failed...".
                *   Else: Update `extraction_batches` (using `tx`): `status: 'queued'`, `document_count: successCount`, `failed_count: failCount`, `total_pages: totalBatchPages`.
            *   Return `newBatchId`.
    *   **8.2.4: Finalize Action**:
        *   **Action**: Handle post-transaction tasks.
        *   **Files**: `actions/batch/batchActions.ts`, `lib/analytics/server.ts`, `next/cache`.
        *   **Instructions**:
            *   After success: `trackServerEvent(...)`, `revalidatePath(...)`. Return success `ActionState`.
            *   Top-level `try...catch`: On transaction error, log. If `batchId` exists, attempt `UPDATE extraction_batches SET status = 'failed' ...`. Return failure `ActionState`.

---

**Step 8.3: Implement Background Processing Logic (MVP Focus)**

*   **Task**: Create Cron + API Route to process queued documents using the correct prompt and accurate quota checks.
*   **Goal**: Reliably execute AI extraction for batch documents, update statuses, and manage usage.
*   **Modules**:
    *   **8.3.1: Configure Vercel Cron Job**: Define schedule (e.g., `*/5 * * * *`) targeting `/api/batch-processor` in `vercel.json`. Set `CRON_SECRET`.
    *   **8.3.2: Create Secure API Route**: Implement `/api/batch-processor/route.ts`. Verify `Authorization: Bearer ${CRON_SECRET}`.
    *   **8.3.3: Implement Batch/Document Fetching & Locking**:
        *   **Action**: Query processable items with locking.
        *   **Files**: `app/api/batch-processor/route.ts`, schema files, `db/db.ts`.
        *   **Instructions**:
            1.  Query `extraction_batches` for `status = 'queued'`, limit (e.g., 5).
            2.  Loop batches:
                *   Atomic update: `UPDATE ... SET status = 'processing' WHERE id = :batchId AND status = 'queued' RETURNING *`. If no row, skip. Store `batch`.
                *   Query associated `documents` where `batch_id = batch.id` AND `status = 'uploaded'`, limit (e.g., 20). Select needed fields incl. `page_count`, `extraction_prompt`.
    *   **8.3.4: Implement Document Processing Loop**:
        *   **Action**: Process each document: check quota, resolve prompt, call AI, update usage.
        *   **Files**: `app/api/batch-processor/route.ts`, `actions/ai/extraction-actions.ts`, `actions/db/user-usage-actions.ts`, `prompts/classification.ts`, `lib/utils/prompt-utils.ts`.
        *   **Instructions**:
            1.  Loop `documents`:
            2.  **Quota Check:** `quotaResult = await checkUserQuotaAction(document.userId, document.pageCount)`.
            3.  If quota fails: Update doc/job status `'failed'`, increment batch `failed_count`, `continue`. **No usage increment.**
            4.  If quota passes:
                *   Update doc status `'processing'`.
                *   **Resolve Prompt (`finalPrompt`)**: Implement logic based on `batch.prompt_strategy` and `document.extraction_prompt`. If 'auto' and prompt is null, download file, call `classifyDocument`, get default prompt via `getDefaultPromptForType`, update `document.extraction_prompt` in DB. Handle classification errors.
                *   Call AI: `aiResult = await extractDocumentDataAction({ documentId: document.id, extractionPrompt: finalPrompt, ... }, true)`.
                *   If success: Update doc/job status `'completed'`, increment batch `completed_count`. **Increment Usage:** `await incrementPagesProcessedAction(document.userId, document.pageCount)`.
                *   If failure: Update doc/job status `'failed'` + error, increment batch `failed_count`. **No usage increment.**
    *   **8.3.5: Implement Batch Status Aggregation**: After document loop for a batch, re-query counts. If `completed + failed === total`, update batch status (`'completed'`, `'partially_completed'`, `'failed'`) and `completed_at`.
    *   **8.3.6: Refine AI Action**: Ensure `extractDocumentDataAction` accepts `extractionPrompt`, skips internal usage increment when `invokedByBatchProcessor=true`, links `batch_id` to job, handles `skipClassification` correctly.

---

**Step 8.4: Implement Batch Status UI (MVP)**

*   **Task**: Build basic UI for listing and viewing batch status.
*   **Goal**: Provide users visibility into their submitted batches and overall progress.
*   **Modules**:
    *   **8.4.1: Create Batch List Action & Page**:
        *   **Action**: Define `fetchUserBatchesAction`. Implement `app/(dashboard)/dashboard/batches/page.tsx`.
        *   **Files**: `actions/batch/batchActions.ts` (New), `app/(dashboard)/dashboard/batches/page.tsx` (New).
        *   **Instructions**: Fetch batches. Display simple list/table: Name (or ID), Status Badge, Progress (e.g., "X / Y documents"), Submitted Date. Link to detail page. Handle loading/empty states. *Defer complex progress bar for MVP.*
    *   **8.4.2: Create Batch Detail Action & Page**:
        *   **Action**: Define `fetchBatchDetailsAction`. Implement `app/(dashboard)/dashboard/batches/[batchId]/page.tsx`.
        *   **Files**: `actions/batch/batchActions.ts` (New), `app/(dashboard)/dashboard/batches/[batchId]/page.tsx` (New).
        *   **Instructions**: Fetch batch and associated documents. Handle not found/denied. Pass data to client component.
    *   **8.4.3: Implement Batch Detail Client Component**:
        *   **Action**: Build `components/batch/BatchDetailClient.tsx`.
        *   **Files**: `components/batch/BatchDetailClient.tsx` (New).
        *   **Instructions**: Display batch summary (Name, Status, Strategy, Global Prompt if applicable). Display simple document list: Filename, Status Badge. *Defer per-document prompt display and advanced filtering/polling for MVP.* Link completed docs to review page.

---

**Step 8.5: Testing (MVP Focus)**

*   **Task**: Validate core functionality, security, and quota mechanisms for the MVP.
*   **Goal**: Ensure the batch upload MVP is reliable and secure.
*   **Modules**:
    *   **8.5.1: Unit Tests**: Test `getServerSidePageCount`, prompt resolution logic (basic cases), action input validation.
    *   **8.5.2: Integration Tests**:
        *   Test `createBatchUploadAction`: Mock KV. Test tier limits. Test preliminary quota check. Verify DB records created (correct page counts, prompts based on strategy).
        *   Test `/api/batch-processor`: Mock DB fetches. Mock `checkUserQuotaAction` based on `pageCount`. Mock `extractDocumentDataAction`. Verify `incrementPagesProcessedAction` called correctly only on success. Verify status updates. Test prompt resolution for 'global' and 'per_document' (defer 'auto' testing if complex).
    *   **8.5.3: RLS Tests**: Add tests for `extraction_batches`.
    *   **8.5.4: E2E Testing (Manual MVP)**:
        *   Test tier limits (using Stripe test mode + KV sync).
        *   Test 'Global Prompt' strategy submission and processing.
        *   Test 'Per-Document Prompt' strategy submission and processing.
        *   **Accurate Quota Test:** Set low DB quota. Submit batch exceeding quota based on *actual page counts*. Verify expected failures and correct usage increment for successes.
        *   Verify basic status updates on list/detail pages.

---