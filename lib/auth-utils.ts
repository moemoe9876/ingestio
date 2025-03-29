import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

// Get the current authenticated user
export async function getAuthenticatedUser() {
  const user = await currentUser();
  
  if (!user) {
    redirect("/login");
  }
  
  return user;
}

// Get user ID or redirect
export async function getUserIdOrRedirect() {
  const { userId } = auth();
  
  if (!userId) {
    redirect("/login");
  }
  
  return userId;
}

// Get user profile from database
export async function getUserProfile() {
  const { userId } = auth();
  
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