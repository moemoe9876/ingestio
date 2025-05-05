
**Redesigned Batch Upload Implementation Plan**

**Key Strengths of this Redesign:**

*   **Flexible Prompting:** Caters to diverse user needs by offering "Global," "Per-Document," and "Auto-Detect & Prompt" strategies.
*   **Leverages Existing Classification:** Intelligently reuses the `classifyDocument` function for the "Auto" strategy, promoting code reuse and consistency.
*   **Accurate Data Association:** Stores the `extraction_prompt` per document when necessary, ensuring the correct context is used during processing.
*   **Clear User Experience:** Implements a guided 3-step wizard flow (Files -> Prompts -> Review) for better usability.
*   **Accurate Quota Handling:** Mandates server-side page counting during batch creation and accurate per-document quota checks by the background processor *before* AI processing.
*   **Separation of Concerns:** Maintains a clear distinction between the batch orchestration logic and the core single-document extraction action.


RLS Policy:
[
  {
    "policy_definition": "CREATE POLICY \"Service role full access on documents\" ON \"public\".\"documents\" FOR ALL TO service_role\n  USING (true)\n  WITH CHECK (true);"
  },
  {
    "policy_definition": "CREATE POLICY \"Users can delete their own documents\" ON \"public\".\"documents\" FOR DELETE TO authenticated\n  USING ((( SELECT (auth.jwt() ->> 'sub'::text)) = user_id));"
  },
  {
    "policy_definition": "CREATE POLICY \"Users can insert their own documents\" ON \"public\".\"documents\" FOR INSERT TO authenticated\n  WITH CHECK ((( SELECT (auth.jwt() ->> 'sub'::text)) = user_id));"
  },
  {
    "policy_definition": "CREATE POLICY \"Users can update their own documents\" ON \"public\".\"documents\" FOR UPDATE TO authenticated\n  USING ((( SELECT (auth.jwt() ->> 'sub'::text)) = user_id))\n  WITH CHECK ((( SELECT (auth.jwt() ->> 'sub'::text)) = user_id));"
  },
  {
    "policy_definition": "CREATE POLICY \"Users can view their own documents\" ON \"public\".\"documents\" FOR SELECT TO authenticated\n  USING ((( SELECT (auth.jwt() ->> 'sub'::text)) = user_id));"
  },
  {
    "policy_definition": "CREATE POLICY \"Service role full access on exports\" ON \"public\".\"exports\" FOR ALL TO service_role\n  USING (true)\n  WITH CHECK (true);"
  },
  {
    "policy_definition": "CREATE POLICY \"Users can delete their own exports\" ON \"public\".\"exports\" FOR DELETE TO authenticated\n  USING ((( SELECT (auth.jwt() ->> 'sub'::text)) = user_id));"
  },
  {
    "policy_definition": "CREATE POLICY \"Users can insert their own exports\" ON \"public\".\"exports\" FOR INSERT TO authenticated\n  WITH CHECK ((( SELECT (auth.jwt() ->> 'sub'::text)) = user_id));"
  },
  {
    "policy_definition": "CREATE POLICY \"Users can view their own exports\" ON \"public\".\"exports\" FOR SELECT TO authenticated\n  USING ((( SELECT (auth.jwt() ->> 'sub'::text)) = user_id));"
  },
  {
    "policy_definition": "CREATE POLICY \"Service role full access on extracted_data\" ON \"public\".\"extracted_data\" FOR ALL TO service_role\n  USING (true)\n  WITH CHECK (true);"
  },
  {
    "policy_definition": "CREATE POLICY \"Users can delete their own extracted data\" ON \"public\".\"extracted_data\" FOR DELETE TO authenticated\n  USING ((( SELECT (auth.jwt() ->> 'sub'::text)) = user_id));"
  },
  {
    "policy_definition": "CREATE POLICY \"Users can update their own extracted data\" ON \"public\".\"extracted_data\" FOR UPDATE TO authenticated\n  USING ((( SELECT (auth.jwt() ->> 'sub'::text)) = user_id))\n  WITH CHECK ((( SELECT (auth.jwt() ->> 'sub'::text)) = user_id));"
  },
  {
    "policy_definition": "CREATE POLICY \"Users can view their own extracted data\" ON \"public\".\"extracted_data\" FOR SELECT TO authenticated\n  USING ((( SELECT (auth.jwt() ->> 'sub'::text)) = user_id));"
  },
  {
    "policy_definition": "CREATE POLICY \"Service role full access on extraction_batches\" ON \"public\".\"extraction_batches\" FOR ALL TO service_role\n  USING (true)\n  WITH CHECK (true);"
  },
  {
    "policy_definition": "CREATE POLICY \"Users can delete their own batches\" ON \"public\".\"extraction_batches\" FOR DELETE TO authenticated\n  USING ((( SELECT (auth.jwt() ->> 'sub'::text)) = user_id));"
  },
  {
    "policy_definition": "CREATE POLICY \"Users can insert their own batches\" ON \"public\".\"extraction_batches\" FOR INSERT TO authenticated\n  WITH CHECK ((( SELECT (auth.jwt() ->> 'sub'::text)) = user_id));"
  },
  {
    "policy_definition": "CREATE POLICY \"Users can update their own batches\" ON \"public\".\"extraction_batches\" FOR UPDATE TO authenticated\n  USING ((( SELECT (auth.jwt() ->> 'sub'::text)) = user_id))\n  WITH CHECK ((( SELECT (auth.jwt() ->> 'sub'::text)) = user_id));"
  },
  {
    "policy_definition": "CREATE POLICY \"Users can view their own batches\" ON \"public\".\"extraction_batches\" FOR SELECT TO authenticated\n  USING ((( SELECT (auth.jwt() ->> 'sub'::text)) = user_id));"
  },
  {
    "policy_definition": "CREATE POLICY \"Service role full access on extraction_jobs\" ON \"public\".\"extraction_jobs\" FOR ALL TO service_role\n  USING (true)\n  WITH CHECK (true);"
  },
  {
    "policy_definition": "CREATE POLICY \"Users can insert their own jobs\" ON \"public\".\"extraction_jobs\" FOR INSERT TO authenticated\n  WITH CHECK ((( SELECT (auth.jwt() ->> 'sub'::text)) = user_id));"
  },
  {
    "policy_definition": "CREATE POLICY \"Users can view their own jobs\" ON \"public\".\"extraction_jobs\" FOR SELECT TO authenticated\n  USING ((( SELECT (auth.jwt() ->> 'sub'::text)) = user_id));"
  },
  {
    "policy_definition": "CREATE POLICY \"Service role full access on profiles\" ON \"public\".\"profiles\" FOR ALL TO service_role\n  USING (true)\n  WITH CHECK (true);"
  },
  {
    "policy_definition": "CREATE POLICY \"Users can update their own profile\" ON \"public\".\"profiles\" FOR UPDATE TO authenticated\n  USING ((( SELECT (auth.jwt() ->> 'sub'::text)) = user_id))\n  WITH CHECK ((( SELECT (auth.jwt() ->> 'sub'::text)) = user_id));"
  },
  {
    "policy_definition": "CREATE POLICY \"Users can view their own profile\" ON \"public\".\"profiles\" FOR SELECT TO authenticated\n  USING ((( SELECT (auth.jwt() ->> 'sub'::text)) = user_id));"
  },
  {
    "policy_definition": "CREATE POLICY \"Service role full access on user_usage\" ON \"public\".\"user_usage\" FOR ALL TO service_role\n  USING (true)\n  WITH CHECK (true);"
  },
  {
    "policy_definition": "CREATE POLICY \"Users can only view their own usage\" ON \"public\".\"user_usage\" FOR SELECT TO authenticated\n  USING ((( SELECT (auth.jwt() ->> 'sub'::text)) = user_id));"
  },
  {
    "policy_definition": "CREATE POLICY \"Service role full access on users\" ON \"public\".\"users\" FOR ALL TO service_role\n  USING (true)\n  WITH CHECK (true);"
  },
  {
    "policy_definition": "CREATE POLICY \"Users can update their own user record\" ON \"public\".\"users\" FOR UPDATE TO authenticated\n  USING ((( SELECT (auth.jwt() ->> 'sub'::text)) = user_id))\n  WITH CHECK ((( SELECT (auth.jwt() ->> 'sub'::text)) = user_id));"
  },
  {
    "policy_definition": "CREATE POLICY \"Users can view their own user record\" ON \"public\".\"users\" FOR SELECT TO authenticated\n  USING ((( SELECT (auth.jwt() ->> 'sub'::text)) = user_id));"
  }
]


