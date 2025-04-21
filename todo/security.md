# Ingestio.io Code Analysis: Security & Performance Optimization

## Overview

This report analyzes the provided codebase for Ingestio.io, an AI-powered document processing application built with Next.js, Supabase, Clerk, Stripe, and Vertex AI. The analysis focuses on identifying potential security vulnerabilities and suggesting performance optimizations to enhance speed and efficiency.

## Security Analysis

The application incorporates several good security practices, including:

*   **Strong Authentication:** Using Clerk for user management and authentication.
*   **Row-Level Security (RLS):** Extensive use and testing of Supabase RLS policies to enforce data access control at the database level.
*   **Input Validation:** Utilization of Zod schemas for validating input in server actions and API routes.
*   **Webhook Security:** Verification of webhook signatures for both Clerk and Stripe.
*   **Secrets Management:** Relying on environment variables for sensitive keys (Stripe, Supabase, Google Cloud, Clerk Webhook Secret, JWT Secret). `.gitignore` correctly excludes `.env*` files and `service-account.json`.
*   **Rate Limiting:** Implementing rate limiting using Upstash Redis to prevent abuse.

However, several areas could be improved or require attention:

### 1. Potential RLS Bypass via Admin Clients

*   **Issue:** Webhooks (`app/api/webhooks/clerk/route.ts`) and potentially some server-side utilities (`lib/supabase/storage-utils.ts`, `actions/db/users-actions.ts`) use the Supabase *admin client* (`createClerkAdminClient`, `createAdminClient`) which bypasses RLS. While necessary for certain operations (like creating users/profiles based on webhooks), any logic flaw in these admin-context functions could lead to unauthorized data access or modification.
*   **Impact:** High. Could allow data leakage or modification across users if not handled carefully.
*   **Files:**
    *   `app/api/webhooks/clerk/route.ts`
    *   `lib/supabase/server.ts` (defines `createAdminClient`)
    *   `lib/supabase/storage-utils.ts` (uses `createAdminClient`)
    *   `actions/db/users-actions.ts` (defines admin-only actions)
*   **Recommendation:**
    *   **Minimize Admin Client Usage:** Strictly limit the use of admin clients to only where absolutely necessary (like webhook handlers creating initial user records).
    *   **Explicit Checks:** Within functions using the admin client, *always* perform explicit checks to ensure the operation is authorized (e.g., in the Clerk webhook, ensure the user ID from the event matches the target record).
    *   **Storage RLS:** While `storage-utils.ts` uses the admin client, it includes a check `path.startsWith(\`${userId}/\`)`. This is good, but rely primarily on Supabase's built-in Storage RLS policies (`__tests__/rls/storage-rls-policies.sql`) which are enforced even for service roles unless explicitly bypassed. Ensure these policies are robust and correctly configured based on `auth.uid()`. The current RLS policies seem to use `auth.uid()::text = (storage.foldername(name))[1]`, which is the correct approach. Double-check that *all* storage interactions respect this path structure.
    *   **Refactor Actions:** Review `users-actions.ts`. Ensure the "ADMIN ONLY" actions are *never* callable directly or indirectly by regular user requests. Consider moving them to a separate, more restricted module if necessary.

### 2. AI Prompt Injection

*   **Issue:** User-provided input (`extractionPrompt`, `customInstructions`) is used in constructing prompts sent to the Vertex AI models (`actions/ai/extraction-actions.ts`, `actions/ai/schema.ts`, `prompts/extraction.ts`). Maliciously crafted prompts could potentially manipulate the AI's behavior, leading to unexpected data extraction, denial of service, or revealing unintended information about the prompt structure.
*   **Impact:** Medium. Depends on the AI model's susceptibility and the specific prompts used.
*   **Files:**
    *   `actions/ai/extraction-actions.ts`
    *   `actions/ai/schema.ts`
    *   `prompts/extraction.ts` (especially `enhancePrompt`)
