Okay, this is a much clearer picture. We will create a detailed `implementation.md` file that guides the AI assistant to **refactor your existing project** into the **new structure** and **new tech stack**.

The plan will involve:

1.  **Restructuring:** Moving existing relevant files (UI components, specific pages) into the new directory structure (`actions/`, `app/`, `components/`, etc.).
2.  **Replacing Core Systems:** Swapping out Firebase Auth/DB/Storage for Clerk/Supabase.
3.  **Updating Logic:** Refactoring API routes into Server Actions, updating data fetching/mutation logic.
4.  **Connecting UI:** Linking the existing Upload and Review page UI (and building out the others) to the new backend logic and data sources.
5.  **Implementing New Features:** Adding Stripe payments, PostHog/Helicone analytics, and Batch Processing.
6.  **Integrating Rules:** Incorporating the specific rules from your `.md` files.
7.  **Production Polish:** Adding error handling, logging, security checks, and performance considerations.

Here is the detailed `implementation.md`:

```markdown
# Ingestio.io Implementation Plan (Refactor to New Structure & Stack)

**Project:** Ingestio.io - AI Document Data Extraction
**Target Stack:** Next.js (Server Actions), Supabase (Postgres, Storage), Clerk (Auth), Stripe (Payments), PostHog/Helicone (Analytics), Vercel AI SDK (Vertex), Tailwind, Shadcn, Framer Motion, MagicUI
**Target Structure:** `actions/`, `app/`, `components/`, `db/`, `lib/`, `prompts/`, `public/`, `types/`
**Deployment:** Vercel

**Goal:** Refactor the existing application to the target tech stack and project structure. Connect existing UI (Upload, Review) and build out remaining pages (Dashboard, History, Metrics, Profile, Settings, Billing, Batch Processing) using real data. Implement payments, analytics, and batch processing. Ensure production readiness.

**Current Status:**
*   Landing Page (`app/(marketing)/page.tsx`) exists.
*   Upload Page (`app/(dashboard)/dashboard/upload/page.tsx`, `components/FileUpload.tsx`) UI exists; triggers old `/api/upload`.
*   Review Page (`app/(dashboard)/dashboard/review/[id]/page.tsx`, `components/DataVisualizer.tsx`, `components/DocumentViewer.tsx`, etc.) UI exists; displays mock/partially connected data from old `/api/documents` routes.
*   Other dashboard pages (`history`, `metrics`, `profile`, `settings`) exist but use mock data.
*   Firebase is the current backend/auth (`lib/firebase`, `context/AuthContext.tsx`, old `/api` routes).
*   Shadcn UI components exist in `components/ui`.

**Refactoring Approach:** We will move existing relevant files into the new structure, then replace backend/auth logic, connect the UI to new Server Actions and data sources, and finally build out the remaining features and pages.

**General Rules Reference:** Adhere to rules defined in `general.md`, `frontend.md`, `backend.md`, `auth.md`, `storage.md`, `payments.md`, `analytics.md`.

---

## Section 0: Project Restructuring & Cleanup

-   [x] **Step 0.1: Create New Directory Structure**
    -   **Task**: Create the target top-level directories (`actions`, `app`, `components`, `db`, `lib`, `prompts`, `types`). Create subdirectories like `actions/db`, `actions/ai`, `app/(auth)`, `app/(dashboard)/dashboard`, `app/(marketing)`, `components/ui`, `components/utilities`, `components/providers`, `db/schema`, `lib/hooks`, `lib/config`, `lib/supabase`, `lib/stripe`, `lib/ai`, `lib/analytics`, **`lib/redis`**, **`lib/rate-limiting`**.
    -   **Files**: Create new directories at the project root.
    -   **Step Dependencies**: None
    -   **User Instructions**: Create the folder structure as specified.

-   [x] **Step 0.2: Move Existing Files to New Structure**
    -   **Task**: Move existing components, pages, and utility files into their corresponding new locations. **Do not modify logic yet.**
    -   **Files**: (Same as previous plan, ensure paths are correct)
        -   ... (all file moves listed previously) ...
        -   **Delete:** `app/api/`, `context/`, `lib/firebase/`.
    -   **Step Dependencies**: 0.1
    -   **User Instructions**: Carefully move files. Update import paths. Delete specified old directories.

## Section 1: Core Setup & Configuration (Post-Restructure)

-   [x] **Step 1.1: Install Dependencies**
    -   **Task**: Install packages for the target stack.
    -   **Files**:
        -   `package.json`: Add `@supabase/supabase-js`, `@supabase/ssr`, `@clerk/nextjs`, `stripe`, `@stripe/stripe-js`, **`@upstash/redis`**, **`@upstash/ratelimit`**, `posthog-js`, `posthog-node`, `ai`, `@ai-sdk/google-vertex`, `svix`, `zod`, `magic-ui`, `uuid`. Ensure others are present. Remove `firebase`.
    -   **Step Dependencies**: 0.2
    -   **User Instructions**: Run `pnpm install`.

-   [x] **Step 1.2: Environment Variable Setup**
    -   **Task**: Define/configure environment variables in `.env.local`.
    -   **Files**:
        -   `.env.local`: Add/Verify Supabase, Clerk, Stripe, PostHog, Helicone (Optional), GCP/Vertex keys/secrets/IDs. **Add `UPSTASH_REDIS_URL`, `UPSTASH_REDIS_TOKEN`**.
        -   `.env.example`: Update.
    -   **Step Dependencies**: None
    -   **User Instructions**: Obtain all keys/secrets/IDs. Set up GCP/Stripe/Upstash resources.

-   [x] **Step 1.3: Initialize Supabase Clients & Middleware**
    -   **Task**: Set up Supabase clients using `@supabase/ssr`.
    -   **Files**: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/middleware.ts`.
    -   **Step Dependencies**: 1.1, 1.2
    -   **User Instructions**: Follow `@supabase/ssr` docs.

-   [x] **Step 1.4: Initialize Clerk Provider & Middleware**
    -   **Task**: Wrap layout with `ClerkProvider` and set up middleware.
    -   **Files**: `app/layout.tsx`, `middleware.ts` (Root).
    -   **Step Dependencies**: 1.1, 1.2
    -   **User Instructions**: Configure Clerk dashboard URLs. Define public routes in middleware.

-   [x] **Step 1.5: Initialize PostHog Provider**
    -   **Task**: Set up PostHog client-side provider.
    -   **Files**: `components/providers/PostHogProvider.tsx`, `app/layout.tsx`.
    -   **Step Dependencies**: 1.1, 1.2, 1.4
    -   **User Instructions**: Ensure PostHog env vars are correct.

-   [x] **Step 1.6: Initialize Redis Client** **(New Step)**
    -   **Task**: Set up the Upstash Redis client utility.
    -   **Files**: `lib/redis/client.ts`.
    -   **Step Dependencies**: 1.1, 1.2
    -   **User Instructions**: Create a singleton Redis client instance using `@upstash/redis` and the environment variables. Export the client instance. Mention its use for rate limiting and potentially caching.

-   [x] **Step 1.7: Configure Vercel AI SDK (Vertex Provider)**
    -   **Task**: Configure the Vercel AI SDK client for Google Vertex.
    -   **Files**: `lib/ai/vertex-client.ts`.
    -   **Step Dependencies**: 1.1, 1.2
    -   **User Instructions**: Ensure GCP credentials and Vertex project/location are set. Handle optional Helicone proxy.

-   [x] **Step 1.8: Configure Stripe Clients**
    -   **Task**: Set up utility functions for Stripe instances.
    -   **Files**: `lib/stripe/server.ts`, `lib/stripe/client.ts`.
    -   **Step Dependencies**: 1.1, 1.2
    -   **User Instructions**: Ensure Stripe keys are correct.

-   [] **Step 1.9: Define Subscription Plan Configuration**
    -   **Task**: Create configuration file for subscription plans.
    -   **Files**: `lib/config/subscription-plans.ts`.
    -   **Step Dependencies**: 1.2
    -   **User Instructions**: Ensure Price IDs match Stripe and env vars.

-   [x] **Step 1.10: Update Base Layouts & Providers**
    -   **Task**: Ensure root layout correctly integrates all providers.
    -   **Files**: `app/layout.tsx`, `components/providers/Providers.tsx`, `components/ui/toaster.tsx`.
    -   **Step Dependencies**: 1.4, 1.5, 1.6, 1.7
    -   **User Instructions**: Check provider nesting order.

