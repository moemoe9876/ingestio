"use server"

/*
 * Server actions for handling Stripe webhook events
 */

import {
  initializeUserUsageAction
} from "@/actions/db/user-usage-actions"
import { db } from "@/db/db"
import { trackServerEvent } from "@/lib/analytics/server"
import { processStripeWebhook } from "@/lib/stripe/webhooks"
import { ActionState } from "@/types"
import { StripeCustomerDataKV } from '@/types/stripe-kv-types'
import type { Stripe } from 'stripe'
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

// Implement robust userId lookup by Stripe customerId
async function getUserIdFromStripeCustomerId(customerId: string): Promise<string | null> {
  console.log(`[WebhookAction] Looking up userId from stripeCustomerId: ${customerId}`);
  try {
    // Use the existing getProfileByStripeCustomerIdAction
    const profileResult = await getProfileByStripeCustomerIdAction(customerId);
    
    if (!profileResult.isSuccess || !profileResult.data?.userId) {
      console.warn(`[WebhookAction] No profile found for Stripe customerId: ${customerId}`);
      return null;
    }
    
    return profileResult.data.userId;
  } catch (error) {
    console.error(`[WebhookAction] Error looking up userId for customerId ${customerId}:`, error);
    return null;
  }
}

// Implement userId lookup by email
async function getUserIdByEmail(email: string): Promise<string | null> {
  console.log(`[WebhookAction] Looking up userId from email: ${email}`);
  try {
    // Query the profiles table via the users table relationship
    // Using a different approach due to typing issues with the previous approach
    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, email)
    });
    
    if (!user || !user.userId) {
      console.warn(`[WebhookAction] No user found for email: ${email}`);
      return null;
    }
    
    const profile = await db.query.profiles.findFirst({
      where: (profiles, { eq }) => eq(profiles.userId, user.userId)
    });
    
    if (!profile || !profile.userId) {
      console.warn(`[WebhookAction] No profile found for user with email: ${email}`);
      return null;
    }
    
    return profile.userId;
  } catch (error) {
    console.error(`[WebhookAction] Error looking up userId for email ${email}:`, error);
    return null;
  }
}

