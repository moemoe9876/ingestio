"use server"

/*
 * Server actions for handling Stripe webhook events
 */

import { updateProfileByStripeCustomerIdAction } from "@/actions/db/profiles-actions"
import { createUserUsageAction, updateUserUsageAction } from "@/actions/db/user-usage-actions"
import { PlanId, getPlanById } from "@/lib/config/subscription-plans"
import { processStripeWebhook } from "@/lib/stripe"
import { ActionState } from "@/types"

/**
 * Process a Stripe webhook and update database accordingly
 */
export async function processStripeWebhookAction(
  rawBody: string | Buffer,
  signature: string
): Promise<ActionState<unknown>> {
  try {
    const result = await processStripeWebhook(rawBody, signature)
    
    if (!result.success) {
      return { 
        isSuccess: false,
        message: `Failed to process webhook: ${result.message}`
      }
    }

    // Handle checkout.session.completed
    if (result.data?.userId && result.data?.customerId && 
        result.message.includes('checkout completion')) {
      const { userId, customerId } = result.data
      
      // Update user profile with Stripe customer ID
      const profileResult = await updateProfileByStripeCustomerIdAction(
        customerId,
        {
          stripeCustomerId: customerId
        }
      )
      
      if (!profileResult.isSuccess) {
        console.error(`Failed to update profile for customer ${customerId}:`, profileResult.message)
      }
    }
    
    // Handle subscription update
    if (result.data?.customerId && result.data?.planId && 
        result.message.includes('subscription update')) {
      const { customerId, planId, subscriptionId } = result.data
      
      // Update user profile with subscription details
      const profileResult = await updateProfileByStripeCustomerIdAction(
        customerId,
        {
          membership: planId as PlanId,
          stripeSubscriptionId: subscriptionId
        }
      )
      
      if (!profileResult.isSuccess) {
        console.error(`Failed to update profile for customer ${customerId}:`, profileResult.message)
        return { 
          isSuccess: false,
          message: `Failed to update profile: ${profileResult.message}`
        }
      }
      
      // Update or create usage record with new quota limits
      if (profileResult.data?.userId) {
        const userId = profileResult.data.userId
        const plan = getPlanById(planId as PlanId)
        
        // Calculate current billing period from Stripe data
        const now = new Date()
        const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
        
        // Try to update existing usage record first
        const updateResult = await updateUserUsageAction(userId, {
          pagesLimit: plan.documentQuota
        })
        
        // If update fails, create a new usage record
        if (!updateResult.isSuccess) {
          const createResult = await createUserUsageAction({
            userId,
            billingPeriodStart: periodStart,
            billingPeriodEnd: periodEnd,
            pagesProcessed: 0,
            pagesLimit: plan.documentQuota
          })
          
          if (!createResult.isSuccess) {
            console.error(`Failed to create usage record for ${userId}:`, createResult.message)
          }
        }
      }
    }
    
    // Handle subscription deletion
    if (result.data?.customerId && result.data?.newPlanId && 
        result.message.includes('subscription deletion')) {
      const { customerId, newPlanId } = result.data
      
      // Update user profile to downgrade to free plan
      const profileResult = await updateProfileByStripeCustomerIdAction(
        customerId,
        {
          membership: newPlanId as PlanId,
          stripeSubscriptionId: null
        }
      )
      
      if (!profileResult.isSuccess) {
        console.error(`Failed to downgrade profile for ${customerId}:`, profileResult.message)
        return { 
          isSuccess: false,
          message: `Failed to downgrade profile: ${profileResult.message}`
        }
      }
    }
    
    return {
      isSuccess: true,
      message: 'Successfully processed Stripe webhook',
      data: result.data
    }
  } catch (error) {
    console.error('Error in processStripeWebhookAction:', error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : 'Unknown error processing webhook'
    }
  }
} 