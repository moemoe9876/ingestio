"use server"

import { getUserSubscriptionDataKVAction } from "@/actions/stripe/sync-actions"
import BatchUploadWizard from "@/components/batch/BatchUploadWizard"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { getUserIdOrRedirect } from "@/lib/auth-utils"
import { AlertCircle } from "lucide-react"

export default async function BatchUploadPage() {
  // Get user ID or redirect
  const userId = await getUserIdOrRedirect()
  
  // Get subscription data
  const subscriptionResult = await getUserSubscriptionDataKVAction()

  // If subscription data retrieval failed, show error
  if (!subscriptionResult.isSuccess) {
    return (
      <div className="container py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to retrieve subscription data: {subscriptionResult.message}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Pass subscription data to client component
  return (
    <BatchUploadWizard
      initialSubscriptionData={subscriptionResult.data}
    />
  )
}
