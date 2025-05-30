/*
 * Stripe webhook handling functions
 * Processes events from Stripe for subscription management
 */

import {
  handleCheckoutCompletedAction,
  handleInvoicePaidAction,
  handleInvoicePaymentFailedAction,
  handleSubscriptionDeletedAction,
  handleSubscriptionUpdatedAction
} from '@/actions/stripe/webhook-actions';
import { getPlanFromStripeMetadata, type PlanId } from '@/lib/config/subscription-plans';
import { redis } from '@/lib/redis/client';
import { StripeCustomerDataKV } from '@/types/stripe-kv-types';
import { type Stripe } from 'stripe';
import { getStripe, validateStripeWebhookSignature } from './config';
import { syncStripeDataToKV } from './sync';

const PROCESSED_EVENT_ID_PREFIX = "stripe_event_processed:";
const EVENT_ID_TTL_SECONDS = 48 * 60 * 60; // 48 hours

// List of events that trigger a sync AND business logic
const criticalEventsForActions: Stripe.Event.Type[] = [
  "checkout.session.completed",
  "customer.subscription.created", // Covered by updated
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid", // Often used for renewal and usage reset
  "invoice.payment_failed",
  // "invoice.payment_succeeded" is often redundant with invoice.paid but can be handled if needed
];

// List of events that trigger a sync
const allowedEvents: Stripe.Event.Type[] = [
  "checkout.session.completed", // Good for initial sync trigger if success page fails
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused", // Handle these statuses in syncStripeDataToKV
  "customer.subscription.resumed", // Handle these statuses in syncStripeDataToKV
  "customer.subscription.pending_update_applied",
  "customer.subscription.pending_update_expired",
  "customer.subscription.trial_will_end", // Informative, sync ensures status is correct
  "invoice.paid", // Important for renewals and usage reset
  "invoice.payment_failed", // Important for status updates (past_due)
  "invoice.payment_action_required", // Status update
  "invoice.upcoming", // Informative, sync ensures status is correct
  "invoice.marked_uncollectible", // Status update (canceled/unpaid)
  "invoice.payment_succeeded", // Redundant with invoice.paid but good to include
  // Payment Intent events might be less critical if focusing only on subscription state,
  // but can be useful for tracking payment status itself. Include if needed.
  // "payment_intent.succeeded",
  // "payment_intent.payment_failed",
  // "payment_intent.canceled",
];

/**
 * Process a Stripe event by filtering based on allowedEvents
 * and delegating to syncStripeDataToKV for allowed events
 * 
 * @param event Stripe webhook event
 * @returns Synced subscription data or null if event type is not in allowedEvents
 */
