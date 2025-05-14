
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

    *  [x] **8.1.4: Implement Step 3: Review & Submit UI & Logic**:
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

    *  [x] **8.1.5: Update Sidebar Navigation**:
        *   **Action**: Add a link to `/dashboard/batch-upload` in `components/utilities/app-sidebar.tsx`.
        *   **Files**: `components/utilities/app-sidebar.tsx`.
        *   **Instructions**: Add a `SidebarMenuItem` with the `Layers` icon (or a more specific batch icon if available) linking to the new page. Ensure it's placed logically within the navigation structure.

---

---

**Step 8.2: Implement Batch Creation Server Action (`actions/batch/batchActions.ts`)**

*  [x]  **Task**: Develop the `createBatchUploadAction` server action. This action is triggered when the user clicks "Submit Batch" in the UI Wizard (Step 3). It handles the initial setup of the batch job, including validation, file uploads, server-side page counting, and database record creation, before handing off to the background processor.Ensure the createBatchUploadAction server action correctly receives and processes the batchName.
*   **Goal**: Securely and atomically create the batch record and associated document records, validate user permissions and limits, upload files to storage, accurately count pages, associate the correct prompts, and queue the batch for background processing. The server action should save the user-provided batch name to the database.
* Create Batch Record:The existing logic userId: userId, name: batchName, ... for tx.insert(extractionBatchesTable) is correct for saving the name.

* Analytics:
Modify the trackServerEvent call to include batchName if available:

await trackServerEvent('batch_created', userId, { 
  batchId, 
  batchName: batchName || 'Untitled Batch', // Provide a fallback for analytics
  fileCount: successfulUploads, 
  totalPages: totalBatchPages, 
  promptStrategy 
}) 