## Section 2: Authentication Implementation (Clerk)

-   [x] **Step 2.1: Implement Clerk Authentication Pages**
    -   **Task**: Replace content with Clerk components.
    -   **Files**: `app/(auth)/login/[[...sign-in]]/page.tsx`, `app/(auth)/signup/[[...sign-up]]/page.tsx`, `app/(auth)/layout.tsx`, `app/auth-theme.css` (Optional).
    -   **Step Dependencies**: 1.4
    -   **User Instructions**: Customize appearance.

-   [x] **Step 2.2: Implement User Profile Page**
    -   **Task**: Replace content with Clerk's component.
    -   **Files**: `app/(dashboard)/dashboard/profile/page.tsx`.
    -   **Step Dependencies**: 1.4
    -   **User Instructions**: Customize appearance.

-   [x] **Step 2.3: Update User Navigation Component**
    -   **Task**: Update `user-nav` to use Clerk.
    -   **Files**: `components/utilities/user-nav.tsx`.
    -   **Step Dependencies**: 1.4, 2.1
    -   **User Instructions**: Use `<UserButton>`. Handle loading state.

-   [x] **Step 2.4: Implement Clerk Webhook for Supabase Sync**
    -   **Task**: Create webhook handler. **Crucially, ensure it creates records in BOTH `users` and `profiles` tables on `user.created` and handles updates/deletes correctly for both.**
    -   **Files**: `app/api/webhooks/clerk/route.ts`.
    -   **Step Dependencies**: 1.3, 1.4, 1.5, 3.1 (DB Schema)
    -   **User Instructions**: Configure webhook in Clerk. Use `createAdminClient`. Sync email, name, avatar to `users`; default membership to `profiles`.

-   [x] **Step 2.5: Configure Clerk JWT Template for Supabase**
    -   **Task**: Create Supabase JWT template in Clerk.
    -   **Files**: None (Clerk Dashboard)
    -   **Step Dependencies**: None
    -   **User Instructions**: Follow Clerk/Supabase docs.

## Section 3: Database & Storage Setup (Supabase)

Okay, this plan focuses specifically on **Step 3.1: Define & Apply Supabase Database Schema (MVP)** from the previous `implementation.md`. It breaks down the process of creating the necessary Drizzle schema files for your MVP database, generating the SQL migration, and applying it, considering your existing `users` and `profiles` tables and the need to update the subscription tier enum.

## Section 3.1: Define & Apply Supabase Database Schema (MVP)

**Goal:** Define the Drizzle ORM schemas for the MVP tables (`user_usage`, `documents`, `extraction_batches`, `extraction_jobs`, `extracted_data`, `exports`), update the existing `profiles` schema to use the new subscription tier names, generate the SQL migration, and prepare for its application to your Supabase database.

---

-   [x] **Step 3.1.1: Update `membership` Enum and `profiles` Schema**
    *   **Task**: Modify the existing `membership` enum definition to use `starter`, `plus`, `growth` and ensure the `profiles` schema uses this updated enum and correctly references the `users` table's TEXT `user_id`.
    *   **Files**:
        *   `db/schema/profiles-schema.ts`:
            *   Update `pgEnum` call: `export const membershipEnum = pgEnum("membership", ["starter", "plus", "growth"]);` (Ensure this matches the exact type name used in your existing migration if different).
            *   Verify `userId` column definition: `userId: text("user_id").primaryKey().notNull().references(() => usersTable.userId, { onDelete: 'cascade' }),` (assuming `usersTable` is imported from `users-schema.ts`).
            *   Ensure `membership` column uses the updated `membershipEnum` and defaults to `'starter'`.
        *   `db/schema/index.ts`: Ensure `profilesTable` and `membershipEnum` are exported.
    *   **Step Dependencies**: Existing `db/schema/profiles-schema.ts`, `db/schema/users-schema.ts`.
    *   **User Instructions**: Modify the `pgEnum` definition in `profiles-schema.ts`. Double-check that the `userId` column is `TEXT`, `PRIMARY KEY`, and correctly references `usersTable.userId`. Update the default value for `membership` to `'starter'`.

-   [x] **Step 3.1.2: Define `user_usage` Schema**
    *   **Task**: Create a new Drizzle schema file for the `user_usage` table. This table tracks page consumption against limits per billing period.
    *   **Files**:
        *   `db/schema/user-usage-schema.ts` (New File):
            *   Import necessary functions from `drizzle-orm/pg-core` (`pgTable`, `uuid`, `text`, `timestamp`, `integer`, `unique`) and reference `profilesTable` from `profiles-schema.ts`.
            *   Define the table `userUsageTable` with columns: `id` (uuid, PK, default random), `userId` (text, notNull, FK referencing `profilesTable.userId` with cascade delete), `billingPeriodStart` (timestamp, notNull), `billingPeriodEnd` (timestamp, notNull), `pagesProcessed` (integer, notNull, default 0), `pagesLimit` (integer, notNull), `createdAt` (timestamp, notNull, default now), `updatedAt` (timestamp, notNull, default now).
            *   Add a unique constraint on `userId` and `billingPeriodStart`.
            *   Export the table definition and `SelectUserUsage`, `InsertUserUsage` types.
        *   `db/schema/index.ts`: Add `export * from "./user-usage-schema";`
    *   **Step Dependencies**: 3.1.1
    *   **User Instructions**: Create the new file `db/schema/user-usage-schema.ts` with the specified Drizzle schema definition. Update `db/schema/index.ts` to export the new schema.

-   [x] **Step 3.1.3: Define `documents` Schema**
    *   **Task**: Create the Drizzle schema file for the `documents` table, including the `document_status` enum.
    *   **Files**:
        *   `db/schema/documents-schema.ts` (New File):
            *   Import necessary functions (`pgTable`, `uuid`, `text`, `timestamp`, `integer`, `pgEnum`) and reference `profilesTable`.
            *   Define `documentStatusEnum` as `pgEnum("document_status", ['uploaded', 'processing', 'completed', 'failed'])`.
            *   Define `documentsTable` with columns: `id` (uuid, PK, default random), `userId` (text, notNull, FK referencing `profilesTable.userId` with cascade delete), `originalFilename` (text, notNull), `storagePath` (text, notNull), `mimeType` (text, notNull), `fileSize` (integer, notNull), `pageCount` (integer, notNull), `status` (use `documentStatusEnum`, notNull, default 'uploaded'), `createdAt`, `updatedAt`.
            *   Export enums, table definition, and types (`SelectDocument`, `InsertDocument`).
        *   `db/schema/index.ts`: Add `export * from "./documents-schema";`
    *   **Step Dependencies**: 3.1.1
    *   **User Instructions**: Create the new file `db/schema/documents-schema.ts`. Define the enum and table schema. Update `db/schema/index.ts`.

-   [x] **Step 3.1.4: Define `extraction_batches` Schema**
    *   **Task**: Create the Drizzle schema file for the `extraction_batches` table.
    *   **Files**:
        *   `db/schema/extraction-batches-schema.ts` (New File):
            *   Import necessary functions (`pgTable`, `uuid`, `text`, `timestamp`, `integer`, `check`) and reference `profilesTable`.
            *   Define `extractionBatchesTable` with columns: `id` (uuid, PK, default random), `userId` (text, notNull, FK referencing `profilesTable.userId` with cascade delete), `name` (text, nullable), `status` (text, notNull, add CHECK constraint `status IN (...)`), `documentCount` (integer, notNull, default 0), `completedCount` (integer, notNull, default 0), `failedCount` (integer, notNull, default 0), `createdAt`, `updatedAt`.
            *   Export table definition and types (`SelectExtractionBatch`, `InsertExtractionBatch`).
        *   `db/schema/index.ts`: Add `export * from "./extraction-batches-schema";`
    *   **Step Dependencies**: 3.1.1
    *   **User Instructions**: Create the new file `db/schema/extraction-batches-schema.ts`. Define the table schema including the CHECK constraint for status. Update `db/schema/index.ts`.

