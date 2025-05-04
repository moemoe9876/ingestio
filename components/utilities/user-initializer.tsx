"use client"

import {
  getProfileAction,
  getProfileByUserIdAction
} from "@/actions/db/profiles-actions"
import { initializeUserUsageAction } from "@/actions/db/user-usage-actions"
import { useAuth } from "@clerk/nextjs"
import { useEffect, useState } from "react"

export function UserInitializer() {
  const { userId } = useAuth()
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    async function initializeUserProfile() {
      if (userId && !initialized) {
        try {
          console.log(`Starting initialization for user ${userId}`)
          
          // First, check if user has a profile
          const profileRes = await getProfileByUserIdAction(userId)
          
          if (!profileRes.isSuccess) {
            console.log(`Profile not found for user ${userId}, creating one...`)
            // Create profile if missing
            const createProfileRes = await getProfileAction({ userId })
            
            if (!createProfileRes.isSuccess) {
              console.error(`Failed to create profile for user ${userId}: ${createProfileRes.message}`)
              // Don't continue if profile creation failed
              return
            }
            
            console.log(`Profile created successfully for user ${userId}`)
          } else {
            console.log(`Profile found for user ${userId}`)
          }
          
          // Only attempt to initialize usage after confirming profile exists OR if it was just created
          // If profileRes was successful (profile already exists), we don't need to initialize usage here
          // as it should be handled by subscription webhooks or getCurrentUserUsageAction.
          if (!profileRes.isSuccess) {
            console.log(`Profile was just created for user ${userId}. Initializing usage...`)
            const usageRes = await initializeUserUsageAction(userId)
          
            if (usageRes.isSuccess) {
              console.log(`User usage initialized successfully for user ${userId}`)
            } else {
              console.error(`Failed to initialize usage for user ${userId}: ${usageRes.message}`)
            }
          } else {
            console.log(`Skipping usage initialization for user ${userId} as profile already exists.`);
          }
          
          setInitialized(true)
        } catch (error) {
          console.error(`Error initializing user profile for ${userId}:`, error)
        }
      }
    }

    initializeUserProfile()
  }, [userId, initialized])

  // This component doesn't render anything
  return null
} 