*   **File**: `actions/batch/batchActions.ts`
*   **Inputs**: `formData: FormData` (containing `files: File[]`, `batchName?: string`, `promptStrategy: 'global' | 'per_document' | 'auto'`, `globalPrompt?: string`, `perDocPrompts?: string` (JSON stringified `Record<string, string>`)).
*   **Outputs**: `ActionState<{ batchId: string }>` on success, or error `ActionState`.
*   **Detailed Steps**:
    1.  **`"use server"` Directive**: Mark the file accordingly.
    2.  **Authentication**: Call `getCurrentUser()` from `lib/auth-utils.ts` to get `userId`. Return error `ActionState` if unauthorized.
    3.  **FormData Parsing**:
        *   Extract `files` array (`formData.getAll("files")`).
        *   Extract `batchName`.
        *   Extract `promptStrategy`.
        *   Conditionally extract `globalPrompt` if `promptStrategy === 'global'`.
        *   Conditionally extract and `JSON.parse` `perDocPrompts` if `promptStrategy === 'per_document'`. Handle potential parsing errors.
    4.  **Subscription & Tier Validation**:
        *   Call `getUserSubscriptionDataKVAction()` from `actions/stripe/sync-actions.ts` to get the user's current subscription status and `planId` from Redis (the source of truth). Handle potential errors fetching this data.
        *   Determine the effective `tier` ('starter', 'plus', 'growth') based on the status and `planId`. Use `validateTier` from `lib/rate-limiting/limiter.ts`.
        *   Check if the user's `tier` allows batch processing (i.e., not 'starter'). Return error `ActionState` if not allowed.
        *   Get the `batchFileLimit` for the user's `tier` from `lib/config/subscription-plans.ts`.
        *   Check if `files.length` exceeds `batchFileLimit`. Return error `ActionState` if it does.
    5.  **Prompt Validation**:
        *   If `promptStrategy === 'global'`, check if `globalPrompt` is provided and non-empty. Return error `ActionState` if not.
        *   If `promptStrategy === 'per_document'`, ensure `perDocPrompts` was provided and parsed correctly. (Individual prompt validation happens later during file loop).
    6.  **Server-Side File Validation**:
        *   Iterate through the `files` array.
        *   For each file, validate its MIME type against the allowed list (`application/pdf`, `image/jpeg`, `image/png`).
        *   Validate its size against `MAX_FILE_SIZE_BYTES`.
        *   Collect any invalid files and their error reasons.
        *   If any files are invalid, return a failure `ActionState` listing the invalid files and reasons.
    7.  **Rate Limiting**: Call `checkRateLimit(userId, tier, 'batch_upload')`. Return error `ActionState` if limit is exceeded.
    8.  **Preliminary Quota Check**: Call `checkUserQuotaAction(userId, files.length)`. This is a *preliminary* check based on file count, not page count. Return error `ActionState` if this basic check fails (e.g., user has 0 pages left). *Accurate page-based quota checks happen later during background processing.*
    9.  **Database Transaction (`db.transaction`)**: Wrap the core logic in a transaction for atomicity.
        *   **Create Batch Record**: `tx.insert(extractionBatchesTable)`:
            *   `userId`: Authenticated user ID.
            *   `name`: `batchName` or null.
            *   `prompt_strategy`: Received `promptStrategy`.
            *   `extraction_prompt`: `globalPrompt` if strategy is 'global', otherwise `null`.
            *   `status`: `'pending_upload'`.
            *   `document_count`: `files.length` (initial count).
            *   `completed_count`, `failed_count`, `total_pages`: Initialize to 0.
        *   Retrieve the `newBatchId` from the inserted record.
        *   **Initialize Loop Variables**: `totalBatchPages = 0`, `successfulUploads = 0`, `failedProcessing = 0`, `documentInsertData = []`.
        *   **Loop Through Validated Files**: For each `file` in the *validated* file list:
            *   `try...catch` block for individual file processing resilience.
            *   **Read Buffer**: Convert `file` to `Buffer`.
            *   **Generate Storage Path**: Create a unique path: `batches/{userId}/{newBatchId}/{uuidv4()}-{sanitizedFilename}`.
            *   **Upload to Storage**: Call `uploadToStorage('documents', storagePath, buffer, file.type)` from `lib/supabase/storage-utils.ts`. If upload fails, increment `failedProcessing`, log the error, and `continue` to the next file.
            *   **Count Pages**: Call `getServerSidePageCount(buffer, file.type)` from `lib/utils/document-utils.ts`. If page counting fails (e.g., corrupted PDF), increment `failedProcessing`, log the error, potentially delete the uploaded file from storage, and `continue`. Add the `pageCount` to `totalBatchPages`.
            *   **Determine Document Prompt**:
                *   If `promptStrategy === 'global'`, `docPrompt = null`.
                *   If `promptStrategy === 'per_document'`, `docPrompt = perDocPromptsMap[file.name] || null`. If `null`, log a warning or potentially mark as failed (`failedProcessing++`, continue).
                *   If `promptStrategy === 'auto'`, `docPrompt = null`.
            *   **Prepare Document DB Record**: Create an object for `documentsTable` insertion: `userId`, `batchId: newBatchId`, `originalFilename`, `storagePath`, `mimeType`, `fileSize`, `pageCount`, `extraction_prompt: docPrompt`, `status: 'uploaded'`. Add this object to the `documentInsertData` array.
            *   Increment `successfulUploads`.
            *   **Catch Block**: If an error occurs for a file, increment `failedProcessing`, log details.
        *   **Bulk Insert Documents**: If `successfulUploads > 0`, perform `tx.insert(documentsTable).values(documentInsertData)`.
        *   **Handle Complete Failure**: If `successfulUploads === 0` and `files.length > 0`, update the batch record status to `'failed'` using `tx`, and `throw new Error("All files failed during upload/processing.")` to rollback and signal failure.
        *   **Update Batch Record (Success/Partial)**: If at least one file succeeded, update the `extraction_batches` record using `tx`:
            *   `status`: `'queued'`.
            *   `document_count`: `successfulUploads`.
            *   `failed_count`: `failedProcessing`.
            *   `total_pages`: `totalBatchPages`.
            *   `updated_at`: `new Date()`.
        *   Return the `newBatchId`.
    10. **Post-Transaction**:
        *   If the transaction succeeded and returned a `batchId`:
            *   Track analytics event: `trackServerEvent('batch_created', userId, { batchId, fileCount: successfulUploads, totalPages: totalBatchPages, promptStrategy })`.
            *   Revalidate relevant paths: `/dashboard/batches`, `/dashboard/history`.
            *   Return success `ActionState` with `{ batchId }`.
    11. **Outer Error Handling**:
        *   Wrap the entire action logic in a `try...catch`.
        *   If the transaction threw the "All files failed" error, return that specific error `ActionState`.
        *   If the transaction failed for other reasons (DB constraint, etc.) and a `batchId` was created *before* the failure, attempt a best-effort update to set the batch status to `'failed'`.
        *   Log the error.
        *   Return a generic failure `ActionState`.

---

**Step 8.3: Implement Background Processing Logic (API Route & Cron)**

*   **Task**: Create a secure API route triggered by a Vercel Cron Job to process documents within queued batches. This route orchestrates the extraction for each document, respecting quotas and prompt strategies.
*   **Goal**: Reliably process queued batch documents asynchronously, update statuses accurately, handle errors gracefully, and correctly increment user page quotas *only* upon successful extraction.
*   **Files**:
    *   `vercel.json` (Add Cron job definition)
    *   `app/api/batch-processor/route.ts` (New API Route)
    *   `actions/ai/extraction-actions.ts` (Modify to accept prompt, add `invokedByBatchProcessor` flag)
    *   `actions/db/user-usage-actions.ts` (Use existing `checkUserQuotaAction`, `incrementPagesProcessedAction`)
    *   `prompts/classification.ts` (Use `classifyDocument`, `getDefaultPromptForType`)
    *   `db/db.ts`, schema files.