-   [x] **Step 3.1.5: Define `extraction_jobs` Schema**
    *   **Task**: Create the Drizzle schema file for `extraction_jobs`, including the `extraction_status` enum.
    *   **Files**:
        *   `db/schema/extraction-jobs-schema.ts` (New File):
            *   Import necessary functions (`pgTable`, `uuid`, `text`, `timestamp`, `jsonb`, `pgEnum`) and reference `profilesTable`, `documentsTable`, `extractionBatchesTable`.
            *   Define `extractionStatusEnum` as `pgEnum("extraction_status", ['queued', 'processing', 'completed', 'failed'])`.
            *   Define `extractionJobsTable` with columns: `id` (uuid, PK, default random), `userId` (text, notNull, FK to `profilesTable.userId`), `documentId` (uuid, notNull, FK to `documentsTable.id`), `batchId` (uuid, nullable, FK to `extractionBatchesTable.id` with `onDelete: 'set null'`), `status` (use `extractionStatusEnum`, notNull, default 'queued'), `extractionPrompt` (text, nullable), `extractionOptions` (jsonb, notNull, default '{}'), `errorMessage` (text, nullable), `createdAt`, `updatedAt`.
            *   Export enum, table definition, and types (`SelectExtractionJob`, `InsertExtractionJob`).
        *   `db/schema/index.ts`: Add `export * from "./extraction-jobs-schema";`
    *   **Step Dependencies**: 3.1.1, 3.1.3, 3.1.4
    *   **User Instructions**: Create the new file `db/schema/extraction-jobs-schema.ts`. Define the enum and table schema with correct foreign keys. Update `db/schema/index.ts`.

-   [x] **Step 3.1.6: Define `extracted_data` Schema**
    *   **Task**: Create the Drizzle schema file for `extracted_data`.
    *   **Files**:
        *   `db/schema/extracted-data-schema.ts` (New File):
            *   Import necessary functions (`pgTable`, `uuid`, `text`, `timestamp`, `jsonb`) and reference `extractionJobsTable`, `documentsTable`, `profilesTable`.
            *   Define `extractedDataTable` with columns: `id` (uuid, PK, default random), `extractionJobId` (uuid, notNull, FK to `extractionJobsTable.id` with cascade delete), `documentId` (uuid, notNull, FK to `documentsTable.id` with cascade delete), `userId` (text, notNull, FK to `profilesTable.userId` with cascade delete), `data` (jsonb, notNull), `documentType` (text, nullable), `createdAt`, `updatedAt`.
            *   Export table definition and types (`SelectExtractedData`, `InsertExtractedData`).
        *   `db/schema/index.ts`: Add `export * from "./extracted-data-schema";`
    *   **Step Dependencies**: 3.1.1, 3.1.3, 3.1.5
    *   **User Instructions**: Create the new file `db/schema/extracted-data-schema.ts`. Define the table schema with correct foreign keys. Update `db/schema/index.ts`.

-   [x] **Step 3.1.7: Define `exports` Schema**
    *   **Task**: Create the Drizzle schema file for `exports`, including the `export_format` enum.
    *   **Files**:
        *   `db/schema/exports-schema.ts` (New File):
            *   Import necessary functions (`pgTable`, `uuid`, `text`, `timestamp`, `pgEnum`, `customType`) and reference `profilesTable`.
            *   Define `exportFormatEnum` as `pgEnum("export_format", ['json', 'csv', 'excel'])`.
            *   Define `uuidArray` custom type: `const uuidArray = customType<{ data: string[] }>({ postgresql: () => 'uuid[]' });`
            *   Define `exportsTable` with columns: `id` (uuid, PK, default random), `userId` (text, notNull, FK to `profilesTable.userId`), `format` (use `exportFormatEnum`, notNull), `status` (text, notNull, add CHECK constraint), `filePath` (text, nullable), `documentIds` (use `uuidArray`, notNull), `createdAt`, `updatedAt`.
            *   Export enum, table definition, and types (`SelectExport`, `InsertExport`).
        *   `db/schema/index.ts`: Add `export * from "./exports-schema";`
    *   **Step Dependencies**: 3.1.1
    *   **User Instructions**: Create the new file `db/schema/exports-schema.ts`. Define the enum, custom array type, and table schema. Update `db/schema/index.ts`.

-   [x] **Step 3.1.8: Generate SQL Migration**
    *   **Task**: Use Drizzle Kit to generate the SQL migration file incorporating all schema changes (updated `profiles`, new MVP tables, new enums).
    *   **Files**: `db/migrations/*` (New SQL file will be generated).
    *   **Step Dependencies**: All previous 3.1.x steps.
    *   **User Instructions**:
        1.  Run `pnpm run db:generate`. Name the migration descriptively (e.g., `add_mvp_tables`).
        2.  **Carefully review** the generated SQL file (`db/migrations/YYYYMMDDHHMMSS_add_mvp_tables.sql`).
        3.  **Verify:** Check for `CREATE TYPE` for new enums, `ALTER TYPE membership RENAME VALUE...` (or similar Drizzle generates for enum changes), `CREATE TABLE` for all new tables, `CREATE INDEX` statements.
        4.  **Manually Add Triggers:** Drizzle Kit *won't* automatically add the `updated_at` triggers for the new tables. **Manually copy/paste** the `CREATE TRIGGER "update_..._updated_at" ...` statements (from the MVP schema SQL provided earlier) into the generated migration file for `user_usage`, `documents`, `extraction_batches`, `extraction_jobs`, `extracted_data`, and `exports`. Ensure they reference the correct table names and the existing `update_updated_at` function.
        5.  **Manually Add Comments:** (Optional) Add `COMMENT ON COLUMN...` statements to the migration file if desired for clarity in the database.

-   [x] **Step 3.1.9: Apply Migration to Supabase**
    *   **Task**: Apply the generated and manually edited SQL migration file to your Supabase database.
    *   **Files**: None (Action performed on DB).
    *   **Step Dependencies**: 3.1.8.
    *   **User Instructions**: **BACKUP YOUR DATABASE FIRST.** Then, either use the Supabase Dashboard SQL Editor to run the contents of the generated migration file or use the Supabase CLI (`supabase db push` if linked, or apply manually). Verify the changes in the Supabase table editor.

-   [x] **Step 3.2: Implement Supabase RLS Policies (MVP)**
    -   **Task**: Define and apply RLS policies for **MVP tables**.
    -   **Files**:
        -   `supabase/migrations/YYYYMMDDHHMMSS_mvp_rls_policies.sql`: Use SQL for MVP RLS policies. Ensure policies use `auth.uid()` or `auth.jwt()->>'sub'` matching the TEXT `user_id`.
    -   **Step Dependencies**: 3.1, 2.5
    -   **User Instructions**: Apply policies. Test thoroughly.

-   [x] **Step 3.3: Configure Supabase Storage Bucket & Policies**
    -   **Task**: Create private storage buckets (`documents`, `exports`) and define access policies.
    -   **Files**: None (Supabase Dashboard/SQL)
    -   **Step Dependencies**: 1.4, 3.2
    -   **User Instructions**: Use RLS-based policies for `storage.objects` referencing `auth.uid()`.


**Plan for Step 3.4:**

-   [x] **Step 3.4.1: Ensure Supabase CLI Login & Project Linking**
    *   **Task**: Verify that the Supabase CLI is logged in and the local project is linked to the correct remote Supabase project. The type generation command relies on introspecting the linked remote database.
    *   **Files**: None (CLI interaction). Check `supabase/.temp/project-ref` to confirm the linked project ID (`fypuznckaysroxucvlau`).
    *   **Step Dependencies**: Supabase CLI installed (assumed from `package.json`).
    *   **User Instructions**:
        1.  Run `supabase login` in your terminal if you haven't already, and follow the prompts.
        2.  Run `supabase link --project-ref fypuznckaysroxucvlau` (replace with your actual project ref if different) and follow the prompts (it might ask for the database password). Confirm linking is successful.

