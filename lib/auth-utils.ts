/*
<ai_context>
Contains the general auth utils. auth() is being awaited
</ai_context>
*/

import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";



/**
 * Retrieves the user ID of the currently authenticated user.
 * Throws an error if the user is not authenticated.
 * @returns The user ID of the authenticated user
 */
export async function getCurrentUser(): Promise<string> {
  const authResult = await auth();
  const { userId } = authResult;
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return userId;
}

/**
 * Checks if a user is currently authenticated.
 * @returns True if the user is authenticated, false otherwise.
 */
export async function isUserAuthenticated(): Promise<boolean> {
  const authResult = await auth();
  const { userId } = authResult;
  return !!userId;
}

/**
 * Retrieves the full Clerk user object for the currently authenticated user.
 * Redirects to login if the user is not authenticated.
 */
export async function getAuthenticatedUser() {
  const user = await currentUser();
  
  if (!user) {
    redirect("/login");
  }
  
  return user;
}

/**
 * Gets user ID or redirects to login page.
 */
export async function getUserIdOrRedirect() {
  const authResult = await auth();
  const { userId } = authResult;
  
  if (!userId) {
    redirect("/login");
  }
  
  return userId;
}

/**
 * Gets user profile from database
 * Note: This is a placeholder - implement based on your actual schema
 */
export async function getUserProfile() {
  const authResult = await auth();
  const { userId } = authResult;
  
  if (!userId) {
    redirect("/login");
  }
  
  // This is a placeholder - implement based on your actual schema
  try {
    // const profile = await db.query.profiles.findFirst({
    //   where: eq(profiles.userId, userId)
    // });
    
    // if (!profile) {
    //   return null;
    // }
    
    // return profile;
    return {
      userId,
      // Add other profile fields as needed
    };
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
} 