"use server"

/*
 * Server actions for handling Stripe webhook events
 */

import { updateProfileByStripeCustomerIdAction } from "@/actions/db/profiles-actions"
import { createUserUsageAction, updateUserUsageAction } from "@/actions/db/user-usage-actions"
import { getPostHogClient, trackServerEvent } from "@/lib/analytics/server"
import { PlanId, getPlanById } from "@/lib/config/subscription-plans"
import { processStripeWebhook } from "@/lib/stripe"
import { ActionState } from "@/types"

// Analytics event constants for tracking
const ANALYTICS_EVENTS = {
  WEBHOOK_RECEIVED: "stripe.webhook.received",
  WEBHOOK_INVALID: "stripe.webhook.invalid",
  CHECKOUT_COMPLETED: "stripe.checkout.completed",
  SUBSCRIPTION_CREATED: "stripe.subscription.created",
  SUBSCRIPTION_UPDATED: "stripe.subscription.updated",
  SUBSCRIPTION_CANCELED: "stripe.subscription.canceled",
  PAYMENT_SUCCEEDED: "stripe.payment.succeeded",
  PAYMENT_FAILED: "stripe.payment.failed"
}

/**
 * Process a Stripe webhook and update database accordingly
 */
export async function processStripeWebhookAction(
  rawBody: string | Buffer,
  signature: string
): Promise<ActionState<unknown>> {
  try {
    // Track that we received a webhook
    const webhookTimestamp = new Date().toISOString()
    
    // Track webhook received (without userId since we don't have it yet)
    try {
      const client = getPostHogClient()
      await client.capture({
        distinctId: 'server', // Use 'server' since we don't have a user ID yet
        event: ANALYTICS_EVENTS.WEBHOOK_RECEIVED,
        properties: {
          timestamp: webhookTimestamp
        }
      })
    } catch (analyticsError) {
      console.error('Failed to track webhook receipt:', analyticsError)
    }
    
    const result = await processStripeWebhook(rawBody, signature)
    
    if (!result.success) {
      // Track webhook validation failure (without userId since we don't have it yet)
      try {
        const client = getPostHogClient()
        await client.capture({
          distinctId: 'server', // Use 'server' since we don't have a user ID yet
          event: ANALYTICS_EVENTS.WEBHOOK_INVALID,
          properties: {
            error: result.message,
            timestamp: webhookTimestamp
          }
        })
      } catch (analyticsError) {
        console.error('Failed to track invalid webhook:', analyticsError)
      }
      
      return { 
        isSuccess: false,
        message: `Failed to process webhook: ${result.message}`
      }
    }

    // Handle checkout.session.completed
    if (result.data?.userId && result.data?.customerId && 
        result.message.includes('checkout completion')) {
      const { userId, customerId, planId } = result.data
      
      // Update user profile with Stripe customer ID
      const profileResult = await updateProfileByStripeCustomerIdAction(
        customerId,
        {
          stripeCustomerId: customerId
        }
      )
      
      if (!profileResult.isSuccess) {
        console.error(`Failed to update profile for customer ${customerId}:`, profileResult.message)
        return {
          isSuccess: false,
          message: `Failed to update profile with customer ID: ${profileResult.message}`
        }
      }
      
      // Track event for analytics
      if (profileResult.data?.userId) {
        await trackServerEvent(
          ANALYTICS_EVENTS.CHECKOUT_COMPLETED,
          profileResult.data.userId,
          { 
            customerId,
            planId,
            eventTimestamp: webhookTimestamp
          }
        )
      }
    }
    
    // Handle subscription update
    if (result.data?.customerId && result.data?.planId && 
        result.message.includes('subscription update')) {
      const { customerId, planId, subscriptionId, subscriptionStatus } = result.data
      
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
        
        // Track event for analytics
        const eventType = result.message.includes('created') 
          ? ANALYTICS_EVENTS.SUBSCRIPTION_CREATED 
          : ANALYTICS_EVENTS.SUBSCRIPTION_UPDATED
        
        await trackServerEvent(
          eventType,
          userId,
          { 
            planId, 
            planName: plan.name,
            subscriptionId, 
            subscriptionStatus,
            pagesLimit: plan.documentQuota,
            billingPeriodStart: periodStart.toISOString(),
            billingPeriodEnd: periodEnd.toISOString(),
            eventTimestamp: webhookTimestamp
          }
        )
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
      
      // Track subscription cancellation event
      if (profileResult.data?.userId) {
        const userId = profileResult.data.userId
        const plan = getPlanById(newPlanId as PlanId)
        
        await trackServerEvent(
          ANALYTICS_EVENTS.SUBSCRIPTION_CANCELED,
          userId,
          { 
            customerId,
            subscriptionId: result.data.subscriptionId,
            newPlanId,
            newPlanName: plan.name,
            newPagesLimit: plan.documentQuota,
            eventTimestamp: webhookTimestamp
          }
        )
        
        // Update user usage to reflect new limits
        await updateUserUsageAction(userId, {
          pagesLimit: plan.documentQuota
        })
      }
    }
    
    // Handle invoice payment succeeded
    if (result.data?.customerId && result.data?.subscriptionId && 
        result.message.includes('invoice payment')) {
      const { customerId, subscriptionId, amount, currency, invoiceId, billingReason } = result.data
      
      // Get user profile to track the event
      const profileResult = await updateProfileByStripeCustomerIdAction(
        customerId,
        {} // No updates needed, just getting the profile
      )
      
      if (profileResult.data?.userId) {
        const userId = profileResult.data.userId
        
        await trackServerEvent(
          ANALYTICS_EVENTS.PAYMENT_SUCCEEDED,
          userId,
          { 
            customerId,
            subscriptionId,
            amount,
            currency,
            invoiceId,
            billingReason,
            membership: profileResult.data.membership,
            eventTimestamp: webhookTimestamp
          }
        )
      }
    }
    
    // Handle invoice payment failed
    if (result.data?.customerId && result.data?.subscriptionId && 
        result.message.includes('failed invoice payment')) {
      const { customerId, subscriptionId, invoiceId } = result.data
      
      // Get user profile to track the event
      const profileResult = await updateProfileByStripeCustomerIdAction(
        customerId,
        {} // No updates needed, just getting the profile
      )
      
      if (profileResult.data?.userId) {
        const userId = profileResult.data.userId
        
        await trackServerEvent(
          ANALYTICS_EVENTS.PAYMENT_FAILED,
          userId,
          { 
            customerId,
            subscriptionId,
            invoiceId,
            membership: profileResult.data.membership,
            eventTimestamp: webhookTimestamp
          }
        )
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