/*
 * Client-Side Stripe Utilities for Ingestio
 * Handles client-side Stripe integration with proper error handling.
 */

import { loadStripe, Stripe } from '@stripe/stripe-js';

// Single instance of the Stripe promise to avoid multiple loads
let stripePromise: Promise<Stripe | null>;

/**
 * Get a singleton instance of the Stripe client for client-side use
 * @returns A Promise resolving to the Stripe client or null if loading fails
 */
export const getStripeClient = (): Promise<Stripe | null> => {
  if (!stripePromise) {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    
    if (!publishableKey) {
      console.error("Stripe publishable key is not set in environment variables");
      return Promise.resolve(null);
    }
    
    stripePromise = loadStripe(publishableKey).catch(error => {
      console.error("Failed to load Stripe:", error);
      return null;
    });
  }
  
  return stripePromise;
};

/**
 * Create a checkout session for a subscription plan
 * @param planId The ID of the subscription plan ('plus' or 'growth')
 * @param userId The user's ID
 * @returns Promise resolving to a Stripe Checkout session ID or null on error
 */
export const createCheckoutSession = async (planId: string, userId: string): Promise<string | null> => {
  try {
    const response = await fetch('/api/stripe/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ planId, userId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create checkout session');
    }

    const { sessionId } = await response.json();
    return sessionId;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return null;
  }
};

/**
 * Redirect to Stripe Checkout for subscription purchase
 * @param planId The ID of the subscription plan ('plus' or 'growth')
 * @param userId The user's ID
 * @returns Promise resolving to true if redirect successful, false otherwise
 */
export const redirectToCheckout = async (planId: string, userId: string): Promise<boolean> => {
  try {
    // Get the Stripe instance
    const stripe = await getStripeClient();
    if (!stripe) {
      throw new Error('Stripe failed to load');
    }
    
    // Create a checkout session
    const sessionId = await createCheckoutSession(planId, userId);
    if (!sessionId) {
      throw new Error('Failed to create checkout session');
    }
    
    // Redirect to checkout
    const { error } = await stripe.redirectToCheckout({ sessionId });
    
    if (error) {
      throw new Error(error.message);
    }
    
    return true;
  } catch (error) {
    console.error('Error redirecting to checkout:', error);
    return false;
  }
}; 