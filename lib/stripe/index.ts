/*
 * Stripe module index file
 * Exports all Stripe-related utilities for easy importing
 */

// Export server-side Stripe utilities
export {
    createStripeCustomer, getStripe,
    getStripeClient, getStripeCustomer,
    validateStripeWebhookSignature
} from './config';

// Export checkout functionality
export {
    createBillingPortalSession, createCheckoutSession
} from './checkout';

// Export webhook handlers
export {
    processStripeWebhook
} from './webhooks';

// Export client-side utilities
export {
    createCheckoutSession as createClientCheckoutSession, getStripeClient as getStripeClientBrowser, redirectToCheckout
} from './client';
