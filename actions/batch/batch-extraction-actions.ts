"use server";

import { checkUserQuotaAction } from "@/actions/db/user-usage-actions";
import { getUserSubscriptionDataKVAction } from "@/actions/stripe/sync-actions";
import { createRateLimiter, RATE_LIMIT_TIERS, SubscriptionTier } from "@/lib/rate-limiting";
import { ActionState } from "@/types";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";

const batchExtractionSchema = z.object({
  documentIds: z.array(z.string().uuid()),
  extractionPrompt: z.string().min(5).max(1000),
});

/**
 * Action to validate and queue a batch extraction job
 * This applies tier limits to batch size and checks for available quota
 */
export async function queueBatchExtractionAction(
  input: z.infer<typeof batchExtractionSchema>
): Promise<ActionState<{ batchId: string; queuedItems: number }>> {
  // Validate authentication
  const authResult = await auth();
  const { userId } = authResult;
  if (!userId) {
    return { isSuccess: false, message: "Unauthorized" };
  }

  try {
    // Validate input
    const parsedInput = batchExtractionSchema.safeParse(input);
    if (!parsedInput.success) {
      return {
        isSuccess: false,
        message: `Invalid input: ${parsedInput.error.message}`,
      };
    }

    const { documentIds, extractionPrompt } = parsedInput.data;
    const batchSize = documentIds.length;

    // Get user's subscription data to determine tier (source of truth)
    const subscriptionResult = await getUserSubscriptionDataKVAction();
    if (!subscriptionResult.isSuccess) {
      return {
        isSuccess: false,
        message: "Unable to determine user subscription tier"
      };
    }
    
    // Determine tier based on subscription status and planId
    let tier: SubscriptionTier = "starter";
    if (subscriptionResult.data.status === 'active' && subscriptionResult.data.planId) {
      tier = subscriptionResult.data.planId as SubscriptionTier;
    }
    
    const maxBatchSize = RATE_LIMIT_TIERS[tier].maxBatchSize;
    
    // Check if batch size exceeds the tier limit
    if (batchSize > maxBatchSize) {
      return {
        isSuccess: false,
        message: `Batch size of ${batchSize} exceeds the ${tier} tier limit of ${maxBatchSize} pages`
      };
    }
    
    // Check if user has enough quota for the batch
    const quotaResult = await checkUserQuotaAction(userId, batchSize);
    if (!quotaResult.isSuccess || !quotaResult.data.hasQuota) {
      return {
        isSuccess: false,
        message: `Insufficient page quota. You have ${quotaResult.data?.remaining || 0} pages remaining, but requested ${batchSize} pages`
      };
    }
    
    // Apply rate limiting for batch requests
    const rateLimiter = createRateLimiter(userId, tier, "batch-extraction");
    const { success, reset } = await rateLimiter.limit(userId);
    
    if (!success) {
      const retryAfter = Math.ceil((reset - Date.now()) / 1000);
      return {
        isSuccess: false,
        message: `Rate limit exceeded. Please try again in ${retryAfter} seconds`
      };
    }
    
    // Queue the batch job logic goes here
    // For now, we'll just return a success response
    // In a real implementation, you would:
    // 1. Create a batch job record in the database
    // 2. Queue individual document processing tasks
    // 3. Return the batch job ID for tracking
    
    const batchId = crypto.randomUUID();
    
    return {
      isSuccess: true,
      message: `Batch extraction job queued with ${batchSize} documents`,
      data: {
        batchId,
        queuedItems: batchSize
      }
    };
  } catch (error) {
    console.error("Error queueing batch extraction:", error);
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to queue batch extraction"
    };
  }
}

/**
 * Action to check the status of a batch extraction job
 */
export async function checkBatchStatusAction(
  batchId: string
): Promise<ActionState<{ 
  completed: number; 
  total: number; 
  status: 'pending' | 'processing' | 'completed' | 'failed' 
}>> {
  // Validate authentication
  const authResult = await auth();
  const { userId } = authResult;
  if (!userId) {
    return { isSuccess: false, message: "Unauthorized" };
  }
  
  try {
    // In a real implementation, you would:
    // 1. Query the batch job record from the database
    // 2. Check the status of individual document processing tasks
    // 3. Return the aggregated status
    
    // For now, we'll just return a mock response
    return {
      isSuccess: true,
      message: "Batch status retrieved",
      data: {
        completed: 0,
        total: 0,
        status: 'pending'
      }
    };
  } catch (error) {
    console.error("Error checking batch status:", error);
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to check batch status"
    };
  }
} 