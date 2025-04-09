// Define quotas based on pricing recommendations
export const STARTER_PLAN_DOC_QUOTA = 25;  // Free tier
export const PLUS_PLAN_DOC_QUOTA = 250;    // $9.99/month
export const GROWTH_PLAN_DOC_QUOTA = 500;  // $19.99/month

// Define batch limits
export const BATCH_PROCESSING_LIMIT_PLUS = 25;    // Max docs per batch job for Plus
export const BATCH_PROCESSING_LIMIT_GROWTH = 100; // Max docs per batch job for Growth

// Define retention periods
export const RETENTION_DAYS_STARTER = 30;  // 1 month
export const RETENTION_DAYS_PLUS = 90;     // 3 months
export const RETENTION_DAYS_GROWTH = 365;  // 1 year

// Define Plan IDs type for pricing model
export type PlanId = 'starter' | 'plus' | 'growth';

// Define the structure for a subscription plan
export interface SubscriptionPlan {
  planId: PlanId;
  name: string;
  description: string;
  priceMonthly: number; // in USD, 0 for free
  stripePriceIdMonthly: string | null;
  documentQuota: number;
  batchProcessing: boolean;
  batchProcessingLimit: number; // Max docs per batch job
  supportLevel: 'community' | 'email' | 'priority';
  dataRetentionDays: number;
  exportFormats: string[];
  isPopular?: boolean;
}

// Define the actual plans according to pricing recommendations
export const subscriptionPlans: Record<PlanId, SubscriptionPlan> = {
  starter: {
    planId: 'starter',
    name: 'Starter',
    description: 'Individuals exploring document extraction',
    priceMonthly: 0,
    stripePriceIdMonthly: null, // Free plan
    documentQuota: STARTER_PLAN_DOC_QUOTA,
    batchProcessing: false,
    batchProcessingLimit: 1, // Effectively no batch processing
    supportLevel: 'community',
    dataRetentionDays: RETENTION_DAYS_STARTER,
    exportFormats: ['JSON', 'CSV', 'Excel'],
  },
  plus: {
    planId: 'plus',
    name: 'Plus',
    description: 'Professionals with regular extraction needs',
    priceMonthly: 9.99,
    stripePriceIdMonthly: process.env.STRIPE_PRICE_PLUS_MONTHLY || null,
    documentQuota: PLUS_PLAN_DOC_QUOTA,
    batchProcessing: true,
    batchProcessingLimit: BATCH_PROCESSING_LIMIT_PLUS,
    supportLevel: 'email',
    dataRetentionDays: RETENTION_DAYS_PLUS,
    exportFormats: ['JSON', 'CSV', 'Excel'],
    isPopular: true, // Marking Plus as popular tier
  },
  growth: {
    planId: 'growth',
    name: 'Growth',
    description: 'Businesses & Power Users with higher volume',
    priceMonthly: 19.99,
    stripePriceIdMonthly: process.env.STRIPE_PRICE_GROWTH_MONTHLY || null,
    documentQuota: GROWTH_PLAN_DOC_QUOTA,
    batchProcessing: true,
    batchProcessingLimit: BATCH_PROCESSING_LIMIT_GROWTH,
    supportLevel: 'priority',
    dataRetentionDays: RETENTION_DAYS_GROWTH,
    exportFormats: ['JSON', 'CSV', 'Excel'],
  },
};

// Helper function to get plan details by PlanId
export function getPlanById(planId: PlanId): SubscriptionPlan {
    return subscriptionPlans[planId] || subscriptionPlans.starter;
}

// Helper function to get plan details by Stripe Price ID
export function getPlanByStripePriceId(priceId: string): SubscriptionPlan | undefined {
    for (const planKey in subscriptionPlans) {
        const plan = subscriptionPlans[planKey as PlanId];
        if (plan.stripePriceIdMonthly === priceId) {
            return plan;
        }
    }
    // Return undefined if no match found
    return undefined;
}

// Helper function to determine plan from stripe product metadata
export function getPlanFromStripeMetadata(metadata: Record<string, string>): PlanId {
    if (!metadata || !metadata.planId || !['starter', 'plus', 'growth'].includes(metadata.planId)) {
        return 'starter'; // Default to starter if no valid plan ID found
    }
    
    return metadata.planId as PlanId;
}

// Helper to check if user has reached document quota
export function hasReachedQuota(currentUsage: number, planId: PlanId): boolean {
    const plan = getPlanById(planId);
    return currentUsage >= plan.documentQuota;
}

// Helper to check if batch size is allowed for plan
export function isBatchSizeAllowed(batchSize: number, planId: PlanId): boolean {
    const plan = getPlanById(planId);
    
    // Check if batch processing is allowed at all
    if (!plan.batchProcessing) {
        return batchSize <= 1; // Only allow single document processing
    }
    
    // Check if batch size is within limits
    return batchSize <= plan.batchProcessingLimit;
} 