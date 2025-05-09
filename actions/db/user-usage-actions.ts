"use server"

/*
 * Server actions for managing user usage data
 */

import { getUserSubscriptionDataKVAction } from "@/actions/stripe/sync-actions";
import { db } from "@/db/db";
import { InsertUserUsage, profilesTable, SelectUserUsage, userUsageTable } from "@/db/schema";
import { RATE_LIMIT_TIERS, SubscriptionTier } from "@/lib/rate-limiting/limiter";
import { getUTCMonthEnd, getUTCMonthStart } from "@/lib/utils/date-utils";
import { ActionState } from "@/types";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";

/**
 * Create a new user usage record
 */
export async function createUserUsageAction(
  data: InsertUserUsage
): Promise<ActionState<SelectUserUsage>> {
  try {
    const [newUsage] = await db.insert(userUsageTable).values(data).returning()
    
    return {
      isSuccess: true,
      message: "User usage record created successfully",
      data: newUsage
    }
  } catch (error) {
    console.error("Error creating user usage record:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Unknown error creating user usage"
    }
  }
}

/**
 * Initialize user usage record for current billing period if it doesn't exist
 * @param userId The user ID
 * @param options Optional parameters for custom period dates
 * @returns ActionState with the user usage record
 */
export async function initializeUserUsageAction(
  userId: string,
  options?: {
    startDate?: Date;
  }
): Promise<ActionState<SelectUserUsage>> {
  try {
    const now = new Date();
    const referenceDate = options?.startDate || now;

    // Check if the user profile exists
    const [profile] = await db
      .select({ userId: profilesTable.userId })
      .from(profilesTable)
      .where(eq(profilesTable.userId, userId))
      .limit(1);

    if (!profile) {
      console.warn(`[initializeUserUsageAction] No profile found for userId: ${userId}. Cannot initialize usage.`);
      return {
        isSuccess: false,
        message: "User profile not found. Cannot initialize usage record.",
      };
    }

    const subscriptionResult = await getUserSubscriptionDataKVAction(userId);
    
    if (!subscriptionResult.isSuccess) {
      console.error(`[initializeUserUsageAction] Failed to retrieve subscription data for user ${userId}: ${subscriptionResult.message}`);
      return {
        isSuccess: false,
        message: `Failed to initialize usage: ${subscriptionResult.message}`
      };
    }
    
    let tier: SubscriptionTier = "starter";
    let authoritativeBillingPeriodStart: Date;
    let authoritativeBillingPeriodEnd: Date;

    // Step 1: Check Stripe data first
    if (
      subscriptionResult.data.status === 'active' &&
      subscriptionResult.data.currentPeriodStart &&
      subscriptionResult.data.currentPeriodEnd 
    ) {
      const stripePeriodStart = new Date(subscriptionResult.data.currentPeriodStart * 1000);
      const stripePeriodEnd = new Date(subscriptionResult.data.currentPeriodEnd * 1000);
      
      // Check if the Stripe period is current (e.g., encompasses 'now' or 'referenceDate')
      // This check is important if KV data could be stale, though syncStripeDataToKV should keep it fresh.
      if (stripePeriodStart <= referenceDate && stripePeriodEnd >= referenceDate) {
        authoritativeBillingPeriodStart = stripePeriodStart;
        authoritativeBillingPeriodEnd = stripePeriodEnd;
        tier = (subscriptionResult.data.planId as SubscriptionTier) || "starter";
        console.log(`[initializeUserUsageAction] Using Stripe authoritative period for user ${userId}: ${authoritativeBillingPeriodStart.toISOString()} - ${authoritativeBillingPeriodEnd.toISOString()}`);
      } else {
        // Stripe data present but not for the current reference period, use calculated UTC month
        console.warn(`[initializeUserUsageAction] Stripe period for user ${userId} (${stripePeriodStart.toISOString()} - ${stripePeriodEnd.toISOString()}) does not cover reference date ${referenceDate.toISOString()}. Falling back to UTC month.`);
        authoritativeBillingPeriodStart = getUTCMonthStart(referenceDate);
        authoritativeBillingPeriodEnd = getUTCMonthEnd(referenceDate);
        // Tier might still be derivable from subscriptionResult if planId is there, even if period dates aren't current
        tier = (subscriptionResult.data.planId as SubscriptionTier) || "starter"; 
      }
    } else {
      // No active Stripe subscription or missing period data from KV store
      // Step 2: Check user's profile for membership tier as a fallback
      console.log(`[initializeUserUsageAction] No active Stripe subscription or period data for user ${userId}. Looking up profile membership.`);
      authoritativeBillingPeriodStart = getUTCMonthStart(referenceDate);
      authoritativeBillingPeriodEnd = getUTCMonthEnd(referenceDate);
      
      try {
        // Fetch user profile to get current membership tier
        const [profileData] = await db
          .select({ membership: profilesTable.membership })
          .from(profilesTable)
          .where(eq(profilesTable.userId, userId))
          .limit(1);
        
        if (profileData && profileData.membership) {
          tier = profileData.membership as SubscriptionTier;
          console.log(`[initializeUserUsageAction] Found membership tier in profile: ${tier}`);
        } else {
          // Tier defaults to starter if profile lookup fails
          console.log(`[initializeUserUsageAction] No membership tier found in profile. Using default starter tier.`);
          tier = "starter";
        }
      } catch (error) {
        console.error(`[initializeUserUsageAction] Error looking up profile membership for user ${userId}:`, error);
        // Default to starter tier if there's an error
        tier = "starter";
      }
    }
    
    const pagesLimit = RATE_LIMIT_TIERS[tier]?.pagesPerMonth || RATE_LIMIT_TIERS["starter"].pagesPerMonth;
    console.log(`[initializeUserUsageAction] User ${userId}, Tier: ${tier}, Pages Limit: ${pagesLimit}`);

    // Attempt to find an existing record for the current calendar month (UTC)
    // matching the authoritativeBillingPeriodStart's month.
    const [existingUsageForMonth] = await db
      .select()
      .from(userUsageTable)
      .where(
        and(
          eq(userUsageTable.userId, userId),
          sql<boolean>`DATE_TRUNC('month', ${userUsageTable.billingPeriodStart} AT TIME ZONE 'UTC') = DATE_TRUNC('month', ${authoritativeBillingPeriodStart.toISOString()} AT TIME ZONE 'UTC')`
        )
      )
      .orderBy(desc(userUsageTable.billingPeriodStart), desc(userUsageTable.updatedAt)) // Prefer latest start or update if (unlikely) duplicates
      .limit(1);

    let resultUsageRecord: SelectUserUsage | undefined;

    if (existingUsageForMonth) {
      console.log(`[initializeUserUsageAction] Found existing usage record for user ${userId} for month of ${authoritativeBillingPeriodStart.toISOString()}: ID ${existingUsageForMonth.id}`);
      // Record exists, update it if necessary
      const updates: Partial<InsertUserUsage> = {
        updatedAt: new Date(),
        // Normalize billingPeriodStart and billingPeriodEnd to authoritative values
        billingPeriodStart: authoritativeBillingPeriodStart,
        billingPeriodEnd: authoritativeBillingPeriodEnd,
        pagesLimit: pagesLimit,
        // CRITICAL: DO NOT include pagesProcessed here to preserve it.
      };

      // Only update if there are actual changes needed to avoid unnecessary writes
      if (
        existingUsageForMonth.billingPeriodStart.getTime() !== authoritativeBillingPeriodStart.getTime() ||
        existingUsageForMonth.billingPeriodEnd.getTime() !== authoritativeBillingPeriodEnd.getTime() ||
        existingUsageForMonth.pagesLimit !== pagesLimit
      ) {
        console.log(`[initializeUserUsageAction] Updating existing usage record ID ${existingUsageForMonth.id} for user ${userId}. New limit: ${pagesLimit}, New period: ${authoritativeBillingPeriodStart.toISOString()} - ${authoritativeBillingPeriodEnd.toISOString()}`);
        const [updatedRecord] = await db
          .update(userUsageTable)
          .set(updates)
          .where(eq(userUsageTable.id, existingUsageForMonth.id))
          .returning();
        resultUsageRecord = updatedRecord;
      } else {
        console.log(`[initializeUserUsageAction] No changes needed for existing usage record ID ${existingUsageForMonth.id} for user ${userId}.`);
        resultUsageRecord = existingUsageForMonth;
      }
      
      // Fallback in case returning() fails unexpectedly after a successful update
      if (!resultUsageRecord && (
        existingUsageForMonth.billingPeriodStart.getTime() !== authoritativeBillingPeriodStart.getTime() ||
        existingUsageForMonth.billingPeriodEnd.getTime() !== authoritativeBillingPeriodEnd.getTime() ||
        existingUsageForMonth.pagesLimit !== pagesLimit
      )) {
          console.warn(`[initializeUserUsageAction] Update operation for user ${userId} did not return a record. Using stale existingUsageForMonth as fallback after attempting update.`);
          // If an update was attempted but returned nothing, the existing record is now stale.
          // It's safer to re-fetch or consider it an error, but for now, we'll use the pre-update state.
          // A more robust solution might throw or re-fetch: resultUsageRecord = await db.select()...where(id)
          resultUsageRecord = { ...existingUsageForMonth, ...updates }; // Simulate the update locally for the return
      } else if (!resultUsageRecord) {
         resultUsageRecord = existingUsageForMonth;
      }


    } else {
      console.log(`[initializeUserUsageAction] No existing usage record found for user ${userId} for month of ${authoritativeBillingPeriodStart.toISOString()}. Creating new record.`);
      // No record exists for this calendar month, insert a new one
      const valuesToInsert: InsertUserUsage = {
        userId,
        billingPeriodStart: authoritativeBillingPeriodStart,
        billingPeriodEnd: authoritativeBillingPeriodEnd,
        pagesProcessed: 0, // New record starts with 0 pages processed
        pagesLimit,
        // createdAt will be set by DB default if configured, or manually: createdAt: new Date()
      };
      const [insertedRecord] = await db
        .insert(userUsageTable)
        .values(valuesToInsert)
        .returning();
      resultUsageRecord = insertedRecord;
      console.log(`[initializeUserUsageAction] Created new usage record ID ${resultUsageRecord?.id} for user ${userId}.`);
    }

    if (!resultUsageRecord) {
      console.error(`[initializeUserUsageAction] Upsert/Select operation did not yield a record for user ${userId}.`);
      return {
        isSuccess: false,
        message: "Failed to initialize or update user usage record.",
      };
    }
    
    return {
      isSuccess: true,
      message: "User usage record initialized/updated successfully",
      data: resultUsageRecord,
    };

  } catch (error) {
    console.error("Error initializing/updating user usage record:", error);
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Unknown error initializing/updating user usage"
    };
  }
}

