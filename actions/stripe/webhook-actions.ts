"use server"

/*
 * Server actions for handling Stripe webhook events
 */

import {
  initializeUserUsageAction
} from "@/actions/db/user-usage-actions"
import { trackServerEvent } from "@/lib/analytics/server"
import { processStripeWebhook } from "@/lib/stripe/webhooks"
import { ActionState } from "@/types"
import {
  getProfileByStripeCustomerIdAction,
  updateProfileByStripeCustomerIdAction
} from "../db/profiles-actions"

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
  rawBody: string,
  signature: string
): Promise<ActionState<{ processed: boolean; eventType?: string }>> {
  try {
    // TODO: Add event tracking for webhook receipt attempts
    console.log("[Webhook] Received webhook request.")

    const result = await processStripeWebhook(rawBody, signature)

    if (!result.success) {
      console.error(`[Webhook] processStripeWebhook failed: ${result.message}`)
      return {
        isSuccess: false,
        message: result.message || "Failed to process webhook"
      }
    }

    if (result.data?.processed && result.data?.syncedData) {
      const { eventType, customerId, syncedData } = result.data
      console.log(`[Webhook] Processing event ${eventType} for customer ${customerId}.`)

      let userId: string | null = null

      // Use the get function to lookup profile by customer ID
      const profileResult = await getProfileByStripeCustomerIdAction(customerId)

      if (profileResult.isSuccess && profileResult.data?.userId) {
        userId = profileResult.data.userId
        
        const isActiveSub =
          syncedData.status === "active" || syncedData.status === "trialing"
        // Use the actual plan ID string for membership
        const membership = isActiveSub && syncedData.planId ? syncedData.planId : "starter"
        const subscriptionId = isActiveSub ? syncedData.subscriptionId : null
        
        // Now use updateProfile for the actual update with values to set
        const updateResult = await updateProfileByStripeCustomerIdAction(
          customerId,
          {
            membership: membership as any, // Casting might be necessary if enum/type mismatch
            stripeSubscriptionId: subscriptionId
          }
        )

        if (!updateResult.isSuccess) {
          console.error(`[Webhook] Failed to denormalize profile update for customer ${customerId}: ${updateResult.message}`);
        } else {
          console.log(`[Webhook] Successfully denormalized profile for customer ${customerId}`);
          // Track subscription change event only if update succeeded
          trackServerEvent("subscription_changed", userId, {
            // Pass properties as the third argument
            newPlan: membership,
            customerId: customerId,
            subscriptionId: subscriptionId ?? "N/A"
          })
        }

        // Reset usage if applicable
        if (eventType === "invoice.paid" && isActiveSub && userId) {
          console.log(`[Webhook] Event is invoice.paid. Initializing/updating usage for user ${userId} based on new invoice period.`);
          
          // The refined initializeUserUsageAction will internally fetch the latest subscription data
          // (which should have been updated in KV by syncStripeDataToKV prior to this action running, or as part of it)
          // and use its currentPeriodStart and currentPeriodEnd as authoritative dates.
          // It also handles setting pagesProcessed to 0 if it determines it's a new billing month record.
          const initUsageResult = await initializeUserUsageAction(userId);

          if (!initUsageResult.isSuccess) {
            console.error(`[Webhook] Failed to initialize/update usage for user ${userId} after invoice.paid: ${initUsageResult.message}`);
          } else {
            console.log(`[Webhook] Successfully initialized/updated usage for user ${userId} after invoice.paid. Usage data:`, initUsageResult.data);
          }
        }
      } else {
        console.log(`[Webhook] No profile found for customerId ${customerId}. Skipping denormalization and usage reset.`);
      }

      return {
        isSuccess: true,
        message: "Webhook processed successfully",
        data: { processed: true, eventType: eventType }
      }
    } else if (result.data?.processed === false) {
      console.log(`[Webhook] Webhook processed but no sync data found or not processed. EventType: ${result.data?.eventType}`);
      return {
        isSuccess: true,
        message: "Webhook received but no action taken",
        data: { processed: false, eventType: result.data?.eventType }
      }
    } else {
      console.error("[Webhook] Unexpected state: processStripeWebhook succeeded but returned invalid data structure.")
      return { isSuccess: false, message: "Internal error after processing webhook" }
    }
  } catch (error: any) {
    console.error("[Webhook] Error processing webhook action:", error);
    return {
      isSuccess: false,
      message: `Error processing webhook: ${error.message}`
    }
  }
} 