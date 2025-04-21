/*
 * Stripe webhook handling functions
 * Processes events from Stripe for subscription management
 */

import { getPlanFromStripeMetadata, type PlanId } from '@/lib/config/subscription-plans';
import { type Stripe } from 'stripe';
import { getStripe, validateStripeWebhookSignature } from './config';

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
    
    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        return await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        return await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, event.type);
      
      case 'customer.subscription.deleted':
        return await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      
      case 'invoice.payment_succeeded':
        return await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
      
      case 'invoice.payment_failed':
        return await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        
      default:
        // Log unhandled event but return success to avoid webhook retries
        console.log(`Unhandled Stripe event type: ${event.type}`);
        return {
          success: true,
          message: `Unhandled Stripe event: ${event.type}`
        };
    }
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