export async function handleCheckoutCompletedAction(
  session: Stripe.Checkout.Session,
  syncedData: StripeCustomerDataKV
): Promise<{ success: boolean; message: string }> {
  console.log('[WebhookAction] Handling checkout.session.completed', session.id);
  const customerId = session.customer as string;
  
  // Check for userId in metadata first - this is crucial for new customers
  const metadataUserId = session.metadata?.userId;
  
  if (metadataUserId) {
    console.log(`[WebhookAction] Found userId ${metadataUserId} in checkout session metadata`);
    
    try {
      // Attempt to create/update profile directly by userId since we have it from metadata
      // This is critical for first-time checkout where no profile exists yet
      const isActiveSub = syncedData.status === 'active' || syncedData.status === 'trialing';
      const membership = isActiveSub && syncedData.planId ? syncedData.planId : "starter";
      const subscriptionId = isActiveSub ? syncedData.subscriptionId : null;
      
      // Import and call the appropriate profile creation/update action
      // This is an example using the profile db module - adjust based on your actual implementation
      const { getProfileByUserIdAction, updateProfileAction } = await import("@/actions/db/profiles-actions");
      
      // First check if a profile exists for this userId
      const existingProfileResult = await getProfileByUserIdAction(metadataUserId);
      
      if (existingProfileResult.isSuccess && existingProfileResult.data) {
        // Profile exists, update it with Stripe info
        console.log(`[WebhookAction] Updating existing profile for userId: ${metadataUserId}`);
        const updateResult = await updateProfileAction(metadataUserId, {
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          membership: membership as any
        });
        
        if (!updateResult.isSuccess) {
          console.error(`[WebhookAction] Failed to update profile for userId: ${metadataUserId}:`, updateResult.message);
        } else {
          console.log(`[WebhookAction] Successfully updated profile for userId: ${metadataUserId} with customerId: ${customerId}`);
        }
      } else {
        // Profile doesn't exist, need to create one
        // You need to implement or import the createProfileAction
        console.log(`[WebhookAction] Creating new profile for userId: ${metadataUserId}`);
        const { getProfileAction } = await import("@/actions/db/profiles-actions");
        
        const createResult = await getProfileAction({
          userId: metadataUserId,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          membership: membership as any
        });
        
        if (!createResult.isSuccess) {
          console.error(`[WebhookAction] Failed to create profile for userId: ${metadataUserId}:`, createResult.message);
          return { success: false, message: `Failed to create profile: ${createResult.message}` };
        } else {
          console.log(`[WebhookAction] Successfully created profile for userId: ${metadataUserId} with customerId: ${customerId}`);
        }
      }
      
      // Initialize/Reset user usage records
      console.log(`[WebhookAction] Initializing usage for userId: ${metadataUserId}`);
      const usageResult = await initializeUserUsageAction(metadataUserId);
      
      if (!usageResult.isSuccess) {
        console.error(`[WebhookAction] Failed to initialize usage for userId: ${metadataUserId}:`, usageResult.message);
      } else {
        console.log(`[WebhookAction] Successfully initialized usage for userId: ${metadataUserId}`);
      }
      
      // Track event for analytics
      console.log(`[WebhookAction] Tracking checkout completed event for userId: ${metadataUserId}`);
      await trackServerEvent("subscription_started", metadataUserId, {
        customerId,
        subscriptionId: subscriptionId ?? "N/A",
        plan: membership,
        checkoutSessionId: session.id
      });
      
      return { success: true, message: 'Checkout completed processed.' };
    } catch (error) {
      console.error(`[WebhookAction] Error processing checkout for userId ${metadataUserId}:`, error);
      return { success: false, message: error instanceof Error ? error.message : 'Failed to process checkout completion.' };
    }
  }
  
  // If we reach here, we don't have userId from metadata, so try to lookup
  const userId = (syncedData as any)?.userId || await getUserIdFromStripeCustomerId(customerId);

  if (!userId) {
    console.error('[WebhookAction] Critical: userId not found for checkout.session.completed', session.id);
    return { success: false, message: 'User ID not found for checkout session and no userId in metadata.' };
  }

  try {
    // 1. Update profiles table using the existing action
    console.log(`[WebhookAction] Updating profile for userId: ${userId} based on checkout session`);
    const isActiveSub = syncedData.status === 'active' || syncedData.status === 'trialing';
    const membership = isActiveSub && syncedData.planId ? syncedData.planId : "starter";
    const subscriptionId = isActiveSub ? syncedData.subscriptionId : null;
    
    const updateResult = await updateProfileByStripeCustomerIdAction(
      customerId,
      {
        membership: membership as any, // Type casting necessary if enum mismatch
        stripeSubscriptionId: subscriptionId
      }
    );
    
    if (!updateResult.isSuccess) {
      console.error(`[WebhookAction] Failed to update profile for userId: ${userId}:`, updateResult.message);
      // Continue processing even if this fails
    } else {
      console.log(`[WebhookAction] Successfully updated profile for userId: ${userId}`);
    }

    // 2. Initialize/Reset user usage records
    console.log(`[WebhookAction] Initializing usage for userId: ${userId}`);
    const usageResult = await initializeUserUsageAction(userId);
    
    if (!usageResult.isSuccess) {
      console.error(`[WebhookAction] Failed to initialize usage for userId: ${userId}:`, usageResult.message);
      // Continue processing even if this fails
    } else {
      console.log(`[WebhookAction] Successfully initialized usage for userId: ${userId}`);
    }

    // 3. Track event for analytics
    console.log(`[WebhookAction] Tracking checkout completed event for userId: ${userId}`);
    await trackServerEvent("subscription_started", userId, {
      customerId,
      subscriptionId: subscriptionId ?? "N/A",
      plan: membership,
      checkoutSessionId: session.id
    });

    return { success: true, message: 'Checkout completed processed.' };
  } catch (error) {
    console.error('[WebhookAction] Error in handleCheckoutCompletedAction:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Failed to process checkout completion.' };
  }
}

