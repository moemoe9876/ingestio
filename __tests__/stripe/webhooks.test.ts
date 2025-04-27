import { getProfileByStripeCustomerIdAction, updateProfileByStripeCustomerIdAction } from "@/actions/db/profiles-actions";
import { initializeUserUsageAction, updateUserUsageAction } from "@/actions/db/user-usage-actions";
import { processStripeWebhookAction } from "@/actions/stripe/webhook-actions";
import { getPostHogServerClient, trackServerEvent } from "@/lib/analytics/server";
import { processStripeWebhook } from "@/lib/stripe/webhooks";
import { beforeEach, describe, expect, test, vi, type Mock } from "vitest";

// --- Mocks ---
vi.mock("@/lib/stripe/webhooks", () => ({
  processStripeWebhook: vi.fn(),
}));

vi.mock("@/actions/db/profiles-actions", () => ({
  updateProfileByStripeCustomerIdAction: vi.fn(),
  getProfileByStripeCustomerIdAction: vi.fn(),
}));

vi.mock("@/actions/db/user-usage-actions", () => ({
  initializeUserUsageAction: vi.fn(),
  updateUserUsageAction: vi.fn(),
}));

vi.mock("@/lib/analytics/server", () => ({
  getPostHogServerClient: vi.fn(),
  trackServerEvent: vi.fn(),
}));

vi.mock("@/lib/config/subscription-plans", () => ({
  getPlanById: vi.fn().mockReturnValue({
    documentQuota: 250
  }),
}));

