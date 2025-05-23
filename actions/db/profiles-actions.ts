/*
<ai_context>
Contains server actions related to profiles in the DB.
</ai_context>
*/

"use server"

import { db } from "@/db/db"
import {
    InsertProfile,
    membershipEnum,
    profilesTable,
    SelectProfile
} from "@/db/schema/profiles-schema"
import { trackServerEvent } from "@/lib/analytics/server"
import { getCurrentUser } from "@/lib/auth/utils"
import { ActionState } from "@/types/server-action-types"
import { eq } from "drizzle-orm"

// Define analytics events constants here since they might not be available in a proper format
const ANALYTICS_EVENTS = {
  SUBSCRIPTION_CHANGED: "subscription_changed"
}

export async function getProfileAction(
  data: InsertProfile
): Promise<ActionState<SelectProfile>> {
  try {
    const [newProfile] = await db.insert(profilesTable).values(data).returning()
    return {
      isSuccess: true,
      message: "Profile created successfully",
      data: newProfile
    }
  } catch (error) {
    console.error("Error creating profile:", error)
    return { isSuccess: false, message: "Failed to create profile" }
  }
}

export async function getProfileByUserIdAction(
  userId: string
): Promise<ActionState<SelectProfile>> {
  try {
    const profile = await db.query.profiles.findFirst({
      where: eq(profilesTable.userId, userId)
    })
    if (!profile) {
      return { isSuccess: false, message: "Profile not found" }
    }

    return {
      isSuccess: true,
      message: "Profile retrieved successfully",
      data: profile
    }
  } catch (error) {
    console.error("Error getting profile by user id", error)
    return { isSuccess: false, message: "Failed to get profile" }
  }
}

export async function updateProfileAction(
  userId: string,
  data: Partial<InsertProfile>
): Promise<ActionState<SelectProfile>> {
  try {
    const [updatedProfile] = await db
      .update(profilesTable)
      .set(data)
      .where(eq(profilesTable.userId, userId))
      .returning()

    if (!updatedProfile) {
      return { isSuccess: false, message: "Profile not found to update" }
    }

    return {
      isSuccess: true,
      message: "Profile updated successfully",
      data: updatedProfile
    }
  } catch (error) {
    console.error("Error updating profile:", error)
    return { isSuccess: false, message: "Failed to update profile" }
  }
}

export async function updateProfileByStripeCustomerIdAction(
  stripeCustomerId: string,
  data: Partial<InsertProfile>
): Promise<ActionState<SelectProfile>> {
  try {
    const [updatedProfile] = await db
      .update(profilesTable)
      .set(data)
      .where(eq(profilesTable.stripeCustomerId, stripeCustomerId))
      .returning()

    if (!updatedProfile) {
      return {
        isSuccess: false,
        message: "Profile not found by Stripe customer ID"
      }
    }

    return {
      isSuccess: true,
      message: "Profile updated by Stripe customer ID successfully",
      data: updatedProfile
    }
  } catch (error) {
    console.error("Error updating profile by stripe customer ID:", error)
    return {
      isSuccess: false,
      message: "Failed to update profile by Stripe customer ID"
    }
  }
}

export async function deleteProfileAction(
  userId: string
): Promise<ActionState<void>> {
  try {
    await db.delete(profilesTable).where(eq(profilesTable.userId, userId))
    return {
      isSuccess: true,
      message: "Profile deleted successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error deleting profile:", error)
    return { isSuccess: false, message: "Failed to delete profile" }
  }
}

/**
 * Updates subscription-related fields in a user's profile
 * Restricted to specific fields related to subscriptions
 */
export async function updateSubscriptionProfileAction(
  userId: string,
  data: {
    membership?: typeof membershipEnum.enumValues[number],
    stripeCustomerId?: string,
    stripeSubscriptionId?: string
  }
): Promise<ActionState<SelectProfile>> {
  try {
    // Get current user ID to ensure user can only update their own profile
    const currentUserId = await getCurrentUser();
    
    // Ensure user can only update their own profile
    if (userId !== currentUserId) {
      return { 
        isSuccess: false, 
        message: "You can only update your own profile"
      };
    }
    
    // Only extract allowed fields to prevent modifying sensitive data
    const allowedData: Partial<InsertProfile> = {};
    
    if (data.membership) allowedData.membership = data.membership;
    if (data.stripeCustomerId) allowedData.stripeCustomerId = data.stripeCustomerId;
    if (data.stripeSubscriptionId) allowedData.stripeSubscriptionId = data.stripeSubscriptionId;
    
    // Update the profile
    const [updatedProfile] = await db
      .update(profilesTable)
      .set(allowedData)
      .where(eq(profilesTable.userId, userId))
      .returning();
    
    if (!updatedProfile) {
      return { isSuccess: false, message: "Profile not found" };
    }
    
    // Track the profile update for analytics
    await trackServerEvent(
      ANALYTICS_EVENTS.SUBSCRIPTION_CHANGED,
      userId,
      { 
        membership: data.membership,
        hasStripeCustomerId: !!data.stripeCustomerId,
        hasStripeSubscriptionId: !!data.stripeSubscriptionId
      }
    );
    
    return {
      isSuccess: true,
      message: "Subscription profile updated successfully",
      data: updatedProfile
    };
  } catch (error) {
    console.error("Error updating subscription profile:", error);
    return { 
      isSuccess: false, 
      message: "Failed to update subscription profile"
    };
  }
}

/**
 * Migration helper: Update any profiles with 'free' membership to 'starter'
 * This is for database compatibility with the membership enum
 */
export async function migrateFreeMembershipsToStarterAction(): Promise<ActionState<{ count: number }>> {
  try {
    // This approach won't work directly because Drizzle enforces the enum
    // In a real app, you would need a database migration script
    // For now, we'll just return a message suggesting how to fix this
    
    console.log('Please run a direct database query to fix the enum values:');
    console.log('UPDATE profiles SET membership = \'starter\' WHERE membership = \'free\';');
    
    return {
      isSuccess: true,
      message: "Cannot automatically migrate. Please run a direct database query.",
      data: { count: 0 }
    };
  } catch (error) {
    console.error("Error migrating free memberships:", error);
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Unknown error during migration"
    };
  }
}

/**
 * Get a profile by Stripe customer ID without updating it
 */
export async function getProfileByStripeCustomerIdAction(
  stripeCustomerId: string
): Promise<ActionState<SelectProfile>> {
  try {
    const profile = await db.query.profiles.findFirst({
      where: eq(profilesTable.stripeCustomerId, stripeCustomerId)
    })
    
    if (!profile) {
      return {
        isSuccess: false,
        message: "Profile not found by Stripe customer ID"
      }
    }

    return {
      isSuccess: true,
      message: "Profile retrieved by Stripe customer ID successfully",
      data: profile
    }
  } catch (error) {
    console.error("Error getting profile by stripe customer ID:", error)
    return {
      isSuccess: false,
      message: "Failed to get profile by Stripe customer ID"
    }
  }
}
