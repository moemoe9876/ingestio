// Client-Side Stripe Utilities
import { loadStripe, Stripe } from '@stripe/stripe-js';


let stripePromise: Promise<Stripe | null>;

export const getStripe = (): Promise<Stripe | null> => {
  if (!stripePromise) {
    const publicKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!publicKey) {
      console.error("Stripe publishable key is not set.");
      return Promise.resolve(null); // Handle missing key gracefully
    }
    stripePromise = loadStripe(publicKey);
  }
  return stripePromise;
}; 