DB tables:

[
  {
    "table_name": "documents",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "documents",
    "column_name": "user_id",
    "data_type": "text"
  },
  {
    "table_name": "documents",
    "column_name": "original_filename",
    "data_type": "text"
  },
  {
    "table_name": "documents",
    "column_name": "storage_path",
    "data_type": "text"
  },
  {
    "table_name": "documents",
    "column_name": "mime_type",
    "data_type": "text"
  },
  {
    "table_name": "documents",
    "column_name": "file_size",
    "data_type": "integer"
  },
  {
    "table_name": "documents",
    "column_name": "page_count",
    "data_type": "integer"
  },
  {
    "table_name": "documents",
    "column_name": "status",
    "data_type": "USER-DEFINED"
  },
  {
    "table_name": "documents",
    "column_name": "created_at",
    "data_type": "timestamp without time zone"
  },
  {
    "table_name": "documents",
    "column_name": "updated_at",
    "data_type": "timestamp without time zone"
  },
  {
    "table_name": "documents",
    "column_name": "batch_id",
    "data_type": "uuid"
  },
  {
    "table_name": "exports",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "exports",
    "column_name": "user_id",
    "data_type": "text"
  },
  {
    "table_name": "exports",
    "column_name": "format",
    "data_type": "USER-DEFINED"
  },
  {
    "table_name": "exports",
    "column_name": "status",
    "data_type": "text"
  },
  {
    "table_name": "exports",
    "column_name": "file_path",
    "data_type": "text"
  },
  {
    "table_name": "exports",
    "column_name": "document_ids",
    "data_type": "ARRAY"
  },
  {
    "table_name": "exports",
    "column_name": "created_at",
    "data_type": "timestamp without time zone"
  },
  {
    "table_name": "exports",
    "column_name": "updated_at",
    "data_type": "timestamp without time zone"
  },
  {
    "table_name": "extracted_data",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "extracted_data",
    "column_name": "extraction_job_id",
    "data_type": "uuid"
  },
  {
    "table_name": "extracted_data",
    "column_name": "document_id",
    "data_type": "uuid"
  },
  {
    "table_name": "extracted_data",
    "column_name": "user_id",
    "data_type": "text"
  },
  {
    "table_name": "extracted_data",
    "column_name": "data",
    "data_type": "jsonb"
  },
  {
    "table_name": "extracted_data",
    "column_name": "document_type",
    "data_type": "text"
  },
  {
    "table_name": "extracted_data",
    "column_name": "created_at",
    "data_type": "timestamp without time zone"
  },
  {
    "table_name": "extracted_data",
    "column_name": "updated_at",
    "data_type": "timestamp without time zone"
  },
  {
    "table_name": "extraction_batches",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "extraction_batches",
    "column_name": "user_id",
    "data_type": "text"
  },
  {
    "table_name": "extraction_batches",
    "column_name": "name",
    "data_type": "text"
  },
  {
    "table_name": "extraction_batches",
    "column_name": "document_count",
    "data_type": "integer"
  },
  {
    "table_name": "extraction_batches",
    "column_name": "completed_count",
    "data_type": "integer"
  },
  {
    "table_name": "extraction_batches",
    "column_name": "failed_count",
    "data_type": "integer"
  },
  {
    "table_name": "extraction_batches",
    "column_name": "created_at",
    "data_type": "timestamp without time zone"
  },
  {
    "table_name": "extraction_batches",
    "column_name": "updated_at",
    "data_type": "timestamp without time zone"
  },
  {
    "table_name": "extraction_batches",
    "column_name": "status",
    "data_type": "USER-DEFINED"
  },
  {
    "table_name": "extraction_batches",
    "column_name": "extraction_prompt",
    "data_type": "text"
  },
  {
    "table_name": "extraction_batches",
    "column_name": "total_pages",
    "data_type": "integer"
  },
  {
    "table_name": "extraction_batches",
    "column_name": "completed_at",
    "data_type": "timestamp without time zone"
  },
  {
    "table_name": "extraction_jobs",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "extraction_jobs",
    "column_name": "user_id",
    "data_type": "text"
  },
  {
    "table_name": "extraction_jobs",
    "column_name": "document_id",
    "data_type": "uuid"
  },
  {
    "table_name": "extraction_jobs",
    "column_name": "batch_id",
    "data_type": "uuid"
  },
  {
    "table_name": "extraction_jobs",
    "column_name": "status",
    "data_type": "USER-DEFINED"
  },
  {
    "table_name": "extraction_jobs",
    "column_name": "extraction_prompt",
    "data_type": "text"
  },
  {
    "table_name": "extraction_jobs",
    "column_name": "extraction_options",
    "data_type": "jsonb"
  },
  {
    "table_name": "extraction_jobs",
    "column_name": "error_message",
    "data_type": "text"
  },
  {
    "table_name": "extraction_jobs",
    "column_name": "created_at",
    "data_type": "timestamp without time zone"
  },
  {
    "table_name": "extraction_jobs",
    "column_name": "updated_at",
    "data_type": "timestamp without time zone"
  },
  {
    "table_name": "profiles",
    "column_name": "user_id",
    "data_type": "text"
  },
  {
    "table_name": "profiles",
    "column_name": "membership",
    "data_type": "USER-DEFINED"
  },
  {
    "table_name": "profiles",
    "column_name": "stripe_customer_id",
    "data_type": "text"
  },
  {
    "table_name": "profiles",
    "column_name": "stripe_subscription_id",
    "data_type": "text"
  },
  {
    "table_name": "profiles",
    "column_name": "created_at",
    "data_type": "timestamp without time zone"
  },
  {
    "table_name": "profiles",
    "column_name": "updated_at",
    "data_type": "timestamp without time zone"
  },
  {
    "table_name": "user_usage",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "user_usage",
    "column_name": "user_id",
    "data_type": "text"
  },
  {
    "table_name": "user_usage",
    "column_name": "billing_period_start",
    "data_type": "timestamp without time zone"
  },
  {
    "table_name": "user_usage",
    "column_name": "billing_period_end",
    "data_type": "timestamp without time zone"
  },
  {
    "table_name": "user_usage",
    "column_name": "pages_processed",
    "data_type": "integer"
  },
  {
    "table_name": "user_usage",
    "column_name": "pages_limit",
    "data_type": "integer"
  },
  {
    "table_name": "user_usage",
    "column_name": "created_at",
    "data_type": "timestamp without time zone"
  },
  {
    "table_name": "user_usage",
    "column_name": "updated_at",
    "data_type": "timestamp without time zone"
  },
  {
    "table_name": "users",
    "column_name": "user_id",
    "data_type": "text"
  },
  {
    "table_name": "users",
    "column_name": "email",
    "data_type": "text"
  },
  {
    "table_name": "users",
    "column_name": "full_name",
    "data_type": "text"
  },
  {
    "table_name": "users",
    "column_name": "avatar_url",
    "data_type": "text"
  },
  {
    "table_name": "users",
    "column_name": "metadata",
    "data_type": "jsonb"
  },
  {
    "table_name": "users",
    "column_name": "created_at",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "users",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone"
  }
]



