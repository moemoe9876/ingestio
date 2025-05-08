
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

**Step 8.1: Implement Batch Upload UI (3-Step Wizard - Based on v0 Mockup)**

*   **Task**: Develop the multi-step frontend interface (Wizard) for batch uploads, precisely following the design and flow demonstrated in the provided v0 UI mockup screenshots.
*   **Goal**: Create an intuitive, accessible, and informative 3-step wizard that guides users through file selection, prompt configuration, and batch review/submission, while respecting tier limits derived from the KV store and providing clear feedback as per the v0 mockup.
*   **Modules**:

    *  [x] **8.1.1: Create Batch Upload Page & Wizard Wrapper Component**:
        *   **Action**: Set up the main page at `app/(dashboard)/dashboard/batch-upload/page.tsx`. This page will render a new primary client component, `components/batch/BatchUploadWizard.tsx`, which will manage the state and rendering of the 3-step wizard. Implement tier-based access control.
        *   **Files**:
            *   `app/(dashboard)/dashboard/batch-upload/page.tsx` (New or modify existing)
            *   `components/batch/BatchUploadWizard.tsx` (New Client Component)
            *   `components/batch/WizardNav.tsx` (New or adapt from v0 `wizard-nav.tsx`)
            *   `components/batch/PlanInfoBanner.tsx` (New or adapt from v0 `plan-info.tsx`)
            *   (Uses `actions/stripe/sync-actions.ts`, `lib/config/subscription-plans.ts`)
        *   **Instructions for `BatchUploadWizard.tsx` (`"use client"`)**:
            1.  **State Management:**
                *   `currentStep: number` (1, 2, or 3), initialized to 1.
                *   `selectedFiles: File[]`, initialized to `[]`.
                *   `fileRejections: { file: File, errors: { code: string, message: string }[] }[]`, initialized to `[]`.
                *   `promptStrategy: "global" | "per_document" | "auto-detect"`, initialized to `"global"`.
                *   `globalPrompt: string`, initialized to an empty string or a default placeholder.
                *   `perDocPrompts: Record<string, string>`, initialized to `{}` (maps `file.name` to prompt string).
                *   `batchName: string` (optional, consider adding an input for this in Step 1 or 3 if desired, for now, it's not in the mockup).
                *   `userPlanId: PlanId | null`, `userTier: SubscriptionTier | null`, `batchFileLimit: number | null`.
                *   `isLoadingSubscription: boolean`, initialized to `true`.
                *   `subscriptionError: string | null`.
                *   `isSubmitting: boolean` (for `useTransition`).
            2.  **Layout Structure (within `BatchUploadWizard.tsx`):**
                *   Main container div with `max-w-5xl`, `mx-auto`, `py-8 px-4`.
                *   Page Title: "New Batch Upload".
                *   Render `PlanInfoBanner.tsx` component, passing `userPlanId` and `batchFileLimit`.
                *   Render `WizardNav.tsx` component, passing `currentStep`.
                *   Conditionally render content for Step 1, 2, or 3 based on `currentStep`.
                *   Implement navigation buttons ("Previous", "Next", "Submit Batch") at the bottom, with visibility and labels changing based on `currentStep`.
            3.  **`useEffect` for Subscription Data & Access Control:**
                *   Fetch subscription data (`planId`, `status`) via `getUserSubscriptionDataKVAction`. Update `userPlanId`, `userTier`, `batchFileLimit` (from `subscriptionPlans[tier].batchProcessingLimit`), `isLoadingSubscription`, and `subscriptionError` states.
                *   If user is on 'starter' tier or subscription is not 'active'/'trialing', display an "Access Denied / Upgrade Required" message (e.g., using Shadcn `Alert` component with a link to billing settings) instead of the wizard steps.
            4.  **Helper Functions:**
                *   `handleNextStep()`, `handlePreviousStep()`.
                *   `handleSubmitBatch()`: Prepares `FormData` and calls `createBatchUploadAction` using `startTransition`.

    *  [x] **8.1.2: Implement Step 1: File Selection UI & Logic**:
        *   **Action**: Integrate or adapt the file upload functionality shown in the v0 mockup's `file-upload.tsx` into the 'Files' step of `BatchUploadWizard.tsx`.
        *   **Files**: `components/batch/BatchUploadWizard.tsx`, `components/utilities/BatchFileUpload.tsx` (Adapt or use v0's `file-upload.tsx` logic).
        *   **Instructions (within `BatchUploadWizard.tsx` - Files Step Content)**:
            1.  **Dropzone & Button:**
                *   Implement the drag & drop area styled as per the mockup (dashed border, centered text "Drag & drop files here or click to browse", "Upload your files to begin processing").
                *   Include an "Upload Files" `Button` (black background, white text as in mockup).
                *   Use `react-dropzone` for this functionality.
            2.  **Constraint Display:** Below the dropzone, display: "Max files per batch: {batchFileLimit}", "Allowed types: PDF, JPG, PNG", "Max file size: 50MB". Use small text and bullet point icons as in the mockup.
            3.  **File Handling Logic (from `react-dropzone` `onDrop` callback):**
                *   Update `selectedFiles` state with accepted files, respecting `batchFileLimit`.
                *   Update `fileRejections` state for rejected files, capturing error messages.
            4.  **Selected Files List:**
                *   Render a section titled "Selected Files ({validFileCount} valid)".
                *   Map `selectedFiles` to display valid files:
                    *   Use appropriate Lucide icons (`FileText` for PDF, `ImageIcon` for images).
                    *   Display `file.name` and `formatFileSize(file.size)`.
                    *   Add an "X" icon `Button` (ghost, small) to remove the file.
                *   Map `fileRejections` to display rejected files:
                    *   Style with a red background/text and `AlertCircleIcon`.
                    *   Display file icon, name, size, and the specific error message.
                    *   Add an "X" icon `Button`.
            5.  **Navigation:** "Next: Configure Prompts" button, disabled if no valid files are selected.
            6.  **Accessibility:** Ensure dropzone and file list are keyboard navigable and screen-reader friendly (Report Sec 2.6).

    *  [x] **8.1.3: Implement Step 2: Prompt Configuration UI & Logic**:
        *   **Action**: Implement the UI for selecting prompt strategy and inputting prompts, as shown in the v0 mockup's `prompt-configuration.tsx`.
        *   **Files**: `components/batch/BatchUploadWizard.tsx`, Shadcn `RadioGroup`, `Textarea`, `Label`, `ScrollArea`.
        *   **Instructions (within `BatchUploadWizard.tsx` - Prompts Step Content)**:
            1.  **Prompt Strategy Selection:**
                *   Use Shadcn `RadioGroup` and `RadioGroupItem` for "Global Prompt," "Per-Document Prompt," and "Auto-Detect & Prompt."
                *   Style with `Label` and descriptions as per the mockup.
                *   Bind to `promptStrategy` state.
            2.  **Conditional Prompt Inputs (within a `Card`-like container):**
                *   **If `promptStrategy === 'global'`:**
                    *   Section title: "Enter Global Extraction Prompt".
                    *   Descriptive text: "This prompt will be applied to all documents in the batch."
                    *   Shadcn `Textarea` bound to `globalPrompt` state.
                *   **If `promptStrategy === 'per_document'`:**
                    *   Section title: "Configure Individual Document Prompts".
                    *   Descriptive text: "Customize extraction prompts for each document in your batch."
                    *   Use `ScrollArea` for the list if it can be long.
                    *   Map `selectedFiles` (valid ones). For each:
                        *   Display file icon and `file.name`.
                        *   Shadcn `Textarea` for its specific prompt, value from `perDocPrompts[file.name]`, `onChange` updates `perDocPrompts`.
                        *   Style with subtle separators between file prompt entries.
                *   **If `promptStrategy === 'auto_detect'`:**
                    *   Section title: "Auto-Detect & Prompt".
                    *   Descriptive text: "IngestIO will automatically detect the document type and apply the best extraction settings. No prompt needed here."
                    *   Blue highlighted info box: "Our AI will analyze each document, identify its type, and extract relevant information automatically. This is ideal for mixed document batches." (Use Shadcn `Alert` with an `InfoCircledIcon`).
            3.  **UI Hint:** Ensure descriptions for strategies are clear.
            4.  **Validation:** "Next: Review Batch" button disabled if:
                *   `promptStrategy === 'global'` and `globalPrompt` is empty.
                *   `promptStrategy === 'per_document'` and any valid file lacks a non-empty prompt in `perDocPrompts`.

    *   **8.1.4: Implement Step 3: Review & Submit UI & Logic**:
        *   **Action**: Display a summary of the batch configuration and handle submission, as shown in the v0 mockup's `batch-review.tsx`.
        *   **Files**: `components/batch/BatchUploadWizard.tsx`, `actions/batch/batchActions.ts`, Shadcn `Card`, `Collapsible`.
        *   **Instructions (within `BatchUploadWizard.tsx` - Review Step Content)**:
            1.  **Batch Summary Section (within a `Card` or styled div):**
                *   Display "Files": Count of valid files, `getTotalSize()` (helper function to sum sizes and format).
                *   Display "Strategy": Formatted `promptStrategy` label.
                *   Display "Processing": "Standard", "Est. time: 2-3 minutes".
            2.  **Prompt Details (Collapsible Section):**
                *   Use Shadcn `Collapsible`, `CollapsibleTrigger` (with `ChevronUpIcon`/`ChevronDownIcon`), `CollapsibleContent`.
                *   Trigger text: "Prompt Details".
                *   Content:
                    *   If `promptStrategy === 'global'`: "Global Prompt:", then the `globalPrompt` text.
                    *   If `promptStrategy === 'per_document'`: "Per-Document Prompts:", then list each file (icon, name) and its prompt from `perDocPrompts`.
                    *   If `promptStrategy === 'auto_detect'`: This section is omitted (as per mockup).
            3.  **Files (Collapsible Section):**
                *   Trigger text: "Files ({validFileCount})".
                *   Content: List valid `selectedFiles` with icon, name, and size.
            4.  **Informational Note:** Display message with `InfoCircledIcon`: "Once submitted, this batch will be processed according to your plan settings. You'll receive a notification when processing is complete."
            5.  **Submit Button:** "Submit Batch" button, bound to `handleSubmitBatch` function. Disable if `isSubmitting`.

    *   **8.1.5: Update Sidebar Navigation**:
        *   **Action**: Add a link to `/dashboard/batch-upload` in `components/utilities/app-sidebar.tsx`.
        *   **Files**: `components/utilities/app-sidebar.tsx`.
        *   **Instructions**: Add a `SidebarMenuItem` with the `Layers` icon (or a more specific batch icon if available) linking to the new page. Ensure it's placed logically within the navigation structure.

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

**Step 8.4: Implement Polished Batch Status UI**

*   **Task**: Build sophisticated frontend pages for users to comprehensively monitor their batch jobs, view detailed progress, access results, and manage batches.
*   **Goal**: Provide a clear, intuitive, visually appealing, and informative interface for batch monitoring that aligns with modern SaaS standards and enhances user trust and productivity.
*   **Modules**:

    *   **8.4.1: Create Batch List Action & Page (`/dashboard/batches`)**:
        *   **Action**: Define `fetchUserBatchesAction` server action. Implement the main batch listing page UI.
        *   **Files**: `actions/batch/batchActions.ts` (New Action), `app/(dashboard)/dashboard/batches/page.tsx` (New Page), `components/batch/BatchListClient.tsx` (New Client Component).
        *   **Instructions**:
            1.  **`fetchUserBatchesAction`**:
                *   Accept parameters for pagination (`page`, `pageSize`), sorting (`sortBy`, `sortOrder`), and potentially filtering (`statusFilter`, `nameFilter`).
                *   Authenticate user (`getCurrentUser`).
                *   Query `extraction_batches` table using Drizzle, applying `WHERE eq(userId, ...)`, filtering, sorting (`orderBy`), and pagination (`limit`, `offset`).
                *   Include a `count()` query to get the total number of batches matching the filters for pagination controls.
                *   Return `ActionState<{ batches: SelectExtractionBatch[], totalCount: number }>`. Handle errors gracefully.
            2.  **`page.tsx` (Server Component)**:
                *   Fetch initial batch data (e.g., page 1, default sort) using `fetchUserBatchesAction`.
                *   Pass initial data, total count, and initial query params to `BatchListClient`. Handle initial fetch errors.
            3.  **`BatchListClient.tsx` (`"use client"`)**:
                *   Manage state: `batches`, `isLoading`, `error`, `pagination` (`currentPage`, `totalPages`), `sorting`, `filters`.
                *   Use `useSWR` or a similar hook (with `fetchUserBatchesAction` as the fetcher) for data fetching, enabling automatic revalidation/polling (e.g., `refreshInterval: 5000`) for status updates. Key the SWR hook with filters/sort/page state.
                *   **UI Implementation**:
                    *   Use `Card` or a similar container for the main list area.
                    *   Implement filtering controls (e.g., `DropdownMenu` or `Select` for Status, `Input` with `Search` icon for Name). Use debouncing for the search input.
                    *   Implement sorting controls (e.g., `DropdownMenu` attached to table headers).
                    *   Display batches using `DataTable` (from Shadcn examples) or a custom responsive grid/list:
                        *   **Columns/Fields:** Batch Name (or ID if unnamed), Status (use `Badge` with `getStatusColorClasses` and `getStatusIcon`), **Detailed Progress** (Display `X / Y documents` and a `Progress` bar calculating `(completed_count + failed_count) / document_count * 100`), **Total Pages**, Submitted Date (`formatRelativeTime`), Completed Date (if applicable).
                        *   **Actions:** Include a "View Details" button/link (`Link href="/dashboard/batches/[batchId]"`) and potentially quick actions like "Delete" (with confirmation dialog) via a `DropdownMenu` (`MoreHorizontal` icon).
                    *   Implement `Pagination` component based on `totalCount` and `pageSize`.
                    *   Use `Skeleton` loaders during initial load and refresh.
                    *   Display clear error messages using `Alert` if fetching fails.
                    *   Show an informative empty state (e.g., "No batches found matching your criteria" or "Upload your first batch!") with a CTA button linking to `/dashboard/batch-upload`.
                    *   Use `motion` components for subtle list item animations (e.g., fade-in).

    *   **8.4.2: Create Batch Detail Action & Page (`/dashboard/batches/[batchId]`)**:
        *   **Action**: Define `fetchBatchDetailsAction` server action. Implement the detail page structure.
        *   **Files**: `actions/batch/batchActions.ts` (New Action), `app/(dashboard)/dashboard/batches/[batchId]/page.tsx` (New Page).
        *   **Instructions**:
            1.  **`fetchBatchDetailsAction`**:
                *   Accept `batchId` parameter.
                *   Authenticate user (`getCurrentUser`).
                *   Query `extraction_batches` table `WHERE eq(id, batchId) AND eq(userId, ...)`. If not found, return error `ActionState`.
                *   Query associated `documents` table `WHERE eq(batchId, batchId)`, potentially with pagination/sorting options passed in. Select necessary columns: `id`, `originalFilename`, `status`, `pageCount`, `extraction_prompt` (the per-doc one), `updatedAt`.
                *   Return `ActionState<{ batch: SelectExtractionBatch, documents: SelectDocument[] /* Add pagination info if needed */ }>`.
            2.  **`page.tsx` (Server Component)**:
                *   Get `batchId` from `params`.
                *   Fetch initial batch and document data using `fetchBatchDetailsAction(batchId)`.
                *   Handle "Not Found" or "Access Denied" errors from the action (e.g., show a 404 page or error message).
                *   Pass fetched `batch` and initial `documents` data to `BatchDetailClient`.

    *   **8.4.3: Implement Batch Detail Client Component**:
        *   **Action**: Build the interactive client component for displaying detailed batch information and associated documents.
        *   **Files**: `components/batch/BatchDetailClient.tsx` (New Component).
        *   **Instructions**:
            1.  `"use client"`. Receive initial `batch` and `documents` props.
            2.  Use `useSWR` or similar for polling/refreshing batch status and potentially the document list (key SWR with `batchId` and any document filters/sort state).
            3.  **Batch Summary Display**:
                *   Use `Card` components to display key batch info: Name, ID, Status (`Badge`), **Prompt Strategy** (display 'Global', 'Per-Document', or 'Auto-Detect').
                *   If strategy is 'Global', display the `batch.extraction_prompt` (potentially truncated with a "Show More" modal/tooltip).
                *   Show **Detailed Progress**: Display counts (`Completed: X`, `Failed: Y`, `Pending: Z`) and a prominent `Progress` bar.
                *   Display Dates: Submitted, Started Processing (if available), Completed At.
                *   Display **Total Pages**.
            4.  **Document List Display**:
                *   Use `DataTable` for the list of documents within the batch.
                *   **Columns:** Filename (with file type icon), Status (`Badge` with color/icon), **Page Count**, **Effective Prompt** (Display per-doc prompt snippet; use Tooltip/Dialog for full prompt; indicate if 'Global' or 'Auto-resolved' was used), Last Updated (`formatRelativeTime`), Error Message (if status is 'failed', truncated with tooltip/modal).
                *   **Actions Column:** Include "Review" button (`Link href="/dashboard/review/[documentId]"`) enabled only for `completed` status, potentially "Retry" for `failed` status (Phase 2 enhancement), and "Delete" (with confirmation).
                *   Implement client-side filtering (by Status) and sorting (by Name, Status, Updated Date) for the document list within the batch detail view.
            5.  **Interactivity**: Use `motion` for smooth transitions when data updates. Use `Tooltip` extensively for providing more details on hover (e.g., full filenames, full prompts, exact timestamps).
            6.  Handle loading and error states gracefully within the component.

---

**Security Considerations Integrated:**

*   All data fetching actions (`fetchUserBatchesAction`, `fetchBatchDetailsAction`) **must** include `WHERE eq(userId, currentUserId)` clauses, enforced by getting the user ID via `getCurrentUser()` within the action. This leverages the database RLS implicitly but provides an explicit application-level check.
*   Links to document review pages (`/dashboard/review/[documentId]`) rely on the RLS and ownership checks within the `fetchDocumentForReviewAction` on the target page.
*   Delete actions must verify ownership before proceeding.

**Production Readiness Focus:**

*   **Performance:** Use pagination and server-side sorting/filtering for the main batch list. Client-side filtering/sorting is acceptable for the document list within a single batch detail view (assuming batches aren't excessively large for the MVP). Leverage `useSWR` for efficient data fetching and caching. Use `Skeleton` components for better perceived performance during loading.
*   **Reliability:** Implement robust error handling in both server actions and client components. Provide clear feedback to the user on failures. SWR's automatic retry can help with transient network issues.
*   **UX:** Follow consistent design patterns using Shadcn/ui. Provide clear visual cues for statuses and progress. Use tooltips and modals effectively to avoid cluttering the main view. Ensure responsiveness across different screen sizes.
*   **Maintainability:** Structure components logically (e.g., `BatchListClient`, `BatchDetailClient`). Use TypeScript types consistently.

This enhanced plan for Step 8.4 aims to deliver a user interface that is not just functional but also informative, polished, and aligned with the expectations of a modern SaaS application, directly addressing the feedback to move beyond a basic MVP for this crucial user-facing monitoring feature.

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

Successful upload of a single valid file via button click.
Successful upload of a batch of valid files via drag-and-drop.
Attempting to upload files exceeding size limits (expect error).
Attempting to upload disallowed file types (expect error).
Attempting to upload more files than the batch limit (expect error).
Uploading a mix of valid and invalid files (verify correct handling of each).
Cancelling an individual file upload during transfer.
Cancelling an entire batch upload during transfer.
Simulating network interruption during upload and verifying resumability (if implemented).
Verifying correct status updates throughout the process (Waiting, Uploading, Processing, Complete, Error).
Verifying successful AI processing and data extraction (if applicable) by checking final status or querying results.
Verifying specific error messages are displayed correctly for different failure modes (network, validation, server error, virus scan fail).


---