-   [x] **Step 3.4.2: Generate TypeScript Types**
    *   **Task**: Execute the Supabase CLI command to generate TypeScript types based on the remote database schema and save them to the specified file.
    *   **Files**: `types/supabase.ts` (Will be created or overwritten).
    *   **Step Dependencies**: 3.1 (Schema applied to remote DB), 3.4.1 (CLI linked).
    *   **User Instructions**:
        1.  Run the following command in your project's root directory:
            ```bash
            supabase gen types typescript --linked > types/supabase.ts
            ```
        2.  *(Alternative if `--linked` doesn't work as expected)*:
            ```bash
            supabase gen types typescript --project-id fypuznckaysroxucvlau > types/supabase.ts
            ```
        3.  Confirm the command runs without errors and the `types/supabase.ts` file is generated/updated.

-   [x] **Step 3.4.3: Verify Generated Types**
    *   **Task**: Briefly inspect the generated `types/supabase.ts` file to ensure it reflects the current database schema.
    *   **Files**: `types/supabase.ts`.
    *   **Step Dependencies**: 3.4.2.
    *   **User Instructions**:
        1.  Open `types/supabase.ts`.
        2.  Look for the main `Database` interface.
        3.  Inside `public` -> `Tables`, verify that interfaces/types exist for your tables (e.g., `users`, `profiles`, `documents`, `user_usage`, `exports`, etc.).
        4.  Check that column names and types within these table definitions seem correct.
        5.  Inside `public` -> `Enums`, verify that your database enums (`membership`, `document_status`, `export_format`, `extraction_status`) are present.

-   [ ] **Step 3.4.4: Integrate Generated Types**
    *   **Task**: Ensure the generated types are correctly exported and utilized by the Supabase client instances.
    *   **Files**:
        *   `types/index.ts`: Verify or add `export * from "./supabase-types";` (or `./supabase` if you named the file `supabase.ts`).
        *   `lib/supabase/client.ts`: Ensure `createBrowserClient<Database>(...)` uses the imported `Database` type.
        *   `lib/supabase/server.ts`: Ensure `createServerClient<Database>(...)` and `createAdminClient` (using `createClient<Database>`) use the imported `Database` type.
        *   `app/api/webhooks/clerk/clerk-client.ts`: Ensure `createClerkAdminClient` (using `createClient<Database>`) uses the imported `Database` type.
    *   **Step Dependencies**: 3.4.3.
    *   **User Instructions**:
        1.  Check `types/index.ts` and make sure the generated types file (`supabase.ts` or `supabase-types.ts`) is exported.
        2.  Go to the specified client creation files (`lib/supabase/client.ts`, `lib/supabase/server.ts`, `app/api/webhooks/clerk/clerk-client.ts`).
        3.  Import the `Database` type from `types/index.ts` (or directly from `types/supabase.ts`).
        4.  Ensure the Supabase client creation functions (`createBrowserClient`, `createServerClient`, `createClient`) include the generic type parameter: `<Database>`.


## Section 4: Core Application Logic (Server Actions & Rate Limiting)

-   [x] **Step 4.0: Implement Rate Limiting Logic** **(New Step)**
    -   **Task**: Implement application-level rate limiting using Redis/Upstash.
    -   **Files**:
        -   `lib/rate-limiting/limiter.ts`: Define rate limiter instances (e.g., using `@upstash/ratelimit`) for different actions (e.g., extraction, general API).
        -   `middleware.ts`: Apply rate limiting to relevant API routes (if any remain) or potentially edge functions.
        -   Server Actions (`actions/*`): Import and use the rate limiter logic within actions that need protection (e.g., `extractDocumentDataAction`). Fetch user tier from `profiles` to apply tier-based limits.
    -   **Step Dependencies**: 1.6 (Redis Client), 1.9 (Subscription Config), 2.4 (Profile data), 4.1 (Auth Helpers)
    -   **User Instructions**: Implement logic based on `rate-limiting.md` strategy. Use Redis for state, not the DB table. Handle `429 Too Many Requests` errors gracefully.

### Step 4.1: Create Base Action Types & Auth Helpers

#### Prompt
**Task**: Define the `ActionState` type and server-side authentication helpers to standardize action responses and ensure secure access control across the application.

**Files**:
- `types/server-action-types.ts`: Define the `ActionState` type (updated from `types/actions.ts` based on codebase).
- `lib/auth-utils.ts`: Implement server-side authentication helpers.

**Step Dependencies**:
- **1.4**: Clerk Authentication Setup (`@clerk/nextjs` in `package.json`, used in `app/layout.tsx`).
- **1.5**: Supabase Client Setup (`lib/supabase/server.ts`).

**User Instructions**:
1. **Define `ActionState` Type**:
   - In `types/server-action-types.ts`, create a generic `ActionState` type to standardize server action responses. Include fields for success status, error messages, and data payloads.
   - Example implementation:
     ```typescript
     export type ActionState<TData = undefined> = {
       isSuccess: boolean;
       message: string;
       data?: TData;
       error?: string;
     };
     ```
   - Ensure the type is reusable across all server actions (e.g., in `actions/db/*` and `actions/ai/*`).

2. **Implement Authentication Helpers**:
   - In `lib/auth-utils.ts`, create server-side functions using Clerk’s `@clerk/nextjs` to manage authentication:
     - `getCurrentUser()`: Retrieves the authenticated user’s ID or throws an error if unauthenticated. Use `auth()` from `@clerk/nextjs/server`.
     - `isUserAuthenticated()`: Returns a boolean indicating if the user is authenticated.
   - Example:
     ```typescript
     import { auth } from "@clerk/nextjs/server";

     export async function getCurrentUser() {
       const { userId } = auth();
       if (!userId) throw new Error("Unauthorized");
       return userId;
     }

     export async function isUserAuthenticated() {
       const { userId } = auth();
       return !!userId;
     }
     ```

3. **Integrate with Supabase**:
   - Use `lib/supabase/server.ts` to create a Supabase client with the authenticated user’s context. Ensure helpers align with Supabase’s RLS policies by passing Clerk’s user ID where needed.
   - Example usage in actions: `const supabase = createSupabaseServerClient();`.

4. **Testing**:
   - Add unit tests in `__tests__/auth-utils.test.ts` (create this file if not present) to verify `getCurrentUser()` and `isUserAuthenticated()` behavior for authenticated and unauthenticated scenarios.

---

[x] 
### Step 4.2: Implement Document Upload Action

#### Prompt
**Task**: Create a server action for uploading documents, ensuring it respects rate limits, checks user quotas, and updates usage metrics.

**Files**:
- `actions/db/documents.ts`: Implement the `uploadDocumentAction` server action.

**Step Dependencies**:
- **3.1**: Database Schema (`db/schema/documents-schema.ts`, `db/schema/user-usage-schema.ts`).
- **3.3**: Storage Buckets Setup (implied via Supabase Storage in `lib/supabase/server.ts`).
- **3.4**: RLS Policies (tested in `__tests__/rls/documents.test.ts`).
- **4.0**: Rate Limit Check (`lib/rate-limiting/limiter.ts`).
- **4.1**: Auth Helpers (`lib/auth-utils.ts`).
- **6.4**: Usage Check (`actions/db/user-usage-actions.ts`).
- **7.2**: Analytics (`lib/analytics/server.ts`).

**User Instructions**:
1. **Authentication Check**:
   - Use `getCurrentUser()` from `lib/auth-utils.ts` to verify the user is authenticated and retrieve their ID.

2. **Rate Limit Check**:
   - Fetch the user’s subscription tier from `profiles` using `getProfileByUserIdAction` in `actions/db/profiles-actions.ts`.
   - Apply the appropriate rate limiter from `lib/rate-limiting/limiter.ts` based on the tier (e.g., Starter, Plus, Growth). Use `@upstash/ratelimit`.
   - If exceeded, return:
     ```typescript
     return { isSuccess: false, message: "Rate limit exceeded", error: "429" };
     ```

3. **Quota Check**:
   - Use `checkUserQuotaAction` from `actions/db/user-usage-actions.ts` to verify remaining pages in `user_usage`.
   - If quota is exceeded, return:
     ```typescript
     return { isSuccess: false, message: "Page quota exceeded", error: "403" };
     ```

4. **File Upload**:
   - Use `lib/supabase/server.ts` to upload the file to the `documents` bucket, prefixing the path with the user’s ID (e.g., `${userId}/filename.pdf`) for RLS enforcement.
   - Insert metadata into `documents` table via Supabase client.

5. **Update Usage**:
   - Call `incrementPagesProcessedAction` from `actions/db/user-usage-actions.ts` to update `pagesProcessed` in `user_usage`.

6. **Revalidation and Redirection**:
   - Revalidate relevant Next.js paths (e.g., `/dashboard/upload`) using `revalidatePath` from `next/cache`.
   - Redirect to the document review page using `redirect` from `next/navigation`.

7. **Analytics**:
   - Use `trackApiUsage` from `lib/analytics/server.ts` to log the upload event (e.g., PostHog integration).

8. **Error Handling**:
   - Return appropriate `ActionState` responses for rate limit, quota, and upload errors.

---

---

### ---

[x]
### Step 4.3: Implement AI Extraction Action

#### Prompt
**Task**: Create server actions for AI-based document extraction using the Vertex AI client, respecting rate limits, quotas, and **effectively utilizing user-provided or default extraction prompts, potentially enhanced by document type detection, based on established guidelines**.

**Files**:
- `actions/ai/extraction-actions.ts`: Implement `extractDocumentDataAction`, `extractTextAction`, `extractInvoiceDataAction`, `extractResumeDataAction`, etc.
- `prompts/extraction.ts`: Define default extraction prompts, system instructions, and helper functions (`enhancePrompt`, `getDefaultPrompt`).

**Step Dependencies**:
- **1.7**: Vertex Client Setup (`lib/ai/vertex-client.ts`).
- **3.1**: Database Schema (`db/schema/documents-schema.ts`, `db/schema/extracted-data-schema.ts`, `db/schema/extraction-jobs-schema.ts`).
- **3.3**: Storage Buckets (via `lib/supabase/server.ts`).
- **3.4**: RLS Policies (`__tests__/rls/documents.test.ts`).
- **4.0**: Rate Limit Check (`lib/rate-limiting/limiter.ts`).
- **4.1**: Auth Helpers (`lib/auth-utils.ts`).
- **4.4**: Schema Generation (optional, `actions/ai/schema.ts`).
- **7.2**: Analytics (`lib/analytics/server.ts`).
- **User Prompt Guidelines**: Reference `docs/db-docs/user-prompt-handling-guidelines.md`.

**User Instructions**:
1.  **Authentication Check**: Use `getCurrentUser()` from `lib/auth-utils.ts`.
2.  **Rate Limit & Quota Check**: Fetch user tier (`getProfileByUserIdAction`), apply rate limiting (`checkRateLimit`), check page quota (`checkUserQuotaAction`). Return `429`/`403` if exceeded.
3.  **Input Validation**: Use Zod (`extractDocumentSchema`) to validate input, including `documentId` and optional `extractionPrompt`, `includeConfidence`, `includePositions`, `documentType`.
4.  **Fetch Document & Create Job**:
    *   Fetch the document metadata from Supabase using `documentId` and `userId` (verify ownership). Handle not found errors.
    *   Create an initial `extraction_jobs` record (status: `processing`, store `extractionPrompt` and options). Handle errors.
    *   Download the document file content from Supabase Storage using `document.storagePath`. Handle errors.
    *   Convert the downloaded file `Blob` or `ArrayBuffer` to base64 using Node.js `Buffer` methods (e.g., `Buffer.from(await fileData.arrayBuffer()).toString('base64')`). **Do not use `FileReader`**.
5.  **Document Type Detection (Optional):**
    *   If the input `documentType` is not provided, consider adding logic (similar to old `/api/extract`) to make a quick AI call to detect the document type *before* proceeding. Store this detected type. Use this detected type for selecting default prompts if needed.
6.  **Prepare Prompt (Crucial Step - Reference Guidelines & Old API)**:
    *   **Select Base Prompt:**
        *   If a valid `extractionPrompt` was provided in the input, use it.
        *   Otherwise, use `getDefaultPrompt(detectedType || input.documentType)` from `prompts/extraction.ts` to get a suitable default.
    *   **Enhance Prompt:** Use the `enhancePrompt(basePrompt, includeConfidence, includePositions)` function from `prompts/extraction.ts` to add instructions for JSON format, confidence scores, and position data based on the input options.
    *   **Combine with System Instructions:** Prepend `SYSTEM_INSTRUCTIONS` from `prompts/extraction.ts`. Add context like "Analyze the following document (likely a [Detected Type])..." if type detection was performed. Ensure clear instructions for JSON output and line item handling (as seen in the old API prompt).
7.  **Call Vertex API**:
    *   Use `getVertexStructuredModel` from `lib/ai/vertex-client.ts`.
    *   **Strongly prefer `generateObject`** using an appropriate Zod schema (e.g., `invoiceSchema`, `resumeSchema`, or a generic `z.record(z.any())`) over `generateText`.
    *   Pass the fully prepared prompt (from step 6) and the base64 document content to the AI model via the `messages` array.
    *   Handle API errors robustly (rate limits, invalid requests, model errors). Update the `extraction_jobs` record with the error message and `failed` status. Return appropriate `ActionState`.
8.  **Process & Save Results**:
    *   If using `generateObject`, validate the `result.object` using Zod `safeParse`.
    *   If using `generateText`, parse `result.text`, clean it (remove markdown), and handle JSON parsing errors (potentially storing raw text as fallback).
    *   *Optional:* Implement post-processing logic (inspired by old API) to attempt structuring poorly formatted line items if needed after initial parsing/validation.
    *   Insert the validated/parsed extracted data into the `extracted_data` table, linking it to the job and document. Include the `documentType` (detected or provided).
    *   Update the `extraction_jobs` record status to `completed`.
    *   Optionally update the `documents` table status to `completed`.
9.  **Update Usage**: Call `incrementPagesProcessedAction`.
10. **Analytics**: Log the `extraction_completed` or `extraction_failed` event (`trackServerEvent`) with relevant details (job ID, document type, tier, etc.).
11. **Error Handling**: Ensure all steps have robust `try...catch` blocks. Return detailed `ActionState` responses for all outcomes.

---
[x]
### Step 4.4: Implement Schema Generation Action

#### Prompt
**Task**: Create a server action for generating schemas using the Vertex AI client, with rate limiting applied.

**Files**:
- `actions/ai/schema.ts`: Implement the `generateSchemaAction` server action.
- `prompts/schemaGen.ts` (Optional): Define schema generation prompts.

**Step Dependencies**:
- **1.7**: Vertex Client Setup (`lib/ai/vertex-client.ts`).
- **4.0**: Rate Limit Check (`lib/rate-limiting/limiter.ts`).
- **4.1**: Auth Helpers (`lib/auth-utils.ts`).
- **7.2**: Analytics (`lib/analytics/server.ts`).

**User Instructions**:
1. **Authentication Check**:
   - Use `getCurrentUser()` from `lib/auth-utils.ts` to verify authentication.

2. **Rate Limit Check**:
   - Apply rate limiting via `lib/rate-limiting/limiter.ts` based on the user’s tier (fetched from `profiles`). Return `429` if exceeded.

3. **Call Vertex API**:
   - Use `getVertexStructuredModel` from `lib/ai/vertex-client.ts` to generate a schema with the provided input, optionally using prompts from `prompts/schemaGen.ts`.

4. **Return Schema**:
   - Return the generated schema in an `ActionState` response with `isSuccess: true`.

5. **Analytics**:
   - Track the event using `trackApiUsage` from `lib/analytics/server.ts`.

---
[x]
### Step 4.5: Implement Document Deletion Action

#### Prompt
**Task**: Create a server action for deleting documents, ensuring proper authorization and cleanup.

**Files**:
- `actions/db/documents.ts`: Implement the `deleteDocumentAction` server action.

**Step Dependencies**:
- **3.1**: Database Schema (`db/schema/documents-schema.ts`).
- **3.4**: RLS Policies (`__tests__/rls/documents.test.ts`).
- **4.1**: Auth Helpers (`lib/auth-utils.ts`).
- **7.2**: Analytics (`lib/analytics/server.ts`).

**User Instructions**:
1. **Authentication and Ownership Check**:
   - Use `getCurrentUser()` from `lib/auth-utils.ts` to verify the user owns the document (check `user_id` in `documents`).

2. **Delete Records**:
   - Delete the document from `documents` table using `lib/supabase/server.ts`. Rely on cascading deletes for `extracted_data` and `extraction_jobs`.

3. **Delete Storage Files**:
   - Remove the file from the `documents` bucket using Supabase Storage, referencing the `storage_path` from the document record.

4. **Analytics**:
   - Track the deletion event with `trackApiUsage` from `lib/analytics/server.ts`.

---
[x]
### Step 4.6: Implement Profile/Settings Update Actions

#### Prompt
**Task**: Create server actions for updating user profiles and settings, targeting specific tables (`profiles` for membership/stripe, `users` for identity).

**Files**:
- `actions/db/profiles-actions.ts`: Implement `updateSubscriptionProfileAction` (updated from `profile.ts`).
- `actions/db/users-actions.ts`: Implement `updateUserIdentityAction` (updated from `users.ts`).

**Step Dependencies**:
- **3.1**: Database Schema (`db/schema/profiles-schema.ts`, `db/schema/users-schema.ts`).
- **3.4**: RLS Policies (`__tests__/rls/profiles.test.ts`).
- **4ich `4.1**: Auth Helpers (`lib/auth-utils.ts`).
- **7.2**: Analytics (`lib/analytics/server.ts`).

**User Instructions**:
1. **Profile Update (`profiles` table)**:
   - In `actions/db/profiles-actions.ts`, implement `updateSubscriptionProfileAction` to update subscription fields (e.g., `membership`, `stripe_customer_id`) in `profiles`.
   - Validate input to prevent unauthorized changes (e.g., only allow specific fields).

2. **User Update (`users` table)**:
   - In `actions/db/users-actions.ts`, implement `updateUserIdentityAction` to update identity fields (e.g., `email`, `avatar`) in `users`.
   - Ensure the user can only update their own record using `getCurrentUser()`.

3. **Analytics**:
   - Track updates with `trackApiUsage` from `lib/analytics/server.ts`.

---
[x]
### Step 4.7: Implement Document Data Fetching Action

#### Prompt
**Task**: Create a server action to fetch document data for the review page, including signed URLs for secure access.

**Files**:
- `actions/db/documents.ts`: Implement `fetchDocumentForReviewAction`.

**Step Dependencies**:
- **3.1**: Database Schema (`db/schema/documents-schema.ts`, `db/schema/extracted-data-schema.ts`).
- **3.3**: Storage Buckets (`lib/supabase/server.ts`).
- **4.1**: Auth Helpers (`lib/auth-utils.ts`).
- **4.3**: AI Extraction Action (`actions/ai/extraction-actions.ts`).

**User Instructions**:
1. **Fetch Document**:
   - Query `documents` table using `lib/supabase/server.ts` with the document ID.

2. **Generate Signed URL**:
   - Use Supabase Storage to create a time-limited signed URL for the file at `storage_path`.

3. **Fetch Extracted Data**:
   - Query `extracted_data` table for associated extraction results.

4. **Return Data**:
   - Return an `ActionState` with document metadata, signed URL, and extracted data.

---
[x]
### Step 4.8: Implement Document Update Action (Review Page)

#### Prompt
**Task**: Create a server action to save confirmed or edited extracted data from the review page.

**Files**:
- `actions/db/documents.ts`: Implement `updateExtractedDataAction`.

**Step Dependencies**:
- **3.1**: Database Schema (`db/schema/extracted-data-schema.ts`, `db/schema/documents-schema.ts`).
- **3.4**: RLS Policies (`__tests__/rls/documents.test.ts`).
- **4.1**: Auth Helpers (`lib/auth-utils.ts`).
- **7.2**: Analytics (`lib/analytics/server.ts`).

**User Instructions**:
1. **Authentication Check**:
   - Use `getCurrentUser()` from `lib/auth-utils.ts` to verify the user owns the document.

2. **Update Extracted Data**:
   - Update the `extracted_data` record with user-provided data using `lib/supabase/server.ts`.

3. **Update Document Status**:
   - Optionally update `documents` status (e.g., `reviewed`) if the review is complete.

4. **Analytics**:
   - Track the update event with `trackApiUsage` from `lib/analytics/server.ts`.





## Section 5: Build Application UI & Pages (Connecting to Backend)

**Goal:** Connect the existing UI components and pages (`Upload`, `Review`) to the new Server Actions and Supabase data. Build out the remaining dashboard pages (`Dashboard`, `History`, `Metrics`, `Settings`, `Billing`) using real data and actions. Replace all `/api/` fetch calls.

**General Approach:** Utilize React hooks (`useState`, `useEffect`, `useTransition`) in client components for state management, triggering server actions, handling loading/error states (using `toast` or `Alert`), and displaying data returned via `ActionState`. Reference `user-prompt-handling-guidelines.md` for UI elements related to prompts.

---

-   [x] **Step 5.1: Connect Upload Page & Initial Job Creation**
    *   **Task**: Modify the Upload page (`upload/page.tsx`) and `FileUpload` component. The goal is to use `uploadDocumentAction` to save the file and metadata, and immediately create an `extraction_jobs` record to queue the extraction using the provided prompt.
    *   **Files**:
        *   `app/(dashboard)/dashboard/upload/page.tsx`:
            *   Manage state for the selected `File`, the `extractionPrompt` string, and `extractionOptions` object using `useState`.
            *   Use `useTransition` for loading state during the upload/job creation process.
            *   Implement the primary submission handler (`handleUploadAndExtract`):
                1.  Validate that a file is selected.
                2.  Call `uploadDocumentAction` (from `actions/db/documents.ts`) with the `File` object and page count.
                3.  **Crucially:** If `uploadDocumentAction` succeeds and returns the new `document` record (including its `id`), immediately call `extractDocumentDataAction` (from `actions/ai/extraction-actions.ts`) passing the `document.id`, the `extractionPrompt` state, and `extractionOptions` state. *Self-correction:* `uploadDocumentAction` should *not* create the job; it should just upload and return the document ID. The UI page will then call `extractDocumentDataAction`.
                4.  Handle the `ActionState` response from `extractDocumentDataAction`. On success, redirect the user to the review page (`/dashboard/review/[documentId]`). On failure (rate limit, quota, upload error, extraction error), display the error message using `toast` or an `Alert`.
        *   `components/utilities/FileUpload.tsx`:
            *   Ensure the `Textarea` for the prompt correctly updates the `extractionPrompt` state in the parent `UploadPage` via the `onPromptChange` prop.
            *   Pass the selected `File` object up via `onFileSelect`.
            *   *(Optional Enhancement)*: Implement UI elements based on `user-prompt-handling-guidelines.md` (e.g., suggested prompts based on detected file type, basic prompt validation feedback).
    *   **Step Dependencies**: 4.2 (`uploadDocumentAction`), 4.3 (`extractDocumentDataAction`), Existing UI, `db/schema/extraction-jobs-schema.ts`.
    *   **User Instructions**: Refactor the main submission handler in `upload/page.tsx` to first call `uploadDocumentAction`, then on success, call `extractDocumentDataAction`. Use `startTransition` for loading state. Display errors clearly. Ensure prompt/options state is correctly passed from `FileUpload` to the page and then to the extraction action.

-   [ ] **Step 5.2: Connect Review Page - Data Loading & Status Handling**
    *   **Task**: Modify the Review page (`review/[id]/page.tsx`) to fetch initial data using `fetchDocumentForReviewAction` and handle different document/extraction statuses.
    *   **Files**: `app/(dashboard)/dashboard/review/[id]/page.tsx`.
    *   **Step Dependencies**: 4.7 (`fetchDocumentForReviewAction`), 4.3 (`extractDocumentDataAction`), Existing UI (`DataVisualizer`, `DocumentViewer`).
    *   **User Instructions**:
        *   Use `useEffect` to call `fetchDocumentForReviewAction` on page load, passing the `documentId` from params. Manage loading state (`useState`).
        *   Display errors if the action fails (document not found, auth error, signed URL error).
        *   If the action succeeds:
            *   Store the fetched `document`, `signedUrl`, and `extractedData` in state (`useState`).
            *   Pass `signedUrl` to `DocumentViewer`.
            *   Check the `document.status` (or potentially fetch the latest `extraction_jobs` status).
            *   If `extractedData` is present and status is `completed`, pass it to `DataVisualizer`.
            *   If `extractedData` is `null` and status is `uploaded` or `queued`, show an option to "Start Extraction" (which would call `extractDocumentDataAction` with a default or stored prompt).
            *   If status is `processing`, show a loading/processing indicator and potentially implement polling or real-time updates (e.g., using Supabase Realtime) to refresh data when complete.
            *   If status is `failed`, display the error message (fetched from `extraction_jobs.errorMessage`).

-   [ ] **Step 5.3: Connect Review Page - Document Viewer Interaction**
    *   **Task**: Ensure `DocumentViewer` displays the document via `signedUrl` and integrates with `DataVisualizer` for highlighting.
    *   **Files**: `app/(dashboard)/dashboard/review/[id]/page.tsx`, `components/utilities/DocumentViewer.tsx`, `components/utilities/PdfViewerUrl.tsx`, `components/utilities/PdfHighlightLayer.tsx`.
    *   **Step Dependencies**: 5.2.
    *   **User Instructions**:
        *   Verify `signedUrl` prop is correctly passed and used.
        *   In `review/[id]/page.tsx`, manage a `currentHighlight` state (`useState<HighlightRect | null>`).
        *   If `extractedData` contains position info (`includePositions` was true), implement logic to generate `HighlightRect` objects when a field is hovered or selected in `DataVisualizer`. Update `currentHighlight` state.
        *   Pass the `currentHighlight` (or an array containing it) to the `highlights` prop of `DocumentViewer`.
        *   Implement the `onPositionClick` handler in `DocumentViewer`/`PdfViewerUrl` to calculate the clicked percentage coordinates. Pass this up to `review/[id]/page.tsx`.
        *   In `review/[id]/page.tsx`, use the clicked coordinates to find the corresponding field in `extractedData` (if positions exist) and update the selection state for `DataVisualizer`.

-   [ ] **Step 5.4: Connect Review Page - Data Visualizer Interaction**
    *   **Task**: Ensure `DataVisualizer` displays `extractedData` and triggers highlight/selection events.
    *   **Files**: `app/(dashboard)/dashboard/review/[id]/page.tsx`, `components/utilities/DataVisualizer.tsx`, `components/utilities/InteractiveDataField.tsx`.
    *   **Step Dependencies**: 5.2.
    *   **User Instructions**:
        *   Pass the fetched `extractedData` to `DataVisualizer`.
        *   Implement the `onHighlight` prop in `DataVisualizer`: When a field in `InteractiveDataField` is hovered, call this prop function, passing the field's path and position data (if available). The parent page (`review/[id]/page.tsx`) will use this to update the `currentHighlight` state for `DocumentViewer`.
        *   Implement the `onSelect` prop in `DataVisualizer`: When a field is clicked, call this prop function with the field's path and data. The parent page can use this to manage focus or editing state.

-   [ ] **Step 5.5: Connect Review Page - Data Update/Confirmation**
    *   **Task**: Implement saving confirmed or edited extracted data using `updateExtractedDataAction`.
    *   **Files**: `app/(dashboard)/dashboard/review/[id]/page.tsx`, `actions/db/documents.ts` (implement `updateExtractedDataAction`).
    *   **Step Dependencies**: 4.8 (Implement `updateExtractedDataAction`), 5.2.
    *   **User Instructions**:
        *   Implement `updateExtractedDataAction` in `actions/db/documents.ts`: Takes `documentId` and the new `data` (JSON). Authenticates user, verifies ownership of the document, updates the corresponding record in `extracted_data`, optionally updates `documents.status` to 'reviewed', tracks analytics, returns `ActionState`.
        *   In `review/[id]/page.tsx`, add state management (`useState`) if implementing inline editing of `extractedData`.
        *   Create a handler function (`handleConfirm` or `handleSave`) attached to a "Confirm" or "Save" button.
        *   This handler calls `updateExtractedDataAction` with the `documentId` and the current (potentially modified) `extractedData` state.
        *   Use `useTransition` to manage the saving state (disable button, show spinner).
        *   Display success/error messages from the `ActionState` response using `toast`.

-   [ ] **Step 5.6: Implement History Page**
    *   **Task**: Build the History page to list processed documents, allowing review, deletion, and filtering.
    *   **Files**:
        *   `app/(dashboard)/dashboard/history/page.tsx`: Client component to fetch, display, filter, and manage documents.
        *   `actions/db/documents.ts`: Implement `fetchUserDocumentsAction`.
    *   **Step Dependencies**: 3.1, 4.1, 4.5 (`deleteDocumentAction`).
    *   **User Instructions**:
        *   Implement `fetchUserDocumentsAction`: Authenticates user (`getCurrentUser`). Queries `documents` table (join with `extraction_jobs` for latest status if needed). Filters by `userId`. Accepts parameters for pagination, sorting (e.g., by `createdAt`), and filtering (e.g., by `status`, `originalFilename`). Returns `ActionState<{ documents: SelectDocument[], totalCount: number }>`.
        *   In `history/page.tsx`: Use `useState` for documents list, filters, pagination state. Use `useEffect` to call `fetchUserDocumentsAction` initially and whenever filters/page change. Use `useTransition` for loading states.
        *   Display documents using `components/ui/table`. Include columns for filename, status, date, actions.
        *   Add input/select controls for filtering (filename search, status dropdown). Update state and trigger refetch on change.
        *   Implement pagination controls using fetched `totalCount`.
        *   Add a "Review" link/button for each row linking to `/dashboard/review/[id]`.
        *   Add a "Delete" button for each row. On click, show a confirmation dialog (`AlertDialog`). If confirmed, call `deleteDocumentAction`, use `useTransition`, show toast on success/error, and refetch the document list on success.

-   [ ] **Step 5.7: Implement Metrics Page**
    *   **Task**: Build the Metrics page using real data fetched via server actions.
    *   **Files**:
        *   `app/(dashboard)/dashboard/metrics/page.tsx`: Client component to fetch and display metrics.
        *   `actions/db/user-usage-actions.ts`: Implement `fetchUserUsageMetricsAction`.
        *   `actions/db/documents.ts` / `actions/db/extraction-jobs.ts`: Implement actions for aggregate data (e.g., `fetchDocumentProcessingStatsAction`).
    *   **Step Dependencies**: 3.1, 4.1.
    *   **User Instructions**:
        *   Implement `fetchUserUsageMetricsAction`: Authenticates user. Fetches the current record from `user_usage` for `pagesProcessed` and `pagesLimit`. Returns `ActionState`.
        *   Implement `fetchDocumentProcessingStatsAction`: Authenticates user. Queries `documents` or `extraction_jobs` to calculate counts by status (e.g., total processed, success rate, average processing time - might require adding timestamps to jobs). Returns `ActionState`.
        *   In `metrics/page.tsx`: Use `useEffect` to call fetching actions. Manage loading state.
        *   Display fetched data in `components/ui/card` components.
        *   Integrate fetched data with chart components (replace placeholders). Add date range filters that trigger refetches.

-   [ ] **Step 5.8: Implement App-Specific Settings**
    *   **Task**: Connect the Settings page UI (`settings/page.tsx`) for any app-specific settings (if different from Clerk profile). If only Clerk profile is needed, this step might be minimal.
    *   **Files**: `app/(dashboard)/dashboard/settings/page.tsx`.
    *   **Step Dependencies**: 4.6 (`updateUserIdentityAction` - if applicable), `getCurrentUserDataAction`.
    *   **User Instructions**:
        *   Determine if any settings beyond Clerk's `UserProfile` component are needed (e.g., default extraction options, notification preferences stored in `users.metadata` or `profiles`).
        *   If yes: Fetch current settings using `getCurrentUserDataAction` or `getProfileByUserIdAction`. Create form elements. On save, call `updateUserIdentityAction` or `updateProfileAction` with the relevant data. Handle state and feedback.
        *   If no app-specific settings are needed beyond what Clerk handles, ensure this page primarily renders the Clerk `UserProfile` component or links to it.

-   [ ] **Step 5.9: Implement Billing Page**
    *   **Task**: Create the Billing page UI and connect it to Stripe actions for plan changes and billing management.
    *   **Files**:
        *   `app/(dashboard)/dashboard/billing/page.tsx` (New File): Client component.
        *   `components/utilities/PricingTable.tsx` (Optional): Reusable component.
    *   **Step Dependencies**: 1.9 (Subscription Config), 3.1 (`profiles` schema), 4.1, 6.2 (`createCheckoutSessionAction`), 6.3 (`createBillingPortalSessionAction`), `getProfileByUserIdAction`, `getCurrentUserUsageAction`.
    *   **User Instructions**:
        *   Use `useEffect` to fetch user's profile (`getProfileByUserIdAction`) and current usage (`getCurrentUserUsageAction`). Manage loading state.
        *   Display current plan details (from `profile.membership` and `subscriptionPlans` config) and usage (`usage.pagesProcessed` / `usage.pagesLimit`).
        *   Display available plans (potentially using `PricingTable` component).
        *   Implement "Upgrade"/"Change Plan" buttons:
            *   Use `useTransition`.
            *   Call `createCheckoutSessionAction` with the target `planId`.
            *   On success, redirect the user to the returned Stripe `url`.
            *   Show errors via `toast`.
        *   Implement "Manage Billing" button:
            *   Show only if `profile.stripeCustomerId` exists.
            *   Use `useTransition`.
            *   Call `createBillingPortalSessionAction`.
            *   On success, redirect user to the returned Stripe Portal `url`.
            *   Show errors via `toast`.

-   [ ] **Step 5.10: Implement Dashboard Page**
    *   **Task**: Connect the main Dashboard page (`dashboard/page.tsx`) to display real summary data.
    *   **Files**: `app/(dashboard)/dashboard/page.tsx`.
    *   **Step Dependencies**: Actions created in 5.6, 5.7.
    *   **User Instructions**:
        *   Use `useEffect` or server-side fetching to call actions like `fetchUserDocumentsAction` (with limit 5, sorted by date) and `fetchUserUsageMetricsAction`.
        *   Populate the summary cards (Total Documents, Processing Rate, Usage, etc.) with the fetched data.
        *   Populate the "Recent Documents" list.
        *   Replace chart placeholders with actual chart components if implementing charts, feeding them fetched data.
        *   Ensure links/buttons navigate to the correct pages (Upload, History, etc.).

---

## Section 6: Payment Integration (Stripe) - Actions & Webhooks

-   [ ] **Step 6.1: Implement Stripe Webhook Handler**
    -   **Task**: Create API route for Stripe events. **Ensure it updates the `profiles` table.**
    -   **Files**: `app/api/webhooks/stripe/route.ts`.
    -   **Step Dependencies**: 1.3, 1.9, 3.1, 7.2
    -   **User Instructions**: Configure webhook. Update `profiles.membership`, `profiles.stripe_*_id`.

-   [ ] **Step 6.2: Implement Checkout Server Action**
    -   **Task**: Create Server Action for Stripe Checkout.
    -   **Files**: `actions/stripe/paymentActions.ts`.
    -   **Step Dependencies**: 1.9, 1.8, 3.1, 7.2
    -   **User Instructions**: Connect to Pricing page. Pass `user_id` in metadata.

-   [ ] **Step 6.3: Implement Customer Portal Server Action**
    -   **Task**: Create Server Action for Stripe Billing Portal.
    -   **Files**: `actions/stripe/paymentActions.ts`.
    -   **Step Dependencies**: 1.9, 3.1, 6.1, 7.2
    -   **User Instructions**: Connect to Billing page. Fetch `stripe_customer_id` from `profiles`.

## Section 7: Analytics Integration (PostHog & Helicone)

-   [ ] **Step 7.1: Implement Analytics Utility Functions**
    -   **Task**: Create helper functions for tracking.
    -   **Files**:
        -   `lib/analytics/client.ts`: Client-side helpers.
        -   `lib/analytics/server.ts`: Server-side helpers.
    -   **Step Dependencies**: 1.6
    -   **User Instructions**: Define event taxonomy.

-   [ ] **Step 7.2: Integrate Event Tracking**
    -   **Task**: Add tracking calls throughout the application.
    -   **Files**: Client Components, Server Actions, Webhook Routes.
    -   **Step Dependencies**: 7.1, All functional sections.
    -   **User Instructions**: Track meaningful events with properties.

-   [ ] **Step 7.3: Verify Helicone Integration**
    -   **Task**: Confirm LLM calls appear in Helicone.
    -   **Files**: None (Verification)
    -   **Step Dependencies**: 1.7, 4.3, 4.4
    -   **User Instructions**: Test AI calls. Check Helicone dashboard.

## Section 8: Batch Processing Feature

-   [ ] **Step 8.1: Implement Batch Upload UI**
    -   **Task**: Create the batch upload page and component.
    -   **Files**:
        -   `app/(dashboard)/dashboard/batch-upload/page.tsx`: Main page, check subscription.
        -   `app/(dashboard)/dashboard/batch-upload/_components/BatchFileUpload.tsx`: Multi-file dropzone UI.
    -   **Step Dependencies**: 1.9, 3.1, 5.1
    -   **User Instructions**: Link from sidebar. Check `profiles.subscription_tier`.

-   [ ] **Step 8.2: Implement Batch Creation Server Action**
    -   **Task**: Create Server Action to handle batch submission.
    -   **Files**:
        -   `actions/batch/batchActions.ts`: `createBatchProcessAction`. Check quota, create `batch_processes`, upload files, create `documents`, update batch count, track event, redirect.
    -   **Step Dependencies**: 3.1, 3.4, 4.1, 6.4, 7.2, 8.1
    -   **User Instructions**: Handle errors. Use structured storage paths.

-   [ ] **Step 8.3: Implement Batch Processing Logic (Background)**
    -   **Task**: Set up asynchronous processing using Vercel Cron Jobs and API route.
    -   **Files**:
        -   `app/api/batch-processor/route.ts`: Triggered by cron. Fetches pending docs, calls `extractDocumentDataAction`, updates status.
        -   `vercel.json`: Configure cron job schedule.
    -   **Step Dependencies**: 3.1, 3.4, 4.3, 8.2
    -   **User Instructions**: Secure API route. Implement locking. Handle errors/rate limits.

-   [ ] **Step 8.4: Implement Batch Status UI**
    -   **Task**: Create pages to list and view batch statuses.
    -   **Files**:
        -   `app/(dashboard)/dashboard/batches/page.tsx`: List batches.
        -   `app/(dashboard)/dashboard/batches/[batchId]/page.tsx`: Batch details.
        -   `app/(dashboard)/dashboard/batches/[batchId]/_components/BatchStatusClient.tsx`: Display progress, document list.
    -   **Step Dependencies**: 3.1, 3.3, 8.2
    -   **User Instructions**: Show clear progress.

## Section 9: UI Enhancements & Polish

-   [ ] **Step 9.1: Integrate MagicUI Components**
    -   **Task**: Add specified MagicUI components.
    -   **Files**: Marketing/Dashboard pages.
    -   **Step Dependencies**: 1.2
    -   **User Instructions**: Specify components/locations.

-   [ ] **Step 9.2: Refine Framer Motion Animations**
    -   **Task**: Add/refine animations.
    -   **Files**: Layouts, specific components.
    -   **Step Dependencies**: 1.2
    -   **User Instructions**: Focus on smooth interactions.

-   [ ] **Step 9.3: UI Consistency & Responsiveness Review**
    -   **Task**: Final UI review.
    -   **Files**: All UI files.
    -   **Step Dependencies**: All UI steps.
    -   **User Instructions**: Test across browsers/sizes.

## Section 10: Production Readiness & Deployment

-   [ ] **Step 10.1: Implement Comprehensive Error Handling**
    -   **Task**: Add `try/catch`, user feedback (toasts), server logging.
    -   **Files**: Actions, API routes, client components.
    -   **Step Dependencies**: All functional sections.
    -   **User Instructions**: Ensure graceful failure.

-   [ ] **Step 10.2: Enhance Server-Side Logging**
    -   **Task**: Add detailed context to server logs.
    -   **Files**: Actions, API routes, middleware.
    -   **Step Dependencies**: None
    -   **User Instructions**: Use `console`. Consider Log Drains.

-   [ ] **Step 10.3: Security Audit & Review**
    -   **Task**: Review RLS, Storage policies, auth checks, webhooks, validation.
    -   **Files**: Migrations, Actions, middleware, webhooks.
    -   **Step Dependencies**: 3.2, 3.3, 4.1, Actions, Webhooks.
    -   **User Instructions**: Test access controls.

-   [ ] **Step 10.4: Performance Optimization**
    -   **Task**: Analyze and optimize performance.
    -   **Files**: `next.config.js`, data-fetching code, components.
    -   **Step Dependencies**: All functional sections.
    -   **User Instructions**: Optimize queries, use dynamic imports.

-   [ ] **Step 10.5: Configure Vercel Deployment**
    -   **Task**: Set up Vercel project, env vars, build settings, domains, cron jobs.
    -   **Files**: `vercel.json` (for cron).
    -   **Step Dependencies**: 1.3, 8.3
    -   **User Instructions**: Add all env vars. Configure cron.

## Section 11: Cleanup

-   [ ] **Step 11.1: Remove Obsolete Code & Files**
    -   **Task**: Delete Firebase code, old API routes, unused components/context.
    -   **Files**: Project-wide. Search for `firebase`, old `/api/` routes.
    -   **Step Dependencies**: All preceding steps.
    -   **User Instructions**: Ensure no legacy code remains.

-   [ ] **Step 11.2: Update Documentation (README)**
    -   **Task**: Update README with new stack, setup, env vars, architecture.
    -   **Files**: `README.md`.
    -   **Step Dependencies**: All preceding steps.
    -   **User Instructions**: Document new setup, env vars, local dev process, DB schema, architecture.

---

This plan provides a detailed roadmap, incorporating the new structure, addressing the current state, and integrating all specified features and rules. Remember to test incrementally.
```




