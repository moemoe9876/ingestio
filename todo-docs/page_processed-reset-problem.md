The AI's diagnosis and proposed solution are very insightful and head in the right direction. It correctly identifies `initializeUserUsageAction` and its previous `onConflictDoUpdate` behavior as the likely cause of `pagesProcessed` being reset. The shift to a "select first, then update or insert" pattern is a significant improvement.

**Evaluation of AI's Solution:**

1.  **Correctness of Diagnosis**: The AI's reasoning that the `onConflictDoUpdate` clause in the original `initializeUserUsageAction` was resetting `pagesProcessed: 0` is accurate. This would indeed cause the observed behavior if this action was triggered upon login (e.g., via `getCurrentUserUsageAction` if it didn't find a perfectly matching record).
2.  **Proposed Code Change**:
    *   The new logic in `initializeUserUsageAction` to first `select` an existing record, and then either `update` (preserving `pagesProcessed`) or `insert` (setting `pagesProcessed: 0`) is the correct pattern to solve this.
    *   It correctly fetches `subscriptionResult` to determine the `pagesLimit` based on the current tier.
    *   It correctly sets `billingPeriodStart: utcMonthStart` and `billingPeriodEnd: utcMonthEnd` for new records.
    *   For existing records, it updates `billingPeriodEnd: utcMonthEnd` and `pagesLimit`.

