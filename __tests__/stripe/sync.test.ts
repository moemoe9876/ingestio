import { getPlanByStripePriceId } from "@/lib/config/subscription-plans"; // Adjust import path
import { syncStripeDataToKV } from "@/lib/stripe/sync"; // Adjust import path
import { customerDataKey, StripeCustomerDataKV, StripeSubscriptionStatus } from "@/types/stripe-kv-types"; // Adjust import path
import Stripe from "stripe";
import { beforeEach, describe, expect, test, vi, type Mock } from "vitest";

// --- Mocks ---
vi.mock("@/lib/stripe/config", () => ({
  getStripe: vi.fn(),
}));

// Mock the redis module - IMPORTANT: must match the exact import path used in the actual code
vi.mock("@/lib/redis/client", () => ({
  redis: {
    set: vi.fn().mockResolvedValue(true),
    get: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock("@/lib/config/subscription-plans", () => ({
  getPlanByStripePriceId: vi.fn(),
}));

// Import mocks after defining them
import { redis } from "@/lib/redis/client";
import { getStripe } from "@/lib/stripe/config";

// Mock Stripe object structure
const mockStripe = {
  subscriptions: {
    list: vi.fn(),
  },
} as unknown as Stripe; // Cast to Stripe type

describe("syncStripeDataToKV", () => {
  const customerId = "cus_test123";
  const subscriptionId = "sub_test456";
  const priceId = "price_test789";
  const internalPlanId = "plus";
  const periodStart = Math.floor(Date.now() / 1000);
  const periodEnd = periodStart + 30 * 24 * 60 * 60; // 30 days later

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    
    // Mock getStripe to return our mock Stripe object
    (getStripe as Mock).mockReturnValue(mockStripe);
    
    // Mock plan lookup
    (getPlanByStripePriceId as Mock).mockImplementation((pId: string) =>
      pId === priceId ? { planId: internalPlanId, stripePriceId: priceId, name: 'Plus Plan' } : undefined
    );

    // Ensure redis.set is properly mocked
    (redis.set as Mock).mockResolvedValue(true);
  });

  test("should sync active subscription data correctly", async () => {
    const mockSubscription: Partial<Stripe.Subscription> = {
      id: subscriptionId,
      status: "active",
      items: {
        data: [{ price: { id: priceId } }],
      } as Stripe.ApiList<Stripe.SubscriptionItem>,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      cancel_at_period_end: false,
      default_payment_method: { // Mock payment method object
        id: 'pm_123',
        object: 'payment_method',
        card: {
          brand: 'visa',
          last4: '4242',
        }
      } as Stripe.PaymentMethod, // Cast to complex type
    };

    (mockStripe.subscriptions.list as Mock).mockResolvedValue({
      data: [mockSubscription],
    });

    const expectedData: StripeCustomerDataKV = {
      subscriptionId: subscriptionId,
      status: "active",
      priceId: priceId,
      planId: internalPlanId,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      paymentMethod: { brand: 'visa', last4: '4242' },
      customerId: customerId,
    };

    const result = await syncStripeDataToKV(customerId);

    expect(mockStripe.subscriptions.list).toHaveBeenCalledWith({
      customer: customerId,
      limit: 1,
      status: "all",
      expand: ["data.default_payment_method"],
    });
    expect(redis.set).toHaveBeenCalledWith(
      customerDataKey(customerId),
      expectedData
    );
    expect(result).toEqual(expectedData);
  }, 10000); // Increase timeout for this test

  test("should store 'none' status if no subscription found", async () => {
    (mockStripe.subscriptions.list as Mock).mockResolvedValue({ data: [] });

    const expectedData: StripeCustomerDataKV = { 
      status: "none",
      customerId: null 
    };

    const result = await syncStripeDataToKV(customerId);

    expect(redis.set).toHaveBeenCalledWith(
      customerDataKey(customerId),
      expectedData
    );
    expect(result).toEqual(expectedData);
  }, 10000); // Increase timeout

  test("should handle canceled subscription correctly", async () => {
    const mockSubscription: Partial<Stripe.Subscription> = {
      id: subscriptionId,
      status: "canceled", // Example status
      items: { data: [{ price: { id: priceId } }] } as any,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      cancel_at_period_end: false, // Can be true or false for canceled
      default_payment_method: null,
    };
    
    (mockStripe.subscriptions.list as Mock).mockResolvedValue({ data: [mockSubscription] });

    const expectedData: StripeCustomerDataKV = {
      subscriptionId: subscriptionId,
      status: "canceled" as StripeSubscriptionStatus,
      priceId: priceId,
      planId: internalPlanId,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      paymentMethod: null,
      customerId: customerId,
    };

    const result = await syncStripeDataToKV(customerId);
    expect(redis.set).toHaveBeenCalledWith(customerDataKey(customerId), expectedData);
    expect(result).toEqual(expectedData);
  }, 10000); // Increase timeout

  test("should store 'none' status and re-throw on Stripe API error", async () => {
    const apiError = new Error("Stripe API unavailable");
    (mockStripe.subscriptions.list as Mock).mockRejectedValue(apiError);

    const expectedErrorData: StripeCustomerDataKV = { 
      status: "none",
      customerId: null 
    };

    // Mock the set function success for the error fallback
    (redis.set as Mock).mockResolvedValue(true);

    await expect(syncStripeDataToKV(customerId)).rejects.toThrow(apiError);

    expect(redis.set).toHaveBeenCalledWith(
      customerDataKey(customerId),
      expectedErrorData
    );
  });

  test("should throw error if Redis fails to set data", async () => {
    const mockSubscription: Partial<Stripe.Subscription> = {
      id: subscriptionId,
      status: "active",
      items: { data: [{ price: { id: priceId } }] } as any,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      cancel_at_period_end: false,
      default_payment_method: null,
    };
    
    (mockStripe.subscriptions.list as Mock).mockResolvedValue({ data: [mockSubscription] });

    const redisError = new Error("Redis unavailable");
    (redis.set as Mock).mockRejectedValue(redisError);

    await expect(syncStripeDataToKV(customerId)).rejects.toThrow(redisError);
  }, 10000); // Increase timeout

  test("should handle null payment method", async () => {
    const mockSubscription: Partial<Stripe.Subscription> = {
      id: subscriptionId,
      status: "active",
      items: { data: [{ price: { id: priceId } }] } as any,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      cancel_at_period_end: false,
      default_payment_method: null, // Explicitly null
    };
    
    (mockStripe.subscriptions.list as Mock).mockResolvedValue({ data: [mockSubscription] });

    const expectedData: StripeCustomerDataKV = {
      subscriptionId: subscriptionId,
      status: "active",
      priceId: priceId,
      planId: internalPlanId,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      paymentMethod: null, // Expect null
      customerId: customerId,
    };

    const result = await syncStripeDataToKV(customerId);
    expect(redis.set).toHaveBeenCalledWith(customerDataKey(customerId), expectedData);
    expect(result).toEqual(expectedData);
  }, 10000); // Increase timeout
}); 