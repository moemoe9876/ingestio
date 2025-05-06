## 1 Need update pdf viewer for multipage pdf documents, currently throwing up errors when uploaded


## Remove the bounding boxed data when users export their data in json format and maybe provide option to include include bounding boxes data.
 

## most recent document (1 hour old) doesn't appear after a manual refresh in history page recently processed, the issue might lie deeper, potentially in backend caching, database delays, or the fetchUserDocumentsAction implementation itself [x]

  

## Iprove Step 5.6: Implement History Page UI

  

## Improve Step 5.7: Implement Metrics Page / add page usage left and UI

  

## Improve Step 5.8: Implement App-Specific Settings UI

  

## Improve Step 5.10: Implement Dashboard Page UI


## need fix the pages input ie the system is not tracking the pages corrcetly saying 2 pages when its actually just one page. [x]



## add the rate limit tiers to the pricing cards info for each tier !!


## Based on the analysis of your provided codebase structure and the logic within the key action files, **your app currently does NOT implement unused page rollover.**

Here's the reasoning:

1.  **Database Schema (`db/schema/user-usage-schema.ts`):** The `userUsageTable` schema includes columns for `userId`, `billingPeriodStart`, `billingPeriodEnd`, `pagesProcessed`, and `pagesLimit`. There is **no column** dedicated to storing a "rollover balance" or "unused pages" from previous periods. The tracking is focused solely on usage *within* the defined billing period.
2.  **Usage Checking Logic (`actions/db/user-usage-actions.ts` - `checkUserQuotaAction`):** This action retrieves the *current* billing period's usage record. It calculates remaining pages simply as `pagesLimit - pagesProcessed` for that specific period. It does not look at previous periods or factor in any potential rollover balance.
3.  **Usage Increment Logic (`actions/db/user-usage-actions.ts` - `incrementPagesProcessedAction`):** This action increments the `pagesProcessed` count for the *current* billing period's record and checks against the `pagesLimit` of that same record. There's no mechanism to consume rollover pages first or add unused pages to the limit.
4.  **Billing Cycle Reset Logic (`actions/stripe/webhook-actions.ts` & `actions/db/user-usage-actions.ts`):** When a Stripe event like `invoice.paid` (signifying a renewal) occurs, the webhook handler calls `createUserUsageAction`. This action is designed to create a *new* usage record for the *new* billing period, explicitly setting `pagesProcessed` to `0`. This clearly indicates a reset and no carry-over from the previous cycle.

**In conclusion:** The current system operates on a standard monthly quota model where usage resets at the beginning of each billing cycle, and unused pages from the previous cycle expire ("use it or lose it"). There is no code supporting the carry-over of unused pages.