*   **Recommendation:**
    *   **Input Sanitization/Validation:** Strictly validate and sanitize user-provided prompt inputs before incorporating them into the final prompt sent to the AI. Disallow control characters, excessive length, or known injection patterns.
    *   **Prompt Structure:** Use clear delimiters or structured formats (like XML tags or JSON objects within the prompt) to separate user input from system instructions. This makes it harder for user input to override instructions.
    *   **Instruction Placement:** Place critical system instructions *after* user input in the prompt sequence if the model respects instruction order.
    *   **Output Parsing:** Validate the AI's output against expected schemas (already done with Zod in `schema.ts` and `extraction-actions.ts`, which is good). Be cautious if falling back to parsing raw text (`extractDocumentDataAction` fallback logic).
    *   **Limit AI Capabilities:** If possible, configure the AI model to restrict certain capabilities (e.g., accessing external resources, executing code) if not needed.

### 3. Insecure Direct Object References (IDOR) - Potential

*   **Issue:** Actions like `deleteDocumentAction`, `fetchDocumentForReviewAction`, `updateExtractedDataAction` take a `documentId` as input. While they correctly check ownership (`eq('user_id', userId)`), this relies heavily on the RLS and application-level checks being perfect. If RLS were misconfigured or bypassed (e.g., via an admin client misuse), an attacker could potentially guess IDs and access/modify others' data.
*   **Impact:** Medium (High if RLS fails). RLS is the primary defense here.
*   **Files:**
    *   `actions/db/documents.ts`
*   **Recommendation:**
    *   **Strengthen RLS:** Continue rigorous testing and auditing of RLS policies. The existing tests are a very good start.
    *   **Use UUIDs:** Using UUIDs (as done) makes guessing IDs much harder than sequential integers.
    *   **Combine Checks:** Always combine the ID check with the `user_id` check in database queries, even when RLS is enabled (defense in depth). This is already being done correctly.

### 4. Sensitive Information in Supabase Temp Files

*   **Issue:** The `supabase/.temp/` directory contains potentially sensitive information like the pooler URL (including a placeholder for the password, but the structure is revealed), project ref, and versions. While the password isn't present, this information could be useful to an attacker reconnaissance.
*   **Impact:** Low. Reveals infrastructure details but not direct credentials.
*   **Files:**
    *   `supabase/.temp/pooler-url`
    *   `supabase/.temp/project-ref`
*   **Recommendation:**
    *   Add `supabase/.temp/` to `.gitignore`. Ensure this directory is never committed to version control. (It seems `.gitignore` might be missing this specific entry, although `/build` might cover it depending on the build process). *Correction:* `.gitignore` does not explicitly ignore `supabase/.temp/`. Add it.

### 5. Error Handling and Information Disclosure

*   **Issue:** Some error messages returned in `ActionState` might reveal internal details (e.g., specific database errors, detailed permission errors from Vertex AI).
*   **Impact:** Low. Could provide attackers with information about the system architecture or specific vulnerabilities.
*   **Files:** Throughout `actions/` directory. Example: `extractDocumentDataAction` returns detailed AI permission errors.
*   **Recommendation:**
    *   **Generic Errors:** Return generic error messages to the client in production (`"Failed to process document"`, `"An internal error occurred"`).
    *   **Server-Side Logging:** Log detailed errors on the server for debugging purposes, but don't expose them directly to the user. The current permission error handling in `extractDocumentDataAction` logs detailed info server-side, which is good, but the user-facing message could be slightly less specific while still guiding towards permission issues.

### 6. Dependency Security

*   **Issue:** Outdated dependencies can contain known vulnerabilities.
*   **Impact:** Variable (Low to Critical).
*   **Files:** `package.json`
*   **Recommendation:**
    *   Regularly run `npm audit` or `pnpm audit` to check for vulnerabilities.
    *   Keep dependencies updated, especially critical ones like Next.js, Clerk, Supabase, Stripe, and AI SDKs.
    *   Use tools like Dependabot or Snyk for automated dependency scanning.

### 7. Storage Access Control

