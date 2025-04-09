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
        return await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      
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
    
    // Here you would update your database with customer information
    // For example, update the user's profile with the Stripe customer ID
    // This would likely call a database action like updateUserProfile
    
    return {
      success: true,
      message: 'Successfully processed checkout completion',
      data: {
        userId,
        customerId
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
  subscription: Stripe.Subscription
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
    
    // Here you would update your database with subscription information
    // For example, update the user's profile with their plan and subscription ID
    // This would likely call a database action like updateUserSubscription
    
    return {
      success: true,
      message: 'Successfully processed subscription update',
      data: {
        customerId,
        subscriptionId,
        planId: effectivePlanId,
        subscriptionStatus
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
    
    if (!customerId) {
      throw new Error('Missing customerId in deleted subscription');
    }
    
    // Here you would update your database when a subscription is canceled
    // For example, downgrade the user to the free plan
    // This would likely call a database action like downgradeUserSubscription
    
    return {
      success: true,
      message: 'Successfully processed subscription deletion',
      data: {
        customerId,
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
    
    // Here you would update your database to record successful payment
    // For example, update payment status and extend billing period
    // This would likely call a database action like recordSuccessfulPayment
    
    return {
      success: true,
      message: 'Successfully processed invoice payment',
      data: {
        customerId,
        subscriptionId,
        amount: invoice.amount_paid
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
    
    // Here you would update your database to record failed payment
    // For example, mark subscription as past due and notify the user
    // This would likely call a database action like recordFailedPayment
    
    return {
      success: true,
      message: 'Successfully processed failed invoice payment',
      data: {
        customerId,
        subscriptionId,
        attempt: invoice.attempt_count
      }
    };
  } catch (error) {
    console.error('Error handling failed invoice payment:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error in failed invoice handler'
    };
  }
} 