"use server"

/*
 * Server actions for managing user usage data
 */

import { db } from "@/db/db"
import { InsertUserUsage, SelectUserUsage, userUsageTable } from "@/db/schema"
import { ActionState } from "@/types"
import { and, eq, gte, lte } from "drizzle-orm"

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
 * Get user usage for current billing period
 */
export async function getCurrentUserUsageAction(
  userId: string
): Promise<ActionState<SelectUserUsage>> {
  try {
    const now = new Date()
    
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
    
    if (!usage) {
      return {
        isSuccess: false,
        message: "No usage record found for current billing period"
      }
    }
    
    return {
      isSuccess: true,
      message: "Retrieved user usage successfully",
      data: usage
    }
  } catch (error) {
    console.error("Error getting user usage:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Unknown error getting user usage"
    }
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