import { Ratelimit } from '@upstash/ratelimit'
import { redis } from '../redis'

/**
 * Rate limiting implementation for Ingestion.io
 * 
 * IMPORTANT: The rate limiting system uses a dual approach:
 * 1. Monthly page quotas (25/250/500 pages) are tracked in the database via user_usage tables
 * 2. Request rate limits (RPM) are enforced using Upstash Redis with sliding windows
 * 
 * This hybrid approach provides both long-term quota tracking and short-term
 * request rate protection against API abuse.
 */

// Tier-based limits from pricing recommendations
export const RATE_LIMIT_TIERS = {
  // Starter (Free) tier - 25 pages per month
  starter: {
    pagesPerMonth: 25,
    maxBatchSize: 1, // No batch processing
    requestsPerMinute: 10 // Conservative limit for API requests
  },
  // Plus tier - 250 pages per month, batch up to 25
  plus: {
    pagesPerMonth: 250,
    maxBatchSize: 25,
    requestsPerMinute: 20
  },
  // Growth tier - 500 pages per month, batch up to 100
  growth: {
    pagesPerMonth: 500,
    maxBatchSize: 100,
    requestsPerMinute: 30
  }
}

// Define subscription tier types
export type SubscriptionTier = 'starter' | 'plus' | 'growth'

/**
 * Factory function to create a rate limiter for a specific user and action
 * @param userId The user's ID
 * @param tier The user's subscription tier
 * @param action The action to create a rate limiter for (e.g., 'extraction', 'api')
 * @returns A rate limiter instance
 */
export function createRateLimiter(
  userId: string,
  tier: SubscriptionTier,
  action: string
) {
  const limit = RATE_LIMIT_TIERS[tier].requestsPerMinute

  // Disable analytics when running in test mode
  const isTestMode = process.env.NODE_ENV === 'test' || process.env.VITEST

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, '1 m'),
    analytics: !isTestMode, // Disable analytics in test mode
    prefix: `ratelimit:${action}` // Use a prefix to separate different rate limiters
  })
}

/**
 * Check if a user has exceeded their rate limit for a specific action
 * @param userId The user's ID
 * @param tier The user's subscription tier
 * @param action The action to check the rate limit for
 * @returns An object with rate limit information
 */
export async function checkRateLimit(
  userId: string,
  tier: SubscriptionTier,
  action: string
) {
  const limiter = createRateLimiter(userId, tier, action)
  return await limiter.limit(userId)
}

/**
 * Global rate limiter for the application
 * Used to protect the application from excessive requests
 */
export const globalRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
  analytics: true,
  prefix: 'ratelimit:global'
})

/**
 * Check if a batch size exceeds the user's tier limit
 * @param tier The user's subscription tier
 * @param batchSize The requested batch size
 * @returns True if the batch size is allowed, false otherwise
 */
export function isBatchSizeAllowed(tier: SubscriptionTier, batchSize: number): boolean {
  return batchSize <= RATE_LIMIT_TIERS[tier].maxBatchSize
}

/**
 * Calculate the number of remaining pages for a user in the current billing period
 * @param tier The user's subscription tier
 * @param pagesUsed The number of pages already used in the current period
 * @returns The number of remaining pages
 */
export function getRemainingPages(tier: SubscriptionTier, pagesUsed: number): number {
  const pagesLimit = RATE_LIMIT_TIERS[tier].pagesPerMonth
  return Math.max(0, pagesLimit - pagesUsed)
}

/**
 * Check if a user has enough page quota remaining for a requested number of pages
 * @param tier The user's subscription tier
 * @param pagesUsed The number of pages already used in the current period
 * @param pagesRequested The number of pages requested
 * @returns True if the user has enough quota, false otherwise
 */
export function hasEnoughPageQuota(
  tier: SubscriptionTier,
  pagesUsed: number,
  pagesRequested: number
): boolean {
  return getRemainingPages(tier, pagesUsed) >= pagesRequested
} 