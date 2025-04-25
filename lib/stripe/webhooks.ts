/*
 * Stripe webhook handling functions
 * Processes events from Stripe for subscription management
 */

import { getPlanFromStripeMetadata, type PlanId } from '@/lib/config/subscription-plans';
import { StripeCustomerDataKV } from '@/types/stripe-kv-types';
import { type Stripe } from 'stripe';
import { getStripe, validateStripeWebhookSignature } from './config';
import { syncStripeDataToKV } from './sync';

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
    console.log(`[Webhook] Skipping event type: ${event.type}`);
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
        event.type === 'invoice.payment_succeeded') {
      throw new Error(`Customer ID missing for critical event type: ${event.type}`);
    }
    
    return null; // For non-critical events, just return null
  }

  console.log(`[Webhook] Processing event ${event.type} for customer ${customerId}. Triggering sync...`);
  
  // Call the central sync function to update Redis KV store
  return await syncStripeDataToKV(customerId);
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
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not set');
    }

    // Validate webhook signature
    const event = validateStripeWebhookSignature(rawBody, signature, webhookSecret);
    
    // Extract basic information for logging and response
    const eventType = event.type;
    const eventId = event.id;
    console.log(`[Webhook] Processing Stripe event: ${eventId} (${eventType})`);
    
    // Process the event using our centralized handler
    const syncedData = await processEvent(event);
    
    // Extract customerId from the event data for response
    let customerId: string | null = null;
    const eventData = event.data.object as any;
    if (eventData.customer) {
      customerId = typeof eventData.customer === 'string' 
        ? eventData.customer 
        : eventData.customer.id;
    }
    
    // If the event type wasn't in our allowed list, syncedData will be null
    if (syncedData === null) {
      console.log(`[Webhook] Event ${eventType} was not processed (not in allowed list)`);
      return {
        success: true, // Still return success to prevent webhook retries
        message: `Event type ${eventType} does not require subscription sync`,
        data: { eventType, customerId, processed: false }
      };
    }
    
    console.log(`[Webhook] Successfully synced data for customer ${customerId} from event ${eventType}`);
    return {
      success: true,
      message: `Successfully processed ${eventType} event`,
      data: {
        eventType,
        customerId,
        syncedData,
        processed: true
      }
    };
    
  } catch (error) {
    console.error('Error processing Stripe webhook:', error);
    return {
      success: false,
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
    const currentPeriodStart = new Date(subscription.current_period_start * 1000);
    const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
    
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
    const subscriptionId = invoice.subscription as string;
    
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
    const subscriptionId = invoice.subscription as string;
    
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