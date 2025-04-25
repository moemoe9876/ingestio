"use server"

/*
 * Server actions for handling Stripe webhook events
 */

import { updateProfileByStripeCustomerIdAction } from "@/actions/db/profiles-actions"
import { initializeUserUsageAction, updateUserUsageAction } from "@/actions/db/user-usage-actions"
import { getPostHogServerClient, trackServerEvent } from "@/lib/analytics/server"
import { getPlanById } from "@/lib/config/subscription-plans"
import { processStripeWebhook } from "@/lib/stripe/webhooks"
import { ActionState } from "@/types"

// Analytics event constants for tracking
const ANALYTICS_EVENTS = {
  WEBHOOK_RECEIVED: "stripe.webhook.received",
  WEBHOOK_INVALID: "stripe.webhook.invalid",
  STRIPE_SUBSCRIPTION_SYNCED: "stripe.subscription.synced",
  STRIPE_SUBSCRIPTION_CANCELLED_SYNCED: "stripe.subscription.cancelled.synced",
  STRIPE_INVOICE_PAID: "stripe.invoice.paid",
  USAGE_RESET: "stripe.usage.reset"
}

/**
 * Process a Stripe webhook and update database accordingly.
 * Implements the "Sane Stripe" approach using KV store as source of truth.
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
      const client = getPostHogServerClient()
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
    
    // Process the webhook using the refactored webhook handler
    const result = await processStripeWebhook(rawBody, signature)
    
    if (!result.success) {
      // Track webhook validation failure
      try {
        const client = getPostHogServerClient()
        await client.capture({
          distinctId: 'server',
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

    // If the webhook was processed successfully and syncedData exists
    if (result.data?.processed && result.data?.syncedData) {
      const { eventType, customerId, syncedData } = result.data

      // Get userId associated with this customerId for analytics and denormalization
      let userId: string | null = null
      
      // Find the profile in the database linked to this Stripe customer
      const profileResult = await updateProfileByStripeCustomerIdAction(
        customerId,
        {} // Empty update just to retrieve the profile
      )
      
      if (profileResult.isSuccess && profileResult.data?.userId) {
        userId = profileResult.data.userId
        
        // Denormalize the data from KV store to the database
        // Extract membership and subscription ID from KV data
        const isActiveSub = syncedData.status === 'active' || syncedData.status === 'trialing'
        const membership = isActiveSub && syncedData.planId ? syncedData.planId : 'starter'
        const subscriptionId = isActiveSub ? syncedData.subscriptionId : null
        
        // Update the user's profile with the latest subscription data
        await updateProfileByStripeCustomerIdAction(
          customerId,
          {
            membership: membership as any, // We know it's a valid membership value
            stripeSubscriptionId: subscriptionId
          }
        )
        
        // Track the sync event with user ID
        if (syncedData.status === 'none' || syncedData.status === 'canceled') {
          await trackServerEvent(
            ANALYTICS_EVENTS.STRIPE_SUBSCRIPTION_CANCELLED_SYNCED,
            userId,
            {
              eventType,
              customerId,
              previousSubscriptionId: profileResult.data.stripeSubscriptionId,
              timestamp: webhookTimestamp
            }
          )
        } else {
          await trackServerEvent(
            ANALYTICS_EVENTS.STRIPE_SUBSCRIPTION_SYNCED,
            userId,
            {
              eventType,
              customerId,
              subscriptionId: syncedData.subscriptionId,
              status: syncedData.status,
              planId: syncedData.planId,
              currentPeriodStart: syncedData.currentPeriodStart 
                ? new Date(syncedData.currentPeriodStart * 1000).toISOString() 
                : null,
              currentPeriodEnd: syncedData.currentPeriodEnd 
                ? new Date(syncedData.currentPeriodEnd * 1000).toISOString() 
                : null,
              cancelAtPeriodEnd: syncedData.cancelAtPeriodEnd,
              timestamp: webhookTimestamp
            }
          )
        }
        
        // Handle usage reset for subscription renewal
        if (eventType === 'invoice.payment_succeeded' || eventType === 'invoice.paid') {
          // Parse the raw event data to check billing_reason
          const eventData = JSON.parse(rawBody.toString())
          const billingReason = eventData?.data?.object?.billing_reason
          
          if (billingReason === 'subscription_cycle' && syncedData.status === 'active' && 
              syncedData.subscriptionId && syncedData.currentPeriodStart && syncedData.currentPeriodEnd) {
            
            // Get subscription period dates from Stripe
            const periodStart = new Date(syncedData.currentPeriodStart * 1000)
            const periodEnd = new Date(syncedData.currentPeriodEnd * 1000)
            
            // Get plan details for quota limits
            const plan = syncedData.planId ? getPlanById(syncedData.planId as any) : null
            const pagesLimit = plan?.documentQuota ?? 0
            
            // Create a new usage record with the precise billing period dates from Stripe
            // This uses our enhanced initializeUserUsageAction with custom dates
            const usageResult = await initializeUserUsageAction(userId, {
              startDate: periodStart,
              endDate: periodEnd
            })
            
            if (usageResult.isSuccess) {
              // Update the pages limit and reset the count to 0
              await updateUserUsageAction(userId, {
                pagesLimit: pagesLimit,
                pagesProcessed: 0 // Reset to 0 for new period
              })
              
              console.log(`[Webhook] Reset usage for user ${userId} for new billing period: ${periodStart.toISOString()} to ${periodEnd.toISOString()}`)
              
              // Track usage reset event
              await trackServerEvent(
                ANALYTICS_EVENTS.USAGE_RESET,
                userId,
                {
                  subscriptionId: syncedData.subscriptionId,
                  planId: syncedData.planId,
                  pagesLimit: pagesLimit,
                  periodStart: periodStart.toISOString(),
                  periodEnd: periodEnd.toISOString(),
                  timestamp: webhookTimestamp
                }
              )
            } else {
              console.error(`[Webhook] Failed to reset usage for user ${userId}:`, usageResult.message)
            }
          }
        }
      } else {
        console.log(`[Webhook] No profile found for customerId ${customerId}. Skipping denormalization.`)
      }
      
      return {
        isSuccess: true,
        message: `Successfully processed ${eventType} webhook and synced data`,
        data: {
          eventType,
          customerId,
          userId,
          syncedData
        }
      }
    }
    
    // If the webhook was received but not processed, still return success
    return {
      isSuccess: true,
      message: result.message || "Webhook received but not processed",
      data: result.data
    }
    
  } catch (error) {
    console.error('Error in processStripeWebhookAction:', error)
    return { 
      isSuccess: false,
      message: error instanceof Error ? error.message : "Unknown error processing webhook action"
    }
  }
} 