---


**8.0.1: Define/Verify Required Enums**

*   **Task**: Ensure all necessary PostgreSQL ENUM types exist with the correct values required for batch processing statuses and the new prompt strategy.
*   **Goal**: Establish constrained value sets for status and strategy columns to maintain data consistency.
*   **Files**:
    *   `db/schema/extraction-batches-schema.ts`
    *   `db/schema/documents-schema.ts`
    *   Generated Migration File (`db/migrations/....sql`)
*   **Instructions**:
    1.  **Define `prompt_strategy_enum`**: In a relevant Drizzle schema file (e.g., `db/schema/extraction-batches-schema.ts` or a dedicated `enums.ts`), define the new enum using `pgEnum`.
    2.  **Verify `batch_status_enum`**: Ensure the existing enum definition in `db/schema/extraction-batches-schema.ts` includes all required values: `'pending_upload'`, `'queued'`, `'processing'`, `'completed'`, `'partially_completed'`, `'failed'`. Add any missing values using Drizzle's syntax if necessary (though typically enums are fully defined at creation).
    3.  **Verify `document_status_enum`**: Ensure the existing enum definition in `db/schema/documents-schema.ts` includes `'uploaded'`, `'queued_for_processing'` (add if needed), `'processing'`, `'completed'`, `'failed'`.
*   **Code (Drizzle Schema - `db/schema/extraction-batches-schema.ts` or `enums.ts`)**:
    ```typescript
    import { pgEnum } from "drizzle-orm/pg-core";

    // New Enum
    export const promptStrategyEnum = pgEnum("prompt_strategy_enum", [
      "global",      // Single prompt for all docs in batch
      "per_document", // Specific prompt stored for each doc
      "auto",        // Auto-classify and use default prompt per doc
    ]);

    // Existing Enum (Verify values)
    export const batchStatusEnum = pgEnum("batch_status_enum", [
      "pending_upload", // Initial state before files fully processed by action
      "queued",         // Ready for background processor
      "processing",
      "completed",
      "partially_completed",
      "failed",
    ]);

    // Existing Enum (Verify values - in documents-schema.ts)
    // export const documentStatusEnum = pgEnum("document_status", [
    //   "uploaded", // Default after successful upload action
    //   "queued_for_processing", // Optional: If needed between batch queue and processor start
    //   "processing",
    //   "completed",
    //   "failed",
    // ]);
    ```
*   **Code (SQL - Verification Only)**:
    ```sql
    -- Verify prompt_strategy_enum exists and has correct values
    SELECT enum_range(NULL::public.prompt_strategy_enum);
    -- Expected: {global,per_document,auto}

    -- Verify batch_status_enum exists and has correct values
    SELECT enum_range(NULL::public.batch_status_enum);
    -- Expected: {pending_upload,queued,processing,completed,partially_completed,failed}

    -- Verify document_status_enum exists and has correct values
    SELECT enum_range(NULL::public.document_status);
    -- Expected: {uploaded,queued_for_processing,processing,completed,failed} -- Adjust if queued_for_processing isn't used
    ```
*   **Security/Production Considerations**: Using enums enforces data integrity at the database level. Ensure all application code uses the defined enum values.

---

**8.0.2: Update `extraction_batches` Table Schema**

*   **Task**: Add the `prompt_strategy` column, ensure `extraction_prompt` is nullable, and add the `total_pages` column.
*   **Goal**: Store the chosen prompting strategy for the batch and the aggregated page count for potential future reference or preliminary checks. Store the global prompt only when applicable.
*   **Files**: `db/schema/extraction-batches-schema.ts`, Generated Migration File.
*   **Instructions**:
    1.  Modify the `extractionBatchesTable` definition in Drizzle.
    2.  Add the `promptStrategy` column using the `promptStrategyEnum` defined in 8.0.1. Set `notNull()` and `default("global")`.
    3.  Ensure the existing `extractionPrompt` column is defined as `text("extraction_prompt").nullable()`.
    4.  Add the `totalPages` column as `integer("total_pages").default(0).notNull()`.
    5.  Verify other count columns (`document_count`, `completed_count`, `failed_count`) exist, are integers, not null, and default to 0.
    6.  Verify `completed_at` column exists and is `timestamp("completed_at").nullable()`.
