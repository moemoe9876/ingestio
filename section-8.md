
**Refined Database Schema for Batch Processing:**

Here's the agreed-upon schema structure we'll base our implementation on:

1.  **`extraction_batches` Table:**
    *   `id` (uuid, PK, default gen_random_uuid())
    *   `user_id` (text, FK -> users.user_id, NOT NULL)
    *   `name` (text, NULL) - Optional user-provided name.
    *   `extraction_prompt` (text, NOT NULL) - The prompt for all documents in this batch.
    *   `status` (batch_status_enum, NOT NULL, DEFAULT 'pending_upload') - Enum: ('pending_upload', 'queued', 'processing', 'completed', 'partially_completed', 'failed').
    *   `document_count` (integer, NOT NULL, DEFAULT 0) - Total documents intended for the batch.
    *   `completed_count` (integer, NOT NULL, DEFAULT 0) - Successfully processed documents.
    *   `failed_count` (integer, NOT NULL, DEFAULT 0) - Failed documents.
    *   `total_pages` (integer, NOT NULL, DEFAULT 0) - Sum of page counts for all documents (calculated post-upload).
    *   `created_at` (timestamp, NOT NULL, DEFAULT now())
    *   `updated_at` (timestamp, NOT NULL, DEFAULT now()) - Auto-updates on change.
    *   `completed_at` (timestamp, NULL) - Timestamp when processing finished.

2.  **`documents` Table (Addition):**
    *   ... (existing columns) ...
    *   `batch_id` (uuid, NULL, FK -> extraction_batches.id ON DELETE SET NULL) - Links document to its upload batch.

3.  **`extraction_jobs` Table (Refinement):**
    *   ... (existing columns: `id`, `user_id`, `document_id`, `status` (extraction_status_enum), `extraction_options`, `error_message`, `created_at`, `updated_at`) ...
    *   `batch_id` (uuid, NULL, FK -> extraction_batches.id ON DELETE CASCADE) - Links job to the batch.
    *   `extraction_prompt` (text, NULL) - Copied from the batch for execution context.

4.  **Enums:**
    *   `batch_status_enum`: ('pending_upload', 'queued', 'processing', 'completed', 'partially_completed', 'failed')
    *   `extraction_status_enum` (Existing): ('queued', 'processing', 'completed', 'failed')
    *   `document_status_enum` (Existing): ('uploaded', 'processing', 'completed', 'failed')

---

**Production-Ready Implementation Plan: Section 8**

**Feature Overview:** Implement a scalable and reliable batch document processing system for 'Plus' and 'Growth' tier users, enabling simultaneous upload and processing of multiple documents with consistent tracking and status updates.

**Tier Limits:**
*   **Plus Tier:** Max **25** documents/batch (`BATCH_PROCESSING_LIMIT_PLUS`).
*   **Growth Tier:** Max **100** documents/batch (`BATCH_PROCESSING_LIMIT_GROWTH`).

**RLS Context:** All operations involving user data must respect the existing RLS policies based on `auth.jwt()->>'sub' == user_id`.

---

### Step 8.0: Database Schema Setup & Migration

