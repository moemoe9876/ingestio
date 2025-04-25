import { StripeCustomerDataKV, StripePaymentMethod, StripeSubscriptionData, customerDataKey } from '@/types/stripe-kv-types'; // Added StripePaymentMethod import
import Stripe from 'stripe';
import { getPlanByStripePriceId } from '../config/subscription-plans'; // Adjusted path assuming subscription-plans.ts is in lib/config
import { redis } from '../redis/client'; // Adjusted path assuming client.ts is in lib/redis
import { getStripe } from './config';

/**
 * Fetches the latest subscription data from Stripe for a customer
 * and updates the Redis KV store.
 * @param customerId The Stripe Customer ID.
 * @returns The data stored in Redis (either subscription details or { status: 'none' }).
 * @throws Throws an error if the Stripe API call fails or Redis update fails critically.
 */
export async function syncStripeDataToKV(customerId: string): Promise<StripeCustomerDataKV> {
  const stripe = getStripe();
  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1, // Assuming one active subscription per customer max
      status: "all", // Fetch all to correctly handle ended/canceled subs
      expand: ["data.default_payment_method"],
    });

    if (subscriptions.data.length === 0) {
      const subData: StripeCustomerDataKV = { status: 'none', customerId: null };
      await redis.set(customerDataKey(customerId), subData);
      console.log(`[Sync] No active subscription found for customer ${customerId}. Stored 'none' status.`);
      return subData;
    }

    const subscription = subscriptions.data[0];
    const priceId = subscription.items.data[0]?.price.id ?? null;
    const plan = priceId ? getPlanByStripePriceId(priceId) : undefined;

    // Extract payment method details safely
    let paymentMethod: StripePaymentMethod | null = null; // Explicitly type as potentially null
    if (subscription.default_payment_method && typeof subscription.default_payment_method !== 'string') {
      const pm = subscription.default_payment_method as Stripe.PaymentMethod;
      if (pm.card) {
        paymentMethod = {
          brand: pm.card.brand ?? null,
          last4: pm.card.last4 ?? null,
        };
      }
      // Add checks for other payment method types if needed (e.g., sepa_debit, us_bank_account)
    }

    // Construct the data object to store in Redis
    const subData: StripeSubscriptionData = {
      subscriptionId: subscription.id,
      customerId: customerId,
      status: subscription.status as Stripe.Subscription.Status,
      priceId: priceId,
      planId: plan?.planId ?? null,
      currentPeriodStart: subscription.current_period_start,
      currentPeriodEnd: subscription.current_period_end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      paymentMethod: paymentMethod,
    };

    // Store the fetched and processed data in Redis
    await redis.set(customerDataKey(customerId), subData);
    console.log(`[Sync] Synced subscription ${subscription.id} (Status: ${subscription.status}) for customer ${customerId}.`);
    return subData;

  } catch (error) {
    console.error(`[Sync Error] Failed to sync data for customer ${customerId}:`, error);

    // Fallback: Attempt to store 'none' status in Redis on error to prevent stale data issues
    const errorData: StripeCustomerDataKV = { status: 'none', customerId: null };
    try {
      await redis.set(customerDataKey(customerId), errorData);
      console.warn(`[Sync Error Fallback] Stored 'none' status in Redis for customer ${customerId} due to sync failure.`);
    } catch (redisError) {
       console.error(`[Sync Error Fallback] CRITICAL: Failed to store 'none' status in Redis for customer ${customerId} after primary sync error:`, redisError);
       // Depending on requirements, you might still want to throw the original error
    }

    // Re-throw the original error after attempting the fallback
    throw error;
  }
}