*   **Code (Drizzle Schema - `db/schema/extraction-batches-schema.ts`)**:
    ```typescript
    import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
    import { profilesTable } from "./profiles-schema";
    import { batchStatusEnum, promptStrategyEnum } from "./enums"; // Assuming enums are in enums.ts

    export const extractionBatchesTable = pgTable("extraction_batches", {
      id: uuid("id").defaultRandom().primaryKey(),
      userId: text("user_id")
        .notNull()
        .references(() => profilesTable.userId, { onDelete: "cascade" }),
      name: text("name"),
      // --- Updated/Added Columns ---
      promptStrategy: promptStrategyEnum("prompt_strategy").notNull().default("global"),
      extractionPrompt: text("extraction_prompt").nullable(), // Stores global prompt ONLY if strategy is 'global'
      status: batchStatusEnum("status").default("pending_upload").notNull(),
      documentCount: integer("document_count").default(0).notNull(),
      completedCount: integer("completed_count").default(0).notNull(),
      failedCount: integer("failed_count").default(0).notNull(),
      totalPages: integer("total_pages").default(0).notNull(), // Stores sum of page counts from documents
      // --- End Updated/Added Columns ---
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at")
        .defaultNow()
        .notNull()
        .$onUpdate(() => new Date()),
      completedAt: timestamp("completed_at").nullable(),
    });
    ```
*   **Code (SQL - Verification Only)**:
    ```sql
    -- Check columns and types in extraction_batches
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'extraction_batches'
    ORDER BY ordinal_position;

    -- Verify prompt_strategy default
    SELECT column_default FROM information_schema.columns
    WHERE table_name = 'extraction_batches' AND column_name = 'prompt_strategy';
    -- Expected: '''global''::prompt_strategy_enum'

    -- Verify extraction_prompt is nullable
    SELECT is_nullable FROM information_schema.columns
    WHERE table_name = 'extraction_batches' AND column_name = 'extraction_prompt';
    -- Expected: 'YES'
    ```
*   **Security/Production Considerations**: The default `prompt_strategy` ('global') is a safe default. The nullable `extraction_prompt` correctly reflects its conditional usage. Ensure the `userId` foreign key has `onDelete: 'cascade'`.

---

**8.0.3: Update `documents` Table Schema**

*   **Task**: Add a nullable `extraction_prompt` column, ensure `batch_id` FK exists and is correctly configured, ensure `page_count` is not nullable, and update the default `status`.
*   **Goal**: Allow storing per-document prompts, link documents to batches correctly, enforce page count presence, and set an appropriate initial status.
*   **Files**: `db/schema/documents-schema.ts`, Generated Migration File.
*   **Instructions**:
    1.  Modify the `documentsTable` definition in Drizzle.
    2.  Add the `extractionPrompt` column: `extractionPrompt: text("extraction_prompt").nullable()`.
    3.  Ensure the `batchId` column exists and references `extractionBatchesTable` with `onDelete: "set null"`.
    4.  Ensure the `pageCount` column is `integer("page_count").notNull()`.
    5.  Change the `default()` value for the `status` column to `'uploaded'`.
*   **Code (Drizzle Schema - `db/schema/documents-schema.ts`)**:
    ```typescript
    import { integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
    import { extractionBatchesTable } from "./extraction-batches-schema";
    import { profilesTable } from "./profiles-schema";
    import { documentStatusEnum } from "./enums"; // Assuming enums are in enums.ts

    export const documentsTable = pgTable("documents", {
      id: uuid("id").defaultRandom().primaryKey(),
      userId: text("user_id")
        .notNull()
        .references(() => profilesTable.userId, { onDelete: "cascade" }),
      // --- Updated/Added Columns ---
      batchId: uuid("batch_id").references(() => extractionBatchesTable.id, {
        onDelete: "set null", // Keep document if batch is deleted
      }),
      extractionPrompt: text("extraction_prompt").nullable(), // Stores per-document prompt if strategy requires
      pageCount: integer("page_count").notNull(), // Ensure this is NOT NULL
      status: documentStatusEnum("status").default("uploaded").notNull(), // Default status after upload action
      // --- End Updated/Added Columns ---
      originalFilename: text("original_filename").notNull(),
      storagePath: text("storage_path").notNull(),
      mimeType: text("mime_type").notNull(),
      fileSize: integer("file_size").notNull(),
      createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
      updatedAt: timestamp("updated_at", { withTimezone: true })
        .defaultNow()
        .notNull()
        .$onUpdate(() => new Date()), // Consider using createUTCDate() if defined
    });
    ```
*   **Code (SQL - Verification Only)**:
    ```sql
    -- Check columns and types in documents
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'documents'
    ORDER BY ordinal_position;

    -- Verify extraction_prompt is nullable
    SELECT is_nullable FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'extraction_prompt';
    -- Expected: 'YES'

    -- Verify page_count is NOT nullable
    SELECT is_nullable FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'page_count';
    -- Expected: 'NO'

    -- Verify status default
    SELECT column_default FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'status';
    -- Expected: '''uploaded''::document_status'

    -- Verify batch_id FK constraint ON DELETE action
    SELECT confdeltype FROM pg_constraint
    WHERE conrelid = 'public.documents'::regclass
      AND confrelid = 'public.extraction_batches'::regclass
      AND conname LIKE 'documents_batch_id_extraction_batches_id_fk%'; -- Adjust name if needed
    -- Expected: 'n' (NO ACTION) or 'a' (SET NULL) - SET NULL is preferred as per schema.
    ```
*   **Security/Production Considerations**: `ON DELETE SET NULL` for `batch_id` prevents data loss. Making `page_count` NOT NULL enforces that this critical data for quota checks is always present. Ensure `userId` FK has `ON DELETE CASCADE`.

---

**8.0.4: Update `extraction_jobs` Table Schema**

*   **Task**: Verify or update the Foreign Key constraint for `batch_id` to ensure appropriate cascading behavior.
*   **Goal**: Ensure that if a batch is deleted, its associated extraction jobs are also automatically deleted to maintain data consistency.
*   **Files**: `db/schema/extraction-jobs-schema.ts`, Generated Migration File.
*   **Instructions**:
    1.  Review the `extractionJobsTable` definition in Drizzle.
    2.  Ensure the `batchId` column's `references` definition includes `{ onDelete: "cascade" }`.