export async function processEvent(event: Stripe.Event): Promise<StripeCustomerDataKV | null> {
  // Skip processing if the event isn't one we track for sync
  if (!allowedEvents.includes(event.type as Stripe.Event.Type)) {
    console.log(`[Webhook] Skipping event type: ${event.type} (not in allowedEvents for sync)`);
    return null;
  }

  let customerId: string | null = null;

  // Extract customer ID - different events have it in different places
  const eventData = event.data.object as any; // Use 'any' for simplicity in accessing various event object structures

  if (eventData.customer) {
    customerId = typeof eventData.customer === 'string' 
      ? eventData.customer 
      : eventData.customer.id; // In some events, customer might be an expanded object
  } else if (eventData.client_reference_id) {
    // Fallback for checkout session if customer isn't immediately available
    console.log(`[Webhook] Using client_reference_id as fallback for customerId: ${eventData.client_reference_id}`);
    customerId = eventData.client_reference_id;
  }

  // Ensure we have a customer ID
  if (typeof customerId !== "string" || !customerId) {
    console.error(`[Webhook Error] Customer ID not found or not a string for event type: ${event.type}. Payload:`, eventData);
    
    // Throw error only for critical subscription events where customerId is always expected
    if (event.type.startsWith('customer.subscription.') || 
        event.type === 'invoice.paid' ||
        event.type === 'checkout.session.completed' || // Added checkout.session.completed
        event.type === 'invoice.payment_succeeded') {
      throw new Error(`Customer ID missing for critical event type: ${event.type}`);
    }
    
    return null; // For non-critical events, just return null
  }

  console.log(`[Webhook] Processing event ${event.type} for customer ${customerId}. Triggering sync...`);
  
  // Call the central sync function to update Redis KV store
  const syncedData = await syncStripeDataToKV(customerId);

  // If sync was successful and it's a critical event, trigger business logic actions
  if (syncedData && criticalEventsForActions.includes(event.type as Stripe.Event.Type)) {
    console.log(`[Webhook] Synced data for ${customerId}, now attempting business logic for ${event.type}.`);
    
    let actionResult = { success: false, message: "No action taken." };
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          actionResult = await handleCheckoutCompletedAction(event.data.object as Stripe.Checkout.Session, syncedData);
          break;
        case 'customer.subscription.created': // Falls through to updated
        case 'customer.subscription.updated':
          actionResult = await handleSubscriptionUpdatedAction(event.data.object as Stripe.Subscription, syncedData, event.type);
          break;
        case 'customer.subscription.deleted':
          actionResult = await handleSubscriptionDeletedAction(event.data.object as Stripe.Subscription, syncedData);
          break;
        case 'invoice.paid':
          actionResult = await handleInvoicePaidAction(event.data.object as Stripe.Invoice, syncedData);
          break;
        case 'invoice.payment_failed':
          actionResult = await handleInvoicePaymentFailedAction(event.data.object as Stripe.Invoice, syncedData);
          break;
        default:
          console.warn(`[Webhook] Critical event ${event.type} has no specific action handler.`);
          actionResult = { success: true, message: `No specific business logic action for ${event.type}, but sync completed.` }; 
          break;
      }
      
      if (actionResult.success) {
        console.log(`[Webhook] Successfully executed business logic for ${event.type} for customer ${customerId}.`);
      } else {
        console.error(`[Webhook] Business logic action for ${event.type} failed for customer ${customerId}: ${actionResult.message}`);
        // Optionally, you could decide not to return syncedData or throw an error if business logic is critical
        // For now, we log and proceed, as idempotency will mark it processed.
      }
    } catch (actionError) {
        console.error(`[Webhook] Error during business logic action for ${event.type} for customer ${customerId}:`, actionError);
        // Similar to above, decide on error handling strategy. Log and proceed for now.
        actionResult = { success: false, message: actionError instanceof Error ? actionError.message : "Unknown error in action handler" };
    }

  } else if (syncedData) {
    console.log(`[Webhook] Event ${event.type} synced for customer ${customerId}, but not in criticalEventsForActions list for further business logic.`);
  } else {
    console.log(`[Webhook] Sync failed or event type ${event.type} not processed for customer ${customerId}, skipping business logic.`);
  }

  return syncedData;
}

// Define return type for webhook handlers
type WebhookHandlerResult = {
  success: boolean;
  message: string;
  data?: any;
};

/**
 * Process a Stripe webhook event
 * @param rawBody Raw request body as string or buffer
 * @param signature Stripe signature header
 * @returns Processing result
 */
