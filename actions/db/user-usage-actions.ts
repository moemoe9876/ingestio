"use server"

/*
 * Server actions for managing user usage data
 */

import { db } from "@/db/db"
import { InsertUserUsage, SelectUserUsage, userUsageTable } from "@/db/schema"
import { RATE_LIMIT_TIERS } from "@/lib/rate-limiting/limiter"
import { ActionState } from "@/types"
import { and, eq, gte, lte } from "drizzle-orm"
import { getProfileByUserIdAction } from "./profiles-actions"

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
 */
export async function initializeUserUsageAction(
  userId: string
): Promise<ActionState<SelectUserUsage>> {
  try {
    // Calculate billing period dates (first to last day of current month)
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
      );
    
    if (!usage) {
      // No usage record found for current period - initialize one
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
  data: Partial<InsertUserUsage>
): Promise<ActionState<SelectUserUsage>> {
  try {
    const now = new Date()
    
    // Find and update the usage record that contains the current date
    const [updated] = await db
      .update(userUsageTable)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(userUsageTable.userId, userId),
          lte(userUsageTable.billingPeriodStart, now),
          gte(userUsageTable.billingPeriodEnd, now)
        )
      )
      .returning()
    
    if (!updated) {
      return {
        isSuccess: false,
        message: "No usage record found for current billing period"
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
 * Increment pages processed count for a user
 */
export async function incrementPagesProcessedAction(
  userId: string,
  count: number = 1
): Promise<ActionState<SelectUserUsage>> {
  try {
    // Get current usage record first
    const currentUsageResult = await getCurrentUserUsageAction(userId)
    
    if (!currentUsageResult.isSuccess) {
      return currentUsageResult
    }
    
    const currentUsage = currentUsageResult.data
    const newCount = currentUsage.pagesProcessed + count
    
    // Make sure this doesn't exceed the limit
    if (newCount > currentUsage.pagesLimit) {
      return {
        isSuccess: false,
        message: "Page limit exceeded"
      }
    }
    
    // Update the usage record
    return updateUserUsageAction(userId, {
      pagesProcessed: newCount
    })
  } catch (error) {
    console.error("Error incrementing pages processed:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Unknown error incrementing pages"
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
    // In development environment, bypass quota check
    if (process.env.NODE_ENV === 'development') {
      console.log('Development mode detected: Bypassing quota check');
      
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