*  [x] **Task**: Implement the refined database schema changes for batch processing.
*   **Goal**: Ensure the database structure accurately supports the batch workflow.
*   **Modules**:
    *   **8.0.1: Define Enums**:
        *   **Action**: Create the `batch_status_enum` SQL definition.
        *   **Files**: `db/migrations/xxxx_create_batch_enum.sql` (new migration file).
        *   **Instructions**: Define the enum with values: 'pending_upload', 'queued', 'processing', 'completed', 'partially_completed', 'failed'.
    *   **8.0.2: Update Drizzle Schemas**:
        *   **Action**: Modify the Drizzle schema files (`.ts`) to reflect the refined table structures.
        *   **Files**:
            *   `db/schema/extraction-batches-schema.ts`: Add `extraction_prompt`, `total_pages`, `completed_at`; update `status` type to use `batch_status_enum` and set default.
            *   `db/schema/documents-schema.ts`: Add the nullable `batchId` foreign key referencing `extraction_batches.id` with `onDelete: 'set null'`.
            *   `db/schema/extraction-jobs-schema.ts`: Add/confirm `batch_id` foreign key referencing `extraction_batches.id` with `onDelete: 'cascade'`; confirm `extraction_prompt` is nullable.
        *   **Instructions**: Use correct Drizzle syntax for columns, types, defaults, foreign keys, and constraints. Ensure `$onUpdate` is correctly configured for `updatedAt`.
    *   **8.0.3: Generate Migration**:
        *   **Action**: Run the Drizzle Kit command to generate the SQL migration file based on schema changes.
        *   **Command**: `pnpm db:generate` (or `pnpm drizzle-kit generate`).
        *   **Instructions**: Execute the command and verify the output directory (`db/migrations/`) contains a new migration file.
    *   **8.0.4: Review Migration SQL**:
        *   **Action**: Carefully inspect the generated SQL migration file.
        *   **Files**: The newly generated file in `db/migrations/`.
        *   **Instructions**: Verify that the SQL correctly creates the enum, alters `extraction_batches`, alters `documents`, and alters `extraction_jobs` as intended. Check constraints and default values.
    *   **8.0.5: Apply Migration**:
        *   **Action**: Run the Drizzle Kit command to apply the migration to the database.
        *   **Command**: `pnpm db:migrate` (or `pnpm drizzle-kit migrate`).
        *   **Instructions**: Execute the command. Verify successful application against your development database.
*   **Dependencies**: Base DB setup (Section 3.1).

---

### Step 8.1: Implement Batch Upload UI

*   **Task**: Develop the frontend interface for initiating batch uploads.
*   **Goal**: Provide a user-friendly way for eligible users to select multiple files, provide instructions, and submit a batch job.
*   **Modules**:
    *   **8.1.1: Create Batch Upload Page Structure**:
        *   **Action**: Set up the main page component, handle routing, and implement tier-based access control.
        *   **Files**: `app/(dashboard)/dashboard/batch-upload/page.tsx`.
        *   **Instructions**: Use `"use client"`. Fetch user profile (`getProfileByUserIdAction`). Redirect or show access denied message for 'starter' tier. Display tier-specific limits (`BATCH_PROCESSING_LIMIT_PLUS`, `BATCH_PROCESSING_LIMIT_GROWTH` from `subscription-plans.ts`). Add basic layout, title, description.
    *   **8.1.2: Implement Multi-File Uploader Component**:
        *   **Action**: Build the reusable file selection component.
        *   **Files**: `components/utilities/BatchFileUpload.tsx`.
        *   **Instructions**: Integrate `react-dropzone`. Implement props for `maxFiles` (based on tier), `allowedMimeTypes`, `maxFileSize`. Perform client-side validation and display errors. Show previews/list of selected files with removal option. Use a callback (`onFilesChange`) to pass `File[]` to the parent page.
    *   **8.1.3: Implement Form and State Management**:
        *   **Action**: Manage UI state for the batch upload form on the page.
        *   **Files**: `app/(dashboard)/dashboard/batch-upload/page.tsx`.
        *   **Instructions**: Use `useState` for selected files, batch name (optional), extraction prompt. Use `useTransition` for loading state during submission. Implement form fields for name and prompt. Disable submit button until files are selected and prompt is entered. Display server errors from the `createBatchUploadAction`.
    *   **8.1.4: Add Sidebar Navigation**:
        *   **Action**: Add a link to the batch upload page in the main dashboard navigation.
        *   **Files**: `components/utilities/app-sidebar.tsx`.
        *   **Instructions**: Add a `SidebarItem` for `/dashboard/batch-upload` with an appropriate icon (e.g., `Layers`). Consider conditional rendering based on tier if feasible within the sidebar's data context.
*   **Dependencies**: 8.0 (DB Schema), Auth (4.1), Profile Action, Subscription Plans Config, Base UI components.

---

### Step 8.2: Implement Batch Creation Server Action