export async function processStripeWebhook(
  rawBody: string | Buffer,
  signature: string
): Promise<WebhookHandlerResult> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    // Log error and return immediately to avoid processing without a secret
    console.error('[Webhook Error] STRIPE_WEBHOOK_SECRET is not set. Webhook processing aborted.');
    return {
      success: false, // Indicate failure due to configuration error
      message: 'STRIPE_WEBHOOK_SECRET is not set. Webhook processing cannot continue.',
    };
  }

  let event: Stripe.Event;
  try {
    // Validate webhook signature first
    event = validateStripeWebhookSignature(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error('[Webhook Signature Error] Error validating Stripe webhook signature:', error);
    return {
      success: false, // Indicate failure due to signature validation
      message: error instanceof Error ? error.message : 'Webhook signature validation failed',
    };
  }

  // Idempotency Check
  const eventId = event.id;
  const idempotencyKey = `${PROCESSED_EVENT_ID_PREFIX}${eventId}`;

  try {
    const alreadyProcessed = await redis.get(idempotencyKey);
    if (alreadyProcessed) {
      console.log(`[Webhook Idempotency] Event ${eventId} (${event.type}) already processed. Skipping.`);
      return {
        success: true, // Important: return success to Stripe to prevent retries
        message: `Event ${eventId} (${event.type}) already processed.`,
        data: { eventId, eventType: event.type, processed: true, idempotencyHit: true }
      };
    }

    // Extract basic information for logging and response
    const eventType = event.type;
    console.log(`[Webhook] Processing Stripe event: ${eventId} (${eventType})`);
    
    // Process the event using our centralized handler
    const syncedData = await processEvent(event);
    
    // If the event type wasn't in our allowed list for sync, syncedData will be null
    if (syncedData === null && !allowedEvents.includes(eventType as Stripe.Event.Type)) {
      console.log(`[Webhook] Event ${eventType} was not processed (not in allowedEvents for sync)`);
      return {
        success: true, // Still return success to prevent webhook retries for non-synced events
        message: `Event type ${eventType} does not require subscription sync or further processing.`,
        data: { eventType, eventId, processed: false, reason: "Not in allowedEvents for sync" }
      };
    }
    
    // If processEvent was successful (even if no specific business logic ran for non-critical events),
    // mark this event ID as processed for idempotency.
    // This handles cases where an event might only sync KV but not trigger deeper business logic.
    if (syncedData !== undefined) { // Check if processEvent ran (syncedData can be null for allowed but non-critical events)
        await redis.set(idempotencyKey, "processed");
        await redis.expire(idempotencyKey, EVENT_ID_TTL_SECONDS);
        console.log(`[Webhook Idempotency] Marked event ${eventId} (${eventType}) as processed.`);
    }


    // Extract customerId from the event data for response, if available after processing
    let customerIdFromEvent: string | null = null;
    const eventDataObject = event.data.object as any;
    if (eventDataObject.customer) {
      customerIdFromEvent = typeof eventDataObject.customer === 'string' 
        ? eventDataObject.customer 
        : eventDataObject.customer.id;
    } else if (eventDataObject.client_reference_id && eventType === "checkout.session.completed") {
        customerIdFromEvent = eventDataObject.client_reference_id;
    }


    if (syncedData === null && allowedEvents.includes(eventType as Stripe.Event.Type)) {
        // This case implies sync was attempted for an allowed event but failed or resulted in no data.
        // The error would have been logged in syncStripeDataToKV or processEvent.
        // Still, mark event as processed to avoid retries on transient errors if that's desired,
        // or handle specific errors from syncStripeDataToKV if it throws them.
        // For now, we assume if we reach here and syncedData is null for an allowed event,
        // something went wrong during sync that was logged.
         console.log(`[Webhook] Event ${eventType} (ID: ${eventId}) was in allowedEvents, but sync resulted in null. Marked as processed.`);
         // Ensure it's marked processed even if sync failed to prevent endless retries on certain errors
         await redis.set(idempotencyKey, "processed_sync_failed");
         await redis.expire(idempotencyKey, EVENT_ID_TTL_SECONDS);
         return {
            success: true, // Return true to Stripe, error is internal
            message: `Event ${eventType} sync resulted in no data or an error during sync. Marked as processed.`,
            data: { eventType, eventId, customerId: customerIdFromEvent, processed: true, syncStatus: "failed_or_no_data" }
         };
    }


    console.log(`[Webhook] Successfully processed event ${eventId} (${eventType}) for customer ${customerIdFromEvent}`);
    return {
      success: true,
      message: `Successfully processed ${eventType} event`,
      data: {
        eventType,
        eventId,
        customerId: customerIdFromEvent, // Use customerId extracted here
        syncedData, // This could be null if the event type isn't in criticalEventsForActions or sync failed
        processed: true,
        idempotencyHit: false
      }
    };
    
  } catch (error) {
    // Catch any other errors, including those from processEvent if not caught internally
    // or from Redis operations if not specifically handled.
    console.error(`[Webhook Error] Unhandled error processing Stripe webhook event ${event ? event.id : 'unknown_event_id'}:`, error);
    
    // Attempt to mark as processed even on unhandled error to prevent retries for some error classes
    // This is debatable and depends on whether you want retries for certain unhandled exceptions.
    // For now, we won't mark as processed here to allow Stripe to retry if it's a transient issue.
    // if (event && event.id) {
    //   // await redis.setex(`${PROCESSED_EVENT_ID_PREFIX}${event.id}`, EVENT_ID_TTL_SECONDS, "processed_unhandled_error");
    // }

    return {
      success: false, // Important: return false to Stripe for it to retry on errors.
      message: error instanceof Error ? error.message : 'Unknown error processing webhook'
    };
  }
}

/**
 * Handle checkout.session.completed event
 */
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
): Promise<WebhookHandlerResult> {
  try {
    // Extract metadata
    const userId = session.metadata?.userId;
    const customerId = session.customer as string;
    
    if (!userId || !customerId) {
      throw new Error('Missing userId or customerId in checkout session');
    }
    
    // Extract planId from metadata if available
    const planId = session.metadata?.planId;
    
    return {
      success: true,
      message: 'Successfully processed checkout completion',
      data: {
        userId,
        customerId,
        planId
      }
    };
  } catch (error) {
    console.error('Error handling checkout session completed:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error in checkout handler'
    };
  }
}

