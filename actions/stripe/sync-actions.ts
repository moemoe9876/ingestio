"use server";

import { getProfileByUserIdAction } from "@/actions/db/profiles-actions";
import { getCurrentUser } from "@/lib/auth-utils";
import { redis } from "@/lib/redis/client";
import { syncStripeDataToKV } from "@/lib/stripe/sync";
import { ActionState } from "@/types";
import { StripeCustomerDataKV, customerDataKey, userToCustomerKey } from "@/types/stripe-kv-types";

/**
 * Syncs subscription data immediately after a successful checkout.
 * Called by the success page to ensure the subscription is synced to KV store.
 */
export async function syncSubscriptionAfterSuccessAction(): Promise<ActionState<StripeCustomerDataKV>> {
  try {
    const userId = await getCurrentUser();
    const stripeCustomerId = await redis.get<string>(userToCustomerKey(userId));

    if (!stripeCustomerId) {
      console.error(`[Sync Success Action] Stripe Customer ID not found in Redis for user ${userId}`);
      // Optional: Could try fetching from DB here as another fallback
      return { 
        isSuccess: false, 
        message: "Stripe customer mapping not found. Please wait a moment or contact support." 
      };
    }

    console.log(`[Sync Success Action] Triggering sync for customer ${stripeCustomerId} (user ${userId})`);
    const syncedData = await syncStripeDataToKV(stripeCustomerId);

    return { 
      isSuccess: true, 
      message: "Subscription synced successfully.", 
      data: syncedData 
    };

  } catch (error) {
    console.error("[Sync Success Action] Error:", error);
    return { 
      isSuccess: false, 
      message: error instanceof Error ? error.message : "Failed to sync subscription." 
    };
  }
}

/**
 * Securely retrieves subscription data from Redis KV store for the current user.
 * Includes fallback logic if the data is not found in Redis.
 * 
 * Fallback order:
 * 1. Try to get data from Redis KV store using userId -> customerId mapping
 * 2. If not found, try to get customerId from user's profile in database
 * 3. If found in profile but not in Redis, trigger a sync from Stripe to Redis
 * 4. If all else fails, return a default 'none' status
 * 
 * @returns ActionState containing the user's subscription data or error
 */
export async function getUserSubscriptionDataKVAction(): Promise<ActionState<StripeCustomerDataKV>> {
  try {
    // Get the current authenticated user ID
    const userId = await getCurrentUser();
    console.log(`[Subscription Data] Retrieving subscription data for user ${userId}`);
    
    // Step 1: Try to get customerID from Redis KV store
    let stripeCustomerId = await redis.get<string>(userToCustomerKey(userId));
    let subscriptionData: StripeCustomerDataKV | null = null;
    
    // If we found the customer ID mapping in Redis
    if (stripeCustomerId) {
      console.log(`[Subscription Data] Found customer ID in Redis: ${stripeCustomerId}`);
      
      // Try to get the subscription data from Redis
      subscriptionData = await redis.get<StripeCustomerDataKV>(customerDataKey(stripeCustomerId));
      
      // If subscription data found, return it
      if (subscriptionData) {
        console.log(`[Subscription Data] Found subscription data in Redis for customer ${stripeCustomerId}`);
        return {
          isSuccess: true,
          message: "Subscription data retrieved from Redis KV store",
          data: subscriptionData
        };
      }
      
      // If we have customer ID but no subscription data, trigger a sync
      console.log(`[Subscription Data] Customer ID found but no subscription data in Redis. Triggering sync from Stripe.`);
      try {
        // Sync from Stripe to Redis
        subscriptionData = await syncStripeDataToKV(stripeCustomerId);
        return {
          isSuccess: true,
          message: "Subscription data synced from Stripe to Redis",
          data: subscriptionData
        };
      } catch (syncError) {
        console.error(`[Subscription Data] Error syncing from Stripe after Redis customerId hit but data miss:`, syncError);
        // Fall through to default if sync fails
      }
    } else {
      // Step 2: Fallback to database if customer ID not found in Redis
      console.log(`[Subscription Data] Customer ID not found in Redis. Checking database profile.`);
      const profileResult = await getProfileByUserIdAction(userId);
      
      if (profileResult.isSuccess && profileResult.data.stripeCustomerId) {
        stripeCustomerId = profileResult.data.stripeCustomerId;
        console.log(`[Subscription Data] Found customer ID in database: ${stripeCustomerId}`);
        
        // Store mapping in Redis for future lookups
        await redis.set(userToCustomerKey(userId), stripeCustomerId);
        
        // Try to sync from Stripe since it wasn't in Redis originally
        console.log(`[Subscription Data] Triggering sync from Stripe after finding customer ID in DB.`);
        try {
          subscriptionData = await syncStripeDataToKV(stripeCustomerId);
          return {
            isSuccess: true,
            message: "Subscription data retrieved from Stripe and cached in Redis",
            data: subscriptionData
          };
        } catch (syncError) {
          console.error(`[Subscription Data] Error syncing from Stripe after finding customer ID in database:`, syncError);
          // Fall through to default if sync fails
        }
      }
    }
    
    // Step 3: If we got here, we couldn't find valid subscription data or sync failed
    // Return a default "none" status
    console.log(`[Subscription Data] No valid subscription data found or sync failed for user ${userId}. Using default.`);
    const defaultData: StripeCustomerDataKV = { status: "none" };
    
    return {
      isSuccess: true,
      message: "No subscription data found or sync failed. Using default status.",
      data: defaultData
    };
    
  } catch (error) {
    console.error("[Subscription Data] General Error:", error);
    // Return a failed state with error message, but don't include data
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to retrieve subscription data"
    };
  }
} 