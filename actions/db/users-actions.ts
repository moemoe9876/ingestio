"use server"

import { db } from "@/db/db"
import { InsertUser, SelectUser, usersTable } from "@/db/schema/users-schema"
import { trackServerEvent } from "@/lib/analytics/server"
import { getCurrentUser } from "@/lib/auth-utils"
import { ActionState } from "@/types/server-action-types"
import { eq } from "drizzle-orm"

/**
 * Gets a user by their user ID
 * 
 * @internal This is an internal function used by server components and other actions.
 * It should NOT be exposed directly to client components.
 */
export async function getUserByIdAction(userId: string): Promise<SelectUser | undefined> {
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.userId, userId))
      .limit(1)
    
    return user
  } catch (error) {
    console.error("Error getting user by ID:", error)
    throw new Error("Failed to get user")
  }
}

/**
 * Gets a user by their email
 * 
 * @internal This is an internal function used by server components and other actions.
 * It should NOT be exposed directly to client components.
 */
export async function getUserByEmailAction(email: string): Promise<SelectUser | undefined> {
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1)
    
    return user
  } catch (error) {
    console.error("Error getting user by email:", error)
    throw new Error("Failed to get user")
  }
}

/**
 * Gets the current authenticated user's data
 * @public Safe to use from client components
 */
export async function getCurrentUserDataAction(): Promise<ActionState<SelectUser>> {
  try {
    // Get current user ID
    const userId = await getCurrentUser();
    
    // Fetch user from database
    const user = await getUserByIdAction(userId);
    
    if (!user) {
      return { 
        isSuccess: false, 
        message: "User not found in database" 
      };
    }
    
    return {
      isSuccess: true,
      message: "User data retrieved successfully",
      data: user
    };
  } catch (error) {
    console.error("Error retrieving current user data:", error);
    return { 
      isSuccess: false, 
      message: "Failed to retrieve user data" 
    };
  }
}

/**
 * ADMIN ONLY: Updates a user's information without authentication checks
 * 
 * @internal This function should only be used in admin contexts or internal webhooks
 * DO NOT expose this directly to client components or public API endpoints
 */
export async function updateUserAction(
  userId: string,
  data: Partial<Omit<InsertUser, "userId" | "createdAt" | "updatedAt">>
): Promise<void> {
  try {
    await db
      .update(usersTable)
      .set(data)
      .where(eq(usersTable.userId, userId))
  } catch (error) {
    console.error("Error updating user:", error)
    throw new Error("Failed to update user")
  }
}

/**
 * ADMIN ONLY: Creates a new user without authentication checks
 * 
 * @internal This function should only be used in admin contexts or internal webhooks
 * DO NOT expose this directly to client components or public API endpoints
 */
export async function createUserAction(
  data: InsertUser
): Promise<void> {
  try {
    await db.insert(usersTable).values(data)
  } catch (error) {
    console.error("Error creating user:", error)
    throw new Error("Failed to create user")
  }
}

/**
 * ADMIN ONLY: Deletes a user without authentication checks
 * 
 * @internal This function should only be used in admin contexts or internal webhooks
 * DO NOT expose this directly to client components or public API endpoints
 */
export async function deleteUserAction(userId: string): Promise<void> {
  try {
    await db
      .delete(usersTable)
      .where(eq(usersTable.userId, userId))
  } catch (error) {
    console.error("Error deleting user:", error)
    throw new Error("Failed to delete user")
  }
}

/**
 * Updates a user's identity information with proper authentication
 * Only allows updating specific user identity fields
 * 
 * @public Safe to use from client components
 */
export async function updateUserIdentityAction(
  userId: string,
  data: {
    fullName?: string,
    avatarUrl?: string,
    metadata?: Record<string, any>
  }
): Promise<ActionState<SelectUser>> {
  try {
    // Get current user ID to ensure user can only update their own information
    const currentUserId = await getCurrentUser();
    
    // Ensure user can only update their own information
    if (userId !== currentUserId) {
      return { 
        isSuccess: false, 
        message: "You can only update your own user information"
      };
    }
    
    // Only extract allowed fields to prevent modifying sensitive data
    const allowedData: Partial<InsertUser> = {};
    
    if (data.fullName !== undefined) allowedData.fullName = data.fullName;
    if (data.avatarUrl !== undefined) allowedData.avatarUrl = data.avatarUrl;
    if (data.metadata !== undefined) allowedData.metadata = data.metadata;
    
    // Update the user
    const [updatedUser] = await db
      .update(usersTable)
      .set(allowedData)
      .where(eq(usersTable.userId, userId))
      .returning();
    
    if (!updatedUser) {
      return { isSuccess: false, message: "User not found" };
    }
    
    // Track the user update for analytics
    await trackServerEvent(
      "user_profile_updated",
      userId,
      { 
        updatedFields: Object.keys(allowedData)
      }
    );
    
    return {
      isSuccess: true,
      message: "User information updated successfully",
      data: updatedUser
    };
  } catch (error) {
    console.error("Error updating user identity:", error);
    return { 
      isSuccess: false, 
      message: "Failed to update user information"
    };
  }
} 