*   **Task**: Develop the server-side logic to securely handle batch submissions, create database records, and manage file uploads.
*   **Goal**: Atomically create batch records and associated document entries while enforcing business rules.
*   **Modules**:
    *   **8.2.1: Define Action & Basic Validation**:
        *   **Action**: Create `createBatchUploadAction` in `actions/batch/batchActions.ts`. Define input (`FormData`) and output (`ActionState`). Implement initial checks.
        *   **Files**: `actions/batch/batchActions.ts`.
        *   **Instructions**: Use `"use server"`. Extract files, name, prompt from `FormData`. Get `userId` (`getCurrentUser`). Fetch profile (`getProfileByUserIdAction`). Validate tier (error if 'starter'). Validate file count against tier limit (`BATCH_PROCESSING_LIMIT_PLUS`/`GROWTH`). Validate prompt is not empty.
    *   **8.2.2: Implement Quota & Rate Limiting**:
        *   **Action**: Integrate checks for API rate limits and user page quota.
        *   **Files**: `actions/batch/batchActions.ts`, `lib/rate-limiting/limiter.ts`, `actions/db/user-usage-actions.ts`.
        *   **Instructions**: Call `checkRateLimit(userId, tier, 'batch_upload')`. Call `checkUserQuotaAction(userId, files.length)` (using document count as an initial estimate). Return specific error messages if limits are exceeded.
    *   **8.2.3: Implement File Processing & DB Transaction**:
        *   **Action**: Handle file uploads and database record creation within a transaction.
        *   **Files**: `actions/batch/batchActions.ts`, `lib/supabase/storage-utils.ts`, `db/db.ts`, schema files.
        *   **Instructions**:
            *   Start `db.transaction(async (tx) => { ... })`.
            *   Inside transaction: Create `extraction_batches` record with `status: 'pending_upload'`.
            *   Initialize `totalBatchPages = 0`.
            *   Loop through files:
                *   Define `storagePath` (`batches/{userId}/{batchId}/{uniqueFilename}`).
                *   Upload file using `uploadToStorage`. Handle upload errors.
                *   **Determine Page Count:** Implement server-side page counting (e.g., using `pdf-lib` for PDFs, 1 for images). Handle errors. Add `pageCount` to `totalBatchPages`.
                *   Create `documents` record using `tx`, linking `batch_id`, storing `pageCount`, setting `status: 'queued_for_processing'`.
            *   Update `extraction_batches` record using `tx`: set `status: 'queued'`, set calculated `total_pages`.
            *   Commit transaction implicitly upon successful completion.
    *   **8.2.4: Finalize Action (Analytics, Revalidation, Return)**:
        *   **Action**: Add post-transaction logic for analytics, cache revalidation, and response.
        *   **Files**: `actions/batch/batchActions.ts`, `lib/analytics/server.ts`, `next/cache`.
        *   **Instructions**: After successful transaction, call `trackServerEvent('batch_created', ...)`. Call `revalidatePath('/dashboard/batches')`. Return `ActionState` success object with the `batchId`. Implement top-level try/catch for the action, ensuring transaction rollback on failure and returning appropriate error `ActionState`.
*   **Dependencies**: 8.0, 8.1, Auth, DB Actions, Storage Util, Rate Limiter, Analytics.

---

### Step 8.3: Implement Background Processing Logic

