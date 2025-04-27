// app/(dashboard)/dashboard/batch-upload/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUserSubscriptionDataKVAction } from "@/actions/stripe/sync-actions";
import {
  BATCH_PROCESSING_LIMIT_PLUS,
  BATCH_PROCESSING_LIMIT_GROWTH,
} from "@/lib/config/subscription-plans";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StripeSubscriptionData } from "@/types/stripe-kv-types"; // Corrected type import

export default function BatchUploadPage() {
  const router = useRouter();
  const [subscriptionData, setSubscriptionData] = useState<StripeSubscriptionData | null>(null); // Corrected type usage
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubscription = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getUserSubscriptionDataKVAction();
        if (!result.isSuccess) { // Check isSuccess instead of error
          throw new Error(result.message); // Use message for error
        }
        // getUserSubscriptionDataKVAction returns ActionState<StripeSubscriptionData | { status: 'none', ... }>
        // Set state only if data represents an actual subscription
        if (result.data && 'planId' in result.data) {
          setSubscriptionData(result.data);
        } else {
          setSubscriptionData(null);
        }
      } catch (err) {
        console.error("Failed to fetch subscription data:", err);
        setError(err instanceof Error ? err.message : "An unknown error occurred.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscription();
  }, []);

  const canAccess =
    subscriptionData &&
    (subscriptionData.status === "active" || subscriptionData.status === "trialing") &&
    (subscriptionData.planId === "plus" || subscriptionData.planId === "growth");

  const tierLimit = subscriptionData?.planId === "plus"
    ? BATCH_PROCESSING_LIMIT_PLUS
    : subscriptionData?.planId === "growth"
    ? BATCH_PROCESSING_LIMIT_GROWTH
    : 0;

  if (isLoading) {
    return (
      <div className="space-y-4 p-4 md:p-8">
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-8">
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error Fetching Subscription</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!canAccess) {
    // Option 1: Redirect (uncomment if preferred)
    // useEffect(() => {
    //   if (!isLoading && !canAccess) {
    //     router.push('/dashboard/billing'); // Or another appropriate page
    //   }
    // }, [isLoading, canAccess, router]);
    // return null; // Or a loading indicator while redirecting

    // Option 2: Show Access Denied Message
    return (
      <div className="p-4 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              Batch document processing is available for Plus and Growth tier subscribers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Your current plan does not support this feature, or your subscription is not active.</p>
            {/* TODO: Add a button/link to the billing/upgrade page */}
            {/* <Button onClick={() => router.push('/dashboard/billing')}>Upgrade Plan</Button> */}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main page content for eligible users
  return (
    <div className="space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold">Batch Document Upload</h1>
        <p className="text-muted-foreground">
          Upload multiple documents for automated data extraction. Your current plan
          ({subscriptionData?.planId}) allows up to {tierLimit} documents per batch.
        </p>
      </div>

      {/* Placeholder for the rest of the UI (File Uploader, Form, etc.) */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Your Documents</CardTitle>
          <CardDescription>Select files and provide an extraction prompt.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Batch File Uploader and Form will go here (Steps 8.1.2 & 8.1.3).</p>
          {/* TODO: Integrate BatchFileUpload component */}
          {/* TODO: Add form fields for batch name (optional) and prompt */}
          {/* TODO: Add submit button */}
        </CardContent>
      </Card>
    </div>
  );
}
