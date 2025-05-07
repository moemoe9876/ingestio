# Implementation Plan for Sane Stripe Integration

This document outlines a comprehensive plan for integrating the "Sane Stripe" approach into Ingestio, creating a more robust, maintainable, and reliable payment integration.

## What is the "Sane Stripe" Approach?

The "Sane Stripe" approach is a pattern for handling Stripe integrations that solves the "split brain" problem where your application's database state can diverge from the actual subscription state in Stripe. The core components are:

1. **Single Source of Truth**: Using a Key-Value store (Redis) to maintain the definitive state of subscriptions
2. **Central Sync Function**: A single `syncStripeDataToKV` function that fetches complete subscription data from Stripe
3. **Customer-First Flow**: Always creating a Stripe customer before checkout and storing the mapping to your user ID
4. **Eager Success Sync**: Triggering the sync function immediately when users return to your app after checkout
5. **Simplified Webhooks**: Having webhooks trigger the same sync function rather than making partial database updates

For more details, see [the original "Sane Stripe" documentation](https://github.com/user-attachments/assets/c7271fa6-493c-4b1c-96cd-18904c2376ee).

## [Section 1: Foundation - KV Store & Sync Function]
- [ ] Step 1: Define Stripe KV data types
  - **Task**: Create type definitions for Stripe data stored in Redis
  - **Files**:
    - `types/stripe-kv-types.ts`: New file with type definitions
  - **Step Dependencies**: None
  - **User Instructions**: Create the types for storing Stripe data in the KV store following the example below

```typescript
// Example from "Sane Stripe"
export type STRIPE_SUB_CACHE =
  | {
      subscriptionId: string | null;
      status: Stripe.Subscription.Status;
      priceId: string | null;
      currentPeriodStart: number | null;
      currentPeriodEnd: number | null;
      cancelAtPeriodEnd: boolean;
      paymentMethod: {
        brand: string | null; // e.g., "visa", "mastercard"
        last4: string | null; // e.g., "4242"
      } | null;
    }
  | {
      status: "none";
    };
```

- [ ] Step 2: Implement core sync function
  - **Task**: Create the central `syncStripeDataToKV` function that fetches subscription data from Stripe and stores it in Redis
  - **Files**:
    - `lib/stripe/sync.ts`: New file with the sync function
    - `lib/redis/client.ts`: Use existing Redis client
  - **Step Dependencies**: Step 1
  - **User Instructions**: Implement the sync function based on the example below

```typescript
// Example from "Sane Stripe"
export async function syncStripeDataToKV(customerId: string) {
  // Fetch latest subscription data from Stripe
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    limit: 1,
    status: "all",
    expand: ["data.default_payment_method"],
  });

  if (subscriptions.data.length === 0) {
    const subData = { status: "none" };
    await kv.set(`stripe:customer:${customerId}`, subData);
    return subData;
  }

  // If a user can have multiple subscriptions, that's your problem
  const subscription = subscriptions.data[0];

  // Store complete subscription state
  const subData = {
    subscriptionId: subscription.id,
    status: subscription.status,
    priceId: subscription.items.data[0].price.id,
    currentPeriodEnd: subscription.current_period_end,
    currentPeriodStart: subscription.current_period_start,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    paymentMethod:
      subscription.default_payment_method &&
      typeof subscription.default_payment_method !== "string"
        ? {
            brand: subscription.default_payment_method.card?.brand ?? null,
            last4: subscription.default_payment_method.card?.last4 ?? null,
          }
        : null,
  };

  // Store the data in your KV
  await kv.set(`stripe:customer:${customerId}`, subData);
  return subData;
}
```

- [ ] Step 3: Implement utility functions for KV store
  - **Task**: Create helper functions to get and set customer ID mappings and subscription data
  - **Files**:
    - `lib/stripe/kv-store.ts`: New file with KV utility functions
    - `lib/redis/client.ts`: Use existing Redis client
  - **Step Dependencies**: Step 1, Step 2
  - **User Instructions**: Create helper functions for KV operations

## [Section 2: Customer Creation & Checkout Flow]
- [ ] Step 4: Update customer creation process
  - **Task**: Modify customer creation to always include userId in metadata and store in KV
  - **Files**:
    - `lib/stripe/config.ts`: Update createStripeCustomer function
    - `actions/stripe/checkout-actions.ts`: Update createCheckoutSessionAction
  - **Step Dependencies**: Step 3
  - **User Instructions**: Ensure customers are created with proper metadata and mapped to users in KV

```typescript
// Example from "Sane Stripe"
export async function GET(req: Request) {
  const user = auth(req);

  // Get the stripeCustomerId from your KV store
  let stripeCustomerId = await kv.get(`stripe:user:${user.id}`);

  // Create a new Stripe customer if this user doesn't have one
  if (!stripeCustomerId) {
    const newCustomer = await stripe.customers.create({
      email: user.email,
      metadata: {
        userId: user.id, // DO NOT FORGET THIS
      },
    });

    // Store the relation between userId and stripeCustomerId in your KV
    await kv.set(`stripe:user:${user.id}`, newCustomer.id);
    stripeCustomerId = newCustomer.id;
  }

  // ALWAYS create a checkout with a stripeCustomerId
  const checkout = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    success_url: "https://example.com/success",
    ...
  });
```

- [ ] Step 5: Update checkout flow
  - **Task**: Modify checkout process to always use customer ID and update success URL
  - **Files**:
    - `lib/stripe/checkout.ts`: Update createCheckoutSession
    - `actions/stripe/checkout-actions.ts`: Update createCheckoutSessionAction
    - `app/api/stripe/create-checkout-session/route.ts`: Update route handler
  - **Step Dependencies**: Step 4
  - **User Instructions**: Ensure checkout sessions always include customer ID and redirect to the dedicated success page

## [Section 3: Success Page Implementation]
- [ ] Step 6: Create success page
  - **Task**: Create a dedicated success page that triggers sync on load
  - **Files**:
    - `app/dashboard/checkout/success/page.tsx`: Create new success page
  - **Step Dependencies**: Step 2, Step 5
  - **User Instructions**: Implement a success page that triggers sync and then redirects users

- [ ] Step 7: Implement sync action for success
  - **Task**: Create server action to sync subscription data after checkout success
  - **Files**:
    - `actions/stripe/sync-actions.ts`: New file with sync action
  - **Step Dependencies**: Step 2, Step 3, Step 6
  - **User Instructions**: Create action to sync data and be called from the success page

```typescript
// Example from "Sane Stripe"
export async function GET(req: Request) {
  const user = auth(req);
  const stripeCustomerId = await kv.get(`stripe:user:${user.id}`);
  if (!stripeCustomerId) {
    return redirect("/");
  }

  await syncStripeDataToKV(stripeCustomerId);
  return redirect("/");
}
```

## [Section 4: Webhook Processing]
- [ ] Step 8: Update webhook handler
  - **Task**: Modify the webhook route to process events using the new sync approach
  - **Files**:
    - `app/api/stripe/webhooks/route.ts`: Update webhook route
    - `actions/stripe/webhook-actions.ts`: Update webhook action
  - **Step Dependencies**: Step 2
  - **User Instructions**: Update the webhook handler to verify events and trigger the appropriate actions

```typescript
// Example from "Sane Stripe"
export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get("Stripe-Signature");

  if (!signature) return NextResponse.json({}, { status: 400 });

  async function doEventProcessing() {
    if (typeof signature !== "string") {
      throw new Error("[STRIPE HOOK] Header isn't a string???");
    }

    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    waitUntil(processEvent(event));
  }

  const { error } = await tryCatch(doEventProcessing());

  if (error) {
    console.error("[STRIPE HOOK] Error processing event", error);
  }

  return NextResponse.json({ received: true });
}
```

- [ ] Step 9: Implement webhook event processing
  - **Task**: Create a function to process Stripe events and trigger syncs
  - **Files**:
    - `lib/stripe/webhooks.ts`: Update webhook processing
  - **Step Dependencies**: Step 8
  - **User Instructions**: Create a function to process events and trigger the appropriate syncs

```typescript
// Example from "Sane Stripe"
async function processEvent(event: Stripe.Event) {
  // Skip processing if the event isn't one I'm tracking (list of all events below)
  if (!allowedEvents.includes(event.type)) return;

  // All the events I track have a customerId
  const { customer: customerId } = event?.data?.object as {
    customer: string; // Sadly TypeScript does not know this
  };

  // This helps make it typesafe and also lets me know if my assumption is wrong
  if (typeof customerId !== "string") {
    throw new Error(
      `[STRIPE HOOK][ERROR] ID isn't string.\nEvent type: ${event.type}`
    );
  }

  return await syncStripeDataToKV(customerId);
}
```

- [ ] Step 10: Define allowed webhook events
  - **Task**: Create a list of Stripe events to process
  - **Files**:
    - `lib/stripe/webhooks.ts`: Add allowedEvents constant
  - **Step Dependencies**: None
  - **User Instructions**: Define the list of events to process based on the example below

```typescript
// Example from "Sane Stripe"
const allowedEvents: Stripe.Event.Type[] = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "customer.subscription.pending_update_applied",
  "customer.subscription.pending_update_expired",
  "customer.subscription.trial_will_end",
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.payment_action_required",
  "invoice.upcoming",
  "invoice.marked_uncollectible",
  "invoice.payment_succeeded",
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "payment_intent.canceled",
];
```

## [Section 5: Usage Reset Integration]
- [ ] Step 11: Create usage reset action
  - **Task**: Create an action to reset usage when billing period renews
  - **Files**:
    - `actions/db/user-usage-actions.ts`: Add resetUserUsageAction function
  - **Step Dependencies**: None
  - **User Instructions**: Implement the reset function that will be triggered on invoice payment

```typescript
export async function resetUserUsageAction(
  userId: string
): Promise<ActionState<SelectUserUsage>> {
  try {
    // Calculate new billing period dates (first to last day of current month)
    const now = new Date();
    const billingPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const billingPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    // Get user profile to determine tier-based page limit
    const profileResult = await getProfileByUserIdAction(userId);
    const tier = profileResult.isSuccess 
      ? (profileResult.data.membership || "starter") 
      : "starter";
    
    // Get page limit for tier
    const pagesLimit = RATE_LIMIT_TIERS[tier as keyof typeof RATE_LIMIT_TIERS]?.pagesPerMonth || 25;
    
    // Update the usage record - reset pagesProcessed to 0 and update billing period
    const [updated] = await db
      .update(userUsageTable)
      .set({
        pagesProcessed: 0,
        pagesLimit,
        billingPeriodStart,
        billingPeriodEnd,
        updatedAt: now
      })
      .where(eq(userUsageTable.userId, userId))
      .returning();
    
    if (!updated) {
      // No existing record, create a new one
      return createUserUsageAction({
        userId,
        billingPeriodStart,
        billingPeriodEnd,
        pagesProcessed: 0,
        pagesLimit,
      });
    }
    
    return {
      isSuccess: true,
      message: "User usage reset successfully",
      data: updated
    };
  } catch (error) {
    console.error("Error resetting user usage:", error);
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Unknown error resetting user usage"
    };
  }
}
```

- [ ] Step 12: Integrate usage reset with webhook
  - **Task**: Add usage reset trigger to invoice.paid webhook handler
  - **Files**:
    - `lib/stripe/webhooks.ts`: Update invoice.paid handler
    - `actions/stripe/webhook-actions.ts`: Update webhook action to trigger reset
  - **Step Dependencies**: Step 9, Step 11
  - **User Instructions**: Connect the webhook system to trigger usage reset on invoice payment

## [Section 6: Subscription Status Access]
- [ ] Step 13: Create subscription data access functions
  - **Task**: Create functions to access subscription data from KV
  - **Files**:
    - `actions/stripe/sync-actions.ts`: Add functions to get subscription status
  - **Step Dependencies**: Step 2, Step 3
  - **User Instructions**: Create functions to retrieve and check subscription status from KV

- [ ] Step 14: Update subscription checks
  - **Task**: Update code that checks subscription status to use KV data
  - **Files**:
    - Various files that check user membership status
  - **Step Dependencies**: Step 13
  - **User Instructions**: Identify places that check subscription status and update them to use the KV data

## [Section 7: Testing & Validation]
- [ ] Step 15: Create KV sync tests
  - **Task**: Implement tests for sync function and KV store
  - **Files**:
    - `__tests__/stripe/sync.test.ts`: New test file
  - **Step Dependencies**: Step 2, Step 3
  - **User Instructions**: Create tests to verify sync functionality

- [ ] Step 16: Create checkout flow tests
  - **Task**: Implement tests for customer creation and checkout
  - **Files**:
    - `__tests__/stripe/checkout.test.ts`: New test file
  - **Step Dependencies**: Step 4, Step 5
  - **User Instructions**: Create tests for the checkout process

- [ ] Step 17: Create webhook tests
  - **Task**: Implement tests for webhook processing
  - **Files**:
    - `__tests__/stripe/webhooks.test.ts`: New test file
  - **Step Dependencies**: Step 8, Step 9, Step 10
  - **User Instructions**: Create tests for webhook processing

- [ ] Step 18: Test usage reset
  - **Task**: Implement tests for usage reset functionality
  - **Files**:
    - `__tests__/stripe/usage-reset.test.ts`: New test file
  - **Step Dependencies**: Step 11, Step 12
  - **User Instructions**: Create tests for usage reset

## [Section 8: Configuration & Optimization]
- [ ] Step 19: Update Stripe configuration
  - **Task**: Set recommended Stripe settings
  - **Files**:
    - `lib/stripe/config.ts`: Update configuration
  - **Step Dependencies**: None
  - **User Instructions**: Configure recommended settings like disabling Cash App Pay and enabling "Limit customers to one subscription"

- [ ] Step 20: Create documentation
  - **Task**: Document the Stripe integration
  - **Files**:
    - `docs/stripe-integration.md`: New documentation file
  - **Step Dependencies**: All
  - **User Instructions**: Create comprehensive documentation of the integration

## Additional Considerations

### Stripe Configuration Recommendations from "Sane Stripe"

1. **DISABLE "CASH APP PAY"**
   - This is recommended in the "Sane Stripe" approach as it's associated with high cancellation rates.

2. **ENABLE "Limit customers to one subscription"**
   - This Stripe setting prevents users from having multiple active subscriptions, which helps avoid race conditions.

3. **Environment Management**:
   - Ensure proper management of `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` for testing and production
   - Maintain separate `STRIPE_PRICE_ID`s for all subscription tiers in both dev and prod environments

### Migration Considerations

When implementing this plan, consider:

1. **Existing Customers**: Need a migration strategy for existing customers to ensure their data is correctly stored in the KV system
2. **Fallback Mechanism**: Maintain the database as a fallback for KV lookup failures
3. **Downtime Avoidance**: Implement changes iteratively to avoid service disruption