describe("Stripe Webhook Processing", () => {
  const mockCustomerId = "cus_test123";
  const mockUserId = "user_test456";
  const mockSubscriptionId = "sub_test789";

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default PostHog client mock
    (getPostHogServerClient as Mock).mockReturnValue({
      capture: vi.fn().mockResolvedValue(undefined),
    });
  });

  describe("processStripeWebhookAction", () => {
    const mockRawBody = JSON.stringify({
      id: "evt_test123",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: mockSubscriptionId,
          customer: mockCustomerId,
          status: "active",
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        }
      }
    });
    const mockSignature = "test_signature";

    test("should successfully process webhook and update profile", async () => {
      // Setup processStripeWebhook mock
      (processStripeWebhook as Mock).mockResolvedValue({
        success: true,
        message: "Successfully processed customer.subscription.updated event",
        data: {
          eventType: "customer.subscription.updated",
          customerId: mockCustomerId,
          processed: true,
          syncedData: {
            subscriptionId: mockSubscriptionId,
            status: "active",
            priceId: "price_test",
            planId: "plus",
            currentPeriodStart: Math.floor(Date.now() / 1000),
            currentPeriodEnd: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
            cancelAtPeriodEnd: false,
            paymentMethod: null,
            customerId: mockCustomerId,
          }
        }
      });

      // Setup profile lookup mock using getProfileByStripeCustomerIdAction
      (getProfileByStripeCustomerIdAction as Mock).mockResolvedValue({
        isSuccess: true,
        message: "Profile retrieved",
        data: {
          userId: mockUserId,
          stripeCustomerId: mockCustomerId,
          stripeSubscriptionId: "sub_old",
          membership: "starter"
        }
      });

      // Setup profile update mock
      (updateProfileByStripeCustomerIdAction as Mock).mockResolvedValue({
        isSuccess: true,
        message: "Profile updated",
        data: {
          userId: mockUserId,
          stripeCustomerId: mockCustomerId,
          stripeSubscriptionId: mockSubscriptionId,
          membership: "plus"
        }
      });

      // Call the action
      const result = await processStripeWebhookAction(mockRawBody, mockSignature);

      // Assertions
      expect(processStripeWebhook).toHaveBeenCalledWith(mockRawBody, mockSignature);
      expect(getProfileByStripeCustomerIdAction).toHaveBeenCalledWith(mockCustomerId);
      expect(updateProfileByStripeCustomerIdAction).toHaveBeenCalledTimes(1);
      
      // Should call update with new subscription data
      expect(updateProfileByStripeCustomerIdAction).toHaveBeenCalledWith(mockCustomerId, {
        membership: "plus",
        stripeSubscriptionId: mockSubscriptionId
      });
      
      // Should track analytics event
      expect(trackServerEvent).toHaveBeenCalled();
      
      expect(result.isSuccess).toBe(true);
    });

    test("should handle invoice.payment_succeeded and reset usage", async () => {
      // Mock an invoice payment succeeded event
      const invoiceBody = JSON.stringify({
        id: "evt_test_invoice",
        type: "invoice.payment_succeeded",
        data: {
          object: {
            id: "in_test123",
            customer: mockCustomerId,
            subscription: mockSubscriptionId,
            billing_reason: "subscription_cycle"
          }
        }
      });

      // Setup processStripeWebhook mock for invoice event
      (processStripeWebhook as Mock).mockResolvedValue({
        success: true,
        message: "Successfully processed invoice.payment_succeeded event",
        data: {
          eventType: "invoice.payment_succeeded",
          customerId: mockCustomerId,
          processed: true,
          syncedData: {
            subscriptionId: mockSubscriptionId,
            status: "active",
            priceId: "price_test",
            planId: "plus",
            currentPeriodStart: Math.floor(Date.now() / 1000),
            currentPeriodEnd: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
            cancelAtPeriodEnd: false,
            paymentMethod: null,
            customerId: mockCustomerId,
          }
        }
      });

      // Setup profile lookup mock
      (getProfileByStripeCustomerIdAction as Mock).mockResolvedValue({
        isSuccess: true,
        message: "Profile retrieved",
        data: {
          userId: mockUserId,
          stripeCustomerId: mockCustomerId,
          stripeSubscriptionId: mockSubscriptionId,
          membership: "plus"
        }
      });

      // Setup profile update mock
      (updateProfileByStripeCustomerIdAction as Mock).mockResolvedValue({
        isSuccess: true,
        message: "Profile updated",
        data: {
          userId: mockUserId,
          stripeCustomerId: mockCustomerId,
          stripeSubscriptionId: mockSubscriptionId,
          membership: "plus"
        }
      });

      // Call the action
      const result = await processStripeWebhookAction(invoiceBody, mockSignature);

      // Assertions
      expect(processStripeWebhook).toHaveBeenCalledWith(invoiceBody, mockSignature);
      expect(getProfileByStripeCustomerIdAction).toHaveBeenCalledWith(mockCustomerId);
      
      expect(result.isSuccess).toBe(true);
    });

    test("should handle cancelled subscription", async () => {
      // Setup processStripeWebhook mock for cancelled subscription
      (processStripeWebhook as Mock).mockResolvedValue({
        success: true,
        message: "Successfully processed customer.subscription.deleted event",
        data: {
          eventType: "customer.subscription.deleted",
          customerId: mockCustomerId,
          processed: true,
          syncedData: {
            status: "canceled",
            subscriptionId: null,
            priceId: null,
            planId: null,
            currentPeriodStart: null,
            currentPeriodEnd: null,
            cancelAtPeriodEnd: false,
            paymentMethod: null,
            customerId: mockCustomerId,
          }
        }
      });

      // Setup profile action mock
      (updateProfileByStripeCustomerIdAction as Mock).mockResolvedValue({
        isSuccess: true,
        message: "Profile updated",
        data: {
          userId: mockUserId,
          stripeCustomerId: mockCustomerId,
          stripeSubscriptionId: mockSubscriptionId,
          membership: "plus"
        }
      });

      // Call the action
      const result = await processStripeWebhookAction(mockRawBody, mockSignature);

      // Assertions
      expect(updateProfileByStripeCustomerIdAction).toHaveBeenNthCalledWith(2, mockCustomerId, {
        membership: "starter", // Should downgrade to free tier
        stripeSubscriptionId: null
      });
      
      // Should track cancellation event
      expect(trackServerEvent).toHaveBeenCalledWith(
        expect.stringContaining("stripe.subscription.cancelled.synced"),
        mockUserId,
        expect.objectContaining({
          previousSubscriptionId: mockSubscriptionId,
        })
      );
      
      expect(result.isSuccess).toBe(true);
    });

    test("should return success even when profile not found", async () => {
      // Setup processStripeWebhook mock
      (processStripeWebhook as Mock).mockResolvedValue({
        success: true,
        message: "Successfully processed event",
        data: {
          eventType: "customer.subscription.updated",
          customerId: mockCustomerId,
          processed: true,
          syncedData: {
            status: "active",
            subscriptionId: mockSubscriptionId,
            planId: "plus",
            customerId: mockCustomerId,
          }
        }
      });

      // Setup profile action to return no profile
      (updateProfileByStripeCustomerIdAction as Mock).mockResolvedValue({
        isSuccess: false,
        message: "Profile not found"
      });

      // Call the action
      const result = await processStripeWebhookAction(mockRawBody, mockSignature);

      // Assertions
      expect(result.isSuccess).toBe(true);
      expect(updateProfileByStripeCustomerIdAction).toHaveBeenCalledWith(mockCustomerId, {});
      expect(trackServerEvent).not.toHaveBeenCalled(); // No user ID, so no event tracking
    });

    test("should handle webhook verification failure", async () => {
      // Setup processStripeWebhook to fail verification
      const verificationError = new Error("Invalid signature");
      (processStripeWebhook as Mock).mockResolvedValue({
        success: false,
        message: verificationError.message
      });

      // Call the action
      const result = await processStripeWebhookAction(mockRawBody, "invalid_signature");

      // Assertions
      expect(result.isSuccess).toBe(false);
      expect(result.message).toContain("Invalid signature");
      expect(updateProfileByStripeCustomerIdAction).not.toHaveBeenCalled();
      expect(initializeUserUsageAction).not.toHaveBeenCalled();
    });

    test("should handle errors in profile update", async () => {
      // Setup processStripeWebhook mock
      (processStripeWebhook as Mock).mockResolvedValue({
        success: true,
        message: "Successfully processed event",
        data: {
          eventType: "customer.subscription.updated",
          customerId: mockCustomerId,
          processed: true,
          syncedData: {
            status: "active",
            subscriptionId: mockSubscriptionId,
            planId: "plus",
            customerId: mockCustomerId,
          }
        }
      });

      // Setup profile action to return user but throw on update
      (updateProfileByStripeCustomerIdAction as Mock)
        .mockResolvedValueOnce({
          isSuccess: true,
          message: "Profile found",
          data: {
            userId: mockUserId,
            stripeCustomerId: mockCustomerId,
          }
        })
        .mockRejectedValueOnce(new Error("Database error"));

      // Call the action
      const result = await processStripeWebhookAction(mockRawBody, mockSignature);

      // Assertions
      expect(result.isSuccess).toBe(false);
      expect(result.message).toContain("Database error");
    });

    test("should handle errors in usage reset", async () => {
      // Mock an invoice payment succeeded event
      const invoiceBody = JSON.stringify({
        id: "evt_test_invoice",
        type: "invoice.payment_succeeded",
        data: {
          object: {
            id: "in_test123",
            customer: mockCustomerId,
            subscription: mockSubscriptionId,
            billing_reason: "subscription_cycle"
          }
        }
      });

      // Setup processStripeWebhook mock
      (processStripeWebhook as Mock).mockResolvedValue({
        success: true,
        message: "Successfully processed event",
        data: {
          eventType: "invoice.payment_succeeded",
          customerId: mockCustomerId,
          processed: true,
          syncedData: {
            status: "active",
            subscriptionId: mockSubscriptionId,
            planId: "plus",
            currentPeriodStart: Math.floor(Date.now() / 1000),
            currentPeriodEnd: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
            customerId: mockCustomerId,
          }
        }
      });

      // Setup profile action to return user
      (updateProfileByStripeCustomerIdAction as Mock).mockResolvedValue({
        isSuccess: true,
        message: "Profile found",
        data: {
          userId: mockUserId,
          stripeCustomerId: mockCustomerId,
        }
      });

      // Setup initializeUserUsageAction to fail
      (initializeUserUsageAction as Mock).mockResolvedValue({
        isSuccess: false,
        message: "Failed to initialize usage"
      });

      // Call the action
      const result = await processStripeWebhookAction(invoiceBody, mockSignature);

      // Should still succeed at webhook level
      expect(result.isSuccess).toBe(true);
      
      // Should attempt to initialize usage period
      expect(initializeUserUsageAction).toHaveBeenCalled();
      
      // Should not update usage count since initialization failed
      expect(updateUserUsageAction).not.toHaveBeenCalled();
    });

    test("should handle unprocessed events correctly", async () => {
      // Setup processStripeWebhook mock for unprocessed event
      (processStripeWebhook as Mock).mockResolvedValue({
        success: true,
        message: "Event type does not require subscription sync",
        data: {
          eventType: "payment_intent.created",
          customerId: mockCustomerId,
          processed: false
        }
      });

      // Call the action
      const result = await processStripeWebhookAction(mockRawBody, mockSignature);

      // Assertions
      expect(result.isSuccess).toBe(true);
      expect(result.message).toContain("Event type does not require subscription sync");
      expect(updateProfileByStripeCustomerIdAction).not.toHaveBeenCalled();
      expect(initializeUserUsageAction).not.toHaveBeenCalled();
    });
  });
}); 