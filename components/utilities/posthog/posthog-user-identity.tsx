/*
<ai_context>
This client component identifies the user in PostHog.
</ai_context>
*/

"use client"

import { useUser } from "@clerk/nextjs"
import posthog from "posthog-js"
import { useEffect } from "react"

export function PostHogUserIdentity() {
  const { user } = useUser()

  useEffect(() => {
    if (user?.id) {
      // Identify the user in PostHog
      posthog.identify(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName,
        user_id: user.id
      })
    } else {
      // If no user is signed in, reset any previously identified user
      posthog.reset()
    }
  }, [user])

  return null
}
