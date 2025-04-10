import { describe, expect, it, vi } from 'vitest';

// Mock the Ratelimit class directly to simplify testing
vi.mock('@upstash/ratelimit', () => {
  return {
    Ratelimit: class MockRatelimit {
      static slidingWindow() {
        return {};
      }
      
      constructor() {
        // Nothing to do
      }
      
      async limit() {
        return {
          success: true,
          limit: 10,
          remaining: 9,
          reset: Date.now() + 60000,
        };
      }
    }
  };
});

// Mock Redis for testing - must be before other imports
vi.mock('@/lib/redis', () => ({
  redis: {
    incr: vi.fn().mockResolvedValue(1),
    incrby: vi.fn().mockResolvedValue(1),
    decr: vi.fn().mockResolvedValue(0),
    decrby: vi.fn().mockResolvedValue(0),
    get: vi.fn().mockResolvedValue(0),
    set: vi.fn().mockResolvedValue('OK'),
    mget: vi.fn().mockResolvedValue([0, 0]),
    mset: vi.fn().mockResolvedValue('OK'),
    expire: vi.fn().mockResolvedValue(1),
    del: vi.fn().mockResolvedValue(1),
    eval: vi.fn().mockImplementation(() => Promise.resolve({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now() + 60000,
    })),
    evalsha: vi.fn().mockImplementation(() => Promise.resolve({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now() + 60000,
    })),
    script: vi.fn().mockReturnValue({
      load: vi.fn().mockResolvedValue('script_hash'),
    }),
    // Add missing Redis methods for analytics
    zincrby: vi.fn().mockResolvedValue(1),
    zadd: vi.fn().mockResolvedValue(1),
    zrem: vi.fn().mockResolvedValue(1),
    zrange: vi.fn().mockResolvedValue([]),
  }
}));

// Import after mock setup
import {
  createRateLimiter,
  isBatchSizeAllowed,
  RATE_LIMIT_TIERS,
  SubscriptionTier
} from '@/lib/rate-limiting';

describe('Rate Limiting', () => {
  describe('Batch size limits', () => {
    it('should respect tier batch limits', () => {
      // Starter tier - max batch size 1
      expect(isBatchSizeAllowed('starter', 1)).toBe(true);
      expect(isBatchSizeAllowed('starter', 2)).toBe(false);
      
      // Plus tier - max batch size 25
      expect(isBatchSizeAllowed('plus', 1)).toBe(true);
      expect(isBatchSizeAllowed('plus', 25)).toBe(true);
      expect(isBatchSizeAllowed('plus', 26)).toBe(false);
      
      // Growth tier - max batch size 100
      expect(isBatchSizeAllowed('growth', 1)).toBe(true);
      expect(isBatchSizeAllowed('growth', 100)).toBe(true);
      expect(isBatchSizeAllowed('growth', 101)).toBe(false);
    });
  });
  
  describe('Subscription tiers', () => {
    it('should have correct page limits per tier', () => {
      expect(RATE_LIMIT_TIERS.starter.pagesPerMonth).toBe(25);
      expect(RATE_LIMIT_TIERS.plus.pagesPerMonth).toBe(250);
      expect(RATE_LIMIT_TIERS.growth.pagesPerMonth).toBe(500);
    });
  });
  
  describe('Rate limiter creation', () => {
    it('should create a rate limiter with correct tier settings', async () => {
      const userId = 'test-user';
      const tiers: SubscriptionTier[] = ['starter', 'plus', 'growth'];
      
      for (const tier of tiers) {
        const limiter = createRateLimiter(userId, tier, 'test');
        expect(limiter).toBeDefined();
        
        // Test successful limit
        const result = await limiter.limit(userId);
        expect(result.success).toBe(true);
      }
    });
  });
}); 