/**
 * Handle subscription created/updated events
 */
async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  eventType: string
): Promise<WebhookHandlerResult> {
  try {
    const customerId = subscription.customer as string;
    const subscriptionId = subscription.id;
    const subscriptionStatus = subscription.status;
    
    if (!customerId) {
      throw new Error('Missing customerId in subscription');
    }
    
    // Get the product to determine the plan
    const productId = subscription.items.data[0]?.price.product as string;
    const stripe = getStripe();
    const product = await stripe.products.retrieve(productId);
    
    // Determine plan ID from product metadata
    const planId = getPlanFromStripeMetadata(product.metadata);
    
    // Determine effective membership based on subscription status
    // Only 'active' or 'trialing' subscriptions grant paid access
    const effectivePlanId: PlanId = (subscriptionStatus === 'active' || subscriptionStatus === 'trialing')
      ? planId
      : 'starter';
    
    // Extract metadata from subscription if available
    const metadata = subscription.metadata || {};
    const userId = metadata.userId || product.metadata.userId || null;
    
    // Extract current period info
    const currentPeriodStart = new Date((subscription as any).current_period_start * 1000);
    const currentPeriodEnd = new Date((subscription as any).current_period_end * 1000);
    
    return {
      success: true,
      message: `Successfully processed subscription ${eventType === 'customer.subscription.created' ? 'creation' : 'update'}`,
      data: {
        customerId,
        subscriptionId,
        planId: effectivePlanId,
        subscriptionStatus,
        userId,
        currentPeriodStart,
        currentPeriodEnd
      }
    };
  } catch (error) {
    console.error('Error handling subscription update:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error in subscription handler'
    };
  }
}

/**
 * Handle subscription deleted event
 */
async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<WebhookHandlerResult> {
  try {
    const customerId = subscription.customer as string;
    const subscriptionId = subscription.id;
    
    if (!customerId) {
      throw new Error('Missing customerId in deleted subscription');
    }
    
    // Extract userId from metadata if available
    const userId = subscription.metadata?.userId;
    
    return {
      success: true,
      message: 'Successfully processed subscription deletion',
      data: {
        customerId,
        subscriptionId,
        userId,
        newPlanId: 'starter' // Always downgrade to starter plan
      }
    };
  } catch (error) {
    console.error('Error handling subscription deletion:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error in subscription deletion handler'
    };
  }
}

/**
 * Handle invoice payment succeeded event
 */
async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice
): Promise<WebhookHandlerResult> {
  try {
    const customerId = invoice.customer as string;
    const sub = (invoice as any).subscription;
    const subscriptionId = typeof sub === 'string' ? sub : (sub && sub.id ? sub.id : null);
    
    if (!customerId || !subscriptionId) {
      throw new Error('Missing customerId or subscriptionId in invoice');
    }
    
    // Extract additional useful information
    const amountPaid = invoice.amount_paid;
    const currency = invoice.currency;
    const invoiceId = invoice.id;
    const billingReason = invoice.billing_reason;
    
    return {
      success: true,
      message: 'Successfully processed invoice payment',
      data: {
        customerId,
        subscriptionId,
        amount: amountPaid,
        currency,
        invoiceId,
        billingReason
      }
    };
  } catch (error) {
    console.error('Error handling invoice payment:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error in invoice payment handler'
    };
  }
}

/**
 * Handle invoice payment failed event
 */
async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice
): Promise<WebhookHandlerResult> {
  try {
    const customerId = invoice.customer as string;
    const sub = (invoice as any).subscription;
    const subscriptionId = typeof sub === 'string' ? sub : (sub && sub.id ? sub.id : null);
    
    if (!customerId || !subscriptionId) {
      throw new Error('Missing customerId or subscriptionId in failed invoice');
    }
    
    // Extract additional useful information
    const invoiceId = invoice.id;
    const attemptCount = invoice.attempt_count;
    const nextPaymentAttempt = invoice.next_payment_attempt 
      ? new Date(invoice.next_payment_attempt * 1000) 
      : null;
    
    return {
      success: true,
      message: 'Successfully processed failed invoice payment',
      data: {
        customerId,
        subscriptionId,
        invoiceId,
        attemptCount,
        nextPaymentAttempt
      }
    };
  } catch (error) {
    console.error('Error handling failed invoice payment:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error in failed payment handler'
    };
  }
} 