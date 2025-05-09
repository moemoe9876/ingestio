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
  signature: string,
  eventId?: string,
  eventType?: string
): Promise<ActionState<{ processed: boolean; eventType?: string }>> {
  try {
    console.log(`[Webhook Action] Received webhook request. Event ID: ${eventId || 'N/A'}, Type: ${eventType || 'N/A'}`);

    const result = await processStripeWebhook(rawBody, signature)

    if (!result.success) {
      console.error(`[Webhook Action] processStripeWebhook failed for Event ID: ${eventId || 'N/A'}. Error: ${result.message}`);
      return {
        isSuccess: false,
        message: result.message || "Failed to process webhook"
      }
    }

    if (result.data?.processed && result.data?.syncedData) {
      const currentEventType = eventType || result.data.eventType;
      const { customerId, syncedData } = result.data
      console.log(`[Webhook Action] Processing Event ID: ${eventId || 'N/A'}, Type: ${currentEventType} for customer ${customerId}.`);

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
          console.error(`[Webhook Action] Failed to denormalize profile update for customer ${customerId}: ${updateResult.message}`);
        } else {
          console.log(`[Webhook Action] Successfully denormalized profile for customer ${customerId}`);
          // Track subscription change event only if update succeeded
          trackServerEvent("subscription_changed", userId, {
            // Pass properties as the third argument
            newPlan: membership,
            customerId: customerId,
            subscriptionId: subscriptionId ?? "N/A"
          })
        }

        // Reset usage if applicable
        if ((currentEventType === "invoice.paid" || currentEventType === "invoice.payment_succeeded") && isActiveSub && userId) {
          console.log(`[Webhook Action] Event ID: ${eventId || 'N/A'} is ${currentEventType}. Initializing/updating usage for user ${userId} based on new invoice period.`);
          
          // The refined initializeUserUsageAction will internally fetch the latest subscription data
          // (which should have been updated in KV by syncStripeDataToKV prior to this action running, or as part of it)
          // and use its currentPeriodStart and currentPeriodEnd as authoritative dates.
          // It also handles setting pagesProcessed to 0 if it determines it's a new billing month record.
          const initUsageResult = await initializeUserUsageAction(userId);

          if (!initUsageResult.isSuccess) {
            console.error(`[Webhook Action] Failed to initialize/update usage for user ${userId} (Event ID: ${eventId || 'N/A'}) after ${currentEventType}: ${initUsageResult.message}`);
          } else {
            console.log(`[Webhook Action] Successfully initialized/updated usage for user ${userId} (Event ID: ${eventId || 'N/A'}) after ${currentEventType}.`);
          }
        }
      } else {
        console.log(`[Webhook Action] No profile found for customerId ${customerId}. Skipping denormalization and usage reset.`);
      }

      return {
        isSuccess: true,
        message: "Webhook processed successfully",
        data: { processed: true, eventType: currentEventType }
      }
    } else if (result.data?.processed === false) {
      const currentEventType = eventType || result.data?.eventType;
      console.log(`[Webhook Action] Webhook (Event ID: ${eventId || 'N/A'}, Type: ${currentEventType}) processed but no sync data or not processed.`);
      return {
        isSuccess: true,
        message: "Webhook received but no action taken",
        data: { processed: false, eventType: currentEventType }
      }
    } else {
      console.error(`[Webhook Action] Unexpected state for Event ID: ${eventId || 'N/A'}: processStripeWebhook succeeded but returned invalid data structure.`);
      return { isSuccess: false, message: "Internal error after processing webhook" }
    }
  } catch (error: any) {
    console.error(`[Webhook Action] Error processing webhook (Event ID: ${eventId || 'N/A'}):`, error);
    return {
      isSuccess: false,
      message: `Error processing webhook: ${error.message}`
    }
  }
} 