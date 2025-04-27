# Implementation Plan: Production-Ready Stripe Integration ("Sane Stripe" + Usage Reset)

**"Sane Stripe" Context Overview (For Implementing AI):**

The "Sane Stripe" approach combats synchronization issues between Stripe and the application database by:

1.  **KV Store (Redis) as Source of Truth:** Storing the definitive subscription status fetched directly from Stripe.
2.  **Central Sync Function (`syncStripeDataToKV`):** A single function to fetch complete Stripe data and update the KV store.
3.  **Reliable Customer Mapping:** Creating/mapping Stripe Customers to internal `userId` in the KV store *before* checkout.
4.  **Eager Sync on Success:** Using a dedicated `/stripe/success` page to trigger the sync function immediately upon user return.
5.  **Simplified Webhooks:** Webhooks trigger the central sync function, avoiding complex partial DB updates. Denormalization (updating `profiles` after KV sync) is optional.

---

## Section S0: Foundation - KV Store Structure & Types

*   [x] **Step S0.1: Define KV Store Data Types**
    *   **Task**: Define the TypeScript types representing the structure of Stripe subscription data to be stored in Redis, along with helper functions for generating Redis keys.
    *   **Goal**: Establish a clear schema for the data synced from Stripe to Redis.
    *   **Files**:
        *   `types/stripe-kv-types.ts` (New File)
    *   **Step Dependencies**: None
    *   **User Instructions**:
        1.  Create the file `types/stripe-kv-types.ts`.
        2.  Define the necessary types based on the "Sane Stripe" context example below, adapting field names or types if necessary to match data retrieved from your Stripe API calls (e.g., ensure `Stripe.Subscription.Status` is imported or defined).
        ```typescript
        // Example structure from "Sane Stripe" context:
        // types/stripe-kv-types.ts
        import type Stripe from 'stripe';

        // Status can be any valid Stripe status OR 'none' if no active sub
        export type StripeSubscriptionStatus = Stripe.Subscription.Status | 'none';

        export type StripePaymentMethod = {
          brand: string | null; // e.g., "visa", "mastercard"
          last4: string | null; // e.g., "4242"
        } | null;

        // Core subscription data stored in KV
        export type StripeSubscriptionData = {
          subscriptionId: string | null;
          status: StripeSubscriptionStatus;
          priceId: string | null; // Stripe Price ID (e.g., price_123abc)
          planId: string | null; // Your internal plan ID ('starter', 'plus', 'growth')
          currentPeriodStart: number | null; // Unix timestamp
          currentPeriodEnd: number | null; // Unix timestamp
          cancelAtPeriodEnd: boolean;
          paymentMethod: StripePaymentMethod;
        };

        // Represents the complete data stored in Redis for a customer
        // This combines the core data structure with the 'none' status possibility.
        export type StripeCustomerDataKV = StripeSubscriptionData | { status: 'none' };

        // Helper function to generate the key for user ID -> customer ID mapping
        export const userToCustomerKey = (userId: string): string => `stripe:user:${userId}`;

        // Helper function to generate the key for customer subscription data
        export const customerDataKey = (customerId: string): string => `stripe:customer:${customerId}`;
        ```

*   [x] **Step S0.2: Verify Redis Client**
    *   **Task**: Ensure the Redis client (`lib/redis/client.ts`) is correctly configured using environment variables and exported for use.
    *   **Files**:
        *   `lib/redis/client.ts`
    *   **Step Dependencies**: None
    *   **User Instructions**: Review `lib/redis/client.ts`. Confirm it reads `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` and exports the `redis` client instance.

---

## Section S1: Central Sync Function Implementation