*   **Code (Drizzle Schema - `db/schema/extraction-jobs-schema.ts`)**:
    ```typescript
    import { jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
    import { documentsTable } from "./documents-schema";
    import { extractionBatchesTable } from "./extraction-batches-schema";
    import { profilesTable } from "./profiles-schema";
    import { extractionStatusEnum } from "./enums"; // Assuming enums are in enums.ts

    export const extractionJobsTable = pgTable("extraction_jobs", {
      id: uuid("id").defaultRandom().primaryKey(),
      userId: text("user_id")
        .notNull()
        .references(() => profilesTable.userId, { onDelete: "cascade" }),
      documentId: uuid("document_id")
        .notNull()
        .references(() => documentsTable.id, { onDelete: "cascade" }),
      // --- Ensure ON DELETE CASCADE ---
      batchId: uuid("batch_id")
        .references(() => extractionBatchesTable.id, { onDelete: "cascade" }), // Ensure this is CASCADE
      // --- End Ensure ON DELETE CASCADE ---
      status: extractionStatusEnum("status").default("queued").notNull(),
      extractionPrompt: text("extraction_prompt"), // This might store the *resolved* prompt used
      extractionOptions: jsonb("extraction_options").default({}).notNull(),
      errorMessage: text("error_message"),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at")
        .defaultNow()
        .notNull()
        .$onUpdate(() => new Date()),
    });
    ```
*   **Code (SQL - Verification Only)**:
    ```sql
    -- Verify batch_id FK constraint ON DELETE action for extraction_jobs
    SELECT conname, confdeltype FROM pg_constraint
    WHERE conrelid = 'public.extraction_jobs'::regclass
      AND confrelid = 'public.extraction_batches'::regclass
      AND conname LIKE 'extraction_jobs_batch_id_extraction_batches_id_fk%'; -- Adjust name if needed
    -- Expected: 'c' (CASCADE)
    ```
*   **Security/Production Considerations**: Using `ON DELETE CASCADE` here ensures that deleting a batch record automatically cleans up all related job records, preventing orphaned data.

---

**8.0.5: Generate & Apply Drizzle Migration**

*   **Task**: Use Drizzle Kit to generate the SQL migration file based on the schema changes and apply it to the database.
*   **Goal**: Safely and consistently update the database schema across all environments.
*   **Files**: Terminal/CLI, Generated Migration File (`db/migrations/...sql`), Drizzle config (`drizzle.config.ts`).
*   **Instructions**:
    1.  **Save** all changes made to the Drizzle schema files (`*.ts`).
    2.  **Generate Migration:** Open a terminal in the project root and run the Drizzle Kit generate command:
        ```bash
        pnpm drizzle-kit generate
        ```
        *(Adjust command based on your package manager if not using pnpm)*
    3.  **Review Generated SQL:** Carefully inspect the SQL file created in the `db/migrations` folder. Ensure it accurately reflects the intended changes (adding columns, altering types/defaults, adding constraints). Verify enum creation/updates and foreign key actions (`ON DELETE`).
    4.  **Apply Migration:**
        *   **Recommended (Development/Staging):** Use the Drizzle Kit migrate command:
            ```bash
            pnpm drizzle-kit migrate
            ```
        *   **Alternative (Production/Manual Control):** Copy the SQL content from the generated migration file and execute it directly in the Supabase SQL Editor for the target database.
    5.  **Verify Changes:** After applying, use SQL verification commands (provided in previous steps) or a database GUI to confirm the schema changes were applied correctly.
    6.  **Commit:** Commit the updated schema files (`*.ts`) AND the generated migration file (`*.sql` and `meta/_journal.json`) to version control.
*   **Security/Production Considerations**: **Never** run `drizzle-kit migrate` directly against a production database without thorough review and a backup. Reviewing the generated SQL is critical. Ensure the database user running migrations has sufficient privileges (`ALTER`, `CREATE`).

---

**8.0.6: RLS Policy Review**

*   **Task**: Review existing Row-Level Security (RLS) policies to ensure they remain effective and secure after the schema changes.
*   **Goal**: Confirm that the new columns (`prompt_strategy`, `extraction_prompt`, `total_pages`, `batch_id`) do not inadvertently expose data or bypass existing ownership checks.
*   **Files**: RLS Policy Definitions (provided in user prompt), Supabase SQL Editor.
*   **Instructions**:
    1.  **Analyze Policies:** Review the provided RLS policies for `extraction_batches` and `documents`. The core logic relies on `(select auth.jwt()->>'sub') = user_id`.
    2.  **Assess Impact:**
        *   `extraction_batches`: The new `prompt_strategy` and nullable `extraction_prompt` columns are added. Since the existing policies grant access based on `user_id`, users will implicitly be able to SELECT/INSERT/UPDATE/DELETE these new columns *on rows they already own*. This is generally the desired behavior – users manage their own batch settings. No RLS changes are strictly required for these columns based on the existing ownership model.
        *   `documents`: The new nullable `extraction_prompt` and `batch_id` columns are added. Similar to batches, the existing ownership policies based on `user_id` will allow users to manage these fields on their own documents. The `ON DELETE SET NULL` for `batch_id` is a data integrity rule, not an RLS rule. No RLS changes are strictly required for these columns.
    3.  **Confirm No New Exposure:** Verify that no new policies are needed to restrict access specifically to the new columns, as the existing row-level ownership policies cover them implicitly.
    4.  **Verify Service Role:** Confirm the `service_role` policies exist and grant `ALL` permissions, as the background processor will likely run under this role and needs full access to update statuses, prompts, counts, etc.
*   **Code (SQL - Verification Only)**:
    ```sql
    -- Review policies on affected tables
    SELECT policyname, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('extraction_batches', 'documents', 'extraction_jobs')
    ORDER BY tablename, policyname;

    -- Specifically check the USING and WITH CHECK clauses for ownership
    -- Example for extraction_batches SELECT policy:
    SELECT policyname, pg_get_expr(polqual, conrelid) as using_clause
    FROM pg_policy
    WHERE polrelid = 'public.extraction_batches'::regclass AND polname = 'Users can view their own batches';
    -- Expected: ((auth.jwt() ->> 'sub'::text) = user_id)

    -- Example for documents INSERT policy:
    SELECT policyname, pg_get_expr(polwithcheck, conrelid) as with_check_clause
    FROM pg_policy
    WHERE polrelid = 'public.documents'::regclass AND polname = 'Users can insert their own documents';
    -- Expected: ((auth.jwt() ->> 'sub'::text) = user_id)
    ```
*   **Security/Production Considerations**: While no changes seem necessary based on the current policies, it's crucial to perform this review step whenever schema changes occur. Ensure that application logic (Server Actions) also performs necessary authorization checks, not relying solely on RLS for complex business rules. The `service_role` must be protected and used only for trusted backend processes like the batch processor and webhooks.



