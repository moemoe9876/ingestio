// Define quotas clearly
export const FREE_PLAN_DOC_QUOTA = 10;
export const STANDARD_PLAN_DOC_QUOTA = 100;
export const PRO_PLAN_DOC_QUOTA = 500;

// Define batch limits
export const BATCH_PROCESSING_LIMIT_STANDARD = 25; // Max docs per batch job for Standard
export const BATCH_PROCESSING_LIMIT_PRO = 100; // Max docs per batch job for Pro

// Define Plan IDs type
export type PlanId = 'free' | 'basic' | 'pro';

// Define the structure for a subscription plan
export interface SubscriptionPlan {
  planId: PlanId;
  name: string;
  description: string;
  priceMonthly: number | null; // Null for free
  priceYearly: number | null; // Null for free
  stripePriceIdMonthly: string | null;
  stripePriceIdYearly: string | null;
  documentQuota: number;
  batchProcessing: boolean;
  batchProcessingLimit: number; // Max docs per batch job
  apiAccess: false; // Explicitly false for all tiers
  prioritySupport: boolean;
  dataRetentionDays: number;
  exportFormats: string[];
  isPopular?: boolean;
}

// Define the actual plans
export const subscriptionPlans: Record<PlanId, SubscriptionPlan> = {
  free: {
    planId: 'free',
    name: 'Free',
    description: 'For personal use and evaluation',
    priceMonthly: 0,
    priceYearly: 0,
    stripePriceIdMonthly: null, // No Stripe ID needed for free
    stripePriceIdYearly: null,
    documentQuota: FREE_PLAN_DOC_QUOTA,
    batchProcessing: false,
    batchProcessingLimit: 0,
    apiAccess: false,
    prioritySupport: false,
    dataRetentionDays: 30,
    exportFormats: ['JSON', 'CSV'],
  },
  basic: {
    planId: 'basic',
    name: 'Basic',
    description: 'For professionals with regular needs',
    priceMonthly: 9.99,
    priceYearly: 99.90, // ~2 months free
    stripePriceIdMonthly: process.env.STRIPE_PRICE_BASIC_MONTHLY || null,
    stripePriceIdYearly: process.env.STRIPE_PRICE_BASIC_YEARLY || null,
    documentQuota: STANDARD_PLAN_DOC_QUOTA,
    batchProcessing: true, // Enable batch processing for Standard
    batchProcessingLimit: BATCH_PROCESSING_LIMIT_STANDARD,
    apiAccess: false,
    prioritySupport: false, // Standard support
    dataRetentionDays: 90,
    exportFormats: ['JSON', 'CSV', 'Excel'],
    isPopular: true,
  },
  pro: {
    planId: 'pro',
    name: 'Pro',
    description: 'For businesses needing automation',
    priceMonthly: 19.99,
    priceYearly: 199.90, // ~2 months free
    stripePriceIdMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY || null,
    stripePriceIdYearly: process.env.STRIPE_PRICE_PRO_YEARLY || null,
    documentQuota: PRO_PLAN_DOC_QUOTA,
    batchProcessing: true, // Enable batch processing for Pro
    batchProcessingLimit: BATCH_PROCESSING_LIMIT_PRO,
    apiAccess: false, // API Access explicitly disabled
    prioritySupport: true, // Add priority support for Pro
    dataRetentionDays: 365,
    exportFormats: ['JSON', 'CSV', 'Excel'],
  },
};

// Helper function to get plan details by PlanId
export function getPlanById(planId: PlanId): SubscriptionPlan | undefined {
    return subscriptionPlans[planId];
}

// Helper function to get plan details by Stripe Price ID
export function getPlanByStripePriceId(priceId: string): SubscriptionPlan | undefined {
    for (const planKey in subscriptionPlans) {
        const plan = subscriptionPlans[planKey as PlanId];
        // Check both monthly and yearly IDs
        if (plan.stripePriceIdMonthly === priceId || plan.stripePriceIdYearly === priceId) {
            return plan;
        }
    }
    // Return free plan if no paid plan matches (or handle as needed)
    return subscriptionPlans.free;
}

// Helper function to get plan details by Stripe Product ID (requires metadata on Product)
export function getPlanByStripeProductId(productId: string): SubscriptionPlan | undefined {
    // This assumes you have added 'planId' metadata to your Stripe Products
    for (const planKey in subscriptionPlans) {
        const plan = subscriptionPlans[planKey as PlanId];
        // You might need to fetch the product from Stripe first to check metadata,
        // or rely on a naming convention if metadata isn't feasible during webhook handling.
        // This example assumes a direct mapping for simplicity, adjust as needed.
        if (plan.planId === productId) { // Placeholder logic - needs refinement
             return plan;
        }
    }
    return subscriptionPlans.free;
} 