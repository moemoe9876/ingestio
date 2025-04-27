"use server"

/*
 * Server actions for managing user usage data
 */

import { getUserSubscriptionDataKVAction } from "@/actions/stripe/sync-actions";
import { db } from "@/db/db";
import { InsertUserUsage, SelectUserUsage, userUsageTable } from "@/db/schema";
import { RATE_LIMIT_TIERS, SubscriptionTier } from "@/lib/rate-limiting/limiter";
import { ActionState } from "@/types";
import { and, desc, eq, gte, lte } from "drizzle-orm";

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
    endDate?: Date;
  }
): Promise<ActionState<SelectUserUsage>> {
  try {
    // Calculate billing period dates
    // Use provided dates if available, otherwise use first to last day of current month
    const now = new Date();
    const billingPeriodStart = options?.startDate || new Date(now.getFullYear(), now.getMonth(), 1);
    const billingPeriodEnd = options?.endDate || new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    // First check if a record already exists for this billing period
    const existingUsage = await db
      .select()
      .from(userUsageTable)
      .where(
        and(
          eq(userUsageTable.userId, userId),
          eq(userUsageTable.billingPeriodStart, billingPeriodStart)
        )
      )
      .limit(1);
    
    // If a record already exists, return it
    if (existingUsage.length > 0) {
      return {
        isSuccess: true,
        message: "User usage record already exists",
        data: existingUsage[0]
      };
    }
    
    // Get user's subscription data from KV store (source of truth)
    const subscriptionResult = await getUserSubscriptionDataKVAction();
    
    // *** ADDED CHECK: Fail early if KV lookup fails ***
    if (!subscriptionResult.isSuccess) {
      console.error(`[initializeUserUsageAction] Failed to retrieve subscription data for user ${userId}: ${subscriptionResult.message}`);
      // Return a specific error indicating the KV failure prevented initialization
      return {
        isSuccess: false,
        message: `Failed to initialize usage: ${subscriptionResult.message}`
      };
    }
    
    // Determine tier based on subscription status and planId
    let tier: SubscriptionTier = "starter";
    if (subscriptionResult.data.status === 'active' && subscriptionResult.data.planId) {
      tier = subscriptionResult.data.planId as SubscriptionTier;
    }
    
    // Get page limit for tier
    const pagesLimit = RATE_LIMIT_TIERS[tier]?.pagesPerMonth || 25;
    
    // Create new usage record
    const [newUsage] = await db.insert(userUsageTable).values({
      userId,
      billingPeriodStart,
      billingPeriodEnd,
      pagesProcessed: 0,
      pagesLimit,
      createdAt: now,
      updatedAt: now
    }).returning();
    
    return {
      isSuccess: true,
      message: "User usage record initialized successfully",
      data: newUsage
    };
  } catch (error) {
    console.error("Error initializing user usage record:", error);
    
    // Attempt to retrieve the record if it was a duplicate key error
    // This handles race conditions where another request created the record
    // between our check and insert
    if (error instanceof Error && error.message.includes('duplicate key')) {
      try {
        const now = new Date();
        const billingPeriodStart = options?.startDate || new Date(now.getFullYear(), now.getMonth(), 1);
        
        const [existingUsage] = await db
          .select()
          .from(userUsageTable)
          .where(
            and(
              eq(userUsageTable.userId, userId),
              eq(userUsageTable.billingPeriodStart, billingPeriodStart)
            )
          )
          .limit(1);
          
        if (existingUsage) {
          return {
            isSuccess: true,
            message: "Retrieved existing user usage record",
            data: existingUsage
          };
        }
      } catch (secondaryError) {
        console.error("Error retrieving existing usage record:", secondaryError);
      }
    }
    
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Unknown error initializing user usage"
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
    console.log(`[getCurrentUserUsageAction] Looking for usage record for userId: ${userId}, current date: ${now.toISOString()}`);
    
    // Find usage record that contains the current date
    const [usage] = await db
      .select()
      .from(userUsageTable)
      .where(
        and(
          eq(userUsageTable.userId, userId),
          lte(userUsageTable.billingPeriodStart, now),
          gte(userUsageTable.billingPeriodEnd, now)
        )
      )
      // If multiple overlapping records exist (e.g., after mid-period subscription upgrade),
      // choose the one with the most recent billingPeriodStart to ensure we always
      // pick the record that reflects the **current** active subscription tier.
      .orderBy(desc(userUsageTable.billingPeriodStart))
      .limit(1);
    
    console.log(`[getCurrentUserUsageAction] Found usage record:`, usage ? 
      `ID: ${usage.id}, period: ${usage.billingPeriodStart.toISOString()} to ${usage.billingPeriodEnd.toISOString()}, processed: ${usage.pagesProcessed}, limit: ${usage.pagesLimit}` : 
      'No record found');
    
    if (!usage) {
      // No usage record found for current period - initialize one
      console.log(`[getCurrentUserUsageAction] No current usage record found, initializing...`);
      return initializeUserUsageAction(userId);
    }
    
    return {
      isSuccess: true,
      message: "Retrieved user usage successfully",
      data: usage
    };
  } catch (error) {
    console.error("Error getting user usage:", error);
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Unknown error getting user usage"
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
    
    console.log(`[updateUserUsageAction] Update result:`, updated);
    
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