---

**(Revised) Step 8.1: Implement Batch Upload UI (3-Step Wizard)**

*   **Task**: Develop the multi-step frontend interface for batch uploads, including file selection, prompt configuration, and review/submission.
*   **Goal**: Create an intuitive wizard that guides users through selecting files, choosing a prompt strategy, providing necessary prompts, and submitting the batch, while respecting tier limits from the KV store.
*   **Modules**:
    *   **8.1.1: Create Batch Upload Page & Wizard Wrapper**:
        *   **Action**: Set up the main page (`app/(dashboard)/dashboard/batch-upload/page.tsx`) and a new client component `BatchUploadWizard` (`components/batch/BatchUploadWizard.tsx`) to manage the wizard state. Implement tier-based access control.
        *   **Files**: `app/(dashboard)/dashboard/batch-upload/page.tsx` (minimal server component possibly), `components/batch/BatchUploadWizard.tsx` (New Client Component), `actions/stripe/sync-actions.ts`.
        *   **Instructions**:
            1.  `page.tsx` can fetch initial data if needed or just render the client wizard.
            2.  `BatchUploadWizard.tsx`: Use `"use client"`. Import necessary hooks, components, `getUserSubscriptionDataKVAction`, `subscriptionPlans`.
            3.  Manage wizard step state (`useState<'files' | 'prompts' | 'review'>('files')`).
            4.  `useEffect`: Fetch subscription data (`planId`, `status`) via `getUserSubscriptionDataKVAction`. Handle loading/errors.
            5.  Determine eligibility based on `status` and `planId`. If ineligible, render an "Upgrade Required" message/component instead of the wizard.
            6.  If eligible, determine `batchLimit` based on `planId`. Store `planId` and `batchLimit` in state.
            7.  Render the current step component based on wizard state. Include Next/Previous buttons.
    *   **8.1.2: Implement Step 1: File Selection**:
        *   **Action**: Integrate the multi-file uploader within the first step of the wizard.
        *   **Files**: `components/batch/BatchUploadWizard.tsx`, `components/utilities/BatchFileUpload.tsx`.
        *   **Instructions**:
            1.  Render `BatchFileUpload` component within the 'files' step.
            2.  Pass the tier-specific `batchLimit` (from state) as `maxFiles`.
            3.  Configure `allowedMimeTypes`, `maxFileSize`.
            4.  Use the `onFilesChange` callback to update the wizard's `selectedFiles: File[]` state.
            5.  Display validation errors from the uploader.
            6.  Disable the "Next" button if `selectedFiles.length === 0`.
    *   **8.1.3: Implement Step 2: Prompt Configuration**:
        *   **Action**: Allow users to select a prompt strategy and provide the necessary prompt(s).
        *   **Files**: `components/batch/BatchUploadWizard.tsx`.
        *   **Instructions**:
            1.  Add state for `promptStrategy: 'global' | 'per_document' | 'auto'` (default 'global'), `globalPrompt: string`, `perDocPrompts: Record<string, string>` (mapping file name/id to prompt).
            2.  Render radio buttons (or similar) to select the strategy.
            3.  Conditionally render input fields:
                *   `Global`: One `Textarea` for `globalPrompt`.
                *   `Per-Document`: A list/table of `selectedFiles` with a `Textarea` next to each to capture individual prompts in `perDocPrompts`.
                *   `Auto-Detect`: No prompt input needed here. Show informational text.
            4.  **Add UI Hint:** Clearly explain the behavior of each strategy (Global applies to all, Per-Document uses individual inputs, Auto uses classification + defaults).
            5.  Disable "Next" button if:
                *   Strategy is 'global' and `globalPrompt` is empty.
                *   Strategy is 'per_document' and any file is missing a prompt in `perDocPrompts`.
    *   **8.1.4: Implement Step 3: Review & Submit**:
        *   **Action**: Display a summary, estimated cost (optional), and the submit button. Handle submission logic.
        *   **Files**: `components/batch/BatchUploadWizard.tsx`, `actions/batch/batchActions.ts`.
        *   **Instructions**:
            1.  Display: Number of files, selected strategy, global prompt (if applicable) or confirmation of per-doc/auto.
            2.  *(Optional)* Show an *estimated* page count/cost based on a default assumption (e.g., 1 page/doc), clearly stating the final count will be determined server-side.
            3.  Add a "Submit Batch" button. Use `useTransition` for loading state (`isSubmitting`). Disable if `isSubmitting`.
            4.  On submit:
                *   Create `FormData`.
                *   Append `files` array.
                *   Append `promptStrategy`.
                *   If strategy is 'global', append `globalPrompt`.
                *   If strategy is 'per_document', append `perDocPrompts` as a JSON string (`JSON.stringify(perDocPrompts)`).
                *   Append optional `batchName`.
                *   Call `createBatchUploadAction(formData)`.
                *   Handle `ActionState` response: Show success toast and redirect (e.g., `/dashboard/batches` or `/dashboard/batches/[batchId]`) or show error toast/alert.
    *   **8.1.5: Update Sidebar Navigation**:
        *   **Action**: Add link in `AppSidebar`.
        *   **Files**: `components/utilities/app-sidebar.tsx`.
        *   **Instructions**: Add `SidebarMenuItem` for `/dashboard/batch-upload` (e.g., `Layers` icon).

---

** Step 8.2: Implement Batch Creation Server Action**