*   [x] **Step S1.1: Implement `syncStripeDataToKV` Function**
    *   **Task**: Create the core `syncStripeDataToKV` function in `lib/stripe/sync.ts`. This function fetches the latest subscription data from Stripe for a given `customerId` and updates the Redis KV store.
    *   **Goal**: Establish the single, reliable mechanism for updating the subscription source of truth (Redis).
    *   **Files**:
        *   `lib/stripe/sync.ts` (New File)
        *   `lib/stripe/config.ts` (Import `getStripe`)
        *   `lib/redis/client.ts` (Import `redis`)
        *   `types/stripe-kv-types.ts` (Import types and `customerDataKey`)
        *   `lib/config/subscription-plans.ts` (Import `getPlanByStripePriceId`)
    *   **Step Dependencies**: S0.1, S0.2
    *   **User Instructions**:
        1.  Create the file `lib/stripe/sync.ts`.
        2.  Implement `async function syncStripeDataToKV(customerId: string): Promise<StripeCustomerDataKV>` based on the logic shown in the "Sane Stripe" context example below.
        3.  Use `stripe.subscriptions.list` with appropriate parameters (`customer`, `limit: 1`, `status: 'all'`, `expand: ['data.default_payment_method']`).
        4.  Handle the case where no subscription is found (set status to `'none'`).
        5.  If a subscription exists, extract relevant fields and map the Stripe `priceId` to your internal `planId` using `getPlanByStripePriceId`.
        6.  Store the resulting `StripeCustomerDataKV` object in Redis using the `customerDataKey`.
        7.  Return the stored data.
        8.  Implement robust try/catch error handling.
        ```typescript
        // Example logic from "Sane Stripe" context (adapt as needed):
        // lib/stripe/sync.ts
        import { getStripe } from './config';
        import { redis } from '../redis';
        import { StripeCustomerDataKV, StripeSubscriptionData, customerDataKey } from '@/types/stripe-kv-types';
        import { getPlanByStripePriceId } from '../config/subscription-plans';
        import Stripe from 'stripe';

        export async function syncStripeDataToKV(customerId: string): Promise<StripeCustomerDataKV> {
          const stripe = getStripe();
          try {
            const subscriptions = await stripe.subscriptions.list({
              customer: customerId,
              limit: 1, // Assuming one active subscription per customer max
              status: "all", // Fetch all to correctly handle ended/canceled subs
              expand: ["data.default_payment_method"],
            });

            if (subscriptions.data.length === 0) {
              const subData: StripeCustomerDataKV = { status: "none" };
              await redis.set(customerDataKey(customerId), subData);
              console.log(`[Sync] No active subscription found for customer ${customerId}. Stored 'none' status.`);
              return subData;
            }

            const subscription = subscriptions.data[0];
            const priceId = subscription.items.data[0]?.price.id ?? null;
            const plan = priceId ? getPlanByStripePriceId(priceId) : undefined;

            // Extract payment method details safely
            let paymentMethod: StripePaymentMethod = null;
            if (subscription.default_payment_method && typeof subscription.default_payment_method !== 'string') {
              const pm = subscription.default_payment_method as Stripe.PaymentMethod;
              if (pm.card) {
                paymentMethod = {
                  brand: pm.card.brand ?? null,
                  last4: pm.card.last4 ?? null,
                };
              }
            }

            const subData: StripeSubscriptionData = {
              subscriptionId: subscription.id,
              status: subscription.status as Stripe.Subscription.Status, // Cast needed
              priceId: priceId,
              planId: plan?.planId ?? null, // Your internal plan ID
              currentPeriodStart: subscription.current_period_start,
              currentPeriodEnd: subscription.current_period_end,
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
              paymentMethod: paymentMethod,
            };

            await redis.set(customerDataKey(customerId), subData);
            console.log(`[Sync] Synced subscription ${subscription.id} (Status: ${subscription.status}) for customer ${customerId}.`);
            return subData;

          } catch (error) {
            console.error(`[Sync Error] Failed to sync data for customer ${customerId}:`, error);
            // Decide on error handling: throw, return default, etc.
            // Returning a 'none' status might be safest for preventing accidental access.
            const errorData: StripeCustomerDataKV = { status: 'none' };
            try {
              // Attempt to store 'none' status on error to prevent stale data issues
              await redis.set(customerDataKey(customerId), errorData);
            } catch (redisError) {
               console.error(`[Sync Error] Failed to store 'none' status in Redis for customer ${customerId}:`, redisError);
            }
            throw error; // Re-throw the original error after attempting to clear cache
          }
        }
        ```

---

## Section S2: Refactor Checkout Flow

