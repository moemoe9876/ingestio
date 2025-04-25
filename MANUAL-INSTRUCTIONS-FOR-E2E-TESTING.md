# E2E Testing Instructions for Stripe Integration

This document outlines the procedure for comprehensive end-to-end testing of the Stripe integration, including webhook handling, subscription management, and usage reset.

## Prerequisites

1. **Stripe CLI**: Install the [Stripe CLI](https://stripe.com/docs/stripe-cli) for local webhook forwarding
2. **Stripe Test Account**: Ensure you have access to a Stripe Test account
3. **Local Development Environment**: Running application with all Stripe-related environment variables configured
4. **Stripe Test Data**: Test credit cards and other test data from [Stripe Testing documentation](https://stripe.com/docs/testing)

## Setup

### 1. Configure Environment Variables

Ensure the following environment variables are set in your `.env.local` file:

```
STRIPE_API_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLIC_KEY=pk_test_...
```

### 2. Start the Stripe CLI Webhook Forwarding

```bash
stripe login
stripe listen --forward-to http://localhost:3000/api/stripe/webhooks
```

Note the webhook signing secret provided by the CLI and update your `STRIPE_WEBHOOK_SECRET` environment variable if necessary.

## Test Scenarios

### Scenario 1: New Subscription Flow

1. **Start with a New User**:
   - Create a new test user account
   - Verify profile is created with `membership: "starter"`
   - Verify no Stripe customer ID is associated

2. **Initiate Checkout**:
   - Navigate to pricing page
   - Select "Plus" plan and click "Subscribe"
   - Verify redirect to Stripe Checkout

3. **Complete Checkout**:
   - Use test card: `4242 4242 4242 4242` (successful payment)
   - Complete form and submit

4. **Verify Success Flow**:
   - Verify redirect to `/stripe/success` page
   - Wait for successful sync message
   - Verify redirect to dashboard

5. **Verify Data Synced**:
   - Check Redis KV store:
     ```bash
     # Using Redis CLI or similar tool
     GET stripe:user:<userId>  # Should return customer ID
     GET stripe:customer:<customerID>  # Should return subscription data
     ```
   - Verify profile in database is updated with:
     - `stripeCustomerId` is set
     - `membership` is set to "plus"
     - `stripeSubscriptionId` is set

6. **Verify Feature Access**:
   - Try batch upload feature (Plus-only)
   - Verify correct page quota is set in user_usage table
   - Verify rate limits are applied correctly

### Scenario 2: Subscription Cancellation

1. **Cancel Subscription**:
   - Navigate to dashboard settings
   - Access billing portal
   - Cancel subscription (select "end at period end")
   - Return to dashboard

2. **Verify Webhook Processing**:
   - Check Stripe CLI output for `customer.subscription.updated` event
   - Verify Redis KV store shows `cancelAtPeriodEnd: true`
   - Current membership should still be "plus" until period end

3. **Simulate Period End**:
   - Use Stripe Dashboard to cancel the subscription immediately
   - This will trigger `customer.subscription.canceled` event
   - Verify Stripe CLI captures the event

4. **Verify Downgrade**:
   - Check Redis KV shows `status: "canceled"` or `status: "none"`
   - Verify profile in database shows `membership: "starter"`
   - Verify premium features are no longer accessible

### Scenario 3: Subscription Renewal & Usage Reset

1. **Create Active Subscription**:
   - Follow Scenario 1 steps to create an active subscription
   - Process some documents to use up quota

2. **Simulate Subscription Renewal**:
   - Use Stripe Dashboard Test Clocks to advance time to next billing period
   - Or use Stripe API to trigger `invoice.payment_succeeded` event:
     ```bash
     stripe trigger invoice.payment_succeeded --add subscription=<sub_id> --add billing_reason=subscription_cycle
     ```

3. **Verify Usage Reset**:
   - Verify Stripe CLI captures `invoice.payment_succeeded` event
   - Check user_usage table for:
     - New period record created with correct start/end dates
     - `pagesProcessed` reset to 0
     - `pagesLimit` correct for tier

4. **Verify Continued Access**:
   - Verify subscription status still active in Redis KV
   - Verify membership still "plus" in database
   - Verify can process new documents with reset quota

### Scenario 4: Payment Failure Handling

1. **Setup Subscription with Card That Will Fail**:
   - Create new subscription using card `4000 0000 0000 0341` (fails on renewal)
   - Complete initial subscription (first payment succeeds)

2. **Simulate Payment Failure on Renewal**:
   - Use Test Clock to advance to renewal date
   - Or trigger payment failure event manually

3. **Verify Past Due Status**:
   - Check Stripe CLI for `invoice.payment_failed` event
   - Verify Redis KV shows `status: "past_due"`
   - Verify premium features still accessible during grace period

4. **Simulate Continued Failure & Cancellation**:
   - Advance test clock or manually trigger cancellation after failure
   - Verify webhook event captured: `customer.subscription.deleted`

5. **Verify Account Downgrade**:
   - Verify Redis KV store shows `status: "canceled"` or `status: "none"`
   - Verify profile shows `membership: "starter"`
   - Verify premium features no longer accessible

## Troubleshooting Tips

1. **Monitor Webhook Events**:
   - Keep Stripe CLI output visible to see incoming events
   - Check server logs for webhook processing messages

2. **Inspect Redis Data**:
   - Use Redis CLI or GUI tool to check KV store values
   - Verify both mapping (`stripe:user:...`) and data (`stripe:customer:...`) keys

3. **Check Database**:
   - Inspect profiles table for correct membership and customer ID values
   - Inspect user_usage table for correct period records and limits

4. **Debugging Sync Issues**:
   - If the automatic sync fails, manually trigger sync by refreshing the success page
   - Check server logs for any errors in the synchronization process

5. **Reset Test State**:
   - Delete test customers and subscriptions in Stripe Dashboard
   - Clear Redis KV store entries
   - Reset user profile in database

## Additional Test Cases

- **Upgrade Flow**: Test upgrading from Plus to Growth plan
- **Downgrade Flow**: Test downgrading from Growth to Plus plan
- **Multiple Devices**: Test accessing site from multiple devices after subscription
- **Billing Portal Access**: Test managing subscription through billing portal

---

Remember that all testing should be done in Stripe Test Mode only. Never use production API keys for testing. 