/**
 * Get user usage for current billing period
 */
export async function getCurrentUserUsageAction(
  userId: string
): Promise<ActionState<SelectUserUsage>> {
  try {
    const now = new Date();
    console.log(`[getCurrentUserUsageAction] Validating usage for userId: ${userId}, reference date: ${now.toISOString()}`);

    // 1. Attempt to fetch an existing usage record covering "now"
    const [existingUsage] = await db
      .select()
      .from(userUsageTable)
      .where(
        and(
          eq(userUsageTable.userId, userId),
          lte(userUsageTable.billingPeriodStart, now),
          gte(userUsageTable.billingPeriodEnd, now)
        )
      )
      .orderBy(desc(userUsageTable.billingPeriodStart)) // Prefer the most recent period if multiple (shouldn't happen)
      .limit(1);

    // 2. Retrieve authoritative subscription data from KV / Stripe to validate period & limit
    const subscriptionResult = await getUserSubscriptionDataKVAction(userId);

    if (!subscriptionResult.isSuccess) {
      console.error(`[getCurrentUserUsageAction] Failed to retrieve subscription data for user ${userId}: ${subscriptionResult.message}`);
      // If we already have a usage record, return it (better than blocking the request)
      // but log that it might be stale or based on defaults.
      if (existingUsage) {
        console.warn(`[getCurrentUserUsageAction] Returning existing usage record ID ${existingUsage.id} for user ${userId} despite KV failure. Data might be stale.`);
        return {
          isSuccess: true,
          message: `Retrieved user usage with potentially stale subscription data (${subscriptionResult.message})`,
          data: existingUsage,
        };
      }
      // Otherwise propagate failure so caller can decide
      return {
        isSuccess: false,
        message: `Failed to get authoritative subscription data: ${subscriptionResult.message}`,
      };
    }

    // 3. Derive authoritative period & limits using the same logic as initializeUserUsageAction
    const referenceDate = now; // For clarity, using 'now' as the reference for period calculation
    const subData = subscriptionResult.data;
    let authoritativeStart: Date;
    let authoritativeEnd: Date;
    let authoritativeTier: SubscriptionTier = "starter"; // Default tier

    if (
      subData && // Ensure subData is not null/undefined
      subData.status === "active" &&
      subData.currentPeriodStart &&
      subData.currentPeriodEnd
    ) {
      const stripeStart = new Date(subData.currentPeriodStart * 1000);
      const stripeEnd = new Date(subData.currentPeriodEnd * 1000);

      // Check if the Stripe period is current (e.g., encompasses 'referenceDate')
      if (stripeStart <= referenceDate && stripeEnd >= referenceDate) {
        authoritativeStart = stripeStart;
        authoritativeEnd = stripeEnd;
        authoritativeTier = (subData.planId as SubscriptionTier) || "starter";
        console.log(`[getCurrentUserUsageAction] User ${userId}: Using Stripe authoritative period: ${authoritativeStart.toISOString()} - ${authoritativeEnd.toISOString()}, Tier: ${authoritativeTier}`);
      } else {
        // Stripe data present but not for the current reference period, fall back to calculated UTC month
        console.warn(`[getCurrentUserUsageAction] User ${userId}: Stripe period (${stripeStart.toISOString()} - ${stripeEnd.toISOString()}) does not cover reference date ${referenceDate.toISOString()}. Falling back to UTC month.`);
        authoritativeStart = getUTCMonthStart(referenceDate);
        authoritativeEnd = getUTCMonthEnd(referenceDate);
        
        try {
          // Fetch user profile to get current membership tier
          const [profileData] = await db
            .select({ membership: profilesTable.membership })
            .from(profilesTable)
            .where(eq(profilesTable.userId, userId))
            .limit(1);
          
          if (profileData && profileData.membership) {
            authoritativeTier = profileData.membership as SubscriptionTier;
            console.log(`[getCurrentUserUsageAction] Found membership tier in profile: ${authoritativeTier}`);
          } else {
            // Tier defaults to starter if profile lookup fails
            console.log(`[getCurrentUserUsageAction] No membership tier found in profile. Using default starter tier.`);
            authoritativeTier = "starter";
          }
        } catch (error) {
          console.error(`[getCurrentUserUsageAction] Error looking up profile membership for user ${userId}:`, error);
          // Default to starter tier if there's an error
          authoritativeTier = "starter";
        }
      }
    } else {
      // No active Stripe subscription or missing period data, fall back to calculated UTC month
      console.log(`[getCurrentUserUsageAction] User ${userId}: No active Stripe subscription or period data. Looking up profile membership.`);
      authoritativeStart = getUTCMonthStart(referenceDate);
      authoritativeEnd = getUTCMonthEnd(referenceDate);
      
      try {
        // Fetch user profile to get current membership tier
        const [profileData] = await db
          .select({ membership: profilesTable.membership })
          .from(profilesTable)
          .where(eq(profilesTable.userId, userId))
          .limit(1);
        
        if (profileData && profileData.membership) {
          authoritativeTier = profileData.membership as SubscriptionTier;
          console.log(`[getCurrentUserUsageAction] Found membership tier in profile: ${authoritativeTier}`);
        } else {
          // Tier defaults to starter if profile lookup fails
          console.log(`[getCurrentUserUsageAction] No membership tier found in profile. Using default starter tier.`);
          authoritativeTier = "starter";
        }
      } catch (error) {
        console.error(`[getCurrentUserUsageAction] Error looking up profile membership for user ${userId}:`, error);
        // Default to starter tier if there's an error
        authoritativeTier = "starter";
      }
    }

    const authoritativeLimit =
      RATE_LIMIT_TIERS[authoritativeTier]?.pagesPerMonth ?? // Use ?? for nullish coalescing
      RATE_LIMIT_TIERS["starter"].pagesPerMonth;
    console.log(`[getCurrentUserUsageAction] User ${userId}: Authoritative Tier: ${authoritativeTier}, Authoritative Limit: ${authoritativeLimit}`);

    // 4. Determine if we need to (re)initialize
    // Ensure existingUsage times are compared correctly (getTime())
    const needsRefresh =
      !existingUsage ||
      (existingUsage.billingPeriodStart instanceof Date && existingUsage.billingPeriodStart.getTime() !== authoritativeStart.getTime()) ||
      (existingUsage.billingPeriodEnd instanceof Date && existingUsage.billingPeriodEnd.getTime() !== authoritativeEnd.getTime()) ||
      existingUsage.pagesLimit !== authoritativeLimit;

    if (needsRefresh) {
      console.log(`[getCurrentUserUsageAction] Usage record for user ${userId} is out-of-date, missing, or limit differs. Triggering initializeUserUsageAction().`);
      console.log(`[getCurrentUserUsageAction] Details: Existing Record Present: ${!!existingUsage}`);
      if (existingUsage) {
        console.log(`[getCurrentUserUsageAction] Existing Start: ${existingUsage.billingPeriodStart?.toISOString()}, Authoritative Start: ${authoritativeStart.toISOString()}`);
        console.log(`[getCurrentUserUsageAction] Existing End: ${existingUsage.billingPeriodEnd?.toISOString()}, Authoritative End: ${authoritativeEnd.toISOString()}`);
        console.log(`[getCurrentUserUsageAction] Existing Limit: ${existingUsage.pagesLimit}, Authoritative Limit: ${authoritativeLimit}`);
      }
      // Pass the referenceDate (now) to initializeUserUsageAction to ensure it uses the same context
      // if it needs to calculate month start/end due to missing Stripe data.
      return initializeUserUsageAction(userId, { startDate: now });
    }

    // 5. Everything looks good – return existing record
    console.log(`[getCurrentUserUsageAction] Returning up-to-date usage record ID ${existingUsage.id} for user ${userId}.`);
    return {
      isSuccess: true,
      message: "Retrieved user usage successfully",
      data: existingUsage,
    };
  } catch (error) {
    console.error("[getCurrentUserUsageAction] Error getting user usage:", error);
    // Ensure a structured error response
    const errorMessage = error instanceof Error ? error.message : "Unknown error getting user usage";
    return {
      isSuccess: false,
      message: errorMessage,
    };
  }
}