*   **Detailed Steps**:
    1.  **Vercel Cron (`vercel.json`)**: Define a job (e.g., every 5 minutes) targeting `/api/batch-processor`. Include the `CRON_SECRET` in environment variables.
        ```json
        {
          "crons": [
            {
              "path": "/api/batch-processor",
              "schedule": "*/5 * * * *", // Every 5 minutes
              "headers": { // Optional, but good practice
                "Authorization": "Bearer ${CRON_SECRET}"
              }
            }
          ]
        }
        ```
    2.  **API Route (`/api/batch-processor/route.ts`)**:
        *   **Security**: Check `request.headers.get('Authorization')` against `Bearer ${process.env.CRON_SECRET}`. Return 401/403 if invalid.
        *   **Fetch Queued Batches**: Query `extraction_batches` for records where `status = 'queued'`. Limit the number fetched per run (e.g., 5-10) to avoid timeouts. `ORDER BY created_at ASC` for FIFO processing.
        *   **Loop Through Batches**: For each fetched `batch`:
            *   **Atomic Status Update (Locking)**: `UPDATE extraction_batches SET status = 'processing', updated_at = NOW() WHERE id = batch.id AND status = 'queued' RETURNING id`. If `RETURNING` is empty, another processor likely grabbed it; skip this batch.
            *   **Fetch Documents**: Query `documents` where `batch_id = batch.id` AND `status = 'uploaded'`. Limit the number of documents processed per batch per run (e.g., 20) to manage execution time. Select `id`, `userId`, `pageCount`, `mimeType`, `storagePath`, `extraction_prompt` (the per-doc one).
            *   **Initialize Counters**: `batchSuccessCount = 0`, `batchFailCount = batch.failed_count` (start with count of files that failed during upload).
            *   **Loop Through Documents**: For each `doc` in the fetched documents:
                *   `try...catch` block for individual document processing.
                *   **Accurate Quota Check**: `quotaResult = await checkUserQuotaAction(doc.userId, doc.pageCount)`.
                *   **Handle Quota Failure**: If `!quotaResult.isSuccess || !quotaResult.data.hasQuota`:
                    *   Update `documents` status to `'failed'`, set error message.
                    *   Update `extraction_jobs` status to `'failed'`, set error message (find job by `document_id`).
                    *   Increment `batchFailCount`.
                    *   `continue` to the next document. **Do NOT increment usage.**
                *   **Update Document Status**: Set `documents.status = 'processing'`.
                *   **Resolve Prompt (`resolvedPrompt`)**:
                    *   If `batch.prompt_strategy === 'global'`, `resolvedPrompt = batch.extraction_prompt`.
                    *   If `batch.prompt_strategy === 'per_document'`, `resolvedPrompt = doc.extraction_prompt`. Handle `null` case (mark as failed or use a default?). Let's mark as failed for now: update status `'failed'`, increment `batchFailCount`, continue.
                    *   If `batch.prompt_strategy === 'auto'`:
                        *   If `doc.extraction_prompt` is already set (e.g., from a previous retry), use it.
                        *   Else: Download blob from `doc.storagePath`. Call `classifyResult = await classifyDocument(...)`. `resolvedPrompt = getDefaultPromptForType(classifyResult.documentType)`. `UPDATE documents SET extraction_prompt = resolvedPrompt WHERE id = doc.id`. Handle classification errors (use default 'other' prompt, log warning).
                *   **Call AI Extraction**: `aiResult = await extractDocumentDataAction({ documentId: doc.id, extractionPrompt: resolvedPrompt, ... }, true)`. Pass `invokedByBatchProcessor: true`.
                *   **Handle AI Result**:
                    *   If `aiResult.isSuccess`: Update `documents` status `'completed'`. Update `extraction_jobs` status `'completed'`. Increment `batchSuccessCount`. **Increment Usage**: `await incrementPagesProcessedAction(doc.userId, doc.pageCount)`.
                    *   If `!aiResult.isSuccess`: Update `documents` status `'failed'`, set error message. Update `extraction_jobs` status `'failed'`, set error message. Increment `batchFailCount`. **Do NOT increment usage.**
                *   **Catch Block**: If any error occurs during this document's processing, update doc/job status to `'failed'`, log error, increment `batchFailCount`.
            *   **Aggregate Batch Status**: After looping through the *current chunk* of documents for the batch:
                *   Fetch the *latest* counts: `SELECT SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed, SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed FROM documents WHERE batch_id = batch.id`.
                *   Let `totalProcessed = completed + failed`.
                *   Determine `finalBatchStatus`:
                    *   If `totalProcessed === batch.document_count` (all docs attempted):
                        *   If `failed === 0`, status is `'completed'`.
                        *   If `completed > 0 && failed > 0`, status is `'partially_completed'`.
                        *   If `completed === 0 && failed > 0`, status is `'failed'`.
                    *   Else (more documents left to process in subsequent runs): status remains `'processing'`.
                *   Update `extraction_batches`: Set `completed_count = completed`, `failed_count = failed`. If `finalBatchStatus` is determined (not 'processing'), set `status = finalBatchStatus` and `completed_at = NOW()`.
        *   Return `NextResponse.json({ success: true, message: "Batch processing cycle complete." })`. Handle potential errors in the overall route.
    3.  **Modify `extractDocumentDataAction`**:
        *   Add `invokedByBatchProcessor: boolean = false` parameter.
        *   Wrap the `incrementPagesProcessedAction` call: `if (!invokedByBatchProcessor) { await incrementPagesProcessedAction(...) }`.
        *   Ensure it links the created `extraction_jobs` record to the `batchId` if provided in the input (modify the insert step).
        *   Respect the `skipClassification` flag passed in the input options.

