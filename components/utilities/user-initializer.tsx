"use client"

import {
  getProfileByUserIdAction
} from "@/actions/db/profiles-actions"
import { initializeUserUsageAction } from "@/actions/db/user-usage-actions"
import { useAuth } from "@clerk/nextjs"
import { useEffect, useState } from "react"

export function UserInitializer() {
  const { userId } = useAuth()
  const [initialized, setInitialized] = useState(false)
  const [initializationAttempt, setInitializationAttempt] = useState(0)

  useEffect(() => {
    const MAX_ATTEMPTS = 3
    const RETRY_DELAY_MS = 1500 // Increased delay for webhook processing

    async function initializeUserProfile() {
      if (userId && !initialized && initializationAttempt < MAX_ATTEMPTS) {
        try {
          console.log(
            `Starting initialization for user ${userId}, attempt ${initializationAttempt + 1}`
          )

          // First, check if user has a profile
          const profileRes = await getProfileByUserIdAction(userId)

          if (profileRes.isSuccess && profileRes.data) {
            console.log(`Profile found for user ${userId}.`)
            
            // Profile exists, proceed to check/initialize usage
            // We check usage here to ensure it's set up, even if profile was created by webhook.
            // The initializeUserUsageAction should be idempotent or check if usage already exists.
            console.log(`Initializing/verifying usage for user ${userId}...`)
            const usageRes = await initializeUserUsageAction(userId) // This action should be idempotent

            if (usageRes.isSuccess) {
              console.log(
                `User usage initialized/verified successfully for user ${userId}`
              )
            } else {
              console.error(
                `Failed to initialize/verify usage for user ${userId}: ${usageRes.message}`
              )
            }
            setInitialized(true) // Mark as initialized
          } else {
            // Profile not found or error fetching
            console.warn(
              `Profile not found for user ${userId} on attempt ${initializationAttempt + 1}. Message: ${profileRes.message}. Will retry if attempts remain.`
            )
            
            // Increment attempt count and schedule a retry
            setInitializationAttempt(prev => prev + 1)
            if (initializationAttempt + 1 < MAX_ATTEMPTS) {
              // No direct retry with setTimeout here to avoid complex state in useEffect
              // The useEffect will re-run due to initializationAttempt state change.
            } else {
              console.error(
                `Failed to find profile for user ${userId} after ${MAX_ATTEMPTS} attempts. Please check Clerk webhook synchronization.`
              )
              // Optionally, still mark as initialized to prevent infinite loops if desired,
              // or leave it to retry on next mount/userId change if that's preferred.
              // For now, we'll stop retrying by not setting initialized and letting MAX_ATTEMPTS cap it.
            }
          }
        } catch (error) {
          console.error(
            `Error during initialization attempt ${initializationAttempt + 1} for user ${userId}:`,
            error
          )
          // Increment attempt count on error as well to prevent infinite loops on unexpected errors
          setInitializationAttempt(prev => prev + 1)
        }
      }
    }

    // Delay the first attempt slightly to give webhooks a better chance
    const timer = setTimeout(() => {
      initializeUserProfile()
    }, initializationAttempt === 0 ? 500 : RETRY_DELAY_MS); // Shorter delay for first, longer for retries

    return () => clearTimeout(timer); // Cleanup timer
  }, [userId, initialized, initializationAttempt]) // Add initializationAttempt to dependency array

  // This component doesn't render anything
  return null
} 