*   **Task**: Create the asynchronous system to process queued documents within batches.
*   **Goal**: Reliably process documents using AI, update statuses, and handle usage counting.
*   **Modules**:
    *   **8.3.1: Configure Vercel Cron Job**:
        *   **Action**: Define the cron schedule in `vercel.json`.
        *   **Files**: `vercel.json`.
        *   **Instructions**: Add a cron job entry targeting `/api/batch-processor` (e.g., `*/5 * * * *`). Ensure the `path` is correct.
    *   **8.3.2: Create Secure API Route**:
        *   **Action**: Implement the `/api/batch-processor/route.ts` endpoint.
        *   **Files**: `app/api/batch-processor/route.ts`.
        *   **Instructions**: Create a `POST` (or `GET`) handler. Implement security check using `CRON_SECRET` environment variable passed via header/body. Reject unauthorized requests.
    *   **8.3.3: Implement Batch/Document Fetching & Locking**:
        *   **Action**: Query for processable batches and documents, implementing locking.
        *   **Files**: `app/api/batch-processor/route.ts`, schema files.
        *   **Instructions**: Query `extraction_batches` (status 'queued', limit). Loop: Update batch status to 'processing' (locking). Query associated `documents` (status 'queued_for_processing', limit).
    *   **8.3.4: Implement Document Processing Loop**:
        *   **Action**: Iterate through fetched documents, call AI, and handle results.
        *   **Files**: `app/api/batch-processor/route.ts`, `actions/ai/extraction-actions.ts`, `actions/db/user-usage-actions.ts`.
        *   **Instructions**: Loop through documents: Update doc status to 'processing'. Call `extractDocumentDataAction(document.id, batch.extraction_prompt)`. **Important:** Ensure `extractDocumentDataAction` *does not* increment usage itself but *does* create/update `extraction_jobs` and `extracted_data`. On success: update doc status 'completed', increment batch `completed_count`, call `incrementPagesProcessedAction(userId, pageCount)`. On failure: update doc status 'failed', update job error, increment batch `failed_count`. Add delays if needed for AI rate limits.
    *   **8.3.5: Implement Batch Status Aggregation**:
        *   **Action**: Update the overall batch status based on individual document outcomes.
        *   **Files**: `app/api/batch-processor/route.ts`, schema files.
        *   **Instructions**: After processing documents for a batch run, re-query counts (`completed_count`, `failed_count`). If `completed + failed == total`, update batch status ('completed', 'partially_completed', 'failed'). Otherwise, leave as 'processing'.
    *   **8.3.6: Refine AI Action for Background Use**:
        *   **Action**: Modify `extractDocumentDataAction` to be suitable for background calls.
        *   **Files**: `actions/ai/extraction-actions.ts`.
        *   **Instructions**: Ensure it accepts `extractionPrompt` override. Verify it correctly creates/updates `extraction_jobs` (including `batch_id` and prompt) and `extracted_data`. Remove any direct usage increment calls from this action. Return detailed success/failure info including error messages.
*   **Dependencies**: 8.0, 8.2, AI Action, Usage Action, Vercel platform.

---

### Step 8.4: Implement Batch Status UI

*   **Task**: Build the frontend pages for users to monitor their batch jobs.
*   **Goal**: Provide clear visibility into batch progress and individual document statuses within a batch.
*   **Modules**:
    *   **8.4.1: Create Batch List Action & Page**:
        *   **Action**: Define `fetchUserBatchesAction` (query `extraction_batches`, filter by user, paginate, sort). Implement the list page UI.
        *   **Files**: `actions/batch/batchActions.ts` (new action), `app/(dashboard)/dashboard/batches/page.tsx`.
        *   **Instructions**: Fetch data using the action. Display batches in a table/list (Name, Status Badge, Counts, Dates). Add pagination/sorting. Link items to the detail page. Handle loading/empty states.
    *   **8.4.2: Create Batch Detail Action & Page Structure**:
        *   **Action**: Define `fetchBatchDetailsAction` (fetch specific batch + associated documents, verify ownership). Set up the detail page structure.
        *   **Files**: `actions/batch/batchActions.ts` (new action), `app/(dashboard)/dashboard/batches/[batchId]/page.tsx`.
        *   **Instructions**: Get `batchId` from params. Call action to fetch data server-side. Pass data to a client component.
    *   **8.4.3: Implement Batch Detail Client Component**:
        *   **Action**: Build the interactive client component for displaying batch details.
        *   **Files**: `components/batch/BatchDetailClient.tsx` (new component).
        *   **Instructions**: Use `"use client"`. Receive props. Display batch summary (Name, Status, Prompt, Progress Bar using counts). Display document list/table (Filename, Status Badge, Page Count, Error if failed). Link completed docs to review page. Add document filtering/sorting. *Optional:* Implement polling or Supabase Realtime for status updates.