---

**Step 9.0: Implement Post-Upload UI (Batch List/Detail & Enhanced Review)**

*   **Task**: Create the user interface for monitoring batch progress, viewing results, and reviewing/editing/confirming individual document extractions, incorporating ideas from the provided screenshots. Ensure the batch name is displayed in the UI where users manage and view their batches.
*   **Goal**: Provide a clear, interactive, and efficient UI for users to manage their batch uploads and extracted data. Allow users to easily identify their batches by the name they provided.

*   **9.1: Batch List Page (`/dashboard/batches`)**
    *   **File**: `app/(dashboard)/dashboard/batches/page.tsx` (Server Component), `components/batch/BatchListClient.tsx` (Client Component).
    *   **Objective**: Display a paginated, sortable, and filterable list of the user's batch jobs.
    *   **Server Component (`page.tsx`)**:
        *   Fetch initial batch data (page 1, default sort) using a *new* server action: `fetchUserBatchListAction`. This action should fetch `extraction_batches` with pagination/sorting/filtering options, returning `{ batches: SelectExtractionBatch[], totalCount: number }`.
        *   Pass initial data to `BatchListClient`. Handle fetch errors.
    *   **Client Component (`BatchListClient.tsx`)**:
        *   `"use client"`.
        *   State: `batches`, `isLoading`, `error`, `pagination` (`currentPage`, `totalPages`), `sorting` (`sortBy`, `sortOrder`), `filters` (`statusFilter`, `nameFilter`).
        *   Data Fetching: Use `useSWR` with `fetchUserBatchListAction` as the fetcher, keyed by state variables (filters, sort, page). Enable polling (`refreshInterval: 5000`).
        *   **UI (using Shadcn `DataTable` example as a base):**
            *   **Filtering/Sorting:** Add controls (e.g., `Input` for name search with debouncing, `Select` for status filter, clickable table headers for sorting). Update SWR key/refetch on changes.
            *   **Table Columns:**
                *   Batch Name/ID (Link to `/dashboard/batches/[batchId]`).
                *   Status (`Badge` with color/icon).
                *   Progress (`Progress` bar: `(completed_count + failed_count) / document_count * 100`, Tooltip showing counts: `Completed: X, Failed: Y, Pending: Z`).
                *   Documents (`document_count`).
                *   Total Pages (`total_pages`).
                *   Submitted (`formatRelativeTime(createdAt)`).
                *   Completed (`formatRelativeTime(completedAt)` if available).
                *   Actions (`DropdownMenu`: View Details, Delete Batch - with confirmation).
            *   **Pagination:** Use Shadcn `Pagination` component, controlled by `currentPage` state and `totalCount`. Trigger refetch on page change.
            *   **Loading/Error/Empty States:** Implement using `Skeleton` and `Alert`. Provide clear messages and a CTA to upload if no batches exist.

        * File: components/batch/BatchListClient.tsx (or equivalent).
Objective: Display the batch name prominently.
UI (DataTable Column):
Modify the "Batch Name/ID" column. It should display batch.name if it exists and is not empty. If batch.name is null or empty, fall back to displaying the batch.id (or a truncated version).
Example logic for display: batch.name || batch.id.substring(0, 8) + '...'.
Filtering/Sorting: If desired, add the ability to filter/sort by the name column. This would require fetchUserBatchListAction to support sorting/filtering by the name field in extraction_batches.    

