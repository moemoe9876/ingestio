/*
 * Stripe configuration with enhanced security measures
 */

import Stripe from "stripe";

// Create and export a properly configured Stripe instance
export function getStripeClient(): Stripe {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  
  if (!apiKey) {
    throw new Error('STRIPE_SECRET_KEY environment variable is missing');
  }
  
  // Let the SDK use its default apiVersion for broader compatibility
  // and to avoid type errors with specific version strings.
  return new Stripe(apiKey, {
    appInfo: {
      name: "Ingestio",
      version: "1.0.0", // Track your app version
      url: process.env.NEXT_PUBLIC_APP_URL // Optional: Add your app URL for Stripe dashboard
    },
    maxNetworkRetries: 3, // Add retry capability for better reliability
    timeout: 30000 // 30 seconds timeout
  });
}

// Singleton instance of Stripe for server-side operations
let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    stripeInstance = getStripeClient();
  }
  return stripeInstance;
}

// Helper to create a customer in Stripe
export async function createStripeCustomer(email: string, name?: string, metadata?: Record<string, string>): Promise<Stripe.Customer> {
  const stripe = getStripe();
  
  try {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata
    });
    
    return customer;
  } catch (error) {
    console.error('Error creating Stripe customer:', error);
    throw new Error('Failed to create Stripe customer');
  }
}

// Helper to retrieve a customer from Stripe
export async function getStripeCustomer(customerId: string): Promise<Stripe.Customer> {
  const stripe = getStripe();
  
  try {
    return await stripe.customers.retrieve(customerId) as Stripe.Customer;
  } catch (error) {
    console.error(`Error retrieving Stripe customer ${customerId}:`, error);
    throw new Error('Failed to retrieve Stripe customer');
  }
}

// Validate a Stripe webhook signature
export function validateStripeWebhookSignature(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
): Stripe.Event {
  const stripe = getStripe();
  
  try {
    return stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    );
  } catch (error) {
    console.error('Error validating Stripe webhook signature:', error);
    throw new Error('Invalid Stripe webhook signature');
  }
} 