*   **Dependencies**: 8.0, 8.2, 8.3 (for data/statuses), Base UI components.

---

### Step 8.5: Testing

*   **Task**: Ensure the batch processing feature is robust, secure, and performs correctly through comprehensive testing.
*   **Goal**: Validate functionality, security (RLS), performance, and edge cases.
*   **Modules**:
    *   **8.5.1: Unit Tests**:
        *   **Action**: Write tests for helper functions and validation logic.
        *   **Files**: `__tests__/utils/pageCounter.test.ts` (if applicable), potentially tests within action files for validation logic.
        *   **Instructions**: Use Vitest to test pure functions involved in page counting, input validation, etc.
    *   **8.5.2: Integration Tests**:
        *   **Action**: Test server actions and API routes with mocked dependencies.
        *   **Files**: `__tests__/batch/batchActions.test.ts`, `__tests__/api/batch-processor.test.ts`.
        *   **Instructions**: Mock DB, storage, AI calls. Verify `createBatchUploadAction` performs correct validation (tier limits, quota), creates DB records, calls storage. Test background processor logic (fetching, calling AI mock, updating statuses, incrementing usage).
    *   **8.5.3: RLS Tests**:
        *   **Action**: Add specific RLS tests for the `extraction_batches` table.
        *   **Files**: `__tests__/rls/extraction_batches.test.ts`.
        *   **Instructions**: Follow the pattern in existing RLS tests (`__tests__/rls/utils.ts`). Verify users can only SELECT, INSERT, UPDATE, DELETE their own batches. Test service role access.
    *   **8.5.4: End-to-End (E2E) Testing**:
        *   **Action**: Perform manual or automated E2E tests covering the user journey.
        *   **Instructions (Manual Example)**:
            1.  Log in as 'Plus' user. Navigate to Batch Upload.
            2.  Attempt to upload 26 files -> Verify error message.
            3.  Upload 5 valid files, add prompt, submit -> Verify success message, redirect (or UI update).
            4.  Navigate to Batches list -> Verify batch appears with 'queued' or 'processing' status.
            5.  Wait for processing -> Navigate to Batch Detail page.
            6.  Verify progress bar updates. Verify document statuses change.
            7.  Verify final batch status ('completed').
            8.  Check Usage page/metrics to confirm page count incremented correctly.
            9.  Repeat tests for 'Growth' tier with appropriate limits.
            10. Test 'Starter' tier access denial.
            11. Test error scenarios (invalid file type, upload failure, AI failure).
*   **Dependencies**: All previous steps (8.0-8.4), Testing setup (`vitest.config.ts`, `__tests__/setup.ts`).

---

| policy_definition                                                                                                                                                                                                                                  |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CREATE POLICY "Service role full access on documents" ON "public"."documents" FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);                                                                                                          |
| CREATE POLICY "Users can delete their own documents" ON "public"."documents" FOR DELETE TO authenticated
  USING ((( SELECT (auth.jwt() ->> 'sub'::text)) = user_id));                                                                             |
| CREATE POLICY "Users can insert their own documents" ON "public"."documents" FOR INSERT TO authenticated
  WITH CHECK ((( SELECT (auth.jwt() ->> 'sub'::text)) = user_id));                                                                        |
| CREATE POLICY "Users can update their own documents" ON "public"."documents" FOR UPDATE TO authenticated
  USING ((( SELECT (auth.jwt() ->> 'sub'::text)) = user_id))
  WITH CHECK ((( SELECT (auth.jwt() ->> 'sub'::text)) = user_id));           |
| CREATE POLICY "Users can view their own documents" ON "public"."documents" FOR SELECT TO authenticated
  USING ((( SELECT (auth.jwt() ->> 'sub'::text)) = user_id));                                                                               |
| CREATE POLICY "Service role full access on exports" ON "public"."exports" FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);                                                                                                              |
| CREATE POLICY "Users can delete their own exports" ON "public"."exports" FOR DELETE TO authenticated
  USING ((( SELECT (auth.jwt() ->> 'sub'::text)) = user_id));                                                                                 |
