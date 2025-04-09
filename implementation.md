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

-   [ ] **Step 3.1: Define & Apply Supabase Database Schema (MVP)**
    -   **Task**: Create the **MVP** PostgreSQL schema in Supabase.
    -   **Files**:
        -   `supabase/migrations/YYYYMMDDHHMMSS_mvp_schema.sql`: Use SQL for the **MVP schema** (including `users`, `profiles`, `user_usage`, `documents`, `extraction_batches`, `extraction_jobs`, `extracted_data`, `exports`). **Use TEXT `user_id` PK linked to Clerk.** Include triggers.
    -   **Step Dependencies**: 1.4
    -   **User Instructions**: Apply schema via Supabase SQL Editor or CLI. Enable `uuid-ossp`. **Do NOT include non-MVP tables like `api_usage`, `api_metrics`, `rate_limit_windows`, etc.**

-   [ ] **Step 3.2: Implement Supabase RLS Policies (MVP)**
    -   **Task**: Define and apply RLS policies for **MVP tables**.
    -   **Files**:
        -   `supabase/migrations/YYYYMMDDHHMMSS_mvp_rls_policies.sql`: Use SQL for MVP RLS policies. Ensure policies use `auth.uid()` or `auth.jwt()->>'sub'` matching the TEXT `user_id`.
    -   **Step Dependencies**: 3.1, 2.5
    -   **User Instructions**: Apply policies. Test thoroughly.

-   [ ] **Step 3.3: Configure Supabase Storage Bucket & Policies**
    -   **Task**: Create private storage buckets (`documents`, `exports`) and define access policies.
    -   **Files**: None (Supabase Dashboard/SQL)
    -   **Step Dependencies**: 1.4, 3.2
    -   **User Instructions**: Use RLS-based policies for `storage.objects` referencing `auth.uid()`.

-   [ ] **Step 3.4: Generate Supabase TypeScript Types**
    -   **Task**: Generate TypeScript types for the **MVP schema**.
    -   **Files**: `types/supabase.ts`.
    -   **Step Dependencies**: 3.1
    -   **User Instructions**: Run `supabase gen types typescript`.

## Section 4: Core Application Logic (Server Actions & Rate Limiting)

-   [ ] **Step 4.0: Implement Rate Limiting Logic** **(New Step)**
    -   **Task**: Implement application-level rate limiting using Redis/Upstash.
    -   **Files**:
        -   `lib/rate-limiting/limiter.ts`: Define rate limiter instances (e.g., using `@upstash/ratelimit`) for different actions (e.g., extraction, general API).
        -   `middleware.ts`: Apply rate limiting to relevant API routes (if any remain) or potentially edge functions.
        -   Server Actions (`actions/*`): Import and use the rate limiter logic within actions that need protection (e.g., `extractDocumentDataAction`). Fetch user tier from `profiles` to apply tier-based limits.
    -   **Step Dependencies**: 1.6 (Redis Client), 1.9 (Subscription Config), 2.4 (Profile data), 4.1 (Auth Helpers)
    -   **User Instructions**: Implement logic based on `rate-limiting.md` strategy. Use Redis for state, not the DB table. Handle `429 Too Many Requests` errors gracefully.

-   [ ] **Step 4.1: Create Base Action Types & Auth Helpers**
    -   **Task**: Define `ActionState` type and server-side auth helpers.
    -   **Files**: `types/actions.ts`, `lib/actions/utils.ts` (Optional), `lib/auth-utils.ts`.
    -   **Step Dependencies**: 1.5, 1.4
    -   **User Instructions**: Implement standard action return type and auth checks.

-   [ ] **Step 4.2: Implement Document Upload Action**
    -   **Task**: Create Server Action for file upload.
    -   **Files**: `actions/db/documents.ts`.
    -   **Step Dependencies**: 3.1, 3.3, 3.4, 4.1, **4.0 (Rate Limit Check)**, 6.4 (Usage Check), 7.2 (Analytics)
    -   **User Instructions**: Check auth, **check rate limit**, check quota (`user_usage`), upload to Storage, insert into `documents`, update quota usage (`user_usage`), revalidate, redirect, track analytics.

-   [ ] **Step 4.3: Implement AI Extraction Action**
    -   **Task**: Create Server Action for AI extraction.
    -   **Files**: `actions/ai/extraction.ts`, `prompts/extraction.ts` (Optional).
    -   **Step Dependencies**: 1.7 (Vertex Client), 3.1, 3.3, 3.4, 4.1, **4.0 (Rate Limit Check)**, 4.4 (Schema Gen - if used), 7.2 (Analytics)
    -   **User Instructions**: Check auth, **check rate limit**, fetch doc, prepare prompt, call Vertex (`generateObject`), save result to `extracted_data`, update `documents` status, track analytics.

-   [ ] **Step 4.4: Implement Schema Generation Action**
    -   **Task**: Create Server Action for schema generation.
    -   **Files**: `actions/ai/schema.ts`, `prompts/schemaGen.ts` (Optional).
    -   **Step Dependencies**: 1.7, 4.1, **4.0 (Rate Limit Check)**, 7.2
    -   **User Instructions**: Check auth, **check rate limit**, call Vertex.

-   [ ] **Step 4.5: Implement Document Deletion Action**
    -   **Task**: Create Server Action for document deletion.
    -   **Files**: `actions/db/documents.ts`.
    -   **Step Dependencies**: 3.1, 3.4, 4.1, 7.2
    -   **User Instructions**: Check auth/ownership, delete DB record (`documents`, cascade should handle `extraction_jobs`, `extracted_data`), delete Storage file(s).

-   [ ] **Step 4.6: Implement Profile/Settings Update Actions**
    -   **Task**: Create Server Actions for user profile/settings. **Note: Profile action only updates `profiles` (membership/stripe), User action updates `users` (name/avatar).**
    -   **Files**: `actions/db/profile.ts` (`updateSubscriptionProfileAction`), `actions/db/users.ts` (`updateUserIdentityAction`).
    -   **Step Dependencies**: 3.1, 3.4, 4.1, 7.2
    -   **User Instructions**: Validate input. Ensure actions target the correct table.

-   [ ] **Step 4.7: Implement Document Data Fetching Action**
    -   **Task**: Create Server Action to fetch data for review page.
    -   **Files**: `actions/db/documents.ts`.
    -   **Step Dependencies**: 3.1, 3.3, 4.1, 4.3
    -   **User Instructions**: Fetch `documents`, generate signed URL, fetch `extracted_data`.

-   [ ] **Step 4.8: Implement Document Update Action (Review Page)**
    -   **Task**: Create Server Action to save confirmed/edited data.
    -   **Files**: `actions/db/documents.ts` (`updateExtractedDataAction`).
    -   **Step Dependencies**: 3.1, 3.4, 4.1, 7.2
    -   **User Instructions**: Update `extracted_data` record. Update `documents` status if needed.

## Section 5: Build Application UI & Pages (Connecting to Backend)

-   [ ] **Step 5.1 - 5.10:** (Steps remain largely the same, but ensure they call the new Server Actions and fetch data correctly based on the MVP schema, especially distinguishing between `users` and `profiles` data where needed).
    -   **Key Change:** Replace any remaining `/api/` fetch calls with Server Action imports and calls using `useTransition` where appropriate.
    -   **Dependencies:** Rely on the corresponding Server Actions created in Section 4.

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




