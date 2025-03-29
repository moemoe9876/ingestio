"use client"

import {
    createProfileAction,
    getProfileByUserIdAction
} from "@/actions/db/profiles-actions"
import { useAuth } from "@clerk/nextjs"
import { useEffect, useState } from "react"

export function UserInitializer() {
  const { userId } = useAuth()
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    async function initializeUserProfile() {
      if (userId && !initialized) {
        try {
          const profileRes = await getProfileByUserIdAction(userId)
          if (!profileRes.isSuccess) {
            await createProfileAction({ userId })
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