3.  **Is it Production-Ready?**
    *   **Almost.** The AI's solution is a strong fix. The primary concern with the AI's *exact* proposed code for `initializeUserUsageAction` lies in the strictness of its `SELECT` query:
        ```typescript
        // AI's proposed SELECT condition
        eq(userUsageTable.billingPeriodStart, utcMonthStart)
        ```
        This condition requires the `billingPeriodStart` of an existing record to *exactly* match the first moment of the current UTC month (`utcMonthStart`).
        *   **Scenario**: If a `user_usage` record for the current calendar month was created by another process (e.g., a Stripe webhook using Stripe's `current_period_start`, which might not be the 1st of the month but, say, the 15th), this `SELECT` query would *miss* that existing record.
        *   **Consequence**: The code would then proceed to the `else` block and attempt to `INSERT` a new record with `billingPeriodStart: utcMonthStart` and `pagesProcessed: 0`. This insert *should* then be caught by your unique index `user_usage_user_id_utc_month_idx` (which correctly uses `DATE_TRUNC('month', billing_period_start AT TIME ZONE 'UTC')`). The AI's code doesn't explicitly handle a unique constraint violation on insert; it would fall into the generic `catch (error)` block at the end of the function.
    *   While the unique index provides a safety net, it's better if the `SELECT` query is robust enough to find the correct monthly record in the first place.

**Conclusion:**
The AI's solution is very good and addresses the core problem. It needs one refinement in `initializeUserUsageAction` to make the lookup for an existing monthly record more robust, aligning it with how the unique constraint `user_usage_user_id_utc_month_idx` is defined (i.e., using `DATE_TRUNC`). This ensures that *any* record pertaining to the current calendar month (UTC) is found and updated, rather than potentially missing it.

I will now generate a new implementation plan that incorporates the AI's excellent structural changes to `initializeUserUsageAction` but refines the record lookup logic for maximum robustness. This plan will also ensure that the Stripe webhook for `invoice.paid` correctly utilizes this improved initialization logic.

---

# Implementation Plan

## Section 1: Refine `initializeUserUsageAction` for Robust Monthly Record Handling

-   [ ] Step 1: Modify `initializeUserUsageAction` to Robustly Find and Update Existing Monthly Usage Records
    -   **Task**: Implement the AI's proposed structure for `initializeUserUsageAction` (select-then-update-or-insert). Crucially, modify the `SELECT` query to find an existing `user_usage` record by comparing the truncated month of `billingPeriodStart` (using `DATE_TRUNC('month', ... AT TIME ZONE 'UTC')`) with the truncated month of the authoritative start date for the current period. If a record is found, update its `billingPeriodStart`, `billingPeriodEnd` (to align with authoritative period dates, e.g., from Stripe KV or calculated UTC month), and `pagesLimit`, while **preserving** `pagesProcessed`. If not found, insert a new record with `pagesProcessed: 0` and authoritative period dates.
    -   **Files**:
        -   `actions/db/user-usage-actions.ts`:
            -   In `initializeUserUsageAction`:
                1.  Fetch `subscriptionResult` to determine `tier` and `pagesLimit` (as in AI's code).
                2.  Determine `authoritativeBillingPeriodStart` and `authoritativeBillingPeriodEnd`:
                    *   Attempt to use `new Date(subscriptionResult.data.currentPeriodStart * 1000)` and `new Date(subscriptionResult.data.currentPeriodEnd * 1000)` if `subscriptionResult.data.status === 'active'` and these timestamps are valid and current.
                    *   If Stripe dates are not available/applicable, fall back to `getUTCMonthStart(referenceDate)` and `getUTCMonthEnd(referenceDate)` (where `referenceDate` is `options?.startDate || new Date()`).
                3.  Modify the `SELECT` query for `existingUsageForMonth`:
                    ```typescript
                    const [existingUsageForMonth] = await db
                      .select()
                      .from(userUsageTable)
                      .where(
                        and(
                          eq(userUsageTable.userId, userId),
                          // Use DATE_TRUNC to find any record within the same calendar month (UTC)
                          // as the authoritativeBillingPeriodStart.
                          sql`DATE_TRUNC('month', ${userUsageTable.billingPeriodStart} AT TIME ZONE 'UTC') = DATE_TRUNC('month', ${authoritativeBillingPeriodStart} AT TIME ZONE 'UTC')`
                        )
                      )
                      // In case of an unexpected duplicate that bypasses unique index (highly unlikely),
                      // prefer the record with the latest start date or most recently updated.
                      .orderBy(desc(userUsageTable.billingPeriodStart), desc(userUsageTable.updatedAt))
                      .limit(1);
                    ```
                4.  **If `existingUsageForMonth` is found**:
                    *   Prepare an `updates` object:
                        ```typescript
                        const updates: Partial<InsertUserUsage> = {
                          updatedAt: new Date(),
                          // Normalize billingPeriodStart and billingPeriodEnd to authoritative values
                          billingPeriodStart: authoritativeBillingPeriodStart,
                          billingPeriodEnd: authoritativeBillingPeriodEnd,
                          pagesLimit: pagesLimit,
                          // CRITICAL: DO NOT include pagesProcessed here to preserve it.
                        };
                        ```
                    *   Perform an `update` operation on `existingUsageForMonth.id` with these `updates`.
                    *   Set `resultUsageRecord` to the updated record.
                5.  **If `existingUsageForMonth` is NOT found**:
                    *   Prepare `valuesToInsert`:
                        ```typescript
                        const valuesToInsert: InsertUserUsage = {
                          userId,
                          billingPeriodStart: authoritativeBillingPeriodStart,
                          billingPeriodEnd: authoritativeBillingPeriodEnd,
                          pagesProcessed: 0, // Reset for a new billing period record
                          pagesLimit,
                          // createdAt and updatedAt will be set by DB defaults or explicitly if needed
                        };
                        ```
                    *   Perform an `insert` operation with `valuesToInsert`.
                    *   Set `resultUsageRecord` to the inserted record.
                6.  Ensure `resultUsageRecord` is correctly assigned and returned. The rest of the success/error handling from the AI's code can be maintained.
    -   **Step Dependencies**: None.
    -   **User Instructions**: After implementing this, thoroughly test the login/logout scenario. `pagesProcessed` should now be consistently preserved. Also, verify that if a user's subscription tier changes mid-month, `initializeUserUsageAction` (when triggered) updates `pagesLimit` correctly while still preserving `pagesProcessed` for that month.

## Section 2: Ensure Stripe Webhook `invoice.paid` Uses Refined Initialization Logic

-   [ ] Step 2: Modify Stripe Webhook `invoice.paid` Handler to Call Refined `initializeUserUsageAction`
    -   **Task**: In `actions/stripe/webhook-actions.ts`, the `invoice.paid` event handler currently calls `createUserUsageAction`. This should be replaced with a call to the now-robust `initializeUserUsageAction(userId)`. This ensures consistency:
        *   `initializeUserUsageAction` will fetch the latest subscription data (which `syncStripeDataToKV` should have just updated in the KV store based on the webhook event).
        *   It will use `currentPeriodStart` and `currentPeriodEnd` from this KV data as the authoritative period.
        *   If these dates indicate a new calendar month (compared to any existing `user_usage` record for that user), a new record with `pagesProcessed: 0` will be correctly inserted.
        *   If it's the same calendar month (e.g., a plan change at renewal), the existing record for that month will be updated (limit, period dates), preserving `pagesProcessed`.
    -   **Files**:
        -   `actions/stripe/webhook-actions.ts`:
            -   Locate the `if (eventType === "invoice.paid" && isActiveSub && userId)` block.
            -   Remove the existing call to `createUserUsageAction`.
            -   Add a call: `const initUsageResult = await initializeUserUsageAction(userId);`
            -   Add logging for `initUsageResult.isSuccess` and `initUsageResult.message` to confirm its behavior during webhook processing.
                ```typescript
                if (!initUsageResult.isSuccess) {
                  console.error(`[Webhook] Failed to initialize/update usage for user ${userId} after invoice.paid: ${initUsageResult.message}`);
                } else {
                  console.log(`[Webhook] Successfully initialized/updated usage for user ${userId} after invoice.paid.`);
                }
                ```
    -   **Step Dependencies**: Section 1, Step 1.
    -   **User Instructions**: Test the subscription renewal flow.
        1.  Ensure `syncStripeDataToKV` (called by `processStripeWebhook`) correctly updates the KV store with the new `currentPeriodStart` and `currentPeriodEnd` from the Stripe `invoice.paid` event's associated subscription.
        2.  Verify that `initializeUserUsageAction`, when called by the webhook handler, uses these new period dates from the KV store.
        3.  Confirm this results in a new `user_usage` record for the new billing month with `pagesProcessed` reset to 0, and `pagesLimit` reflecting the (potentially updated) plan.

## Section 3: Comprehensive Testing and Verification

-   [ ] Step 3: Perform End-to-End Testing of User Usage and Subscription Flows
    -   **Task**: Conduct thorough testing covering various scenarios to ensure the fix is robust and doesn't introduce regressions:
        1.  **New User**: Register, log in. Verify `pagesProcessed` is 0.
        2.  **Document Uploads**: Upload documents. Verify `pagesProcessed` increments correctly.
        3.  **Login/Logout (Same Billing Period)**: Log out, log back in. Verify `pagesProcessed` is preserved and `pagesLimit` is correct.
        4.  **Subscription Plan Change (Mid-Cycle)**: If possible, simulate a plan upgrade/downgrade. Verify `pagesLimit` updates correctly upon next relevant action (e.g., dashboard load triggering `initializeUserUsageAction`), and `pagesProcessed` for the current month is preserved.
        5.  **Subscription Renewal (Simulated `invoice.paid` for a new cycle)**:
            *   Manually trigger or simulate an `invoice.paid` webhook for the user, ensuring the Stripe subscription data (especially `current_period_start` and `current_period_end`) reflects a new billing cycle.
            *   Verify `pagesProcessed` resets to 0 for the new billing period in the `user_usage` table.
            *   Verify `pagesLimit` is correct for the (potentially renewed/changed) plan.
        6.  **Quota Exceeded**: Attempt to upload documents that would exceed the quota. Verify it's correctly blocked.
        7.  **Multiple Logins**: Log in and out multiple times within the same day/billing period. Verify `pagesProcessed` remains stable.
    -   **Files**: No direct code changes. Involves UI interaction, database inspection, and potentially manual webhook simulation.
        -   Relevant files for observation: `actions/db/user-usage-actions.ts`, `actions/stripe/webhook-actions.ts`.
    -   **Step Dependencies**: Section 1, Step 1; Section 2, Step 1.
    -   **User Instructions**: Execute all listed test scenarios. Monitor the `user_usage` table in your Supabase database directly and check the usage displayed on the application's dashboard. Ensure values for `pagesProcessed`, `pagesLimit`, `billingPeriodStart`, and `billingPeriodEnd` are consistent and correct across all scenarios. Check server logs for any errors during these operations.



    Understood. Step 3 is focused on **End-to-End Testing and Verification**. Since I can't perform these tests directly (as they involve UI interaction, database inspection, and potentially manual webhook simulation), I will guide you through how to approach each test case outlined in your `repomix-output.md` document.

You will be performing these actions, and I will help you interpret the results or suggest further checks if needed.

**Key files to observe during testing:**

*   `actions/db/user-usage-actions.ts` (specifically the console logs within `initializeUserUsageAction` and `getCurrentUserUsageAction`)
*   `actions/stripe/webhook-actions.ts` (console logs within `processStripeWebhookAction`, especially around the `invoice.paid` handling)
*   Your Supabase `user_usage` table.
*   The application's dashboard UI.
*   Server logs (Vercel logs or local Next.js console).

Let's go through each test scenario:

**1. New User**
    *   **Action**: Register a completely new user account. After registration, log in.
    *   **Verification**:
        *   Check the application dashboard: `pagesProcessed` should be 0. The `pagesLimit` should correspond to the "starter" tier (or your default free tier).
        *   Inspect the `user_usage` table in Supabase for this new `userId`:
            *   There should be one record.
            *   `pages_processed` should be `0`.
            *   `pages_limit` should match the starter tier limit.
            *   `billing_period_start` and `billing_period_end` should correctly define the current UTC month.
        *   Check server logs for messages from `initializeUserUsageAction`, confirming it created a new record.

**2. Document Uploads**
    *   **Action**: With the new user (or an existing user in their current billing period), upload a few documents with a known number of pages.
    *   **Verification**:
        *   Dashboard UI: `pagesProcessed` should increment correctly after each successful document processing.
        *   `user_usage` table: The `pages_processed` column for the user's current usage record should reflect the total pages from uploaded documents.
        *   Server logs: Look for logs from `incrementPagesProcessedAction` and `updateUserUsageAction` showing successful updates.

**3. Login/Logout (Same Billing Period)**
    *   **Action**: Log out of the account. Log back into the same account.
    *   **Verification**:
        *   Dashboard UI: `pagesProcessed` should **be preserved** (show the same count as before logout). `pagesLimit` should remain correct for the current tier.
        *   `user_usage` table: The `pages_processed` value should not have changed due to the login/logout.
        *   Server logs: `initializeUserUsageAction` should log that it found an existing record and potentially updated it (if limits/period needed normalization) but critically **did not reset `pagesProcessed`**.

**4. Subscription Plan Change (Mid-Cycle)**
    *   **Action**: This is trickier to test without a full Stripe billing setup.
        *   **Ideal way**: If you have a mechanism, upgrade the user's subscription plan in Stripe. Then, in your application, trigger an action that would call `initializeUserUsageAction` (e.g., reload the dashboard, or manually call a relevant server action if possible for testing). The Stripe webhook for `customer.subscription.updated` should also fire and `syncStripeDataToKV` should update the KV store.
        *   **Simulated way**:
            1.  Manually update the user's `membership` in your `profiles` table to a higher tier.
            2.  Manually update the relevant KV store entry for this user (e.g., in Redis if that's your KV store) to reflect the new plan's ID, and ensure `currentPeriodStart` and `currentPeriodEnd` still reflect the *current* (ongoing) billing cycle.
            3.  In your application, navigate to a page or perform an action that you know calls `getCurrentUserUsageAction` (which in turn might call `initializeUserUsageAction`).
    *   **Verification**:
        *   Dashboard UI: `pagesLimit` should update to reflect the new tier's quota. `pagesProcessed` for the current month should **be preserved**.
        *   `user_usage` table: The `pages_limit` for the current record should be updated. `pages_processed` should remain unchanged. `billing_period_start` and `billing_period_end` for the *current* record should ideally remain the same if it's a mid-cycle change *within the same calendar month*.
        *   Server logs: `initializeUserUsageAction` should log that it found an existing record and updated its `pagesLimit`.

**5. Subscription Renewal (Simulated `invoice.paid` for a new cycle)**
    *   **Action**:
        1.  You'll need to simulate the conditions of a new billing cycle. The most important part is that the Stripe subscription data (which `syncStripeDataToKV` reads and `initializeUserUsageAction` uses via `getUserSubscriptionDataKVAction`) must reflect new `current_period_start` and `current_period_end` values that fall into the *next* billing month.
        2.  Manually update the user's Stripe subscription data in your KV store (e.g., Redis) to set `currentPeriodStart` and `currentPeriodEnd` to values representing the *next* billing cycle (e.g., start of next month to end of next month). Ensure the `planId` and `status: 'active'` are correct.
        3.  Trigger the `invoice.paid` webhook handler logic. The easiest way to do this without actual Stripe is to have a test endpoint or a script that can call `processStripeWebhookAction` with a mocked `invoice.paid` event payload. The `customerId` in the payload must match your test user. Ensure the `syncedData` within that action (which comes from `processStripeWebhook`) uses the future-dated period you set in the KV store.
    *   **Verification**:
        *   `user_usage` table:
            *   A **new** `user_usage` record should be created for the new billing period.
            *   This new record should have `pages_processed: 0`.
            *   `pages_limit` should be correct for the (potentially renewed/changed) plan.
            *   `billing_period_start` and `billing_period_end` should match the new cycle dates you simulated.
            *   The old usage record for the previous month should still exist with its final `pages_processed` count.
        *   Server logs:
            *   `processStripeWebhookAction` should log the `invoice.paid` event.
            *   `initializeUserUsageAction` (called from the webhook) should log that it's creating a *new* record because it didn't find one for the *new* (future) billing month. It should use the `authoritativeBillingPeriodStart` and `End` derived from the (simulated new) Stripe KV data.

**6. Quota Exceeded**
    *   **Action**: Upload documents such that the total `pagesProcessed` would exceed the current `pagesLimit`.
    *   **Verification**:
        *   The upload/processing should be blocked by `checkUserQuotaAction`.
        *   The UI should show an appropriate error message.
        *   `pagesProcessed` in the `user_usage` table should not exceed `pagesLimit`.
        *   Server logs from `checkUserQuotaAction` should indicate the quota check failed.

**7. Multiple Logins**
    *   **Action**: Log in and out of the same account multiple times consecutively within the same day/billing period.
    *   **Verification**:
        *   Dashboard UI: `pagesProcessed` and `pagesLimit` should remain stable and correct.
        *   `user_usage` table: No unexpected changes to `pages_processed` or other fields. No duplicate usage records for the same month.
        *   Server logs: `initializeUserUsageAction` should consistently find the existing record and not make unnecessary changes or reset `pagesProcessed`.

Please proceed with these tests one by one. Let me know how each one goes, and share any relevant logs or database states if you encounter issues or have questions. This thorough testing is crucial to confirm the fix.