*   **Task**: Develop `createBatchUploadAction` to securely handle submissions, validate against KV store tier/limits, create DB records, upload files using **server-side page counting**, and store appropriate prompts.
*   **Goal**: Atomically create batch/document records, enforcing rules, storing accurate page counts, and associating the correct prompt strategy/text before queuing.
*   **Modules**:
    *   **8.2.1: Define Action & Basic Validation**:
        *   **Action**: Create/update `createBatchUploadAction` in `actions/batch/batchActions.ts`. Define input (`FormData`) and output (`ActionState<{ batchId: string }>`).
        *   **Files**: `actions/batch/batchActions.ts`, `actions/stripe/sync-actions.ts`, `lib/auth-utils.ts`, `lib/config/subscription-plans.ts`.
        *   **Instructions**:
            1.  `"use server"`. Get `userId`. Extract `files: File[]`, `batchName: string | null`, `promptStrategy: string`, `globalPrompt: string | null`, `perDocPromptsJson: string | null` from `FormData`.
            2.  Parse `perDocPromptsMap = perDocPromptsJson ? JSON.parse(perDocPromptsJson) : {}`. Handle parse errors.
            3.  **Fetch Subscription (KV):** Get `planId`/`status` via `getUserSubscriptionDataKVAction`. Handle errors.
            4.  **Validate Tier/Limits:** Determine `tier`. Deny access for 'starter'/inactive. Get `batchLimit`. Check `files.length`. Validate prompt inputs based on `promptStrategy` (e.g., `globalPrompt` required if strategy is 'global'). Return failure `ActionState` if invalid.
    *   **8.2.2: Implement Quota & Rate Limiting**:
        *   **Action**: Add checks *before* the transaction.
        *   **Files**: `actions/batch/batchActions.ts`, `lib/rate-limiting/limiter.ts`, `actions/db/user-usage-actions.ts`.
        *   **Instructions**:
            1.  Call `checkRateLimit(userId, tier, 'batch_upload')`. Return failure if needed.
            2.  **Preliminary Quota Check:** Call `checkUserQuotaAction(userId, files.length)`. Return failure if insufficient.
    *   **8.2.3: Implement File Processing & DB Transaction**:
        *   **Action**: Handle file uploads, server-side page counting, determine effective prompt, and create DB records atomically.
        *   **Files**: `actions/batch/batchActions.ts`, `lib/supabase/storage-utils.ts`, `db/db.ts`, schema files, `lib/utils/document-utils.ts`.
        *   **Instructions**:
            *   `db.transaction(async (tx) => { ... })`.
            *   Inside transaction:
                *   Create `extraction_batches` record using `tx`: `userId`, `name`, `prompt_strategy`, `extraction_prompt` (store `globalPrompt` ONLY if strategy is 'global', otherwise NULL), `status: 'pending_upload'`. Get `newBatchId`.
                *   Init `totalBatchPages = 0`, `filesProcessedSuccessfully = 0`, `filesFailedProcessing = 0`, `documentInsertPromises = []`.
                *   Loop through `files` array (using index `i`):
                    *   `try...catch` block per file.
                    *   Read file to `Buffer`.
                    *   Define unique `storagePath`.
                    *   Upload using `uploadToStorage`. If error, increment `filesFailedProcessing`, log, `continue`.
                    *   Get `pageCount` via `getServerSidePageCount`. If error, increment `filesFailedProcessing`, log, `continue`.
                    *   Add `pageCount` to `totalBatchPages`.
                    *   **Determine `effectivePrompt`**:
                        *   If `promptStrategy === 'global'`, `effectivePrompt = globalPrompt`.
                        *   If `promptStrategy === 'per_document'`, `effectivePrompt = perDocPromptsMap[file.name] ?? null`. Handle missing prompt for a file as an error (increment `filesFailedProcessing`, log, `continue`).
                        *   If `promptStrategy === 'auto'`, `effectivePrompt = null`.
                    *   **Prepare** `documents` insert using `tx`: link `batch_id`, store `pageCount`, store `extraction_prompt: effectivePrompt`, set `status: 'uploaded'`, add other fields. Add promise to `documentInsertPromises`.
                    *   Increment `filesProcessedSuccessfully`.
                    *   On error within loop: catch, increment `filesFailedProcessing`, log, `continue`.
                *   Execute inserts: `await Promise.all(documentInsertPromises)`.
                *   Check if any files succeeded: If `filesProcessedSuccessfully === 0` and `files.length > 0`, update batch status to `'failed'` (using `tx`), throw error "All files failed...".
                *   Else: Update `extraction_batches` (using `tx`): set `status: 'queued'`, `document_count: filesProcessedSuccessfully`, `failed_count: filesFailedProcessing`, `total_pages: totalBatchPages`.
            *   Return `newBatchId`.
    *   **8.2.4: Finalize Action (Analytics, Revalidation, Return)**:
        *   **Action**: Post-transaction logic.
        *   **Files**: `actions/batch/batchActions.ts`, `lib/analytics/server.ts`, `next/cache`.
        *   **Instructions**:
            *   After successful transaction: `trackServerEvent(...)`, `revalidatePath(...)`. Return success `ActionState`.
            *   Top-level `try...catch`: If transaction error, log. If `batchId` exists, attempt update batch status to `'failed'` (outside transaction). Return failure `ActionState`.

---

** Step 8.3: Implement Background Processing Logic**

*   **Task**: Create the Cron + API Route system to process documents, **resolve prompts based on strategy**, check quota accurately, and increment usage correctly.
*   **Goal**: Reliably process batch documents using the appropriate prompt for each, update statuses, handle usage counting, and manage batch completion.
*   **Modules**:
    *   **8.3.1: Configure Vercel Cron Job**: (No change from original plan).
    *   **8.3.2: Create Secure API Route**: (No change - check `CRON_SECRET`).
    *   **8.3.3: Implement Batch/Document Fetching & Locking**:
        *   **Action**: Query processable batches/documents, implement locking.
        *   **Files**: `app/api/batch-processor/route.ts`, schema files, `db/db.ts`.
        *   **Instructions**:
            1.  Query `extraction_batches` for `status = 'queued'`, limit batches.
            2.  Loop batches:
                *   Atomic update to set batch `status = 'processing'`. If no row returned, skip. Store fetched `batch` details (incl. `prompt_strategy`, `extraction_prompt` for global case).
                *   Query associated `documents` where `batch_id = batch.id` AND `status = 'uploaded'`, limit docs. **Select `id`, `user_id`, `page_count`, `mime_type`, `storage_path`, `extraction_prompt` (the per-doc one).**
    *   **8.3.4: Implement Document Processing Loop**:
        *   **Action**: Iterate documents, check quota, **resolve prompt**, call AI, handle results, **increment usage**.
        *   **Files**: `app/api/batch-processor/route.ts`, `actions/ai/extraction-actions.ts`, `actions/db/user-usage-actions.ts`, `prompts/classification.ts`, `prompts/extraction.ts`, `lib/utils/prompt-utils.ts`.
        *   **Instructions**:
            1.  Inside the batch loop, loop through `documents`.
            2.  **Accurate Quota Check:** `quotaResult = await checkUserQuotaAction(document.userId, document.pageCount)`.
            3.  If quota fails: Update doc status `'failed'`, job status `'failed'` + error, increment batch `failed_count`, `continue`. **Do not increment usage.**
            4.  If quota passes:
                *   Update doc status to `'processing'`.
                *   **Resolve Prompt (`finalPrompt`)**:
                    *   If `batch.prompt_strategy === 'global'`, `finalPrompt = batch.extraction_prompt`.
                    *   If `batch.prompt_strategy === 'per_document'`, `finalPrompt = document.extraction_prompt`. If `finalPrompt` is null/empty, handle as error (update doc/job status `'failed'`, increment `failed_count`, `continue`).
                    *   If `batch.prompt_strategy === 'auto'`:
                        *   If `document.extraction_prompt`, use it (`finalPrompt = document.extraction_prompt`).
                        *   Else (needs classification):
                            *   Download doc: `await supabase.storage...download(document.storage_path)`. Handle error.
                            *   Classify: `classificationResult = await classifyDocument(fileData, document.mime_type, traceId)`. Handle error (log, default type 'other').
                            *   Get default: `finalPrompt = getDefaultPromptForType(classificationResult.documentType)`.
                            *   **Update Document:** Save `finalPrompt` back to `documents` table (`UPDATE documents SET extraction_prompt = :finalPrompt WHERE id = :docId`). Handle update error (log).
                *   Call AI: `aiResult = await extractDocumentDataAction({ documentId: document.id, extractionPrompt: finalPrompt, /* other options */ }, true)`. (Pass `true` to skip internal usage increment).
                *   If `aiResult.isSuccess`: Update doc status `'completed'`, job status `'completed'`, increment batch `completed_count`. **Increment Usage:** `await incrementPagesProcessedAction(document.userId, document.pageCount)`. Handle increment errors.
                *   If `aiResult.isSuccess === false`: Update doc status `'failed'`, job status `'failed'` + error, increment batch `failed_count`. **Do not increment usage.**
    *   **8.3.5: Implement Batch Status Aggregation**: (No change - check counts, update final batch status).
    *   **8.3.6: Refine AI Action**:
        *   **Action**: Ensure `extractDocumentDataAction` handles background calls correctly.
        *   **Files**: `actions/ai/extraction-actions.ts`.
        *   **Instructions**:
            *   Verify it accepts `extractionPrompt` override.
            *   Ensure it **does not** call `incrementPagesProcessedAction` when `invokedByBatchProcessor` is true.
            *   Ensure it links `batch_id` to `extraction_jobs`.
            *   Ensure classification logic respects the `skipClassification` flag and uses the provided `extractionPrompt`.

