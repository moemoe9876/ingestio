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
          // First, check if user has a profile
          const profileRes = await getProfileByUserIdAction(userId)
          
          if (!profileRes.isSuccess) {
            // Create profile if missing
            await getProfileAction({ userId })
            console.log("User profile created successfully")
          }
          
          // Then initialize usage records
          const usageRes = await initializeUserUsageAction(userId)
          if (usageRes.isSuccess) {
            console.log("User usage initialized successfully")
          }
          
          setInitialized(true)
        } catch (error) {
          console.error("Error initializing user profile:", error)
        }
      }
    }

    initializeUserProfile()
  }, [userId, initialized])

  // This component doesn't render anything
  return null
} 