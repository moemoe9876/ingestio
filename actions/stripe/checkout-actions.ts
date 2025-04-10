"use server"

/*
 * Server actions for Stripe checkout functionality
 */

import { getProfileByUserIdAction } from "@/actions/db/profiles-actions"
import { getUserByIdAction } from "@/actions/db/users-actions"
import { PlanId, getPlanById } from "@/lib/config/subscription-plans"
import {
  createBillingPortalSession,
  createCheckoutSession
} from "@/lib/stripe"
import { ActionState } from "@/types"

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
    
    // Get user profile (to check if they already have a Stripe customer ID)
    const profileResult = await getProfileByUserIdAction(userId)
    
    if (!profileResult.isSuccess) {
      return {
        isSuccess: false,
        message: `Failed to get user profile: ${profileResult.message}`
      }
    }

    // Get user to get email
    const user = await getUserByIdAction(userId)
    
    // Check for existing Stripe customer ID
    const customerId = profileResult.data?.stripeCustomerId
    
    // Create success URL with optional return URL
    const successUrl = returnUrl 
      ? `${process.env.NEXT_PUBLIC_APP_URL}${returnUrl}?checkout=success`
      : `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success`
    
    // Create checkout session
    const session = await createCheckoutSession({
      planId,
      userId,
      customerId: customerId === null ? undefined : customerId,
      customerEmail: user?.email,
      successUrl
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