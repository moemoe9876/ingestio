import { getProfileByUserIdAction, updateProfileAction } from "@/actions/db/profiles-actions";
import { getUserByIdAction } from "@/actions/db/users-actions";
import { createCheckoutSessionAction } from "@/actions/stripe/checkout-actions";
import { getPlanById } from "@/lib/config/subscription-plans";
import { redis } from "@/lib/redis/client";
import { createCheckoutSession } from "@/lib/stripe";
import { createStripeCustomer } from "@/lib/stripe/config";
import { userToCustomerKey } from "@/types/stripe-kv-types";
import { beforeEach, describe, expect, test, vi, type Mock } from "vitest";

// --- Mocks ---
vi.mock("@/actions/db/profiles-actions", () => ({
  getProfileByUserIdAction: vi.fn(),
  updateProfileAction: vi.fn(),
}));

vi.mock("@/actions/db/users-actions", () => ({
  getUserByIdAction: vi.fn(),
}));

vi.mock("@/lib/config/subscription-plans", () => ({
  getPlanById: vi.fn(),
}));

vi.mock("@/lib/redis/client", () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock("@/lib/stripe/config", () => ({
  createStripeCustomer: vi.fn(),
}));

vi.mock("@/lib/stripe", () => ({
  createCheckoutSession: vi.fn(),
}));

describe("createCheckoutSessionAction", () => {
  const userId = "user_123";
  const planId = "plus";
  const mockSessionId = "cs_test_123";
  const mockSessionUrl = "https://checkout.stripe.com/123";
  const mockEmail = "test@example.com";
  const mockFullName = "Test User";
  const mockStripeCustomerId = "cus_test123";
  const mockAppUrl = "https://app.test";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    // Setup environment variables
    process.env.NEXT_PUBLIC_APP_URL = mockAppUrl;

    // Setup default mocks
    (getPlanById as Mock).mockReturnValue({
      planId: "plus",
      stripePriceId: "price_123",
      priceMonthly: 9.99,
      name: "Plus Plan",
      documentQuota: 250,
    });

    (getUserByIdAction as Mock).mockResolvedValue({
      id: userId,
      email: mockEmail,
      fullName: mockFullName,
    });

    (createCheckoutSession as Mock).mockResolvedValue({
      id: mockSessionId,
      url: mockSessionUrl,
    });

    (redis.set as Mock).mockResolvedValue(true);
  });

  test("should create checkout session with existing customer ID from Redis", async () => {
    // Setup Redis to return a customer ID
    (redis.get as Mock).mockResolvedValue(mockStripeCustomerId);

    // Call the action
    const result = await createCheckoutSessionAction(userId, planId);

    // Assertions
    expect(redis.get).toHaveBeenCalledWith(userToCustomerKey(userId));
    expect(getProfileByUserIdAction).not.toHaveBeenCalled(); // Should not query DB when Redis has value
    expect(createStripeCustomer).not.toHaveBeenCalled(); // Should not create new customer
    expect(createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        planId,
        userId,
        customerId: mockStripeCustomerId,
        customerEmail: mockEmail,
        successUrl: `${mockAppUrl}/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
      })
    );
    expect(result.isSuccess).toBe(true);
    expect(result.data).toEqual({
      sessionId: mockSessionId,
      url: mockSessionUrl,
    });
  });

  test("should create checkout session with existing customer ID from DB when not in Redis", async () => {
    // Setup Redis to return null (no customer ID)
    (redis.get as Mock).mockResolvedValue(null);
    
    // Setup profile action to return a customer ID
    (getProfileByUserIdAction as Mock).mockResolvedValue({
      isSuccess: true,
      data: {
        userId,
        stripeCustomerId: mockStripeCustomerId,
      },
    });

    // Call the action
    const result = await createCheckoutSessionAction(userId, planId);

    // Assertions
    expect(redis.get).toHaveBeenCalledWith(userToCustomerKey(userId));
    expect(getProfileByUserIdAction).toHaveBeenCalledWith(userId);
    expect(redis.set).toHaveBeenCalledWith(userToCustomerKey(userId), mockStripeCustomerId);
    expect(createStripeCustomer).not.toHaveBeenCalled(); // Should not create new customer
    expect(createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: mockStripeCustomerId,
      })
    );
    expect(result.isSuccess).toBe(true);
  });

  test("should create a new Stripe customer when not found in Redis or DB", async () => {
    // Setup Redis and DB to return no customer ID
    (redis.get as Mock).mockResolvedValue(null);
    (getProfileByUserIdAction as Mock).mockResolvedValue({
      isSuccess: true,
      data: {
        userId,
        stripeCustomerId: null,
      },
    });
    
    // Setup customer creation
    (createStripeCustomer as Mock).mockResolvedValue({
      id: mockStripeCustomerId,
    });

    // Call the action
    const result = await createCheckoutSessionAction(userId, planId);

    // Assertions
    expect(createStripeCustomer).toHaveBeenCalledWith(
      mockEmail, 
      mockFullName, 
      { userId }
    );
    expect(redis.set).toHaveBeenCalledWith(userToCustomerKey(userId), mockStripeCustomerId);
    expect(updateProfileAction).toHaveBeenCalledWith(userId, { stripeCustomerId: mockStripeCustomerId });
    expect(createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: mockStripeCustomerId,
      })
    );
    expect(result.isSuccess).toBe(true);
  });

  test("should return error for invalid plan", async () => {
    // Setup plan lookup to return null
    (getPlanById as Mock).mockReturnValue(null);
    
    // Call the action
    const result = await createCheckoutSessionAction(userId, "invalid-plan" as any);

    // Assertions
    expect(result.isSuccess).toBe(false);
    expect(result.message).toContain("Invalid plan");
    expect(createCheckoutSession).not.toHaveBeenCalled();
  });

  test("should return error for starter (free) plan", async () => {
    // Setup plan lookup to return starter plan with free price
    (getPlanById as Mock).mockReturnValue({
      planId: "starter",
      priceMonthly: 0,
    });
    
    // Call the action
    const result = await createCheckoutSessionAction(userId, "starter");

    // Assertions
    expect(result.isSuccess).toBe(false);
    expect(result.message).toContain("Cannot create checkout session for starter plan");
    expect(createCheckoutSession).not.toHaveBeenCalled();
  });

  test("should return error if user not found", async () => {
    // Setup user lookup to return null
    (getUserByIdAction as Mock).mockResolvedValue(null);
    
    // Call the action
    const result = await createCheckoutSessionAction(userId, planId);

    // Assertions
    expect(result.isSuccess).toBe(false);
    expect(result.message).toContain("User not found");
    expect(createCheckoutSession).not.toHaveBeenCalled();
  });

  test("should handle error when creating Stripe customer", async () => {
    // Setup Redis and DB to return no customer ID
    (redis.get as Mock).mockResolvedValue(null);
    (getProfileByUserIdAction as Mock).mockResolvedValue({
      isSuccess: true,
      data: {
        userId,
        stripeCustomerId: null,
      },
    });
    
    // Setup customer creation to fail
    const stripeError = new Error("Failed to create Stripe customer");
    (createStripeCustomer as Mock).mockRejectedValue(stripeError);

    // Call the action
    const result = await createCheckoutSessionAction(userId, planId);

    // Assertions
    expect(result.isSuccess).toBe(false);
    expect(result.message).toBe(stripeError.message);
    expect(createCheckoutSession).not.toHaveBeenCalled();
  });

  test("should handle error when creating checkout session", async () => {
    // Setup Redis to return a customer ID
    (redis.get as Mock).mockResolvedValue(mockStripeCustomerId);
    
    // Setup checkout session creation to fail
    const sessionError = new Error("Failed to create checkout session");
    (createCheckoutSession as Mock).mockRejectedValue(sessionError);

    // Call the action
    const result = await createCheckoutSessionAction(userId, planId);

    // Assertions
    expect(result.isSuccess).toBe(false);
    expect(result.message).toBe(sessionError.message);
  });
}); 