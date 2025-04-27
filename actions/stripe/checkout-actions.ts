"use server"

/*
 * Server actions for Stripe checkout functionality
 */

import { getProfileByUserIdAction, updateProfileAction } from "@/actions/db/profiles-actions"
import { getUserByIdAction } from "@/actions/db/users-actions"
import { PlanId, getPlanById } from "@/lib/config/subscription-plans"
import { redis } from "@/lib/redis/client"
import {
  createBillingPortalSession,
  createCheckoutSession
} from "@/lib/stripe"
import { createStripeCustomer } from "@/lib/stripe/config"
import { ActionState } from "@/types"
import { userToCustomerKey } from "@/types/stripe-kv-types"

/**
 * Create a Stripe checkout session for subscription purchase
 */
export async function createCheckoutSessionAction(
  userId: string,
  planId: PlanId,
  returnUrl?: string
): Promise<ActionState<{ sessionId: string; url: string }>> {
  try {
    if (!userId) {
      return {
        isSuccess: false,
        message: "User ID is required"
      }
    }
    
    if (!planId) {
      return {
        isSuccess: false,
        message: "Plan ID is required"
      }
    }
    
    // Validate the plan exists
    const plan = getPlanById(planId)
    if (!plan) {
      return {
        isSuccess: false,
        message: `Invalid plan: ${planId}`
      }
    }
    
    // Check if this is a paid plan
    if (plan.priceMonthly === 0) {
      return {
        isSuccess: false,
        message: "Cannot create checkout session for starter plan"
      }
    }
    
    // Get user to get email
    const user = await getUserByIdAction(userId)
    if (!user) {
      return {
        isSuccess: false,
        message: "User not found"
      }
    }
    
    // 1. Get stripeCustomerId from KV store (Primary)
    let stripeCustomerId = await redis.get<string>(userToCustomerKey(userId))
    
    // 2. Fallback: Get from DB if not in KV
    if (!stripeCustomerId) {
      const profileResult = await getProfileByUserIdAction(userId)
      
      if (profileResult.isSuccess && profileResult.data.stripeCustomerId) {
        stripeCustomerId = profileResult.data.stripeCustomerId
        // Store in KV for future lookups
        await redis.set(userToCustomerKey(userId), stripeCustomerId)
        console.log(`[Checkout] Found customerId ${stripeCustomerId} in DB, cached in Redis.`)
      }
    }
    
    // 3. Create if doesn't exist
    if (!stripeCustomerId) {
      if (!user.email) {
        return {
          isSuccess: false,
          message: "User email not found, cannot create Stripe customer."
        }
      }
      
      console.log(`[Checkout] No Stripe customer found for userId ${userId}. Creating new customer...`)
      const newCustomer = await createStripeCustomer(
        user.email, 
        user.fullName ?? undefined, 
        { userId: userId }
      ) // Pass userId in metadata
      
      stripeCustomerId = newCustomer.id
      
      // Store mapping in KV (Primary)
      await redis.set(userToCustomerKey(userId), stripeCustomerId)
      
      // Update DB profile (Secondary/Denormalization)
      await updateProfileAction(userId, { stripeCustomerId: stripeCustomerId })
      console.log(`[Checkout] Created new Stripe customer ${stripeCustomerId} and mapped to userId ${userId}.`)
    }
    
    // 4. Create Checkout Session with the customerId
    const successUrl = `${process.env.NEXT_PUBLIC_APP_URL}/stripe/success?session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?tab=billing`
    
    // Create checkout session
    const session = await createCheckoutSession({
      planId,
      userId,
      customerId: stripeCustomerId,
      customerEmail: user.email,
      successUrl,
      cancelUrl
    })
    
    return {
      isSuccess: true,
      message: "Checkout session created successfully",
      data: {
        sessionId: session.id,
        url: session.url as string
      }
    }
  } catch (error) {
    console.error("Error creating checkout session:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Unknown error creating checkout session"
    }
  }
}

/**
 * Create a Stripe billing portal session for managing subscriptions
 * Can accept either a userId or customerId directly
 */
export async function createBillingPortalSessionAction(
  idParam: string,
  returnUrl?: string
): Promise<ActionState<{ url: string }>> {
  try {
    console.log(`[BillingPortal] Called with idParam: ${idParam}, returnUrl: ${returnUrl}`);
    
    if (!idParam) {
      console.error('[BillingPortal] No ID parameter provided');
      return {
        isSuccess: false,
        message: "User ID or Customer ID is required"
      }
    }
    
    let customerId = idParam;
    
    // If this looks like a userId (has user_ prefix) and not a Stripe customer ID (has cus_ prefix),
    // then we need to look up the customer ID
    if (idParam.startsWith('user_') && !idParam.startsWith('cus_')) {
      console.log(`[BillingPortal] ID param appears to be a userId, looking up corresponding customer ID...`);
      // Get user profile to get Stripe customer ID
      const profileResult = await getProfileByUserIdAction(idParam)
      console.log(`[BillingPortal] Profile lookup result:`, profileResult);
      
      if (!profileResult.isSuccess) {
        console.error(`[BillingPortal] Failed to get profile for user ${idParam}: ${profileResult.message}`);
        return {
          isSuccess: false,
          message: `Failed to get user profile: ${profileResult.message}`
        }
      }
      
      customerId = profileResult.data?.stripeCustomerId || '';
      console.log(`[BillingPortal] Found customer ID: ${customerId}`);
      
      if (!customerId) {
        console.error(`[BillingPortal] No customer ID found for user ${idParam}`);
        return {
          isSuccess: false,
          message: "User does not have a Stripe customer ID"
        }
      }
    }
    
    // Create portal URL with optional return URL
    const portalReturnUrl = returnUrl 
      ? `${process.env.NEXT_PUBLIC_APP_URL}${returnUrl}`
      : `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
    
    console.log(`[BillingPortal] Creating portal session for customer ${customerId} with return URL: ${portalReturnUrl}`);
    
    // Create billing portal session with the customerId
    try {
      const session = await createBillingPortalSession(
        customerId,
        portalReturnUrl
      )
      
      console.log(`[BillingPortal] Successfully created session with URL: ${session.url}`);
      
      return {
        isSuccess: true,
        message: "Billing portal session created successfully",
        data: {
          url: session.url
        }
      }
    } catch (stripeError) {
      console.error(`[BillingPortal] Stripe error creating billing portal:`, stripeError);
      return {
        isSuccess: false,
        message: stripeError instanceof Error ? `Stripe error: ${stripeError.message}` : "Unknown Stripe error"
      }
    }
  } catch (error) {
    console.error("[BillingPortal] Error creating billing portal session:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Unknown error creating billing portal session"
    }
  }
}