*   [x] **Step S2.1: Refactor `createCheckoutSessionAction`**
    *   **Task**: Modify the checkout action to implement the "Customer-First" flow: ensure a Stripe Customer exists and is mapped in Redis *before* creating the Checkout Session. Update the success URL.
    *   **Files**:
        *   `actions/stripe/checkout-actions.ts` (`createCheckoutSessionAction`)
        *   `lib/stripe/config.ts` (Import `createStripeCustomer`)
        *   `lib/redis/client.ts` (Import `redis`)
        *   `types/stripe-kv-types.ts` (Import `userToCustomerKey`)
        *   `actions/db/profiles-actions.ts` (Import `getProfileByUserIdAction`, `updateProfileAction`)
        *   `actions/db/users-actions.ts` (Import `getUserByIdAction`)
        *   `lib/stripe/checkout.ts` (Import `createCheckoutSession`)
    *   **Step Dependencies**: S0.1, S0.2, S1.1 (conceptually)
    *   **User Instructions**:
        1.  Modify `createCheckoutSessionAction` according to the "Sane Stripe" customer handling logic:
        2.  After user auth, attempt to get `stripeCustomerId` from Redis using `userToCustomerKey(userId)`.
        3.  If not in Redis, check `profiles` table as a fallback.
        4.  If still not found, create a *new* Stripe customer using `createStripeCustomer`, ensuring `userId` is in the metadata. Store the mapping `userId` -> `newCustomer.id` in Redis using `userToCustomerKey`. Update the `profiles` table as well.
        5.  Ensure consistency between Redis and `profiles` if found in one but not the other.
        6.  Modify the call to the underlying `createCheckoutSession` function (in `lib/stripe/checkout.ts`) to pass the confirmed `stripeCustomerId` and set `successUrl: \`${process.env.NEXT_PUBLIC_APP_URL}/stripe/success?session_id={CHECKOUT_SESSION_ID}\``.
        ```typescript
        // Example logic structure from "Sane Stripe" context (adapt to your action):
        // Inside createCheckoutSessionAction...
        const userId = await getCurrentUser();
        // ... validate planId ...
        const user = await getUserByIdAction(userId); // Fetch user details if needed for creation

        // 1. Get stripeCustomerId from KV store (Primary)
        let stripeCustomerId = await redis.get<string>(userToCustomerKey(userId));

        // 2. Fallback: Get from DB if not in KV
        if (!stripeCustomerId) {
          const profileResult = await getProfileByUserIdAction(userId);
          if (profileResult.isSuccess && profileResult.data.stripeCustomerId) {
            stripeCustomerId = profileResult.data.stripeCustomerId;
            // Store in KV for future lookups
            await redis.set(userToCustomerKey(userId), stripeCustomerId);
            console.log(`[Checkout] Found customerId ${stripeCustomerId} in DB, cached in Redis.`);
          }
        }

        // 3. Create if doesn't exist
        if (!stripeCustomerId) {
          if (!user?.email) {
             return { isSuccess: false, message: "User email not found, cannot create Stripe customer." };
          }
          console.log(`[Checkout] No Stripe customer found for userId ${userId}. Creating new customer...`);
          const newCustomer = await createStripeCustomer(user.email, user.fullName ?? undefined, { userId: userId }); // Pass userId in metadata
          stripeCustomerId = newCustomer.id;

          // Store mapping in KV (Primary)
          await redis.set(userToCustomerKey(userId), stripeCustomerId);
          // Update DB profile (Secondary/Denormalization)
          await updateProfileAction(userId, { stripeCustomerId: stripeCustomerId });
          console.log(`[Checkout] Created new Stripe customer ${stripeCustomerId} and mapped to userId ${userId}.`);
        }

        // 4. Create Checkout Session with the customerId
        const successUrl = `${process.env.NEXT_PUBLIC_APP_URL}/stripe/success?session_id={CHECKOUT_SESSION_ID}`;
        const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/pricing`; // Or settings

        const session = await createCheckoutSession({ // This calls the function in lib/stripe/checkout.ts
          planId,
          userId, // Still useful for metadata in session/subscription
          customerId: stripeCustomerId, // Pass the confirmed customer ID
          customerEmail: user?.email, // Optional if customerId is provided
          successUrl,
          cancelUrl,
        });
        // ... return session URL ...
        ```

*   [x] **Step S2.2: Verify API Route**
    *   **Task**: Ensure the API route `app/api/stripe/create-checkout-session/route.ts` correctly calls the refactored action.
    *   **Files**:
        *   `app/api/stripe/create-checkout-session/route.ts`
    *   **Step Dependencies**: S2.1
    *   **User Instructions**: Review the route handler. Confirm it passes necessary data (`planId`) to the refactored `createCheckoutSessionAction`.

---

## Section S3: Implement Success Page & Eager Sync

*   [x] **Step S3.1: Create Eager Sync Server Action**
    *   **Task**: Create `syncSubscriptionAfterSuccessAction` in `actions/stripe/sync-actions.ts` to be called by the success page.
    *   **Goal**: Provide a backend endpoint for the success page to trigger the immediate sync.
    *   **Files**:
        *   `actions/stripe/sync-actions.ts` (New File)
        *   `lib/stripe/sync.ts` (Import `syncStripeDataToKV`)
        *   `lib/redis/client.ts` (Import `redis`)
        *   `types/stripe-kv-types.ts` (Import types and `userToCustomerKey`)
        *   `lib/auth-utils.ts` (Import `getCurrentUser`)
    *   **Step Dependencies**: S1.1
    *   **User Instructions**:
        1.  Create `actions/stripe/sync-actions.ts`.
        2.  Define `async function syncSubscriptionAfterSuccessAction(): Promise<ActionState<StripeCustomerDataKV>>`.
        3.  Implement the logic: Get `userId`, get `customerId` from Redis using `userToCustomerKey`. If found, call `syncStripeDataToKV(customerId)`. Handle errors (e.g., customerId not found). Return `ActionState` with synced data.
        ```typescript
        // Example Action: actions/stripe/sync-actions.ts
        "use server";
        import { getCurrentUser } from "@/lib/auth-utils";
        import { redis } from "@/lib/redis";
        import { syncStripeDataToKV } from "@/lib/stripe/sync";
        import { ActionState } from "@/types";
        import { StripeCustomerDataKV, userToCustomerKey } from "@/types/stripe-kv-types";

        export async function syncSubscriptionAfterSuccessAction(): Promise<ActionState<StripeCustomerDataKV>> {
          try {
            const userId = await getCurrentUser();
            const stripeCustomerId = await redis.get<string>(userToCustomerKey(userId));

            if (!stripeCustomerId) {
              console.error(`[Sync Success Action] Stripe Customer ID not found in Redis for user ${userId}`);
              // Optional: Could try fetching from DB here as another fallback
              return { isSuccess: false, message: "Stripe customer mapping not found. Please wait a moment or contact support." };
            }

            console.log(`[Sync Success Action] Triggering sync for customer ${stripeCustomerId} (user ${userId})`);
            const syncedData = await syncStripeDataToKV(stripeCustomerId);

            return { isSuccess: true, message: "Subscription synced successfully.", data: syncedData };

          } catch (error) {
            console.error("[Sync Success Action] Error:", error);
            return { isSuccess: false, message: error instanceof Error ? error.message : "Failed to sync subscription." };
          }
        }
        ```

*   [x] **Step S3.2: Create Stripe Success Page**
    *   **Task**: Implement the client-side page at `/stripe/success` that shows a loading state, calls the sync action, and redirects.
    *   **Files**:
        *   `app/stripe/success/page.tsx` (New File)
    *   **Step Dependencies**: S3.1
    *   **User Instructions**:
        1.  Create the file `app/stripe/success/page.tsx`.
        2.  Use `"use client";`. Import `useEffect`, `useState`, `useRouter`, `syncSubscriptionAfterSuccessAction`, `toast`.
        3.  Display a user-friendly loading message (e.g., "Finalizing your subscription, please wait...").
        4.  Use `useEffect` to call `syncSubscriptionAfterSuccessAction()` on mount.
        5.  On success, redirect to `/dashboard` (or `/dashboard/settings?tab=billing`) and show a success toast.
        6.  On failure, display an informative error message and provide options (retry, contact support, go to dashboard).
        ```typescript
        // Example useEffect logic from "Sane Stripe" context (adapt for action):
        // app/stripe/success/page.tsx
        "use client";
        import { useEffect, useState } from 'react';
        import { useRouter } from 'next/navigation';
        import { syncSubscriptionAfterSuccessAction } from '@/actions/stripe/sync-actions'; // Adjust path
        import { useToast } from '@/components/ui/use-toast'; // Adjust path
        import { Loader2 } from 'lucide-react'; // Example loader

        export default function StripeSuccessPage() {
          const router = useRouter();
          const { toast } = useToast();
          const [isLoading, setIsLoading] = useState(true);
          const [error, setError] = useState<string | null>(null);

          useEffect(() => {
            let isMounted = true;
            const sync = async () => {
              setIsLoading(true);
              setError(null);
              console.log("[Success Page] Attempting to sync subscription...");
              const result = await syncSubscriptionAfterSuccessAction();
              console.log("[Success Page] Sync action result:", result);

              if (isMounted) {
                if (result.isSuccess) {
                  toast({ title: "Success!", description: "Your subscription is active." });
                  // Optional: Add a small delay before redirecting for user feedback
                  setTimeout(() => router.push('/dashboard'), 1000);
                } else {
                  setError("Failed to sync subscription: " + result.message + ". Please refresh or contact support.");
                  toast({ title: "Sync Error", description: result.message, variant: "destructive" });
                  setIsLoading(false); // Stop loading on error
                }
                // No need to setIsLoading(false) on success due to redirect
              }
            };
            sync();
            return () => { isMounted = false; }; // Cleanup
          }, [router, toast]);

          return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4">
              {isLoading && (
                <>
                  <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                  <h1 className="text-xl font-semibold mb-2">Finalizing your subscription...</h1>
                  <p className="text-muted-foreground text-center">Please wait while we update your account.</p>
                </>
              )}
              {error && (
                 <div className="text-center">
                   <h1 className="text-xl font-semibold text-destructive mb-2">Sync Failed</h1>
                   <p className="text-muted-foreground mb-4">{error}</p>
                   <button onClick={() => window.location.reload()} className="/* Style button */">Retry Sync</button>
                   {/* Add button to go to dashboard */}
                 </div>
              )}
            </div>
          );
        }
        ```

---

## Section S4: Refactor Webhook Processing

*   [x] **Step S4.1: Define Allowed Webhook Events**
    *   **Task**: Define the `allowedEvents` constant array in `lib/stripe/webhooks.ts`.
    *   **Files**:
        *   `lib/stripe/webhooks.ts`
    *   **Step Dependencies**: None
    *   **User Instructions**: Add the `allowedEvents` constant array, copying the list provided in the "Sane Stripe" context example.
        ```typescript
        // lib/stripe/webhooks.ts
        import Stripe from 'stripe';
        // ... other imports ...

        // List of events from "Sane Stripe" context that trigger a sync
        const allowedEvents: Stripe.Event.Type[] = [
          "checkout.session.completed", // Good for initial sync trigger if success page fails
          "customer.subscription.created",
          "customer.subscription.updated",
          "customer.subscription.deleted",
          "customer.subscription.paused", // Handle these statuses in syncStripeDataToKV
          "customer.subscription.resumed", // Handle these statuses in syncStripeDataToKV
          "customer.subscription.pending_update_applied",
          "customer.subscription.pending_update_expired",
          "customer.subscription.trial_will_end", // Informative, sync ensures status is correct
          "invoice.paid", // Important for renewals and usage reset
          "invoice.payment_failed", // Important for status updates (past_due)
          "invoice.payment_action_required", // Status update
          "invoice.upcoming", // Informative, sync ensures status is correct
          "invoice.marked_uncollectible", // Status update (canceled/unpaid)
          "invoice.payment_succeeded", // Redundant with invoice.paid but good to include
          // Payment Intent events might be less critical if focusing only on subscription state,
          // but can be useful for tracking payment status itself. Include if needed.
          // "payment_intent.succeeded",
          // "payment_intent.payment_failed",
          // "payment_intent.canceled",
        ];
        // ... rest of the file ...
        ```

*   [x] **Step S4.2: Implement `processEvent` Function**
    *   **Task**: Create the `processEvent` function in `lib/stripe/webhooks.ts` to filter events and delegate to `syncStripeDataToKV`.
    *   **Files**:
        *   `lib/stripe/webhooks.ts`
        *   `lib/stripe/sync.ts` (Import `syncStripeDataToKV`)
    *   **Step Dependencies**: S1.1, S4.1
    *   **User Instructions**: Implement `async function processEvent(event: Stripe.Event): Promise<StripeCustomerDataKV | null>` as shown in the "Sane Stripe" context example. It should check `allowedEvents`, extract `customerId`, call `syncStripeDataToKV`, and return the result or `null`.
        ```typescript
        // Example from "Sane Stripe" context (add to lib/stripe/webhooks.ts):
        import { syncStripeDataToKV } from './sync'; // Adjust path
        import { StripeCustomerDataKV } from '@/types/stripe-kv-types'; // Adjust path

        async function processEvent(event: Stripe.Event): Promise<StripeCustomerDataKV | null> {
          // Skip processing if the event isn't one we track for sync
          if (!allowedEvents.includes(event.type)) {
            console.log(`[Webhook] Skipping event type: ${event.type}`);
            return null;
          }

          let customerId: string | null = null;

          // Extract customer ID - different events have it in different places
          const eventData = event.data.object as any; // Use 'any' for simplicity, or type guards
          if (eventData.customer) {
            customerId = eventData.customer;
          } else if (eventData.client_reference_id) {
             // Fallback for checkout session if customer isn't immediately available? Check Stripe docs.
             // Usually checkout.session.completed has customer ID.
          } // Add more cases if needed based on allowedEvents

          // Ensure we have a customer ID
          if (typeof customerId !== "string") {
            console.error(`[Webhook Error] Customer ID not found or not a string for event type: ${event.type}. Payload:`, event.data.object);
            // Depending on the event, this might be expected or an error.
            // For subscription events, it's usually an error.
            // For checkout.session.completed, it should be present.
            // Consider throwing an error only for critical events where customerId is expected.
             if (event.type.startsWith('customer.subscription.')) {
                 throw new Error(`Customer ID missing for critical event type: ${event.type}`);
             }
             return null; // Or handle differently
          }

          console.log(`[Webhook] Processing event ${event.type} for customer ${customerId}. Triggering sync...`);
          return await syncStripeDataToKV(customerId);
        }
        ```

*   [x] **Step S4.3: Refactor `processStripeWebhook` Function**
    *   **Task**: Update the main webhook validation function in `lib/stripe/webhooks.ts` to use the new `processEvent` function.
    *   **Files**:
        *   `lib/stripe/webhooks.ts` (`processStripeWebhook`)
    *   **Step Dependencies**: S4.2
    *   **User Instructions**: Modify `processStripeWebhook` to:
        1.  Validate the signature and construct the `event` object.
        2.  Call `await processEvent(event);`.
        3.  Return a structured success object containing `eventType`, `customerId` (if extracted), and the `syncedData` returned by `processEvent`. Handle errors from `processEvent`.

*   [x] **Step S4.4: Refactor `processStripeWebhookAction` (Orchestrator & Denormalization)**
    *   **Task**: Update the server action (`actions/stripe/webhook-actions.ts`) to call the refactored `processStripeWebhook`, handle denormalization (updating `profiles`), and analytics.
    *   **Files**:
        *   `actions/stripe/webhook-actions.ts` (`processStripeWebhookAction`)
        *   `lib/stripe/webhooks.ts` (Import `processStripeWebhook`)
        *   `actions/db/profiles-actions.ts` (Import `updateProfileByStripeCustomerIdAction`, `updateProfileAction`)
        *   `lib/analytics/server.ts` (Import `trackServerEvent`)
        *   `types/stripe-kv-types.ts`
        *   `lib/redis/client.ts` (Import `redis` for getting userId from customerId if needed)
    *   **Step Dependencies**: S4.3
    *   **User Instructions**:
        1.  Modify `processStripeWebhookAction` to call the refactored `processStripeWebhook`.
        2.  If the processing was successful and `result.data.syncedData` exists:
            *   Extract `customerId` and `syncedData`.
            *   **Denormalization:** Fetch the `userId` associated with the `customerId` (query `profiles` or Redis `userToCustomerKey`). If found, call `updateProfileByStripeCustomerIdAction` or `updateProfileAction` to update `profiles.membership` and `profiles.stripeSubscriptionId` based on the `syncedData`.
            *   **Analytics:** Track relevant events (e.g., `stripe_subscription_synced`, `stripe_subscription_cancelled_synced`) using `trackServerEvent` with `userId` and data from `syncedData`.
        3.  Return success/failure `ActionState`.

---

## Section S5: Integrate Usage Reset into Webhook (Refined)

*   [x] **Step S5.1: Enhance `initializeUserUsageAction`**
    *   **Task**: Modify `initializeUserUsageAction` to accept optional `startDate` and `endDate` for precise period creation.
    *   **Files**:
        *   `actions/db/user-usage-actions.ts`
    *   **Step Dependencies**: None (Replaces R1)
    *   **User Instructions**: Implement the changes exactly as described in the previous plan's **Step R1.1**.

*   [x] **Step S5.2: Trigger Usage Reset from Webhook Action**
    *   **Task**: Add logic to `processStripeWebhookAction` to call the enhanced `initializeUserUsageAction` specifically when a relevant `invoice.payment_succeeded` event occurs.
    *   **Files**:
        *   `actions/stripe/webhook-actions.ts` (`processStripeWebhookAction`)
        *   `lib/stripe/config.ts` (Import `getStripe`)
        *   `actions/db/user-usage-actions.ts` (Import `initializeUserUsageAction`)
        *   `actions/db/profiles-actions.ts` (To get `userId` from `customerId`)
    *   **Step Dependencies**: S4.4, S5.1
    *   **User Instructions**:
        1.  Inside `processStripeWebhookAction`, *after* the main `processStripeWebhook` call returns successfully:
        2.  Check if `result.data.eventType === 'invoice.payment_succeeded'`.
        3.  If yes, extract `customerId` and `subscriptionId` (these should ideally be passed back from `processStripeWebhook` or be available in the raw event data if needed).
        4.  Fetch the `Stripe.Invoice` object if needed to check `billing_reason` (or ensure this check happens in `processEvent`). If it's a renewal (`subscription_cycle`):
        5.  Fetch the `Stripe.Subscription` object using `subscriptionId`.
        6.  Extract `newPeriodStart` and `newPeriodEnd` dates from the subscription.
        7.  Get the internal `userId` for the `customerId`.
        8.  If `userId` found, call `initializeUserUsageAction(userId, { startDate: newPeriodStart, endDate: newPeriodEnd });`.
        9.  Log the outcome and track `user_usage_reset` analytics event.

---

## Section S6: Update Application Data Access Logic

*   [x] **Step S6.1: Create KV Subscription Data Access Action**
    *   **Task**: Implement `getUserSubscriptionDataKVAction` in `actions/stripe/sync-actions.ts` to securely retrieve subscription data from Redis for the current user.
    *   **Files**:
        *   `actions/stripe/sync-actions.ts` (Add new action)
        *   `lib/redis/client.ts` (Import `redis`)
        *   `types/stripe-kv-types.ts` (Import types and keys)
        *   `lib/auth-utils.ts` (Import `getCurrentUser`)
        *   `lib/stripe/sync.ts` (Optional: Import `syncStripeDataToKV` for fallback)
    *   **Step Dependencies**: S0.1, S1.1
    *   **User Instructions**: Implement the action as described in the previous plan's **Step S6.1**, including the fallback logic (try Redis, then maybe DB/trigger sync, then default).

*   [x] **Step S6.2: Refactor Authorization Checks**
    *   **Task**: Update application logic (actions, components) to use `getUserSubscriptionDataKVAction` as the primary source for subscription status checks.
    *   **Files**:
        *   `actions/ai/extraction-actions.ts`
        *   `actions/batch/batchActions.ts`
        *   `app/(dashboard)/dashboard/batch-upload/page.tsx`
        *   Other relevant files checking `profile.membership`.
    *   **Step Dependencies**: S6.1
    *   **User Instructions**:
        1.  Identify all locations checking `profile.membership` for feature gating or limits.
        2.  Replace these checks with calls to `getUserSubscriptionDataKVAction()`.
        3.  Base logic on the returned KV data (e.g., `result.data.status === 'active'` and `result.data.planId === 'plus'`).
        4.  **Decision:** If you implemented reliable denormalization in S4.4 (updating `profiles` after KV sync), you *can* continue using `profile.membership` as a shortcut, but understand that the KV store is the ultimate source of truth. Using the KV action directly is safer against potential denormalization lag/errors. Recommend using the KV action directly for critical checks.

---

## Section S7: Testing & Validation

*   [x] **Step S7.1: Test KV Store & Sync Logic**
    *   **Task**: Write unit/integration tests for KV key generation, `syncStripeDataToKV`, and `getUserSubscriptionDataKVAction`.
    *   **Files**: `__tests__/stripe/sync.test.ts`, `__tests__/stripe/kv-store.test.ts`.
    *   **Step Dependencies**: S0, S1, S6.1
    *   **User Instructions**: Follow instructions from previous plan's **Step S7.1**.

*   [x] **Step S7.2: Test Refactored Checkout Flow**
    *   **Task**: Test `createCheckoutSessionAction` ensures customer creation/mapping in KV and DB before generating the session.
    *   **Files**: `__tests__/stripe/checkout.test.ts`.
    *   **Step Dependencies**: S2
    *   **User Instructions**: Follow instructions from previous plan's **Step S7.2**.

*   [x] **Step S7.3: Test Success Page & Eager Sync**
    *   **Task**: Test the `/stripe/success` page triggers the sync action and redirects.
    *   **Files**: `__tests__/stripe/success-page.test.tsx`, `__tests__/actions/sync-actions.test.ts`.
    *   **Step Dependencies**: S3
    *   **User Instructions**: Follow instructions from previous plan's **Step S7.3**.

*   [x] **Step S7.4: Test Refactored Webhook Handling & Usage Reset**
    *   **Task**: Test the webhook action (`processStripeWebhookAction`), event processor (`processEvent`), and usage reset trigger.
    *   **Files**: `__tests__/stripe/webhooks.test.ts`.
    *   **Step Dependencies**: S4, S5
    *   **User Instructions**: Follow instructions from previous plan's **Step S7.4**, ensuring tests cover the call to `initializeUserUsageAction` for `invoice.payment_succeeded`.

*   [x] **Step S7.5: Test Application Logic with KV Data**
    *   **Task**: Verify feature gating and authorization logic correctly uses the KV subscription data.
    *   **Files**: `__tests__/actions/batchActions.test.ts`, `__tests__/ai/extraction-actions.test.ts`, etc.
    *   **Step Dependencies**: S6
    *   **User Instructions**: Follow instructions from previous plan's **Step S7.5**, mocking `getUserSubscriptionDataKVAction`.

*   [] **Step S7.6: Comprehensive E2E Testing**
    *   **Task**: Perform end-to-end tests covering the full user lifecycle using Stripe Test Mode and Stripe CLI.
    *   **Step Dependencies**: All previous steps.
    *   **User Instructions**: Follow instructions from previous plan's **Step S7.6**.

---

## Section S8: Configuration & Optimization

*   [ ] **Step S8.1: Apply Stripe Dashboard Settings**
    *   **Task**: Configure recommended settings in the Stripe Dashboard ("Limit customers to one subscription", consider disabling Cash App Pay).
    *   **Files**: N/A (Stripe Dashboard UI)
    *   **Step Dependencies**: None
    *   **User Instructions**: Follow instructions from previous plan's **Step S8.1**.

*   [ ] **Step S8.2: Environment Variable Management**
    *   **Task**: Ensure all necessary Stripe keys, Redis credentials, etc., are securely managed via environment variables.
    *   **Files**: `.env.local`, `.env.production`, Vercel Environment Variables UI.
    *   **Step Dependencies**: None
    *   **User Instructions**: Follow instructions from previous plan's **Step S8.2**.

*   [ ] **Step S8.3: Documentation**
    *   **Task**: Document the new Stripe integration flow, KV store structure, and webhook handling logic.
    *   **Files**: `docs/stripe-integration.md` (New or Updated File).
    *   **Step Dependencies**: All previous steps.
    *   **User Instructions**: Follow instructions from previous plan's **Step S8.3**.

---





This plan assumes:

*   Sections S0-S6 (Sane Stripe Backend) are implemented and tested.
*   Page Count Fix (P1-P3) is implemented and tested.
*   Database schema changes for Batch Processing (Step 8.0) are done.
*   You have the necessary UI structure in place as identified (`settings/page.tsx` with a billing tab, sidebar user dropdown).

---

**Implementation Plan: Frontend Stripe Integration (Connecting Sane Stripe Backend)**

**Goal:** Fully integrate the Sane Stripe backend logic with the user interface, allowing users to view their subscription status, manage billing, and upgrade plans directly from the application, using the Redis KV store as the primary data source.

---

**Relevant Files:**

*   `app/(dashboard)/dashboard/settings/page.tsx`: Main UI for displaying subscription info and triggering actions.
*   `components/utilities/app-sidebar.tsx`: Contains the user dropdown menu.
*   `app/(marketing)/page.tsx`: (Or your dedicated pricing component) Contains public-facing upgrade buttons.
*   `actions/stripe/sync-actions.ts`: Provides `getUserSubscriptionDataKVAction`.
*   `actions/db/user-usage-actions.ts`: Provides `getCurrentUserUsageAction`.
*   `actions/stripe/checkout-actions.ts`: Provides `createCheckoutSessionAction`, `createBillingPortalSessionAction`.
*   `app/api/stripe/create-checkout-session/route.ts`: API route called by frontend.
*   `app/api/stripe/create-billing-portal/route.ts`: API route called by frontend.
*   `lib/stripe/client.ts`: Client-side Stripe helpers (optional, can implement fetch directly).
*   `lib/config/subscription-plans.ts`: Plan details.
*   Relevant UI components (`Card`, `Button`, `Progress`, `Badge`, `Skeleton`, etc.).

---

### Step FS.1: Fetch and Display Subscription & Usage Data in Settings

*   [ ] **Task**: Modify the Settings page to fetch the user's current subscription status from the Redis KV store and their current page usage from the database, then display this information accurately in the "Subscription & Billing" tab.
*   [ ] **Goal**: Provide users with a real-time view of their plan, status, and usage based on the Sane Stripe source of truth.
*   **Files**: `app/(dashboard)/dashboard/settings/page.tsx`, `actions/stripe/sync-actions.ts` (Import `getUserSubscriptionDataKVAction`), `actions/db/user-usage-actions.ts` (Import `getCurrentUserUsageAction`).
*   **Instructions**:
    1.  **State:** Add state variables in `settings/page.tsx` for `kvSubscriptionData: StripeCustomerDataKV | null`, `usageData: SelectUserUsage | null`, `isLoading: boolean`, `error: string | null`.
    2.  **Data Fetching:**
        *   In `useEffect` (triggered by `user.id`), use `Promise.all` to call:
            *   `getUserSubscriptionDataKVAction()`
            *   `getCurrentUserUsageAction(userId)`
        *   Handle loading state (`setIsLoading`).
        *   On success, update `kvSubscriptionData` and `usageData` states.
        *   On failure (for either action), set an appropriate `error` state message.
    3.  **Display Logic:**
        *   **Current Plan Card:**
            *   Determine `currentPlanId` based on `kvSubscriptionData.status` ('active' or 'trialing') and `kvSubscriptionData.planId`. Default to 'starter' if status is 'none' or inactive.
            *   Fetch `currentPlan` details using `getPlanById(currentPlanId)`.
            *   Display `currentPlan.name` and `currentPlan.description`.
            *   Show a `Badge` indicating the plan (e.g., "Plus", "Growth").
            *   If `kvSubscriptionData.cancelAtPeriodEnd` is true, display a prominent "Cancels at end of period" badge/message.
        *   **Usage Display:**
            *   If `usageData` and `currentPlan` exist:
                *   Display `usageData.pagesProcessed` / `currentPlan.documentQuota` (handle `Infinity` for unlimited plans).
                *   Calculate `usagePercentage = (usageData.pagesProcessed / currentPlan.documentQuota) * 100` (handle division by zero/infinity).
                *   Render the `Progress` component with `usagePercentage`.
                *   Calculate and display "Days Left" using `usageData.billingPeriodEnd`.
            *   If loading, display `Skeleton` components for plan name, usage text, and progress bar.
            *   If error, display an error message.

*   **Dependencies**: S6.1 (`getUserSubscriptionDataKVAction`), `getCurrentUserUsageAction`, UI Components.

---

### Step FS.2: Connect "Manage Billing" Button

*   [ ] **Task**: Implement the functionality for the "Manage Billing" button within the Settings page's "Subscription & Billing" tab.
*   [ ] **Goal**: Allow users with an active Stripe subscription to securely access the Stripe Billing Portal.
*   **Files**: `app/(dashboard)/dashboard/settings/page.tsx`, `app/api/stripe/create-billing-portal/route.ts`, `actions/stripe/checkout-actions.ts`.
*   **Instructions**:
    1.  **Conditional Rendering:** In `settings/page.tsx`, only render the "Manage Billing" button if `kvSubscriptionData?.customerId` exists (meaning the user has a Stripe customer record, likely from a previous or current subscription).
    2.  **State:** Add `isBillingActionPending` state using `useTransition`.
    3.  **Handler Function (`handleManageBilling`):**
        *   Create an `async` function attached to the button's `onClick`.
        *   Wrap the logic in `startBillingActionTransition`.
        *   Check again if `kvSubscriptionData?.customerId` exists. If not, show an error toast and return.
        *   Call your API route: `fetch('/api/stripe/create-billing-portal', { method: 'POST' })`.
        *   Handle the response:
            *   If `!response.ok`, parse the error, show an error `toast`, and set `isBillingActionPending(false)`.
            *   If `response.ok`, parse the JSON to get the `{ url }`.
            *   Redirect the user: `window.location.href = url;`. (No need to set loading state false here, as the page navigates away).
        *   Include `try...catch` for network errors and show a `toast`.
    4.  **Button State:** Disable the button when `isBillingActionPending` is true. Show a loading indicator (e.g., `Loader2` icon) inside the button during the transition.

*   **Dependencies**: FS.1 (fetches `kvSubscriptionData`), API route, Backend Action (`createBillingPortalSessionAction`), UI Components (`Button`, `Loader2`, `toast`).

---

### Step FS.3: Connect "Upgrade/Switch Plan" Buttons

*   [ ] **Task**: Implement the functionality for the "Upgrade" or "Switch Plan" buttons for available paid plans within the Settings page's "Subscription & Billing" tab.
*   [ ] **Goal**: Allow users to initiate the Stripe Checkout flow to change their subscription plan.
*   **Files**: `app/(dashboard)/dashboard/settings/page.tsx`, `app/api/stripe/create-checkout-session/route.ts`, `actions/stripe/checkout-actions.ts`, `lib/stripe/client.ts` (optional).
*   **Instructions**:
    1.  **Button Rendering:** In `settings/page.tsx`, when mapping through `subscriptionPlans`:
        *   Only render buttons for 'plus' and 'growth' plans.
        *   Do *not* render an upgrade button for the user's `currentPlanId` (derived from `kvSubscriptionData`).
        *   The button text should be dynamic (e.g., "Upgrade to Plus", "Switch to Growth").
    2.  **State:** Use the same `isBillingActionPending` state from FS.2 (or create a separate one like `isCheckoutPending`) using `useTransition`.
    3.  **Handler Function (`handleUpgradeClick`):**
        *   Create an `async` function that accepts the target `planId: PlanId` ('plus' or 'growth').
        *   Attach this handler to the `onClick` of each upgrade/switch button, passing the correct `planId`.
        *   Wrap the logic in `startBillingActionTransition`.
        *   Call your API route: `fetch('/api/stripe/create-checkout-session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ planId }) })`.
        *   Handle the response:
            *   If `!response.ok`, parse error, show error `toast`, set loading state false.
            *   If `response.ok`, parse `{ sessionId }`.
            *   **Redirect to Stripe:**
                *   Get the Stripe.js instance: `const stripe = await getStripeClient();` (from `lib/stripe/client.ts`). Handle potential loading errors.
                *   Call `stripe.redirectToCheckout({ sessionId })`.
                *   Handle potential `redirectToCheckout` errors (show `toast`, set loading state false).
        *   Include `try...catch` for network errors.
    4.  **Button State:** Disable the buttons when `isBillingActionPending` is true. Show a loading indicator.

*   **Dependencies**: FS.1, API route, Backend Action (`createCheckoutSessionAction`), Stripe.js client helper (optional), UI Components.

---

### Step FS.4: Connect Marketing/Pricing Page Buttons

*   [ ] **Task**: Connect the "Get Started" / "Upgrade" buttons on the public marketing/pricing page to the appropriate action (Signup or Stripe Checkout).
*   [ ] **Goal**: Ensure public CTAs correctly direct users based on their authentication status.
*   **Files**: `app/(marketing)/page.tsx` (or your pricing component), `lib/stripe/client.ts` (optional).
*   **Instructions**:
    1.  **Auth Check:** Use the `useUser` hook from Clerk to check `user` and `isLoaded`.
    2.  **Button Logic:** For each paid plan button ('Plus', 'Growth'):
        *   Add an `onClick` handler.
        *   **Inside the handler:**
            *   Check if `isLoaded`. If not, show a loading state or do nothing yet.
            *   If `isLoaded` and `!user` (user is logged out), redirect to signup: `router.push('/signup')`.
            *   If `isLoaded` and `user` (user is logged in), execute the same logic as **Step FS.3 Handler Function (`handleUpgradeClick`)**: call the `/api/stripe/create-checkout-session` API route and redirect to Stripe Checkout. Use `useTransition` for loading state.
    3.  **Free Plan Button:** Ensure the "Start For Free" button simply links to `/signup`.

*   **Dependencies**: Clerk `useUser`, API route, Backend Action (`createCheckoutSessionAction`), Stripe.js client helper (optional), UI Components.

---

### Step FS.5: Update Sidebar User Menu Link

*   [ ] **Task**: Update the "Billing" link within the user dropdown menu in the sidebar to point directly to the "Subscription & Billing" tab on the Settings page.
*   [ ] **Goal**: Provide a direct navigation path for users to manage their subscription.
*   **Files**: `components/utilities/app-sidebar.tsx`.
*   **Instructions**:
    1.  Locate the `DropdownMenuItem` for "Billing" within the `DropdownMenuContent` in `app-sidebar.tsx`.
    2.  Change the `href` prop of the nested `Link` component from `/dashboard/billing` (or whatever it was) to `/dashboard/settings?tab=billing`.

*   **Dependencies**: UI Component (`app-sidebar.tsx`).

---

### Step FS.6: End-to-End Testing (UI Focus)

*   [ ] **Task**: Manually test the frontend flows related to subscription management.
*   [ ] **Goal**: Verify that the UI correctly displays data from the KV store and that checkout/billing portal buttons function as expected.
*   **Instructions**:
    1.  **Starter User:** Log in as a user known to be on the 'starter' plan (or a new user).
        *   Navigate to Settings -> Subscription & Billing.
        *   Verify the "Current Plan" card shows "Starter".
        *   Verify usage shows "X / 25 pages used".
        *   Verify the "Manage Billing" button is *not* visible or is disabled.
        *   Verify "Upgrade" buttons are visible for 'Plus' and 'Growth'.
        *   Click "Upgrade to Plus". Verify redirection to Stripe Checkout (Test Mode). **Do not complete checkout yet.**
    2.  **Paid User (Plus):** Log in as a user known to have an active 'Plus' subscription (use one from previous E2E tests or create one now by completing the checkout from the previous step).
        *   Navigate to Settings -> Subscription & Billing.
        *   Verify the "Current Plan" card shows "Plus".
        *   Verify usage shows "X / 250 pages used".
        *   Verify the "Manage Billing" button *is* visible and enabled.
        *   Click "Manage Billing". Verify redirection to Stripe Billing Portal (Test Mode).
        *   Verify the "Upgrade" button for 'Plus' is replaced with "Current Plan" (or similar disabled state).
        *   Verify the "Switch to Growth" button is visible. Click it. Verify redirection to Stripe Checkout for the Growth plan.
    3.  **Cancelled User:** Log in as a user whose subscription was cancelled (at period end).
        *   Navigate to Settings -> Subscription & Billing.
        *   Verify the "Current Plan" card shows the *original* plan name but also indicates "Cancels at end of period".
        *   Verify the "Manage Billing" button is still visible (users can often reactivate via portal).
        *   Verify "Upgrade/Switch" buttons are available.
    4.  **Error Handling:** Test clicking buttons when the API routes might fail (e.g., temporarily disable network or modify the API route to return an error). Verify user-friendly `toast` messages appear.

*   **Dependencies**: All previous FS steps, Completed E2E backend tests (S7.6).

---