*   **Issue:** `lib/supabase/storage-utils.ts` uses the admin client for uploads/downloads. While it performs a basic path check (`path.startsWith(\`${userId}/\`)`), relying solely on application-level checks for storage access is less secure than using Supabase's built-in RLS for storage.
*   **Impact:** Medium. If the application check fails or is bypassed, unauthorized access could occur.
*   **Files:** `lib/supabase/storage-utils.ts`, `__tests__/rls/storage-rls-policies.sql`
*   **Recommendation:**
    *   **Enforce Storage RLS:** Ensure the Storage RLS policies defined in `storage-rls-policies.sql` are active and correctly configured. These policies should use `auth.uid()` and `storage.foldername()` to restrict access based on the user ID being the first part of the file path.
    *   **Use User Client for Storage:** If possible, refactor storage operations to use the standard `createServerClient` (which should have the user's auth context) instead of the admin client. This allows Supabase to enforce RLS directly. If the admin client *must* be used (e.g., for specific backend tasks), ensure the application logic rigorously enforces user ownership *before* interacting with storage. The current check in `storage-utils.ts` is a good step, but RLS is better.

## Performance Optimization

The application can be optimized in several areas:

### 1. Backend & API Performance

*   **Database Query Optimization:**
    *   **Indexing:** Ensure appropriate database indexes are created for frequently queried columns (e.g., `user_id`, `document_id`, `status`, `created_at` in various tables). Check migrations (`db/migrations/`) for existing indexes (`idx_profiles_user_id`, `idx_users_email`, `idx_users_user_id` exist, review others). Index `documents.user_id`, `extraction_jobs.user_id`, `extracted_data.user_id`, etc.
    *   **Selective Fetching:** Only select necessary columns from the database instead of `select('*')` where possible (e.g., in `fetchUserDocumentsAction`, specify columns needed for the list view). Drizzle makes this easier.
    *   **Metrics Query:** The `fetchUserMetricsAction` uses `Promise.all` which is good. However, complex aggregations over large datasets can become slow. Monitor query performance and consider creating materialized views or summary tables if metrics become a bottleneck.
*   **Caching:**
    *   **Redis:** Leverage the existing Upstash Redis instance not just for rate limiting but also for caching frequently accessed data (e.g., user profiles, subscription plans, potentially non-sensitive API responses).
    *   **Data Caching:** Cache results from `getProfileByUserIdAction`, `getCurrentUserUsageAction` within a request or for short durations using Redis to avoid redundant DB calls within a single request lifecycle.
*   **Server Action Efficiency:** Keep server actions focused. Avoid complex computations or multiple dependent data fetches within a single action if possible.
*   **AI Call Optimization:**
    *   **Model Selection:** Continue using efficient models like `GEMINI_2_0_FLASH` where appropriate. Evaluate if smaller/faster models suffice for simpler tasks.
    *   **Prompt Engineering:** Optimize prompts for conciseness and clarity to potentially reduce token usage and processing time. The `parseRequestedFields` and `filterExtractedData` logic helps by potentially reducing the amount of data the AI needs to generate.
    *   **Asynchronous Processing:** Ensure AI extraction happens asynchronously (as implied by the job/status system) so users don't wait directly for AI completion. The current setup with `extraction_jobs` table suggests this is the case.

### 2. Frontend Performance

*   **Bundle Size:**
    *   **Code Splitting:** Next.js App Router handles this well automatically.
    *   **Dynamic Imports:** Use `next/dynamic` for large components or libraries not needed immediately (e.g., potentially the `DocumentViewer` or complex charting libraries if they were heavier).
    *   **Analyze Bundles:** Use `@next/bundle-analyzer` (`pnpm run analyze`) periodically to identify large chunks.
*   **Component Rendering:**
    *   **Server vs. Client Components:** Review component boundaries. Use Server Components where possible to reduce client-side JavaScript. Client components (`"use client"`) should be used only when necessary (hooks, interactivity). The current structure with `(auth)`, `(dashboard)`, `(marketing)` route groups seems appropriate.
    *   **Memoization:** Use `React.memo`, `useCallback`, `useMemo` where appropriate in client components to prevent unnecessary re-renders, especially in components like `DataVisualizer` or lists.
*   **Loading States:** Implement more granular loading states (skeletons are used, which is good) for data fetching within components (`MetricsPage`, `HistoryPage`, `ReviewPage`) to improve perceived performance. The current implementation seems to handle loading states well.
*   **Image Optimization:** Ensure images (especially in the marketing page) are optimized using `next/image` or appropriate formats/compression.
*   **PDF Viewer:** `react-pdf` can be resource-intensive. Ensure it's only loaded when needed. Consider lazy loading the component or optimizing its rendering (e.g., rendering only visible pages).

### 3. Document Processing Workflow

*   **Segmentation (`lib/preprocessing/document-segmentation.ts`):**
    *   **Efficiency:** The current `extractSegmentContent` downloads the *entire* document for each segment. This is extremely inefficient for large documents. Implement actual page extraction using a server-side PDF library (like `pdf-lib` or calling a dedicated microservice) to only process relevant pages.
    *   **Section Detection:** The `detectSectionBreaks` is a placeholder. A real implementation analyzing document structure (headings, layout) would improve segmentation quality but add processing overhead. Evaluate the trade-off.
*   **File Upload:** The current `uploadDocumentAction` seems to handle the upload and DB record creation sequentially. Consider optimizing by:
    *   Initiating the storage upload first.
    *   While uploading, create the DB record (potentially with a 'pending_upload' status).
    *   Update the DB record once the upload completes. This might improve perceived responsiveness. *Correction:* The current action seems okay, but ensure large file uploads don't block the server thread for too long. Using Supabase storage directly handles the upload stream efficiently.

### 4. Build & Deployment

*   **Tree Shaking:** Ensure libraries used are tree-shakeable to minimize bundle size.
*   **Vercel Optimization:** Leverage Vercel's edge functions or caching capabilities where appropriate.
*   **Cold Starts:** Monitor serverless function cold start times, especially for API routes and server actions. Keep functions lean.

### 5. Prioritization

1.  **Security - Critical:**
    *   Thoroughly review and minimize Admin Client usage (`app/api/webhooks/clerk/route.ts`, `lib/supabase/storage-utils.ts`). Add explicit checks where admin client is unavoidable.
    *   Ensure Storage RLS policies are correctly implemented and enforced. Consider switching `storage-utils.ts` to use the user client if feasible.
    *   Add `supabase/.temp/` to `.gitignore`.
2.  **Security - High:**
    *   Implement robust prompt sanitization/structuring to mitigate AI Prompt Injection risks.
3.  **Performance - High Impact:**
    *   Implement efficient PDF page extraction in `document-segmentation.ts` instead of downloading the full file per segment.
    *   Add necessary database indexes (e.g., `user_id` on `documents`, `extraction_jobs`, etc.).
4.  **Security - Medium:**
    *   Regularly audit dependencies (`pnpm audit`).
    *   Refine error handling to avoid leaking internal details in production.
5.  **Performance - Medium Impact:**
    *   Implement backend caching with Redis (profiles, usage data).
    *   Analyze frontend bundle size and apply dynamic imports where beneficial.
    *   Optimize complex database queries (e.g., metrics).
6.  **Performance - Lower Impact:**
    *   Review component rendering strategies (Server vs. Client).
    *   Optimize PDF viewer loading/rendering.


### 6. Dependency Security

*   **Issue:** Outdated dependencies can contain known vulnerabilities, potentially exposing the application to various attacks. The `pnpm audit` report identified several vulnerabilities.
*   **Impact:** Variable (Low to High), depending on the specific vulnerability and whether it's exploitable in the application's context.
*   **Files:** `package.json`
*   **Specific Vulnerabilities Found (`pnpm audit`):**
    *   **(High) Command Injection in `lodash.template`:** An indirect dependency via `magicui-cli`. If this vulnerable function is used with untrusted input *at runtime*, it could allow arbitrary command execution. While `magicui-cli` might primarily be a development tool, its presence warrants investigation and updating.
    *   **(Moderate) Dev Server Bypass in `esbuild`:** An indirect dependency via `drizzle-kit`. This vulnerability could allow external sites to interact with the *development* server, potentially exposing source code or other sensitive information during development.
    *   **(Moderate) Dev Server Bypass in `vite`:** An indirect dependency via `vitest`. Similar to the `esbuild` issue, this affects the security of the *development/testing* environment provided by Vitest.
    *   **(Low) Header Leak in `next`:** The specific version of `next` used (`14.2.25`) may leak an internal header (`x-middleware-subrequest-id`) to external hosts under certain middleware configurations. This is primarily an information disclosure risk.
    *   **(Low) Out-of-Bounds Characters in `cookie`:** An indirect dependency via `@supabase/ssr`. Allows potentially problematic characters in cookie attributes, which could lead to unexpected behavior or minor security issues in specific scenarios.
*   **Recommendation:**
    *   **Prioritize High Severity:** Immediately address the `lodash.template` vulnerability. Update `magicui-cli` to a version that uses a patched `lodash` or investigate if `magicui-cli` usage exposes this vulnerability. If `magicui-cli` is only used for development/build steps and not in the runtime application, the immediate risk is lower, but updating is still strongly recommended.
    *   **Update Development Dependencies:** Update `drizzle-kit` and `vitest` to resolve the `esbuild` and `vite` vulnerabilities, securing the development environment.
    *   **Update Core Dependencies:** Update `next` to version `14.2.26` or later to fix the header leak. Update `@supabase/ssr` to a version that includes `cookie` version `0.7.0` or later.
    *   **General Update Strategy:** Run `pnpm up --latest` to update direct dependencies. Check if indirect vulnerabilities are resolved. If not, identify which direct dependency needs updating or consider using `pnpm overrides` if a direct update isn't available (use overrides with caution).
    *   **Regular Audits:** Regularly run `pnpm audit` and integrate automated dependency scanning (e.g., Dependabot, Snyk) into the development workflow.
## Conclusion

Ingestio.io has a solid foundation with good security practices like RLS and webhook verification. The main security concerns revolve around the careful use of admin database clients and potential AI prompt injection. Performance can be significantly improved by optimizing the document segmentation process, adding database indexes, and implementing caching. Addressing the prioritized security issues and implementing key performance optimizations will enhance the application's robustness, speed, and user experience.














# Ingestio.io Document Usage Metering System

## 1. Overview

This document outlines the system for tracking and limiting document processing usage within the Ingestio.io application. The goal is to provide a fair, efficient, and scalable system that aligns with user subscription tiers and resource consumption (primarily AI processing).

We will implement a **Page-Based Credit System**. Instead of directly counting documents or raw API calls, usage will be measured by the number of **pages processed** during AI extraction tasks. This provides a more granular and fair representation of the work performed.

## 2. Why Pages as the Metering Unit?

Choosing the right unit is crucial for fairness and aligning costs with usage.

*   **Documents:** Counting whole documents is simple but unfair. Processing a 1-page invoice costs significantly less (in AI tokens and time) than processing a 100-page report. Charging the same for both is inequitable.
*   **API Calls:** Doesn't reflect the workload. A single API call could be for a simple status check or for processing a large batch of documents.
*   **AI Tokens:** This is closest to the actual cost incurred (Vertex AI charges based on input/output tokens). However, it's complex for users to understand and predict ("How many tokens will my 10-page PDF use?").
*   **Pages (Chosen Approach):**
    *   **Intuitive:** Users understand documents in terms of pages.
    *   **Correlates with Cost:** More pages generally mean more text, more AI tokens, and more processing time. It's a good proxy for resource consumption.
    *   **Aligns with Existing Schema:** Your database already includes `page_count` in `db/schema/documents-schema.ts` and tracks `pages_processed` / `pages_limit` in `db/schema/user-usage-schema.ts`. This makes implementation more efficient by leveraging existing structures.
    *   **Fairness:** Better reflects the effort required compared to counting documents.

## 3. System Components

This system relies on several interconnected parts of your application:

1.  **Document Metadata (`db/schema/documents-schema.ts`):**
    *   The `documentsTable` stores essential information about each uploaded document.
    *   **Crucial Field:** `pageCount` (integer). This field **must** be accurately populated for each document, ideally *before* extraction begins.
    *   *Improvement Needed:* Currently, `actions/db/documents.ts` (`uploadDocumentAction`) takes `pageCount` as an argument, likely from the client. This should be moved to the backend. After a file is uploaded to storage, a server-side process (potentially using a library like `pdf-lib` for PDFs) should determine the actual page count and update the `documentsTable` record *before* the document is queued for AI extraction.

2.  **Subscription Plans (`lib/config/subscription-plans.ts`):**
    *   Defines the `documentQuota` (interpreted as **page quota**) for each `PlanId` ('starter', 'plus', 'growth').
    *   These quotas (`STARTER_PLAN_DOC_QUOTA`, `PLUS_PLAN_DOC_QUOTA`, etc.) represent the `pages_limit` for a user's billing cycle.

3.  **User Usage Tracking (`db/schema/user-usage-schema.ts`):**
    *   The `userUsageTable` tracks usage per user per billing cycle.
    *   `user_id`: Links to the user.
    *   `billing_period_start`, `billing_period_end`: Defines the cycle for the quota.
    *   `pages_processed`: The running count of pages processed in the current cycle. **This is the core counter.**
    *   `pages_limit`: The maximum pages allowed for the user's tier in this cycle (copied from `subscription-plans.ts`).

4.  **Usage Management Logic (`actions/db/user-usage-actions.ts`):**
    *   `checkUserQuotaAction(userId, requiredPages)`: Checks if `pages_limit - pages_processed >= requiredPages`. **Crucially, `requiredPages` should be the actual page count of the document(s) being processed.**
    *   `incrementPagesProcessedAction(userId, count)`: Atomically increments the `pages_processed` count for the user's current billing cycle by the number of pages successfully processed.
    *   `initializeUserUsageAction(userId)`: Creates a new usage record for the current billing period if one doesn't exist, setting the correct `pages_limit` based on the user's profile/tier.
    *   `getCurrentUserUsageAction(userId)`: Retrieves the current usage record.

5.  **Extraction Trigger Points:**
    *   **Single Document (`actions/ai/extraction-actions.ts` -> `extractDocumentDataAction`):** This action initiates the extraction for one document.
    *   **Batch Processing (`actions/batch/batch-extraction-actions.ts` -> `queueBatchExtractionAction`):** This action queues multiple documents for processing.

6.  **Quota Reset Mechanism (Needs Implementation):**
    *   A mechanism is required to automatically create a *new* `userUsageTable` record at the start of each billing cycle (e.g., monthly).
    *   **Options:**
        *   **Cron Job:** A scheduled task (e.g., Supabase Cron Job, external scheduler) runs monthly to find active users and call `initializeUserUsageAction`.
        *   **Stripe Webhook:** Listen for `invoice.paid` or `customer.subscription.updated` events in `actions/stripe/webhook-actions.ts`. When a subscription renews, call `initializeUserUsageAction` for that user. This is often more reliable as it ties usage reset directly to payment/renewal.

## 4. Detailed Workflow

### Single Document Extraction (`extractDocumentDataAction`)

1.  **Trigger:** User requests extraction for a specific `documentId` via the UI.
2.  **Authentication:** `getCurrentUser()` verifies the user (`lib/auth-utils.ts`).
3.  **Fetch Document:** The action fetches the document record from `documentsTable` using the `documentId` (`actions/ai/extraction-actions.ts`).
4.  **Get Page Count:** Retrieve the `pageCount` from the fetched document record. **(Requires accurate `pageCount` storage)**.
5.  **Quota Check:** Call `checkUserQuotaAction(userId, pageCount)` (`actions/db/user-usage-actions.ts`).
    *   This function retrieves the current `userUsageTable` record.
    *   It calculates `remaining = pages_limit - pages_processed`.
    *   It returns `{ hasQuota: remaining >= pageCount, remaining, usage }`.
6.  **Decision:**
    *   If `hasQuota` is `false`, return an error to the user ("Page quota exceeded").
    *   If `hasQuota` is `true`, proceed.
7.  **AI Processing:** The document is sent to Vertex AI for extraction.
8.  **Increment Usage (On Success):** *After* receiving a successful response from Vertex AI, call `incrementPagesProcessedAction(userId, pageCount)` (`actions/db/user-usage-actions.ts`).
    *   This function finds the current usage record and atomically increases `pages_processed` by `pageCount`.
9.  **Save Results:** Store the extracted data.
10. **Return Result:** Send the extracted data or success message to the user.

### Batch Document Extraction (`queueBatchExtractionAction`)

1.  **Trigger:** User requests batch extraction for multiple `documentIds`.
2.  **Authentication:** `getCurrentUser()` verifies the user.
3.  **Fetch Documents:** Fetch *all* document records corresponding to the `documentIds`.
4.  **Calculate Total Pages:** Sum the `pageCount` for all documents in the batch. Let this be `totalBatchPages`.
5.  **Quota Check:** Call `checkUserQuotaAction(userId, totalBatchPages)`.
6.  **Decision:**
    *   If `hasQuota` is `false`, return an error ("Insufficient quota for the entire batch").
    *   If `hasQuota` is `true`, proceed.
7.  **Queue Jobs:** Create a batch record (`extraction_batches`) and individual extraction jobs (`extraction_jobs`) for each document. **Do NOT check quota or increment usage here.**
8.  **Background Processing:** A separate worker/process handles each individual `extraction_job`.
9.  **Increment Usage (Per Job):** For *each* successfully completed individual job within the batch, the worker calls `incrementPagesProcessedAction(userId, individualDocumentPageCount)`. This ensures usage is only counted for successfully processed pages within the batch.

## 5. Mathematical Example

*   **User:** Belongs to 'Plus' tier (`lib/config/subscription-plans.ts`).
*   **Quota:** `PLUS_PLAN_DOC_QUOTA` = 250 pages/month.
*   **Current Usage:** `userUsageTable.pages_processed` = 240 pages.
*   **Remaining:** `pages_limit` (250) - `pages_processed` (240) = 10 pages.

*   **Scenario 1: User uploads a 5-page document.**
    1.  `extractDocumentDataAction` is called.
    2.  `pageCount` = 5.
    3.  `checkUserQuotaAction(userId, 5)` is called.
    4.  Check: Is `remaining` (10) >= `pageCount` (5)? Yes.
    5.  `hasQuota` is `true`. Proceed with AI extraction.
    6.  AI succeeds.
    7.  `incrementPagesProcessedAction(userId, 5)` is called.
    8.  `userUsageTable.pages_processed` becomes 240 + 5 = 245.

*   **Scenario 2: User uploads a 12-page document.**
    1.  `extractDocumentDataAction` is called.
    2.  `pageCount` = 12.
    3.  `checkUserQuotaAction(userId, 12)` is called.
    4.  Check: Is `remaining` (10) >= `pageCount` (12)? No.
    5.  `hasQuota` is `false`. Return error "Page quota exceeded". AI extraction is **not** performed.
    6.  `userUsageTable.pages_processed` remains 240.

## 6. Efficiency Considerations

*   **Database Operations:** `incrementPagesProcessedAction` should use an atomic database update (e.g., `UPDATE user_usage SET pages_processed = pages_processed + count WHERE ...`) to prevent race conditions if multiple requests happen concurrently. Drizzle ORM handles this well with its `update` method.
*   **Check Before Processing:** Quota checks (`checkUserQuotaAction`) happen *before* the expensive AI call, saving resources if the user is over their limit.
*   **Accurate Page Count:** The accuracy of the entire system depends on having the correct `pageCount` stored in the `documentsTable`. Implementing reliable server-side page counting post-upload is critical.
*   **Batch Efficiency:** Checking quota once for the entire batch (`queueBatchExtractionAction`) is more efficient than checking for each document individually before queuing. Usage is then incremented accurately as individual jobs complete.

## 7. Future Enhancements

*   **Credit System:** For more complex pricing (e.g., charging more for specific AI features or larger models), transition to a credit system. Each page processed could consume a base number of credits, with additional features consuming more. This requires adding a `credits_used` / `credits_limit` to `userUsageTable` and defining credit costs.
*   **Real-time Updates:** Use Supabase Realtime subscriptions to update the user's remaining quota display in the UI without requiring page refreshes.
*   **Overages:** Implement logic for handling usage overages (e.g., blocking further processing, charging per extra page based on Stripe configuration).

## 8. Conclusion

This page-based metering system provides a balanced approach for Ingestio.io. It's relatively intuitive for users, aligns well with processing costs, integrates efficiently with the existing database schema and actions (`user-usage-schema.ts`, `user-usage-actions.ts`), and can be reliably implemented by ensuring accurate page counting and proper integration within the extraction workflows (`extraction-actions.ts`, `batch-extraction-actions.ts`). Implementing a robust quota reset mechanism (likely via Stripe webhooks) is the final key component.