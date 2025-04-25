import type Stripe from 'stripe'

// Status can be any valid Stripe status OR 'none' if no active sub
export type StripeSubscriptionStatus = Stripe.Subscription.Status | 'none'

export type StripePaymentMethod = {
  brand: string | null // e.g., "visa", "mastercard"
  last4: string | null // e.g., "4242"
} | null

// Core subscription data stored in KV
export type StripeSubscriptionData = {
  subscriptionId: string | null
  customerId: string | null
  status: StripeSubscriptionStatus
  priceId: string | null // Stripe Price ID (e.g., price_123abc)
  planId: string | null // Your internal plan ID ('starter', 'plus', 'growth')
  currentPeriodStart: number | null // Unix timestamp
  currentPeriodEnd: number | null // Unix timestamp
  cancelAtPeriodEnd: boolean
  paymentMethod: StripePaymentMethod
}

// Represents the complete data stored in Redis for a customer
// This combines the core data structure with the 'none' status possibility.
export type StripeCustomerDataKV = (StripeSubscriptionData & { customerId: string }) | { status: 'none'; customerId?: null }

/**
 * Helper function to generate the key for user ID -> customer ID mapping
 * @param userId The internal user ID
 * @returns Redis key for storing/retrieving the Stripe customer ID
 */
export const userToCustomerKey = (userId: string): string => `stripe:user:${userId}`

/**
 * Helper function to generate the key for customer subscription data
 * @param customerId The Stripe customer ID
 * @returns Redis key for storing/retrieving subscription data
 */
export const customerDataKey = (customerId: string): string => `stripe:customer:${customerId}`