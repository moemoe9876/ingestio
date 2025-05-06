# Supabase DB Timezone and Billing Period Issues in Subscription Applications

## Problem Overview

Our application experienced a data inconsistency issue in the `user_usage` table where multiple usage records were created for the same user during the same billing period. This document outlines the technical details of the issue, root causes, and implementation solutions.

The specific symptoms we observed:

- A single user (ID: `user_2wIUHypcAM46n6I6ePnz7sUSYiU`) had multiple entries in the `user_usage` table
- One record showed billing period starting at `2025-04-27 04:36:04`
- Another record showed billing period starting at `2025-04-30 23:00:00` (effectively May 1 in local time)
- Both records tracked pages processed separately, fragmenting the user's actual usage data

## Root Causes

### 1. Time Zone Inconsistency

The primary issue stemmed from how dates were calculated and stored:

```javascript
// In initializeUserUsageAction
const billingPeriodStart = options?.startDate || new Date(now.getFullYear(), now.getMonth(), 1);
```

This code creates a date representing midnight on the first day of the current month in the local timezone. However, when this JavaScript Date object is sent to PostgreSQL, it's interpreted as UTC. This timezone shift caused records to be stored with unexpected timestamps.

For example, if the server is in UTC+1:
- Local date: `May 1, 2025 00:00:00 (UTC+1)`
- Stored in DB as: `April 30, 2025 23:00:00 (UTC)`

### 2. Table Schema Constraints

The `user_usage` table had a unique constraint:

```sql
CONSTRAINT "user_usage_user_id_billing_period_start_unique" UNIQUE("user_id","billing_period_start")
```

This constraint couldn't prevent duplicates when the `billing_period_start` values differed by even a millisecond, despite representing the same logical billing period.

### 3. Implementation Changes

Code changes that altered how the `billing_period_start` was calculated created records with different timestamps. 

- Earlier implementation: Used current timestamp for new billing periods
- Current implementation: Uses first day of the month
- This transition created overlapping records that bypassed the uniqueness constraint

## Best Practices for Handling Dates and Billing Periods

### 1. Use UTC Consistently

From [PostgreSQL documentation](https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/database/postgres/configuration.mdx):

```sql
-- Check database timezone
select name, abbrev, utc_offset, is_dst
from pg_timezone_names()
order by name;
```

**Solution:** Always use UTC for date calculations to avoid timezone inconsistencies:

```javascript 
// Fix: Use UTC date methods
const billingPeriodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
const billingPeriodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
```

### 2. Use Appropriate Column Types

Postgres offers different timestamp types:
- `timestamp`: Stored without timezone information
- `timestamptz`: Stored with timezone information, always converted to/from UTC

**Solution:** Use `timestamptz` for billing period columns to ensure consistent timezone handling.

```sql
-- Alter table to use timestamptz
ALTER TABLE user_usage 
  ALTER COLUMN billing_period_start TYPE timestamptz,
  ALTER COLUMN billing_period_end TYPE timestamptz;
```

### 3. Create Robust Uniqueness Constraints

**Solution:** Create a functional index that normalizes the dates to the month level:

```sql
-- Create a month-level uniqueness constraint
ALTER TABLE user_usage
  ADD CONSTRAINT user_usage_unique_month
  UNIQUE (user_id, DATE_TRUNC('month', billing_period_start));
```

### 4. Make Initialization Truly Idempotent

From our code review, the `initializeUserUsageAction` function attempts to be idempotent by checking for existing records, but timezone inconsistencies can bypass these checks.

**Solution:** Use `ON CONFLICT DO NOTHING` pattern for true idempotency:

```javascript
// Pseudocode for Drizzle ORM
const result = await db.insert(userUsageTable)
  .values({
    userId,
    billingPeriodStart,
    billingPeriodEnd,
    pagesProcessed: 0,
    pagesLimit,
  })
  .onConflictDoNothing({ 
    target: [userUsageTable.userId, userUsageTable.billingPeriodStart], 
    // Use pg function call to normalize dates for conflict detection
    where: sql`DATE_TRUNC('month', ${userUsageTable.billingPeriodStart}) = DATE_TRUNC('month', ${billingPeriodStart})`
  })
  .returning();
```

## Cleanup for Existing Issues

To fix the existing data inconsistency:

1. Identify affected users:

```sql
SELECT user_id, COUNT(*) AS record_count
FROM user_usage
GROUP BY user_id
HAVING COUNT(*) > 1;
```

2. Fix or merge existing duplicate records:

