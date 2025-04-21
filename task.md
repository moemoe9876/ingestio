
**Section 7: Analytics Integration (PostHog)**

-   [ ] **Step 7.1: Implement PostHog Analytics Utilities**
    -   **Status**: Appears mostly complete based on file structure.
    -   **Task**: Create and configure helper functions for initializing PostHog and tracking events on both the client and server. Ensure environment variables (`NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`) are correctly used.
    -   **Files**:
        -   `lib/analytics/client.ts`: Contains client-side helpers (`trackEvent`, `identifyUser`, `resetUser`) using the `window.posthog` instance.
        -   `lib/analytics/server.ts`: Contains server-side helpers (`getPostHogClient`, `trackServerEvent`, `identifyServerUser`) using the `posthog-node` library.
        -   `components/utilities/posthog/posthog-provider.tsx`: Initializes PostHog on the client, handles page views.
        -   `components/utilities/posthog/posthog-user-identity.tsx`: Identifies the logged-in user to PostHog.
        -   `app/layout.tsx`: Integrates `PostHogProvider`, `PostHogUserIdentity`.
        -   `.env.local` / Vercel Env Vars: `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`.
    -   **Step Dependencies**: 1.6 (Env Vars)
    -   **User Instructions**:
        1.  **Environment Variables**: Verify `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` are correctly set in your `.env.local` and Vercel environment variables.
        2.  **Client Initialization (`posthog-provider.tsx`)**: Confirm `posthog.init` is called correctly with the public key and host. Ensure `capture_pageview` is `false` as page views are handled manually by `PostHogPageView`.
        3.  **Server Initialization (`server.ts`)**: Confirm `getPostHogClient` initializes `posthog-node` correctly with the *same* public key and host. Note: `posthog-node` uses the public key, not a secret key.
        4.  **User Identification (`posthog-user-identity.tsx`)**: Verify this component correctly uses the `useUser` hook from Clerk to get user details (`id`, `email`, `name`) and calls `posthog.identify`. Ensure `posthog.reset()` is called when the user logs out or is not present.
        5.  **Helper Functions**: Review `client.ts` and `server.ts` to ensure the helper functions correctly interact with the respective PostHog instances.

---

-   [ ] **Step 7.2: Integrate Standard Event Tracking**
    -   **Status**: Partially implemented (some tracking exists). Needs comprehensive review.
    -   **Task**: Add PostHog event tracking calls (`trackEvent` on client, `trackServerEvent` on server) at key points throughout the application lifecycle.
    -   **Files**:
        -   Client Components (e.g., `FileUpload.tsx`, `settings/page.tsx`, Pricing component).
        -   Server Actions (e.g., `actions/db/documents.ts`, `actions/ai/extraction-actions.ts`, `actions/stripe/checkout-actions.ts`).
        -   Webhook Routes (`app/api/webhooks/clerk/route.ts`, `app/api/stripe/webhooks/route.ts`).
        -   `lib/analytics/index.ts`: (Optional) Define shared event names/constants.
    -   **Step Dependencies**: 7.1, All functional sections.
    -   **User Instructions**:
        1.  **Define Event Taxonomy**: Create a list of key user actions and system events to track (e.g., `user_signed_up`, `document_uploaded`, `extraction_started`, `extraction_completed`, `extraction_failed`, `subscription_created`, `settings_updated`, `feature_used_schema_gen`). Use constants if possible (`lib/analytics/index.ts`).
        2.  **Client-Side Tracking**: In relevant client components, import `trackEvent` from `lib/analytics/client.ts` and call it on user interactions (button clicks, form submissions *before* the server action is called). Include relevant properties.
            ```javascript
            // Example in a client component button onClick
            import { trackEvent } from '@/lib/analytics/client';

            const handleButtonClick = () => {
              trackEvent('specific_button_clicked', { page: pathname, component: 'MyComponent' });
              // ... rest of the handler logic (e.g., call server action)
            };
            ```
        3.  **Server-Side Tracking**: In Server Actions and API routes (especially webhooks), import `trackServerEvent` from `lib/analytics/server.ts`. Call it after significant operations complete (or fail). Ensure you pass the `userId` and relevant event properties.
            ```typescript
            // Example in a Server Action (e.g., actions/db/documents.ts)
            import { trackServerEvent } from '@/lib/analytics/server';
            import { getCurrentUser } from '@/lib/auth-utils';

            export async function someDocumentAction( /* ...params */ ) {
              const userId = await getCurrentUser();
              try {
                // ... perform action ...
                await trackServerEvent('document_action_success', userId, { documentId: '...', otherProp: '...' });
                return { isSuccess: true, /* ... */ };
              } catch (error) {
                await trackServerEvent('document_action_failed', userId, { documentId: '...', error: error.message });
                return { isSuccess: false, /* ... */ };
              }
            }
            ```
        4.  **Webhook Tracking**: Ensure webhook handlers (Clerk, Stripe) track events using `trackServerEvent`, passing the `userId` (which might need to be looked up based on webhook data like `customerId`).
        5.  **Properties**: Include meaningful properties with each event (e.g., `documentId`, `fileType`, `pageCount`, `planId`, `tier`, `errorMessage`).
        6.  **Verification**: Test the application flows and verify events appear correctly in the PostHog dashboard event feed with associated users and properties.