---

**Step 8.4: Implement Batch Status UI**

*   **Task**: Build frontend pages for users to monitor their batch jobs and understand the prompting strategy used.
*   **Goal**: Provide clear visibility into batch progress, individual document statuses, and the prompt applied to each document.
*   **Modules**:
    *   **8.4.1: Create Batch List Action & Page**:
        *   **Action**: Define `fetchUserBatchesAction` (query `extraction_batches`, filter by `userId`, paginate, sort). Implement the list page UI (`app/(dashboard)/dashboard/batches/page.tsx`).
        *   **Files**: `actions/batch/batchActions.ts` (new action), `app/(dashboard)/dashboard/batches/page.tsx` (New File).
        *   **Instructions**: Fetch data. Display batches in table/list (Name, Status Badge, **Prompt Strategy**, Progress Bar (`completed_count`, `failed_count`, `document_count`), **Total Pages**, Dates). Link to detail page. Handle loading/empty states.
    *   **8.4.2: Create Batch Detail Action & Page Structure**:
        *   **Action**: Define `fetchBatchDetailsAction` (fetch specific `extraction_batches` record + associated `documents` records, verify ownership). Set up detail page structure (`app/(dashboard)/dashboard/batches/[batchId]/page.tsx`).
        *   **Files**: `actions/batch/batchActions.ts` (new action), `app/(dashboard)/dashboard/batches/[batchId]/page.tsx` (New File).
        *   **Instructions**: Get `batchId`. Call action server-side. Handle "not found"/access denied. Pass `batch` info (incl. `prompt_strategy`, global `extraction_prompt` if applicable) and `documents` list (incl. per-doc `extraction_prompt`) to a client component.
    *   **8.4.3: Implement Batch Detail Client Component**:
        *   **Action**: Build the interactive client component for displaying batch details.
        *   **Files**: `components/batch/BatchDetailClient.tsx` (New Component).
        *   **Instructions**:
            *   Use `"use client"`. Receive `batch` and `documents` props.
            *   Display batch summary (Name, Status, **Prompt Strategy**, **Global Prompt** if strategy is 'global', Progress Bar, **Total Pages**).
            *   Display document list/table: Filename, Status Badge, **Page Count**, **Effective Prompt** (Show per-doc prompt; if 'auto' and processed, show resolved prompt; if 'global', show indication it used the global one; show snippet with tooltip/modal for long prompts), Error if failed.
            *   Link completed docs to review page (`/dashboard/review/[documentId]`).
            *   Add document filtering/sorting within the batch.
            *   *Optional:* Implement polling (`useSWR`) or Realtime for status updates.

---

** Step 8.5:Testing**

*   **Task**: Ensure robustness, security, and correctness, including **KV-based tier checks**, **prompt strategy logic**, and **accurate page-based quota validation**.
*   **Goal**: Validate functionality, security, performance, and edge cases for all prompting strategies and quota scenarios.
*   **Modules**:
    *   **8.5.1: Unit Tests**: Test `getServerSidePageCount`, `resolvePrompt` helper (from processor), action input validation.
    *   **8.5.2: Integration Tests**:
        *   **Test `createBatchUploadAction`**: Mock KV for tiers. Test validation for each `promptStrategy`. Test preliminary quota check. Verify DB records (`batch.prompt_strategy`, `batch.extraction_prompt`, `doc.extraction_prompt`, correct `pageCount`/`total_pages`). Verify storage calls.
        *   **Test `/api/batch-processor`**: Mock DB fetches. Mock `checkUserQuotaAction` (based on `doc.pageCount`). Test `resolvePrompt` logic for all strategies (mock classification for 'auto'). Mock `extractDocumentDataAction`. Verify `incrementPagesProcessedAction` called *only* on success with correct `pageCount`. Verify status updates.
    *   **8.5.3: RLS Tests**: Add tests for `extraction_batches`. Review `documents`, `extraction_jobs` policies.
    *   **8.5.4: End-to-End (E2E) Testing**:
        *   Test tier limits (from KV).
        *   Test **Global Prompt** strategy.
        *   Test **Per-Document Prompt** strategy (e.g., 2 docs, 2 different prompts).
        *   Test **Auto-Detect** strategy with a mix of document types (e.g., invoice + resume). Verify different default prompts were used (check logs or potentially add a field to `extraction_jobs` to store the *resolved* prompt used).
        *   **Accurate Quota Test:** Set low DB quota. Submit batch exceeding quota based on *actual page counts*. Verify behavior (some success, some fail, correct usage increment, correct batch status).
        *   Test error scenarios (upload fail, page count fail, classify fail, AI fail).

---