```sql
-- For each affected user, update one record with combined page counts and delete others
WITH ranked_records AS (
  SELECT 
    id, 
    user_id, 
    billing_period_start,
    pages_processed,
    ROW_NUMBER() OVER (PARTITION BY user_id, DATE_TRUNC('month', billing_period_start) ORDER BY billing_period_start) as rn,
    SUM(pages_processed) OVER (PARTITION BY user_id, DATE_TRUNC('month', billing_period_start)) as total_processed
  FROM user_usage
)
UPDATE user_usage
SET 
  pages_processed = rr.total_processed,
  billing_period_start = DATE_TRUNC('month', rr.billing_period_start)
FROM ranked_records rr
WHERE user_usage.id = rr.id AND rr.rn = 1;

-- Delete the duplicate records (keeping only the first one)
DELETE FROM user_usage
USING ranked_records rr
WHERE user_usage.id = rr.id AND rr.rn > 1;
```

## Monitoring and Preventing Future Issues

1. Add logging to track billing period calculations:

```javascript
console.log(`Creating billing period: ${billingPeriodStart.toISOString()} to ${billingPeriodEnd.toISOString()}`);
```

2. Add database constraints that enforce logical business rules

3. Create monitoring queries to detect potential data integrity issues before they impact users

## References

- [Supabase Documentation: Postgres Timezone Configuration](https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/database/postgres/configuration.mdx)
- [Timestamp Functions in PostgreSQL](https://github.com/supabase/supabase/blob/master/examples/prompts/database-functions.md)
- [Stripe Node.js Integration Best Practices](https://github.com/stripe/stripe-node/blob/master/README.md) 






This is an excellent and very insightful analysis! It aligns well with my previous thoughts and adds some valuable perspectives, particularly:

1.  **Highlighting the "old code version" (Cause #2):** This is a very plausible explanation for the `2025-04-27` record. If `billing_period_start` was previously just `new Date()`, that record would have been created on April 27th. The subsequent refactor to "first-of-month" logic would then create the `2025-04-30 23:00:00` record (which is May 1st local time, shifted to UTC).
2.  **Column type choice (`timestamp` vs `timestamptz`) (Cause #6):** This is a crucial point. Using `timestamp without time zone` makes the application highly susceptible to timezone interpretation issues between the application server and the database server. Switching to `timestamp with time zone` (timestamptz) and storing everything in UTC is best practice.
3.  **Unique index granularity (Cause #7 & Solution #2):** Suggesting a unique constraint on `(user_id, DATE_TRUNC('month', billing_period_start))` is a very good idea to enforce uniqueness at the *logical billing month* level, regardless of minor time discrepancies in the `billing_period_start` day/time.
4.  **`INSERT ... ON CONFLICT DO NOTHING/UPDATE` (Solution #4):** This is the robust way to make `initializeUserUsageAction` truly idempotent, especially when combined with the month-level unique index.

The AI's "Most Likely Combination" (A & B) is spot on.

The "What To Do Next" section provides a solid foundation for a fix. I will integrate these suggestions into a more detailed implementation plan. The key is to:
*   **Standardize all `billing_period_start` and `billing_period_end` to UTC**, with `billing_period_start` always being the 1st of the month at 00:00:00 UTC.
*   **Modify the database schema** to use `timestamptz` and add the month-level unique constraint.
*   **Refactor `initializeUserUsageAction`** to be truly idempotent using an "upsert" strategy based on the new unique constraint.
*   **Ensure the Stripe webhook handler (`invoice.paid`)** also uses this standardized period logic and the upsert mechanism to reset usage.

Here's the refined implementation plan:

# Implementation Plan

## Section 1: Database Schema and Date Handling Foundation

-   [ ] Step 1.1: Update Date Utility Helpers for UTC Month Boundaries
    -   **Task**: Modify/Create functions in `lib/utils/date-utils.ts` to reliably get the start (1st day, 00:00:00 UTC) and end (last day, 23:59:59.999 UTC) of a month for any given `Date` object, ensuring the output is a `Date` object representing UTC.
        ```typescript
        // Example for lib/utils/date-utils.ts
        export function getUTCMonthStart(date: Date): Date {
          return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
        }

        export function getUTCMonthEnd(date: Date): Date {
          // Go to the start of the next month, then subtract 1 millisecond
          const year = date.getUTCFullYear();
          const month = date.getUTCMonth();
          return new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0) - 1);
        }
        ```
    -   **Files**:
        -   `lib/utils/date-utils.ts`: Implement `getUTCMonthStart` and `getUTCMonthEnd`.
    -   **Step Dependencies**: None
    -   **User Instructions**: Review the new helper functions for correctness, ensuring they always return UTC dates.

-   [ ] Step 1.2: Modify `user_usage` Table Schema
    -   **Task**: Create a new Drizzle migration to:
        1.  Change `billing_period_start` and `billing_period_end` columns in `user_usage` table from `timestamp` to `timestamptz`.
        2.  Drop the existing unique constraint `user_usage_user_id_billing_period_start_unique`.
        3.  Add a new unique constraint on `(user_id, DATE_TRUNC('month', billing_period_start AT TIME ZONE 'UTC'))`. This ensures uniqueness per user per calendar month (UTC).
    -   **Files**:
        -   Create a new migration file in `db/migrations/`. Example: `db/migrations/XXXX_fix_user_usage_period.sql`
            ```sql
            -- Migration content
            ALTER TABLE "public"."user_usage"
              ALTER COLUMN "billing_period_start" TYPE timestamptz USING "billing_period_start"::timestamptz,
              ALTER COLUMN "billing_period_end" TYPE timestamptz USING "billing_period_end"::timestamptz;

            ALTER TABLE "public"."user_usage"
              DROP CONSTRAINT IF EXISTS "user_usage_user_id_billing_period_start_unique";

            -- Add a temporary index to help with the constraint creation if the table is large
            CREATE INDEX IF NOT EXISTS idx_user_usage_user_id_month_start_temp ON "public"."user_usage" (user_id, DATE_TRUNC('month', billing_period_start AT TIME ZONE 'UTC'));

            -- Before adding the new unique constraint, you might need to clean up existing duplicates
            -- that would violate it. This is a manual step or a more complex data migration script.
            -- For now, we assume duplicates will be handled manually or by the data cleanup step later.

            ALTER TABLE "public"."user_usage"
              ADD CONSTRAINT "user_usage_user_id_utc_month_unique"
              UNIQUE (user_id, DATE_TRUNC('month', billing_period_start AT TIME ZONE 'UTC'));

            -- Drop the temporary index if you created it
            -- DROP INDEX IF EXISTS idx_user_usage_user_id_month_start_temp;
            ```
        -   `db/schema/user-usage-schema.ts`: Update Drizzle schema definition for `billingPeriodStart` and `billingPeriodEnd` to use `timestamp("...", { withTimezone: true, mode: 'date' })`. Update the unique constraint definition in Drizzle to reflect the new SQL constraint (Drizzle might not directly support `DATE_TRUNC` in its unique constraint definition, so the SQL one is the source of truth).
            ```typescript
            // In db/schema/user-usage-schema.ts
            // ...
            billingPeriodStart: timestamp("billing_period_start", { withTimezone: true, mode: 'date' }).notNull(),
            billingPeriodEnd: timestamp("billing_period_end", { withTimezone: true, mode: 'date' }).notNull(),
            // ...
            }, (table) => {
              return {
                // Drizzle's unique constraint helper might not support DATE_TRUNC directly.
                // The SQL unique constraint is the source of truth.
                // You can represent it as a named unique constraint if Drizzle Kit picks it up,
                // or just rely on the SQL migration.
                // For documentation purposes, you might add a comment here.
                // userBillingMonthUnique: uniqueIndex("user_usage_user_id_utc_month_idx")
                //   .on(table.userId, sql`DATE_TRUNC('month', ${table.billingPeriodStart} AT TIME ZONE 'UTC')`),
                // OR simply:
                // userBillingMonthUnique: unique("user_usage_user_id_utc_month_unique").on(table.userId, table.billingPeriodStart)
                // and understand that the DB enforces the DATE_TRUNC logic.
                // Let's try to be explicit if Drizzle supports it, otherwise comment.
                // Drizzle might require you to define the SQL for the unique constraint directly if it's complex.
                // For now, we'll assume the SQL migration handles the unique constraint.
                // The old constraint: userBillingPeriodIdx: unique().on(table.userId, table.billingPeriodStart)
              }
            })
            ```
    -   **Step Dependencies**: Step 1.1
    -   **User Instructions**:
        1.  Run `pnpm db:generate` to create the migration file.
        2.  Carefully review the generated SQL. You will likely need to **manually edit the SQL migration file** to include the `ALTER COLUMN TYPE`, `DROP CONSTRAINT`, and `ADD CONSTRAINT ... UNIQUE (user_id, DATE_TRUNC('month', billing_period_start AT TIME ZONE 'UTC'))` parts. Drizzle Kit might not generate these complex changes perfectly.
        3.  **BACKUP YOUR DATABASE** before applying migrations.
        4.  Manually resolve any existing duplicate data that would violate the new unique constraint *before* applying the migration that adds the constraint, or be prepared for the migration to fail.
        5.  Run `pnpm db:migrate` to apply the migration.
        6.  Update the Drizzle schema file (`db/schema/user-usage-schema.ts`) to reflect `timestamptz`.

## Section 2: Refactor User Usage Actions for Idempotency and Consistency

-   [ ] Step 2.1: Refactor `initializeUserUsageAction` for Idempotency
    -   **Task**: Modify `initializeUserUsageAction` in `actions/db/user-usage-actions.ts`:
        1.  Use the new UTC date helpers (`getUTCMonthStart`, `getUTCMonthEnd`) from Step 1.1 to calculate `utcMonthStart` and `utcMonthEnd` based on the current date (or provided options).
        2.  Fetch `subscriptionResult` to determine `pagesLimit` for the user's tier.
        3.  Use Drizzle's `db.insert(...).values(...).onConflictDoUpdate(...)` (upsert) functionality.
            *   The `onConflict` target should be the new unique constraint (e.g., based on `userId` and the truncated month of `billingPeriodStart`). Drizzle syntax for this might involve specifying the constraint name or the columns involved in the unique index that `DATE_TRUNC` effectively creates.
            *   If a conflict occurs (record for that user & month already exists), `DO UPDATE` should set:
                *   `pagesProcessed = 0` (if it's a new billing cycle reset).
                *   `pagesLimit = newPagesLimit` (from current subscription).
                *   `billingPeriodEnd = utcMonthEnd` (to ensure it's correctly set for the current month).
                *   `updatedAt = new Date()`.
            *   If no conflict, it inserts a new record with `pagesProcessed = 0`, `pagesLimit = newPagesLimit`, `billingPeriodStart = utcMonthStart`, `billingPeriodEnd = utcMonthEnd`.
        4.  Remove the initial `select` check for existing usage; the `onConflictDoUpdate` handles this.
    -   **Files**:
        -   `actions/db/user-usage-actions.ts`: Major refactor of `initializeUserUsageAction`.
        -   `lib/utils/date-utils.ts`: (Ensure helpers from Step 1.1 are used).
    -   **Step Dependencies**: Step 1.1, Step 1.2
    -   **User Instructions**: Test this action thoroughly. It should now correctly create a new record for a new user/new month, or update (reset `pagesProcessed`, update `pagesLimit` and `billingPeriodEnd`) an existing record for the current month.

-   [ ] Step 2.2: Review `getCurrentUserUsageAction`
    -   **Task**: Ensure `getCurrentUserUsageAction` correctly finds the *single* active usage record for the user for the current UTC month. The `orderBy(desc(userUsageTable.billingPeriodStart))` and `limit(1)` combined with the `where` clause (checking if `now` is between `billingPeriodStart` and `billingPeriodEnd`) should still work correctly, assuming `billingPeriodStart` is now consistently the 1st of the month UTC.
    -   **Files**:
        -   `actions/db/user-usage-actions.ts`: Review `getCurrentUserUsageAction`.
    -   **Step Dependencies**: Step 2.1
    -   **User Instructions**: Verify this action returns the correct (and single) usage record.

-   [ ] Step 2.3: Review `updateUserUsageAction`
    -   **Task**: The `updateUserUsageAction` is primarily used by `incrementPagesProcessedAction`. Its logic to find the record to update (either by `usageId` or by `userId` and current date range) needs to be robust.
        *   If `usageId` is provided, it should update that specific record.
        *   If `usageId` is NOT provided, it should find the record for the current UTC month (similar to `getCurrentUserUsageAction`) and update that.
        *   The `dateClause` should use UTC `now` for comparison against the UTC `billingPeriodStart` and `billingPeriodEnd`.
    -   **Files**:
        -   `actions/db/user-usage-actions.ts`: Review and potentially simplify `updateUserUsageAction` if `getCurrentUserUsageAction` reliably returns the correct ID to pass.
    -   **Step Dependencies**: Step 2.1, Step 2.2
    -   **User Instructions**: Ensure page increments update the correct monthly record.

## Section 3: Update Stripe Webhook Logic

-   [ ] Step 3.1: Modify `processStripeWebhookAction` for `invoice.paid` Event
    -   **Task**: In `actions/stripe/webhook-actions.ts`, when handling an `invoice.paid` event:
        1.  Retrieve `userId` based on `customerId`.
        2.  Get `currentPeriodStart` and `currentPeriodEnd` from Stripe's `syncedData`. These are UTC Unix timestamps. Convert them to `Date` objects.
        3.  Call the refactored `initializeUserUsageAction(userId, { startDate: stripePeriodStartDate, endDate: stripePeriodEndDate })`. This action will now handle the upsert logic:
            *   It will calculate the `utcMonthStart` based on `stripePeriodStartDate`.
            *   It will find an existing record for that `userId` and `utcMonthStart` or create a new one.
            *   It will set `pagesProcessed = 0`.
            *   It will set `pagesLimit` based on the user's current plan (derived from `syncedData.planId`).
            *   It will set `billingPeriodEnd` to the `stripePeriodEndDate`.
        4.  Remove the direct call to `createUserUsageAction`.
    -   **Files**:
        -   `actions/stripe/webhook-actions.ts`: Modify the logic for `invoice.paid`.
        -   `actions/db/user-usage-actions.ts`: (Leverage the refactored `initializeUserUsageAction`).
    -   **Step Dependencies**: Step 1.1, Step 2.1
    -   **User Instructions**: Test the `invoice.paid` webhook. It should correctly reset usage for the billing period defined by Stripe, ensuring `billing_period_start` is normalized to the 1st of that month (UTC) and `billing_period_end` matches Stripe's end date.

## Section 4: Review `UserInitializer` Component

-   [ ] Step 4.1: Simplify `UserInitializer` Logic
    -   **Task**: Review `components/utilities/user-initializer.tsx`. With a robust `initializeUserUsageAction` (idempotent upsert), the retry logic within `UserInitializer` might be simplified or made less aggressive. The primary goal is to ensure `initializeUserUsageAction(userId)` is called once the `userId` is available. The action itself will handle creating or updating the necessary record for the current month.
    -   **Files**:
        -   `components/utilities/user-initializer.tsx`: Review and potentially simplify.
    -   **Step Dependencies**: Step 2.1
    -   **User Instructions**: Ensure that after login, the `user_usage` record for the current month is correctly created or already exists without duplicates. The retry logic might still be useful if Clerk webhooks are slow, but the core idempotency is now in the server action.

## Section 5: Data Cleanup and Verification

-   [ ] Step 5.1: Manually Clean Up Existing Duplicate `user_usage` Records
    -   **Task**: After deploying the schema changes and code fixes, write and execute SQL queries to:
        1.  Identify users with multiple `user_usage` records for overlapping or adjacent periods that effectively cover the same billing month (e.g., one starting April 27th, another April 30th for a May 1st cycle).
        2.  For each user with duplicates:
            *   Determine the "correct" record (ideally the one whose `billing_period_start` is the 1st of the month UTC, or the one with the latest `billing_period_start` if normalization wasn't perfect yet).
            *   Sum `pages_processed` from all duplicate records for that logical month.
            *   Update the "correct" record with the summed `pages_processed`, the correct `pages_limit` for their current plan, and ensure `billing_period_start` is 1st of month UTC and `billing_period_end` is end of month UTC.
            *   Delete the other duplicate records for that user and logical month.
    -   **Files**: None (This is a database operation, potentially a one-off SQL script).
    -   **Step Dependencies**: All previous code and schema steps implemented and deployed.
    -   **User Instructions**: **CRITICAL: BACKUP YOUR DATABASE before running any manual data manipulation scripts.**
        Example SQL to find users with multiple records that might cover the current/recent month (adjust date ranges):
        ```sql
        SELECT user_id, COUNT(*) as num_records,
               ARRAY_AGG(id) as usage_ids,
               ARRAY_AGG(billing_period_start) as start_dates,
               ARRAY_AGG(pages_processed) as pages
        FROM user_usage
        WHERE billing_period_end >= '2025-04-01T00:00:00Z' -- Example: look at records ending in or after April 2025
        GROUP BY user_id
        HAVING COUNT(*) > 1;
        ```
        For each `user_id` found, you'll need to inspect their records and decide on the merge/delete strategy.

-   [ ] Step 5.2: Thorough Testing
    -   **Task**: After deployment and data cleanup:
        1.  Test new user sign-up: Ensure one `user_usage` record is created with correct UTC month boundaries.
        2.  Test existing user login: Ensure their current month's usage record is correct and no new ones are made.
        3.  Simulate Stripe `invoice.paid` webhooks: Verify usage is reset correctly in the existing monthly record.
        4.  Perform actions that increment `pagesProcessed`: Confirm it updates the single correct record.
    -   **Files**: None (Testing activity).
    -   **Step Dependencies**: Step 5.1
    -   **User Instructions**: Monitor the `user_usage` table closely during these tests.

