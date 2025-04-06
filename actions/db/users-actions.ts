"use server"

import { db } from "@/db/db"
import { InsertUser, SelectUser, usersTable } from "@/db/schema/users-schema"
import { eq } from "drizzle-orm"

/**
 * Gets a user by their user ID
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
 * Updates a user's information
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
 * Creates a new user
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
 * Deletes a user
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