/**
 * Update user usage record
 */
export async function updateUserUsageAction(
  userId: string,
  data: Partial<InsertUserUsage>,
  usageId?: string
): Promise<ActionState<SelectUserUsage>> {
  try {
    const now = new Date()
    console.log(`[updateUserUsageAction] userId: ${userId}, usageId: ${usageId}, data:`, data);
    
    // Always apply billing period check for absolute safety
    const dateClause = and(
      lte(userUsageTable.billingPeriodStart, now), // Billing period has started
      gte(userUsageTable.billingPeriodEnd, now)    // ...and has not ended yet
    );
    
    let whereClause;
    
    // If an explicit usageId is supplied, use it as the primary filter
    // BUT ALSO verify this is the current billing period
    if (usageId) {
      whereClause = and(
        eq(userUsageTable.id, usageId),
        eq(userUsageTable.userId, userId), // Security check
        dateClause // CRITICAL: Always verify this is the current period
      );
      console.log(`[updateUserUsageAction] Using ID-based filter with usageId: ${usageId} AND current period check`);
    } else {
      // Otherwise fall back to date-based filtering
      whereClause = and(
        eq(userUsageTable.userId, userId),
        dateClause
      );
      console.log(`[updateUserUsageAction] Using date-based filter as no usageId provided`);
    }
    
    console.log(`[updateUserUsageAction] Final whereClause:`, whereClause);
    
    // Find and update the usage record
    const [updated] = await db
      .update(userUsageTable)
      .set({
        ...data,
        updatedAt: now
      })
      .where(whereClause)
      .returning();
    
    console.log(`[updateUserUsageAction] Update result:`, 
      updated ? `ID: ${updated.id}, period: ${updated.billingPeriodStart.toISOString()} to ${updated.billingPeriodEnd.toISOString()}, processed: ${updated.pagesProcessed}` : 'No record updated');
    
    if (!updated) {
      return {
        isSuccess: false,
        message: "No usage record found for update"
      }
    }
    
    return {
      isSuccess: true,
      message: "User usage updated successfully",
      data: updated
    }
  } catch (error) {
    console.error("Error updating user usage:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Unknown error updating user usage"
    }
  }
}