| CREATE POLICY "Users can insert their own exports" ON "public"."exports" FOR INSERT TO authenticated
  WITH CHECK ((( SELECT (auth.jwt() ->> 'sub'::text)) = user_id));                                                                            |
| CREATE POLICY "Users can view their own exports" ON "public"."exports" FOR SELECT TO authenticated
  USING ((( SELECT (auth.jwt() ->> 'sub'::text)) = user_id));                                                                                   |
| CREATE POLICY "Service role full access on extracted_data" ON "public"."extracted_data" FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);                                                                                                |
| CREATE POLICY "Users can delete their own extracted data" ON "public"."extracted_data" FOR DELETE TO authenticated
  USING ((( SELECT (auth.jwt() ->> 'sub'::text)) = user_id));                                                                   |
| CREATE POLICY "Users can update their own extracted data" ON "public"."extracted_data" FOR UPDATE TO authenticated
  USING ((( SELECT (auth.jwt() ->> 'sub'::text)) = user_id))
  WITH CHECK ((( SELECT (auth.jwt() ->> 'sub'::text)) = user_id)); |
| CREATE POLICY "Users can view their own extracted data" ON "public"."extracted_data" FOR SELECT TO authenticated
  USING ((( SELECT (auth.jwt() ->> 'sub'::text)) = user_id));                                                                     |
| CREATE POLICY "Service role full access on extraction_batches" ON "public"."extraction_batches" FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);                                                                                        |
| CREATE POLICY "Users can delete their own batches" ON "public"."extraction_batches" FOR DELETE TO authenticated
  USING ((( SELECT (auth.jwt() ->> 'sub'::text)) = user_id));                                                                      |
| CREATE POLICY "Users can insert their own batches" ON "public"."extraction_batches" FOR INSERT TO authenticated
  WITH CHECK ((( SELECT (auth.jwt() ->> 'sub'::text)) = user_id));                                                                 |
| CREATE POLICY "Users can update their own batches" ON "public"."extraction_batches" FOR UPDATE TO authenticated
  USING ((( SELECT (auth.jwt() ->> 'sub'::text)) = user_id))
  WITH CHECK ((( SELECT (auth.jwt() ->> 'sub'::text)) = user_id));    |
| CREATE POLICY "Users can view their own batches" ON "public"."extraction_batches" FOR SELECT TO authenticated
  USING ((( SELECT (auth.jwt() ->> 'sub'::text)) = user_id));                                                                        |
| CREATE POLICY "Service role full access on extraction_jobs" ON "public"."extraction_jobs" FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);                                                                                              |
| CREATE POLICY "Users can insert their own jobs" ON "public"."extraction_jobs" FOR INSERT TO authenticated
  WITH CHECK ((( SELECT (auth.jwt() ->> 'sub'::text)) = user_id));                                                                       |
| CREATE POLICY "Users can view their own jobs" ON "public"."extraction_jobs" FOR SELECT TO authenticated
  USING ((( SELECT (auth.jwt() ->> 'sub'::text)) = user_id));                                                                              |
| CREATE POLICY "Service role full access on profiles" ON "public"."profiles" FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);                                                                                                            |
| CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE TO authenticated
  USING ((( SELECT (auth.jwt() ->> 'sub'::text)) = user_id))
  WITH CHECK ((( SELECT (auth.jwt() ->> 'sub'::text)) = user_id));              |
| CREATE POLICY "Users can view their own profile" ON "public"."profiles" FOR SELECT TO authenticated
  USING ((( SELECT (auth.jwt() ->> 'sub'::text)) = user_id));                                                                                  |
| CREATE POLICY "Service role full access on user_usage" ON "public"."user_usage" FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);                                                                                                        |
| CREATE POLICY "Users can only view their own usage" ON "public"."user_usage" FOR SELECT TO authenticated
  USING ((( SELECT (auth.jwt() ->> 'sub'::text)) = user_id));                                                                             |