*   **9.2: Batch Detail Page (`/dashboard/batches/[batchId]`)**
    *   **File**: `app/(dashboard)/dashboard/batches/[batchId]/page.tsx` (Server Component), `components/batch/BatchDetailClient.tsx` (Client Component).
    *   **Objective**: Display detailed information about a specific batch, including its status, summary, and a list of its associated documents with their individual statuses and actions.
    *   **Server Component (`page.tsx`)**:
        *   Get `batchId` from `params`.
        *   Fetch initial batch and document data using a *new* action: `fetchBatchDetailAction(batchId)`. This action fetches the specific `extraction_batches` record and the *first page* of associated `documents` records (with pagination info).
        *   Handle "Not Found" / "Access Denied". Pass data to `BatchDetailClient`.
    *   **Client Component (`BatchDetailClient.tsx`)**:
        *   `"use client"`. Receive initial `batch` and `documents` props.
        *   State: `batchDetails`, `documentsList`, `isLoadingBatch`, `isLoadingDocs`, `error`, `docPagination`, `docFilters` (`status`), `docSorting`.
        *   Data Fetching:
            *   Use `useSWR` for the `batchDetails` (polling for status updates).
            *   Use `useSWR` for `documentsList`, keyed by `batchId`, `docPagination`, `docFilters`, `docSorting`. Fetch using a *new* action: `fetchDocumentsForBatchAction(batchId, options)`.
        *   **UI (incorporating screenshot elements):**
            *   **Batch Header:** Display batch name/ID, overall status (`Badge`), progress bar/counts, dates, total pages. Add "Edit Extraction" (Phase 2?) and "Delete Batch" buttons. (Screenshot: `Batch TkOLAwspgz` header).
            *   **Document Filters:** Tabs for "All", "To Review" (Uploaded/Processing?), "Confirmed" (Completed?), "Error" (Failed). Update `docFilters` state and trigger refetch. (Screenshot: Filter tabs).
            *   **Document Table (`DataTable`):**
                *   Checkbox column for bulk actions.
                *   File Name (Link to `/dashboard/review/[documentId]`).
                *   Status (`Badge` with color/icon).
                *   Name (Extracted Field - *MVP: Show placeholder or first key field*).
                *   Line Items (Preview Icon `< >` - *MVP: Show placeholder or count*. Clicking could open a simple modal showing the raw `line_items` JSON/array).
                *   Options (`DropdownMenu` per row): "Export File", "Redo File", "Delete File". (Screenshot: Options dropdown).
            *   **Selection Action Bar:** Appears when checkboxes are selected. Buttons: "Redo Files", "Delete Files", "Export As...". (Screenshot: Selection bar).
            *   **Document Pagination:** Implement if needed based on `fetchDocumentsForBatchAction` results.
            *   Handle loading/error/empty states for the document list.

            * File: components/batch/BatchDetailClient.tsx (or equivalent).
Objective: Display the batch name in the header of the detail page.
UI (Batch Header):
Ensure the batch header prominently displays batchDetails.name. If it's null, you might display "Untitled Batch" or the batchId.