/**
 * Check if user has remaining page quota for current billing period
 */
export async function checkUserQuotaAction(
  userId: string,
  requiredPages: number = 1
): Promise<ActionState<{ 
  hasQuota: boolean;
  remaining: number;
  usage: SelectUserUsage;
}>> {
  try {
    // In development environment, bypass quota check unless override is set
    if (process.env.NODE_ENV === 'development' && process.env.ENFORCE_QUOTAS !== 'true') {
      // Get current usage record for tracking purposes, but don't enforce limit
      const currentUsageResult = await getCurrentUserUsageAction(userId);
      
      // If no usage record is found, still proceed
      const usage = currentUsageResult.isSuccess ? currentUsageResult.data : {
        pagesProcessed: 0,
        pagesLimit: 999999,
      } as SelectUserUsage;
      
      // Always return true in development
      return {
        isSuccess: true,
        message: `Development mode: quota check bypassed`,
        data: {
          hasQuota: true,
          remaining: 999999, // Effectively unlimited
          usage
        }
      };
    }
    
    // Get current usage record
    const currentUsageResult = await getCurrentUserUsageAction(userId)
    
    if (!currentUsageResult.isSuccess) {
      return {
        isSuccess: false,
        message: currentUsageResult.message
      }
    }
    
    const usage = currentUsageResult.data
    const remaining = usage.pagesLimit - usage.pagesProcessed
    const hasQuota = remaining >= requiredPages
    
    return {
      isSuccess: true,
      message: hasQuota 
        ? `User has sufficient quota (${remaining} pages remaining)` 
        : `Quota exceeded (${remaining} pages remaining, ${requiredPages} required)`,
      data: {
        hasQuota,
        remaining,
        usage
      }
    }
  } catch (error) {
    console.error("Error checking user quota:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Unknown error checking quota"
    }
  }
}