export async function handleSubscriptionUpdatedAction(
  subscription: Stripe.Subscription,
  syncedData: StripeCustomerDataKV,
  eventType: string // 'customer.subscription.created' or 'customer.subscription.updated'
): Promise<{ success: boolean; message: string }> {
  console.log(`[WebhookAction] Handling ${eventType}`, subscription.id);
  const customerId = subscription.customer as string;
  // userId might be in subscription metadata, product metadata (via syncedData), or need lookup
  const userId = subscription.metadata?.userId || (syncedData as any)?.userId || await getUserIdFromStripeCustomerId(customerId);

  if (!userId) {
    console.error(`[WebhookAction] Critical: userId not found for ${eventType}`, subscription.id);
    return { success: false, message: `User ID not found for ${eventType}.` };
  }

  try {
    // 1. Update profiles table with subscription information
    console.log(`[WebhookAction] Updating profile for userId: ${userId} based on subscription update`);
    const isActiveSub = syncedData.status === 'active' || syncedData.status === 'trialing';
    const membership = isActiveSub && syncedData.planId ? syncedData.planId : "starter";
    const subscriptionId = isActiveSub ? syncedData.subscriptionId : null;
    
    const updateResult = await updateProfileByStripeCustomerIdAction(
      customerId,
      {
        membership: membership as any, // Type casting necessary if enum mismatch
        stripeSubscriptionId: subscriptionId
      }
    );
    
    if (!updateResult.isSuccess) {
      console.error(`[WebhookAction] Failed to update profile for userId: ${userId}:`, updateResult.message);
      // Continue processing even if this fails
    } else {
      console.log(`[WebhookAction] Successfully updated profile for userId: ${userId}`);
    }

    // 2. Initialize/Reset user usage records if the subscription is active or trialing
    if (isActiveSub) {
      console.log(`[WebhookAction] Initializing usage for userId: ${userId} due to active/trialing status`);
      const usageResult = await initializeUserUsageAction(userId);
      
      if (!usageResult.isSuccess) {
        console.error(`[WebhookAction] Failed to initialize usage for userId: ${userId}:`, usageResult.message);
        // Continue processing even if this fails
      } else {
        console.log(`[WebhookAction] Successfully initialized usage for userId: ${userId}`);
      }
    }

    // 3. Track event for analytics
    console.log(`[WebhookAction] Tracking subscription update event for userId: ${userId}`);
    await trackServerEvent("subscription_changed", userId, {
      eventType,
      customerId,
      subscriptionId: subscriptionId ?? "N/A",
      status: syncedData.status,
      plan: membership
    });

    return { success: true, message: `${eventType} processed.` };
  } catch (error) {
    console.error(`[WebhookAction] Error in handleSubscriptionUpdatedAction for ${eventType}:`, error);
    return { success: false, message: error instanceof Error ? error.message : `Failed to process ${eventType}.` };
  }
}

export async function handleSubscriptionDeletedAction(
  subscription: Stripe.Subscription,
  syncedData: StripeCustomerDataKV // syncedData here might reflect 'none' status after sync
): Promise<{ success: boolean; message: string }> {
  console.log('[WebhookAction] Handling customer.subscription.deleted', subscription.id);
  const customerId = subscription.customer as string;
  const userId = subscription.metadata?.userId || (syncedData as any)?.userId || await getUserIdFromStripeCustomerId(customerId);

  if (!userId) {
    console.error('[WebhookAction] Critical: userId not found for customer.subscription.deleted', subscription.id);
    return { success: false, message: 'User ID not found for subscription deletion.' };
  }

  try {
    // 1. Update profiles table - downgrade to starter plan
    console.log(`[WebhookAction] Updating profile for userId: ${userId} to reflect subscription deletion`);
    const updateResult = await updateProfileByStripeCustomerIdAction(
      customerId,
      {
        membership: "starter", // Downgrade to free/starter plan
        stripeSubscriptionId: null // Clear subscription ID
      }
    );
    
    if (!updateResult.isSuccess) {
      console.error(`[WebhookAction] Failed to update profile for userId: ${userId}:`, updateResult.message);
      // Continue processing even if this fails
    } else {
      console.log(`[WebhookAction] Successfully updated profile for userId: ${userId} to starter plan`);
    }

    // 2. Reset user usage records (for starter/free tier)
    console.log(`[WebhookAction] Initializing usage for userId: ${userId} for starter/free tier`);
    const usageResult = await initializeUserUsageAction(userId);
    
    if (!usageResult.isSuccess) {
      console.error(`[WebhookAction] Failed to initialize usage for userId: ${userId}:`, usageResult.message);
      // Continue processing even if this fails
    } else {
      console.log(`[WebhookAction] Successfully initialized usage for userId: ${userId} for starter tier`);
    }

    // 3. Track event for analytics
    console.log(`[WebhookAction] Tracking subscription deletion event for userId: ${userId}`);
    await trackServerEvent("subscription_cancelled", userId, {
      customerId,
      subscriptionId: subscription.id,
      previousPlan: subscription.metadata?.planId || "unknown"
    });

    return { success: true, message: 'Subscription deletion processed.' };
  } catch (error) {
    console.error('[WebhookAction] Error in handleSubscriptionDeletedAction:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Failed to process subscription deletion.' };
  }
}