*   **9.3: Enhance Review Page (`/dashboard/review/[id]`)**
    *   **File**: `app/(dashboard)/dashboard/review/[id]/page.tsx` (Client Component - likely needs conversion if it's currently Server).
    *   **Objective**: Integrate the editing and confirmation workflow shown in the screenshots into the existing review page structure.
    *   **UI Changes (Right Panel - `DataVisualizer` needs modification or replacement):**
        *   **Editing:**
            *   Make fields editable when `editMode` is true (pass `isEditable={editMode}` to `InteractiveDataField`).
            *   `InteractiveDataField` should render an `Input` when clicked in edit mode.
            *   Implement "Add Item" / "Remove Item" buttons specifically for array fields (like `line items` in the screenshot). This requires logic within the component rendering the array to manage its state locally before saving.
        *   **Actions:**
            *   Replace the existing "Confirm" button with:
                *   "Save Changes" button: Enabled only when `hasUnsavedChanges && editMode` is true. Calls `handleSaveChanges`.
                *   "Mark as Confirmed" button: Enabled when `!confirmed && !editMode`. Calls `handleMarkConfirmed`. (Alternatively, combine Save & Confirm).
                *   "Reset Changes" button: Enabled when `hasUnsavedChanges && editMode`. Triggers `handleReset`.
            *   Add "Export As..." button: Triggers the `ExportOptionsModal`. (Screenshot: Export button).
            *   Add "Delete" button (Trash Icon): Triggers delete confirmation. (Screenshot: Trash button).
        *   **Status Display:** Clearly show the current `File Status` (e.g., "Processed", "Confirmed"). (Screenshot: File Status).
        *   **Navigation:** Implement Previous/Next document buttons. This requires fetching the list of document IDs *within the same batch* when the page loads and managing the current index.
    *   **State Management:**
        *   Add `editMode`, `confirmed`, `originalData`, `hasUnsavedChanges` state variables.
        *   Modify `fetchDocumentData` to store the initial data in `originalData`.
        *   Update `hasUnsavedChanges` whenever `extractedData` is modified compared to `originalData`.
    *   **New Actions:**
        *   `handleSaveChanges`: Calls `updateExtractedDataAction` with the current `extractedData`. On success, updates `originalData` to match `extractedData`, sets `hasUnsavedChanges` to false, potentially exits edit mode.
        *   `handleMarkConfirmed`: Calls a *new* action `confirmDocumentStatusAction(documentId)` which updates the `documents.status` to `'confirmed'` (or similar). Updates local `confirmed` state.
        *   `handleReset`: Resets `extractedData` to `originalData`, sets `editMode` false, `hasUnsavedChanges` false. Show confirmation dialog first.

*   **9.4: Implement Export Functionality**
    *   **File**: `components/utilities/ExportOptionsModal.tsx` (New Client Component), `actions/batch/batchActions.ts` (New Action: `exportDocumentsAction`).
    *   **Objective**: Allow users to export data for one or multiple selected documents in various formats, including expanding array fields into multiple rows.
    *   **Modal Component (`ExportOptionsModal.tsx`)**:
        *   `"use client"`.
        *   Props: `isOpen`, `onClose`, `documentIds: string[]`, `availableArrayFields: string[]` (e.g., ['line_items', 'addresses']), `onSubmit: (options) => void`.
        *   State: `selectedFormat` ('excel', 'csv', 'json'), `exportType` ('normal', 'multiRow'), `selectedArrayField` (string | null).
        *   UI based on screenshot: File Format buttons, Export Type radio buttons. Conditionally show "Select a field" dropdown (`Select` component) when `exportType === 'multiRow'`, populated with `availableArrayFields`. Cancel/Export File buttons.
        *   `onSubmit` callback passes the selected options.
    *   **Server Action (`exportDocumentsAction`)**:
        *   Inputs: `documentIds: string[]`, `format: 'excel' | 'csv' | 'json'`, `exportType: 'normal' | 'multiRow'`, `arrayFieldToExpand?: string`.
        *   Auth check.
        *   Fetch `extracted_data` for all `documentIds` belonging to the user.
        *   **Formatting Logic:**
            *   `json`: Simple `JSON.stringify`.
            *   `normal` (CSV/Excel): Flatten each document's data into a single row. Headers are all unique keys.
            *   `multiRow` (CSV/Excel): For each document, find the `arrayFieldToExpand`. Create multiple rows, duplicating the non-array fields for each item in the array. Requires careful handling of nested data within the array items. Use a CSV/Excel library (e.g., `papaparse`, `xlsx`) for robust generation.
        *   Upload generated file to `exports` bucket in Supabase Storage (`exports/{userId}/{exportId}.{format}`).
        *   Create record in `exports` table (status `processing` initially, update to `completed` or `failed`).
        *   Generate signed URL for the uploaded export file.
        *   Return `ActionState<{ downloadUrl: string, exportId: string }>`. (Or trigger download directly if feasible, though returning URL is often better).
    *   **Integration**: Trigger modal from Batch Detail page (selection bar, options menu) and Review page. Pass selected `documentIds` and detected array fields. Call `exportDocumentsAction` on modal submit. Handle success/error (e.g., show toast, provide download link).

*   **9.5: Implement "Redo" and "Delete" Document Actions**
    *   **File**: `actions/batch/batchActions.ts` (New Action: `redoDocumentExtractionAction`), `actions/db/documents.ts` (Use existing `deleteDocumentAction`).
    *   **Objective**: Allow users to re-process failed/completed documents or delete individual documents from a batch.
    *   **`redoDocumentExtractionAction(documentId: string)`**:
        *   Auth check.
        *   Verify document ownership (`SELECT id FROM documents WHERE id = documentId AND user_id = userId`).
        *   Update `documents` status to `'uploaded'`.
        *   Update corresponding `extraction_jobs` status to `'queued'`, clear `error_message`.
        *   Optionally: Delete existing `extracted_data` for this document/job.
        *   Update parent `extraction_batches` counts (decrement completed/failed, potentially change batch status back to `processing` or `partially_completed`).
        *   Revalidate paths. Return success/error `ActionState`.
    *   **`deleteDocumentAction(documentId: string)`**: (Existing action in `actions/db/documents.ts`)
        *   Ensure this action also updates the parent `extraction_batches` counts (`document_count`, potentially `completed_count`/`failed_count`) after successfully deleting the document and its related job/data (due to cascade). This might require fetching the batch ID *before* deleting the document.
    *   **Integration**: Add "Redo File" and "Delete File" options to the `DropdownMenu` in the Batch Detail table and potentially on the Review page. Use confirmation dialogs (`AlertDialog`) for delete actions. Disable "Redo" if the document status is already 'processing' or 'queued'. Update UI optimistically or refetch data on success.

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

** Testing (MVP Focus)**

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
















Okay, here are the specific instructions for implementing the recommendations we discussed for `actions/batch/batchActions.ts` and related files.

**Recommendation 1: Function Length **

*  
*   **Consideration:** If the file processing loop within `db.transaction` in `createBatchUploadAction` becomes significantly more complex, extract it into a private async helper function within `actions/batch/batchActions.ts`.

    ```typescript
    // In actions/batch/batchActions.ts

    // Example structure for the helper (details depend on your exact logic)
    async function _processAndPrepareDocument(
      file: File,
      userId: string,
      currentBatchId: string,
      promptStrategy: 'global' | 'per_document' | 'auto',
      perDocPromptsMap: Record<string, string>
    ): Promise<{ success: boolean; dbData?: typeof documentsTable.$inferInsert; pageCount?: number; error?: string }> {
      const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const uniqueFilename = `${uuidv4()}-${sanitizedFilename}`;
      const storagePath = `batches/${userId}/${currentBatchId}/${uniqueFilename}`;
      let fileNodeBuffer: Buffer;
      let pageCount: number;

      try {
        const fileArrayBuffer = await file.arrayBuffer();
        fileNodeBuffer = Buffer.from(fileArrayBuffer);
        // Assuming getPageCount is defined elsewhere and imported
        pageCount = await getPageCount(file, fileArrayBuffer); 
      } catch (countError: any) {
        console.error(`Failed to get page count for ${file.name}:`, countError.message);
        return { success: false, error: `Page count failed: ${countError.message}` };
      }

      try {
        const uploadResult = await uploadToStorage(
          process.env.NEXT_PUBLIC_SUPABASE_DOCUMENTS_BUCKET!,
          storagePath,
          fileNodeBuffer,
          file.type
        );

        if (!uploadResult.success || !uploadResult.data?.path) {
          return { success: false, error: `Upload failed: ${uploadResult.error || "Missing path"}` };
        }

        let docPrompt: string | null = null;
        if (promptStrategy === 'per_document') {
          docPrompt = perDocPromptsMap[file.name] || null;
          if (!docPrompt) {
            return { success: false, error: `Missing prompt for ${file.name} (per-document strategy)`};
          }
        }
        // 'global' and 'auto' strategies will have docPrompt as null here,
        // as the global prompt is on the batch, and auto-prompt is resolved by the processor.

        return {
          success: true,
          dbData: {
            userId: userId,
            batchId: currentBatchId,
            originalFilename: file.name,
            storagePath: uploadResult.data.path,
            mimeType: file.type,
            fileSize: file.size,
            pageCount: pageCount,
            extractionPrompt: docPrompt, // This will be null for 'global' and 'auto'
            status: 'uploaded',
          },
          pageCount: pageCount,
        };

      } catch (fileProcessingError: any) {
         return { success: false, error: `File processing error: ${fileProcessingError.message}` };
      }
    }

    // Then in createBatchUploadAction:
    // ...
    // for (const file of files) {
    //   const result = await _processAndPrepareDocument(file, userId, currentBatchId, promptStrategy, perDocPromptsMap);
    //   if (result.success && result.dbData && result.pageCount !== undefined) {
    //     documentInsertData.push(result.dbData);
    //     totalBatchPages += result.pageCount;
    //     successfulUploads++;
    //   } else {
    //     filesFailedInitialProcessing++;
    //     console.error(`Skipping file ${file.name} due to error: ${result.error}`);
    //   }
    // }
    // ...
    ```

---

**Recommendation 2: Subscription Data Source (High Priority)**

*   **Goal:** Use `getUserSubscriptionDataKVAction` in `createBatchUploadAction` to determine `userTier` for more reliable entitlement checks.

*   **Step 2.1: Modify `actions/batch/batchActions.ts`**
    1.  Import `getUserSubscriptionDataKVAction`:
        ```typescript
        import { getUserSubscriptionDataKVAction } from "@/actions/stripe/sync-actions";
        ```
    2.  Replace the `getProfileByUserIdAction` call for tier validation with `getUserSubscriptionDataKVAction`:

        ```typescript
        // Inside createBatchUploadAction, after FormData Parsing

        // 3. Subscription & Tier Validation
        const subscriptionResult = await getUserSubscriptionDataKVAction(); // No userId needed if it gets from auth internally
                                                                        // If it needs userId, pass it: await getUserSubscriptionDataKVAction(userId);
        if (!subscriptionResult.isSuccess) {
          return {
            isSuccess: false,
            message: subscriptionResult.message || "Failed to fetch user subscription data for tier validation.",
            error: "SUBSCRIPTION_FETCH_FAILED_TIER_VALIDATION",
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

        // ... (rest of the tier validation logic using userTier and planDetails remains the same)
        // if (userTier === "starter") { ... }
        // const planDetails = subscriptionPlans[userTier];
        // ...
        ```

*   **Step 2.2: Verify `getUserSubscriptionDataKVAction`**
    *   Ensure `actions/stripe/sync-actions.ts` -> `getUserSubscriptionDataKVAction` correctly fetches the current authenticated user's ID if no `userIdOfBillingUser` is passed. It currently does: `const userId = userIdOfBillingUser ?? await getCurrentUser();`. This is good.
    *   Confirm that your Stripe webhook handlers in `actions/stripe/webhook-actions.ts` are reliably updating the Redis KV store via `syncStripeDataToKV` and subsequently updating `profilesTable.membership` via `updateProfileByStripeCustomerIdAction`. The order should be: Stripe Event -> Webhook -> `syncStripeDataToKV` (updates Redis) -> `updateProfileByStripeCustomerIdAction` (updates `profiles` table). This ensures `profilesTable.membership` can serve as a reliable fallback if KV fails, but KV is primary.

---

**Recommendation 3: Analytics Placeholder (Standard Practice)**

*   **Goal:** Ensure `trackServerEvent` correctly sends data to PostHog.
*   **Step 3.1: Verify PostHog Configuration**
    1.  In your `.env.local` (and corresponding Vercel environment variables for production), ensure `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` (if not using the default US host) are correctly set.
    2.  The implementation in `lib/analytics/server.ts` for `getPostHogServerClient()` and `trackServerEvent()` looks correct.
        ```typescript
        // lib/analytics/server.ts - Excerpt (already good)
        export async function trackServerEvent(
          eventName: string, 
          userId: string, 
          properties?: Record<string, any>
        ) {
          try {
            const client = getPostHogServerClient(); // This initializes PostHog
            await client.capture({ // This sends the event
              distinctId: userId,
              event: eventName,
              properties
            });
          } catch (error) {
            console.error("Failed to track server event:", error);
          }
        }
        ```
    3.  **Test:** After deploying these changes (or locally with env vars set), trigger the `createBatchUploadAction` and verify in your PostHog dashboard that the `batch_created` event appears with the correct properties.

*   **Step 3.2: Update `createBatchUploadAction` Analytics Call (Already in your plan)**
    *   Ensure the `batchName` is included in the properties sent to `trackServerEvent`.
        ```typescript
        // In createBatchUploadAction, after successful transaction:
        console.log(`Analytics: trackServerEvent('batch_created', ${userId}, { batchId: ${batchId}, batchName: '${batchName || 'Untitled Batch'}', fileCount: ${successfulUploads}, totalPages: ${totalBatchPages}, promptStrategy: '${promptStrategy}' })`);
        // Replace console.log with actual call:
        await trackServerEvent('batch_created', userId, {
            batchId: batchId,
            batchName: batchName || 'Untitled Batch', // Provide a fallback for analytics
            fileCount: successfulUploads,
            totalPages: totalBatchPages,
            promptStrategy: promptStrategy
        });
        ```

---

**Recommendation 4: Error Message in Transaction Catch (Improved Debugging)**

*   **Goal:** Store the last critical error message on the `extraction_batches` table.

*   **Step 4.1: Modify Database Schema**
    1.  Open `db/schema/extraction-batches-schema.ts`.
    2.  Add a new nullable text column for the error message:
        ```typescript
        // db/schema/extraction-batches-schema.ts
        import {
          integer,
          pgTable,
          text, // Ensure text is imported
          timestamp,
          uuid
        } from "drizzle-orm/pg-core";
        import { batchStatusEnum, promptStrategyEnum } from "./enums";
        import { profilesTable } from "./profiles-schema";

        export const extractionBatchesTable = pgTable("extraction_batches", {
          // ... existing columns ...
          totalPages: integer("total_pages").default(0).notNull(),
          createdAt: timestamp("created_at").defaultNow().notNull(),
          updatedAt: timestamp("updated_at")
            .defaultNow()
            .notNull()
            .$onUpdate(() => new Date()),
          completedAt: timestamp("completed_at"),
          lastErrorMessage: text("last_error_message"), // <-- ADD THIS LINE
        });
        ```
    3.  Generate and apply the migration:
        *   Run `pnpm drizzle-kit generate`
        *   Review the generated SQL migration file (it should add the `last_error_message` column).
        *   Run `pnpm drizzle-kit migrate` (or apply SQL manually in production).

*   **Step 4.2: Update `createBatchUploadAction` Transaction Catch Block**
    1.  Modify the `catch (transactionError: any)` block in `actions/batch/batchActions.ts`:
        ```typescript
        // In actions/batch/batchActions.ts
        // ...
        } catch (transactionError: any) {
           console.error("Batch creation transaction or post-transaction step failed:", transactionError.message);
           if (batchId) { // batchId might be null if error occurred before batch record creation
               try {
                   const errorMessageToStore = transactionError.message 
                                               ? transactionError.message.substring(0, 1000) // Truncate to prevent overly long messages
                                               : "Unknown transaction error";
                   await db.update(extractionBatchesTable)
                       .set({ 
                           status: 'failed', 
                           updatedAt: new Date(),
                           lastErrorMessage: errorMessageToStore // Store the error message
                       })
                       .where(eq(extractionBatchesTable.id, batchId));
                   console.log(`Marked batch ${batchId} as failed due to error: ${errorMessageToStore}`);
               } catch (updateError: any) {
                   console.error(`Failed to mark batch ${batchId} as failed and store error message after transaction error: ${updateError.message}`);
               }
           }
           return {
               isSuccess: false,
               message: transactionError.message || "Failed to create batch due to a server error.",
               error: "TRANSACTION_OR_POST_TRANSACTION_ERROR",
           };
        }
        // ...
        ```

---

By implementing these instructions, your `createBatchUploadAction` will be more robust in its tier validation, provide better analytics, and offer improved debuggability for batch creation failures. Remember to test these changes thoroughly.