---

-   [ ] **Step 7.3: Implement PostHog LLM Observability**
    -   **Status**: Not Implemented.
    -   **Task**: Wrap AI model calls (`generateObject`, `generateText`) to capture detailed LLM interaction data (`$ai_generation` event) for observability in PostHog.
    -   **Files**:
        -   `actions/ai/extraction-actions.ts`: Primary location for AI SDK calls.
        -   `lib/analytics/server.ts`: Needs the PostHog Node client instance.
        -   `lib/ai/vertex-client.ts`: Where the Vertex AI client is configured.
        -   (Potentially) A new helper file `lib/ai/observable-generation.ts` to encapsulate the wrapping logic.
    -   **Step Dependencies**: 1.7 (Vertex AI Setup), 4.3/4.4 (AI Actions), 7.1 (PostHog Server Utils)
    -   **User Instructions**:
        1.  **Install Dependency**: Ensure `@posthog/ai` is installed: `npm install @posthog/ai` or `pnpm add @posthog/ai`.
        2.  **Import Wrapper**: In `actions/ai/extraction-actions.ts` (or a helper file), import `withTracing` from `@posthog/ai` and your PostHog Node client instance from `lib/analytics/server.ts`.
            ```typescript
            import { withTracing } from '@posthog/ai';
            import { getPostHogClient } from '@/lib/analytics/server'; // Adjust path
            import { getVertexModel, getVertexStructuredModel, VERTEX_MODELS } from '@/lib/ai/vertex-client'; // Your Vertex client getter
            import { generateObject, generateText } from 'ai';
            import { randomUUID } from 'crypto'; // For generating trace IDs

            const phClient = getPostHogClient();
            ```
        3.  **Wrap Model Initialization**: When getting your Vertex model instance, wrap it using `withTracing`.
            ```typescript
            // Inside your AI action (e.g., extractDocumentDataAction)
            const userId = await getCurrentUser(); // Get the user ID

            // Generate a unique trace ID for this specific extraction process
            const traceId = randomUUID();

            // Wrap the structured model instance
            const observableStructuredModel = withTracing(
              getVertexStructuredModel(VERTEX_MODELS.GEMINI_2_0_FLASH), // Get your base model instance
              phClient, // Your initialized PostHog Node client
              {
                posthogDistinctId: userId, // Associate trace with the user
                posthogTraceId: traceId,   // Group events for this extraction
                posthogProperties: {       // Add custom properties
                  documentId: documentId,
                  action: 'extractDocumentDataAction',
                  tier: tier, // Pass the user's tier if available
                },
                // posthogPrivacyMode: false, // Default is false, set true to exclude input/output
                // posthogGroups: { "company": companyId }, // Optional: If using PostHog groups
              }
            );

            // Wrap the text model instance (if used as fallback)
            const observableTextModel = withTracing(
              getVertexModel(VERTEX_MODELS.GEMINI_2_0_FLASH),
              phClient,
              {
                posthogDistinctId: userId,
                posthogTraceId: traceId, // Use the SAME traceId
                posthogProperties: {
                  documentId: documentId,
                  action: 'extractDocumentDataAction_fallback',
                  tier: tier,
                },
              }
            );
            ```
        4.  **Use Wrapped Model**: Replace the direct model instances in your `generateObject` and `generateText` calls with the wrapped instances (`observableStructuredModel`, `observableTextModel`). The `withTracing` wrapper automatically handles capturing the `$ai_generation` event on success or failure.
            ```typescript
            // Example using the wrapped model for generateObject
            try {
              const result = await generateObject({
                model: observableStructuredModel, // Use the wrapped model
                schema: z.record(z.any()), // Your schema
                messages: [ /* ... your messages ... */ ],
              });
              extractedData = result.object;
              // No need to manually call phClient.capture here for $ai_generation
            } catch (structuredError) {
              // Error is automatically captured by withTracing
              console.error("Structured generation failed:", structuredError);

              // Fallback example using wrapped text model
              try {
                 const textResult = await generateText({
                   model: observableTextModel, // Use wrapped text model
                   messages: [ /* ... your messages ... */ ],
                 });
                 // ... process textResult ...
              } catch (textError) {
                 // Error is automatically captured by withTracing
                 console.error("Fallback text generation failed:", textError);
                 throw textError; // Re-throw to be caught by outer try/catch
              }
            }
            ```
        5.  **Shutdown Client (Optional but Recommended)**: Ensure `phClient.shutdown()` is called when your application exits gracefully (e.g., in serverless function completion or process exit handlers) to flush any remaining events. This might be tricky in Next.js server actions; PostHog Node client usually handles batching and flushing automatically. Check PostHog Node docs for best practices in serverless environments.
        6.  **Verification**:
            *   Trigger AI extractions in your application.
            *   Go to your PostHog project dashboard.
            *   Navigate to the "Events" tab.
            *   Filter for the event name `$ai_generation`.
            *   Verify that events are captured with the correct properties (`$ai_model`, `$ai_provider`, `$ai_input`, `$ai_output_choices`, `$ai_latency`, `$ai_trace_id`, `distinct_id`, etc.). Check both success and error cases.
            *   Explore the LLM Observability features in PostHog if enabled.

---