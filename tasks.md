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

### Step 4.3: Implement AI Extraction Action

#### Prompt
**Task**: Create a server action for AI-based document extraction using the Vertex AI client, respecting rate limits and quotas.

**Files**:
- `actions/ai/extraction-actions.ts`: Implement `extractDocumentDataAction` (updated from `extraction.ts` based on codebase).
- `prompts/extraction.ts` (Optional): Define extraction prompts if needed.

**Step Dependencies**:
- **1.7**: Vertex Client Setup (`lib/ai/vertex-client.ts`).
- **3.1**: Database Schema (`db/schema/documents-schema.ts`, `db/schema/extracted-data-schema.ts`).
- **3.3**: Storage Buckets (via `lib/supabase/server.ts`).
- **3.4**: RLS Policies (`__tests__/rls/documents.test.ts`).
- **4.0**: Rate Limit Check (`lib/rate-limiting/limiter.ts`).
- **4.1**: Auth Helpers (`lib/auth-utils.ts`).
- **4.4**: Schema Generation (optional, `actions/ai/schema.ts`).
- **7.2**: Analytics (`lib/analytics/server.ts`).

**User Instructions**:
1. **Authentication Check**:
   - Use `getCurrentUser()` from `lib/auth-utils.ts` to ensure the user is authenticated.

2. **Rate Limit Check**:
   - Fetch the user’s tier from `profiles` using `getProfileByUserIdAction` in `actions/db/profiles-actions.ts`.
   - Apply rate limiting via `lib/rate-limiting/limiter.ts`. Return `429` if exceeded.

3. **Fetch Document**:
   - Query `documents` table using `lib/supabase/server.ts` with the provided document ID.

4. **Prepare Prompt**:
   - Construct the extraction prompt, optionally using a predefined template from `prompts/extraction.ts`.

5. **Call Vertex API**:
   - Use `getVertexStructuredModel` from `lib/ai/vertex-client.ts` to call `generateObject` with the prompt and document content.
   - Handle API errors (e.g., rate limits) and return appropriate `ActionState`.

6. **Save Results**:
   - Insert extracted data into `extracted_data` table via Supabase.
   - Update `documents` table status (e.g., `complete`) using `lib/supabase/server.ts`.

7. **Analytics**:
   - Log the extraction event with `trackApiUsage` from `lib/analytics/server.ts`.

8. **Error Handling**:
   - Handle errors for API failures, quota issues, or invalid documents, returning detailed `ActionState` responses.

---

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