| CREATE POLICY "Service role full access on users" ON "public"."users" FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);                                                                                                                  |
| CREATE POLICY "Users can update their own user record" ON "public"."users" FOR UPDATE TO authenticated
  USING ((( SELECT (auth.jwt() ->> 'sub'::text)) = user_id))
  WITH CHECK ((( SELECT (auth.jwt() ->> 'sub'::text)) = user_id));             |
| CREATE POLICY "Users can view their own user record" ON "public"."users" FOR SELECT TO authenticated
  USING ((( SELECT (auth.jwt() ->> 'sub'::text)) = user_id));                                                                                 |



  | table_name         | column_name            | data_type                   |
| ------------------ | ---------------------- | --------------------------- |
| documents          | id                     | uuid                        |
| documents          | user_id                | text                        |
| documents          | original_filename      | text                        |
| documents          | storage_path           | text                        |
| documents          | mime_type              | text                        |
| documents          | file_size              | integer                     |
| documents          | page_count             | integer                     |
| documents          | status                 | USER-DEFINED                |
| documents          | created_at             | timestamp without time zone |
| documents          | updated_at             | timestamp without time zone |
| exports            | id                     | uuid                        |
| exports            | user_id                | text                        |
| exports            | format                 | USER-DEFINED                |
| exports            | status                 | text                        |
| exports            | file_path              | text                        |
| exports            | document_ids           | ARRAY                       |
| exports            | created_at             | timestamp without time zone |
| exports            | updated_at             | timestamp without time zone |
| extracted_data     | id                     | uuid                        |
| extracted_data     | extraction_job_id      | uuid                        |
| extracted_data     | document_id            | uuid                        |
| extracted_data     | user_id                | text                        |
| extracted_data     | data                   | jsonb                       |
| extracted_data     | document_type          | text                        |
| extracted_data     | created_at             | timestamp without time zone |
| extracted_data     | updated_at             | timestamp without time zone |
| extraction_batches | id                     | uuid                        |
| extraction_batches | user_id                | text                        |
| extraction_batches | name                   | text                        |
| extraction_batches | status                 | text                        |
| extraction_batches | document_count         | integer                     |
| extraction_batches | completed_count        | integer                     |
| extraction_batches | failed_count           | integer                     |
| extraction_batches | created_at             | timestamp without time zone |
| extraction_batches | updated_at             | timestamp without time zone |
| extraction_jobs    | id                     | uuid                        |
| extraction_jobs    | user_id                | text                        |
| extraction_jobs    | document_id            | uuid                        |
| extraction_jobs    | batch_id               | uuid                        |
| extraction_jobs    | status                 | USER-DEFINED                |
| extraction_jobs    | extraction_prompt      | text                        |
| extraction_jobs    | extraction_options     | jsonb                       |
| extraction_jobs    | error_message          | text                        |
| extraction_jobs    | created_at             | timestamp without time zone |
| extraction_jobs    | updated_at             | timestamp without time zone |
| profiles           | user_id                | text                        |
| profiles           | membership             | USER-DEFINED                |
| profiles           | stripe_customer_id     | text                        |
| profiles           | stripe_subscription_id | text                        |
| profiles           | created_at             | timestamp without time zone |
| profiles           | updated_at             | timestamp without time zone |
| user_usage         | id                     | uuid                        |
| user_usage         | user_id                | text                        |
| user_usage         | billing_period_start   | timestamp without time zone |
| user_usage         | billing_period_end     | timestamp without time zone |
| user_usage         | pages_processed        | integer                     |
| user_usage         | pages_limit            | integer                     |
| user_usage         | created_at             | timestamp without time zone |
| user_usage         | updated_at             | timestamp without time zone |
| users              | user_id                | text                        |
| users              | email                  | text                        |
| users              | full_name              | text                        |
| users              | avatar_url             | text                        |
| users              | metadata               | jsonb                       |
| users              | created_at             | timestamp with time zone    |
| users              | updated_at             | timestamp with time zone    |