/**
 * Increment pages processed count for a user
 */
export async function incrementPagesProcessedAction(
  userId: string,
  count: number = 1
): Promise<ActionState<SelectUserUsage>> {
  try {
    console.log(`[incrementPagesProcessedAction] Incrementing pages for userId: ${userId} by count: ${count}`);
    
    // Get current usage record first
    const currentUsageResult = await getCurrentUserUsageAction(userId)
    
    if (!currentUsageResult.isSuccess) {
      console.log(`[incrementPagesProcessedAction] Failed to get current usage: ${currentUsageResult.message}`);
      return currentUsageResult
    }
    
    const currentUsage = currentUsageResult.data
    console.log(`[incrementPagesProcessedAction] Current usage record:`, 
      `ID: ${currentUsage.id}, period: ${currentUsage.billingPeriodStart.toISOString()} to ${currentUsage.billingPeriodEnd.toISOString()}, 
      processed: ${currentUsage.pagesProcessed}, limit: ${currentUsage.pagesLimit}`);
    
    const newCount = currentUsage.pagesProcessed + count
    console.log(`[incrementPagesProcessedAction] New count will be: ${newCount}`);
    
    // Make sure this doesn't exceed the limit
    if (newCount > currentUsage.pagesLimit) {
      console.log(`[incrementPagesProcessedAction] Page limit exceeded. Limit: ${currentUsage.pagesLimit}, Attempted: ${newCount}`);
      return {
        isSuccess: false,
        message: "Page limit exceeded"
      }
    }
    
    console.log(`[incrementPagesProcessedAction] Updating usage record with ID: ${currentUsage.id} to set pagesProcessed: ${newCount}`);
    
    // Update the usage record using its specific ID
    return updateUserUsageAction(
      userId, 
      { pagesProcessed: newCount },
      currentUsage.id // Pass the ID to ensure only this record is updated
    )
  } catch (error) {
    console.error("Error incrementing pages processed:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Unknown error incrementing pages"
    }
  }
}
