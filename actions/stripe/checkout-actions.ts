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
 */
export async function createBillingPortalSessionAction(
  userId: string,
  returnUrl?: string
): Promise<ActionState<{ url: string }>> {
  try {
    if (!userId) {
      return {
        isSuccess: false,
        message: "User ID is required"
      }
    }
    
    // Get user profile to get Stripe customer ID
    const profileResult = await getProfileByUserIdAction(userId)
    
    if (!profileResult.isSuccess) {
      return {
        isSuccess: false,
        message: `Failed to get user profile: ${profileResult.message}`
      }
    }
    
    const customerId = profileResult.data?.stripeCustomerId
    
    if (!customerId) {
      return {
        isSuccess: false,
        message: "User does not have a Stripe customer ID"
      }
    }
    
    // Create portal URL with optional return URL
    const portalReturnUrl = returnUrl 
      ? `${process.env.NEXT_PUBLIC_APP_URL}${returnUrl}`
      : `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
    
    // Create billing portal session
    const session = await createBillingPortalSession(
      customerId,
      portalReturnUrl
    )
    
    return {
      isSuccess: true,
      message: "Billing portal session created successfully",
      data: {
        url: session.url
      }
    }
  } catch (error) {
    console.error("Error creating billing portal session:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Unknown error creating billing portal session"
    }
  }
}