export async function handleInvoicePaidAction(
  invoice: Stripe.Invoice,
  syncedData: StripeCustomerDataKV
): Promise<{ success: boolean; message: string }> {
  console.log('[WebhookAction] Handling invoice.paid', invoice.id);
  const customerId = invoice.customer as string;
  const userId = (invoice.customer_email && await getUserIdByEmail(invoice.customer_email)) || 
                 (syncedData as any)?.userId || 
                 await getUserIdFromStripeCustomerId(customerId);

  if (!userId) {
    console.error('[WebhookAction] Critical: userId not found for invoice.paid', invoice.id);
    return { success: false, message: 'User ID not found for invoice payment.' };
  }

  try {
    // 1. Verify/update profiles table if needed
    console.log(`[WebhookAction] Verifying profile status for userId: ${userId} based on invoice.paid`);
    const isActiveSub = syncedData.status === 'active' || syncedData.status === 'trialing';
    
    if (isActiveSub) {
      const membership = syncedData.planId || "starter";
      const subscriptionId = syncedData.subscriptionId;
      
      const updateResult = await updateProfileByStripeCustomerIdAction(
        customerId,
        {
          membership: membership as any, // Type casting necessary if enum mismatch
          stripeSubscriptionId: subscriptionId
        }
      );
      
      if (!updateResult.isSuccess) {
        console.error(`[WebhookAction] Failed to update profile for userId: ${userId}:`, updateResult.message);
        // Continue processing even if this fails
      } else {
        console.log(`[WebhookAction] Successfully verified/updated profile for userId: ${userId}`);
      }
    }

    // 2. This is a key event for resetting usage for recurring subscriptions
    if (isActiveSub) {
      console.log(`[WebhookAction] Resetting usage for userId: ${userId} due to invoice.paid for active subscription`);
      const usageResult = await initializeUserUsageAction(userId);
      
      if (!usageResult.isSuccess) {
        console.error(`[WebhookAction] Failed to reset usage for userId: ${userId}:`, usageResult.message);
        // Continue processing even if this fails
      } else {
        console.log(`[WebhookAction] Successfully reset usage for userId: ${userId}`);
      }
    }

    // 3. Track event for analytics
    console.log(`[WebhookAction] Tracking invoice paid event for userId: ${userId}`);
    await trackServerEvent("invoice_paid", userId, {
      customerId,
      invoiceId: invoice.id,
      amount: invoice.amount_paid,
      currency: invoice.currency,
      // Using type assertion to access the subscription property
      subscriptionRef: (invoice as any).subscription ? String((invoice as any).subscription) : "N/A", 
      status: syncedData.status
    });

    return { success: true, message: 'Invoice payment processed.' };
  } catch (error) {
    console.error('[WebhookAction] Error in handleInvoicePaidAction:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Failed to process invoice payment.' };
  }
}

export async function handleInvoicePaymentFailedAction(
  invoice: Stripe.Invoice,
  syncedData: StripeCustomerDataKV
): Promise<{ success: boolean; message: string }> {
  console.log('[WebhookAction] Handling invoice.payment_failed', invoice.id);
  const customerId = invoice.customer as string;
  const userId = (invoice.customer_email && await getUserIdByEmail(invoice.customer_email)) || 
                 (syncedData as any)?.userId || 
                 await getUserIdFromStripeCustomerId(customerId);

  if (!userId) {
    console.error('[WebhookAction] Critical: userId not found for invoice.payment_failed', invoice.id);
    return { success: false, message: 'User ID not found for invoice payment failure.' };
  }

  try {
    // 1. Update profiles table with a "past_due" status (if syncedData already contains that from Stripe)
    console.log(`[WebhookAction] Updating profile for userId: ${userId} to reflect payment failure. SyncedData:`, syncedData);
    
    // We don't actually change the membership tier on payment failure, just track the event
    // The subscription status in syncedData should already reflect 'past_due' if appropriate
    
    // 2. Track the payment failure event for analytics and potential notification
    console.log(`[WebhookAction] Tracking payment failed event for userId: ${userId}`);
    await trackServerEvent("invoice_payment_failed", userId, {
      customerId,
      invoiceId: invoice.id,
      amount: invoice.amount_due,
      currency: invoice.currency,
      // Using type assertion to access the subscription property which may exist on Stripe's Invoice type
      // but might not be defined in the TypeScript definitions
      subscriptionRef: (invoice as any).subscription ? String((invoice as any).subscription) : "N/A",
      attemptCount: invoice.attempt_count,
      nextAttempt: invoice.next_payment_attempt ? new Date(invoice.next_payment_attempt * 1000).toISOString() : null,
      status: syncedData.status
    });
    
    // 3. Automatic reminder/dunning is usually handled by Stripe, but you could trigger a custom email here
    console.log(`[WebhookAction] Payment failed for userId: ${userId}. Stripe will handle dunning process.`);

    return { success: true, message: 'Invoice payment failure processed.' };
  } catch (error) {
    console.error('[WebhookAction] Error in handleInvoicePaymentFailedAction:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Failed to process invoice payment failure.' };
  }
} 