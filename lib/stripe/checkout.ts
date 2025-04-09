/*
 * Server-side checkout functionality for Stripe
 */

import { getPlanById } from '@/lib/config/subscription-plans';
import { type Stripe } from 'stripe';
import { getStripe } from './config';

interface CreateCheckoutSessionOptions {
  planId: string;
  userId: string;
  customerEmail?: string;
  customerId?: string;
  successUrl?: string;
  cancelUrl?: string;
}

/**
 * Create a Stripe checkout session for subscription purchase
 */
export async function createCheckoutSession({
  planId,
  userId,
  customerEmail,
  customerId,
  successUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success`,
  cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/pricing?checkout=canceled`
}: CreateCheckoutSessionOptions): Promise<Stripe.Checkout.Session> {
  // Validate inputs
  if (!planId || !userId) {
    throw new Error('planId and userId are required for checkout');
  }
  
  // Validate that the plan exists and has a price ID
  const plan = getPlanById(planId as any);
  
  if (!plan || plan.priceMonthly === 0) {
    throw new Error(`Invalid plan: ${planId}`);
  }
  
  if (!plan.stripePriceIdMonthly) {
    throw new Error(`No Stripe price ID configured for plan: ${planId}`);
  }
  
  // Get Stripe instance
  const stripe = getStripe();
  
  try {
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      billing_address_collection: 'auto',
      customer: customerId,
      customer_email: !customerId ? customerEmail : undefined,
      line_items: [
        {
          price: plan.stripePriceIdMonthly,
          quantity: 1
        }
      ],
      mode: 'subscription',
      subscription_data: {
        metadata: {
          userId,
          planId
        }
      },
      metadata: {
        userId,
        planId
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true
    });
    
    return session;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw new Error('Failed to create checkout session');
  }
}

/**
 * Create a Stripe billing portal session for managing subscriptions
 */
export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
): Promise<Stripe.BillingPortal.Session> {
  if (!customerId) {
    throw new Error('customerId is required for billing portal');
  }
  
  const stripe = getStripe();
  
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl
    });
    
    return session;
  } catch (error) {
    console.error('Error creating billing portal session:', error);
    throw new Error('Failed to create billing portal session');
  }
} 