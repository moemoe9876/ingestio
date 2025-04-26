import { syncSubscriptionAfterSuccessAction } from "@/actions/stripe/sync-actions";
import { getCurrentUser } from "@/lib/auth-utils";
import { redis } from "@/lib/redis/client";
import { syncStripeDataToKV } from "@/lib/stripe/sync";
import { StripeCustomerDataKV, userToCustomerKey } from "@/types/stripe-kv-types";
import { beforeEach, describe, expect, test, vi, type Mock } from "vitest";

// --- Mocks ---
vi.mock("@/lib/redis/client", () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));
vi.mock("@/lib/auth-utils", () => ({
  getCurrentUser: vi.fn(),
}));
vi.mock("@/lib/stripe/sync", () => ({
  syncStripeDataToKV: vi.fn(),
}));

describe("syncSubscriptionAfterSuccessAction", () => {
  const userId = "user_test_123";
  const customerId = "cus_test_abc";
  const mockActiveSubData: StripeCustomerDataKV = {
    subscriptionId: "sub_active",
    status: "active",
    priceId: "price_active",
    planId: "plus",
    currentPeriodStart: 1,
    currentPeriodEnd: 2,
    cancelAtPeriodEnd: false,
    paymentMethod: null,
    customerId: customerId,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock getCurrentUser by default
    (getCurrentUser as Mock).mockResolvedValue(userId);
  });

  test("should sync subscription data successfully", async () => {
    // Setup mocks
    (redis.get as Mock).mockResolvedValue(customerId);
    (syncStripeDataToKV as Mock).mockResolvedValue(mockActiveSubData);

    // Call the action
    const result = await syncSubscriptionAfterSuccessAction();

    // Assert
    expect(getCurrentUser).toHaveBeenCalled();
    expect(redis.get).toHaveBeenCalledWith(userToCustomerKey(userId));
    expect(syncStripeDataToKV).toHaveBeenCalledWith(customerId);
    expect(result.isSuccess).toBe(true);
    expect(result.message).toBe("Subscription synced successfully.");
    expect(result.data).toEqual(mockActiveSubData);
  });

  test("should return failure if customer ID not found in Redis", async () => {
    // Setup mocks
    (redis.get as Mock).mockResolvedValue(null);

    // Call the action
    const result = await syncSubscriptionAfterSuccessAction();

    // Assert
    expect(getCurrentUser).toHaveBeenCalled();
    expect(redis.get).toHaveBeenCalledWith(userToCustomerKey(userId));
    expect(syncStripeDataToKV).not.toHaveBeenCalled();
    expect(result.isSuccess).toBe(false);
    expect(result.message).toContain("Stripe customer mapping not found");
  });

  test("should handle error from getCurrentUser", async () => {
    // Setup mocks
    const authError = new Error("Auth error");
    (getCurrentUser as Mock).mockRejectedValue(authError);

    // Call the action
    const result = await syncSubscriptionAfterSuccessAction();

    // Assert
    expect(result.isSuccess).toBe(false);
    expect(result.message).toBe("Auth error");
  });

  test("should handle error from Redis", async () => {
    // Setup mocks
    const redisError = new Error("Redis connection failed");
    (redis.get as Mock).mockRejectedValue(redisError);

    // Call the action
    const result = await syncSubscriptionAfterSuccessAction();

    // Assert
    expect(result.isSuccess).toBe(false);
    expect(result.message).toBe("Redis connection failed");
  });

  test("should handle error from syncStripeDataToKV", async () => {
    // Setup mocks
    (redis.get as Mock).mockResolvedValue(customerId);
    const syncError = new Error("Stripe API error");
    (syncStripeDataToKV as Mock).mockRejectedValue(syncError);

    // Call the action
    const result = await syncSubscriptionAfterSuccessAction();

    // Assert
    expect(syncStripeDataToKV).toHaveBeenCalledWith(customerId);
    expect(result.isSuccess).toBe(false);
    expect(result.message).toBe("Stripe API error");
  });
}); 