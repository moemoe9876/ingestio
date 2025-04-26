/**
 * @vitest-environment jsdom
 */
import { syncSubscriptionAfterSuccessAction } from "@/actions/stripe";
import StripeSuccessPage from "@/app/stripe/success/page";
import { StripeCustomerDataKV } from "@/types/stripe-kv-types";
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, waitFor, waitForElementToBeRemoved } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// Define router type
type RouterType = ReturnType<typeof useRouter>;

// Mock the Next.js router
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn()
  })),
}));

// Mock the toast component
vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock the syncSubscriptionAfterSuccessAction action
vi.mock("@/actions/stripe", () => ({
  syncSubscriptionAfterSuccessAction: vi.fn(),
}));

// Helper to wait for loading to complete
const waitForLoadingToComplete = async () => {
  // Wait for loading indicator to disappear if it's present
  try {
    await waitForElementToBeRemoved(() => screen.queryByText("Finalizing your subscription..."), {
      timeout: 1000,
    });
  } catch (e) {
    // Loading might already be gone, which is fine
  }
};

describe("StripeSuccessPage", () => {
  const mockRouter = {
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn()
  } as unknown as RouterType;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue(mockRouter);
    // Force real timers for most tests
    vi.useRealTimers();
    // Clear any pending timeouts
    vi.clearAllTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("should show loading state initially", async () => {
    // Keep the action pending during this test
    vi.mocked(syncSubscriptionAfterSuccessAction).mockImplementation(
      () => new Promise(() => {})
    );

    render(<StripeSuccessPage />);

    // Assert loading state is displayed
    expect(screen.getByText("Finalizing your subscription...")).toBeInTheDocument();
    expect(screen.getByText("Please wait while we update your account.")).toBeInTheDocument();
    
    // Query for SVG element
    const loaderSvg = document.querySelector('svg.animate-spin');
    expect(loaderSvg).toBeInTheDocument();
  });

  test("should call syncSubscriptionAfterSuccessAction on mount", async () => {
    // Setup mock to resolve immediately
    vi.mocked(syncSubscriptionAfterSuccessAction).mockResolvedValue({
      isSuccess: true,
      message: "Subscription synced successfully",
      data: {
        status: "active" as const,
        planId: "plus",
        subscriptionId: "sub_123",
        priceId: "price_123",
        currentPeriodStart: 1234567890,
        currentPeriodEnd: 1234657890,
        cancelAtPeriodEnd: false,
        paymentMethod: null,
        customerId: "cus_123"
      } as StripeCustomerDataKV
    });

    render(<StripeSuccessPage />);
    
    // Verify the action was called
    expect(syncSubscriptionAfterSuccessAction).toHaveBeenCalled();
  });

  test("should redirect to dashboard when sync is successful", async () => {
    // Use fake timers for setTimeout
    vi.useFakeTimers();
    
    // Setup mock for successful action
    vi.mocked(syncSubscriptionAfterSuccessAction).mockResolvedValue({
      isSuccess: true,
      message: "Subscription synced successfully",
      data: {
        status: "active" as const,
        planId: "plus",
        subscriptionId: "sub_123",
        priceId: "price_123",
        currentPeriodStart: 1234567890,
        currentPeriodEnd: 1234657890,
        cancelAtPeriodEnd: false,
        paymentMethod: null,
        customerId: "cus_123"
      } as StripeCustomerDataKV
    });

    await act(async () => {
      render(<StripeSuccessPage />);
      // Wait for promises to resolve
      await Promise.resolve();
    });
    
    // Run the timeout that triggers the redirect
    await act(async () => {
      vi.runAllTimers();
    });
    
    // Check if router.push was called with correct path
    expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
  });

  test("should show error state when sync fails", async () => {
    // Mock the failed response
    vi.mocked(syncSubscriptionAfterSuccessAction).mockResolvedValue({
      isSuccess: false,
      message: "Failed to sync subscription",
    });
    
    await act(async () => {
      render(<StripeSuccessPage />);
    });
    
    // Additional flushes to ensure state updates are processed
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    
    // Wait for the loading state to disappear
    await waitFor(() => {
      expect(screen.queryByText("Finalizing your subscription...")).not.toBeInTheDocument();
    }, { timeout: 2000 });
    
    // Now check for error elements
    expect(screen.getByText("Sync Failed")).toBeInTheDocument();
    expect(screen.getByText(/Failed to sync subscription/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Retry Sync/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Go to Dashboard/i })).toBeInTheDocument();
  }, 15000);
  
  test("should retry sync when retry button is clicked", async () => {
    // Mock window.location.reload
    const originalLocation = window.location;
    const mockLocation = { ...originalLocation, reload: vi.fn() };
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: mockLocation
    });
    
    // Mock failed response for initial load
    vi.mocked(syncSubscriptionAfterSuccessAction).mockResolvedValue({
      isSuccess: false,
      message: "Failed to sync subscription",
    });
    
    await act(async () => {
      render(<StripeSuccessPage />);
      // Wait for promises to resolve
      await Promise.resolve();
      await Promise.resolve();
    });
    
    // Wait for loading to finish and error state to appear
    await waitFor(() => {
      expect(screen.queryByText("Finalizing your subscription...")).not.toBeInTheDocument();
    }, { timeout: 2000 });
    
    // Click the retry button
    const retryButton = screen.getByRole("button", { name: /Retry Sync/i });
    await act(async () => {
      fireEvent.click(retryButton);
    });
    
    // Verify page reload was called
    expect(window.location.reload).toHaveBeenCalled();
    
    // Restore original location
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: originalLocation
    });
  }, 15000);
  
  test("should navigate to dashboard when dashboard button is clicked", async () => {
    // Mock failed response
    vi.mocked(syncSubscriptionAfterSuccessAction).mockResolvedValue({
      isSuccess: false,
      message: "Failed to sync subscription",
    });
    
    await act(async () => {
      render(<StripeSuccessPage />);
      // Wait for promises to resolve
      await Promise.resolve();
      await Promise.resolve();
    });
    
    // Wait for loading to finish and error state to appear
    await waitFor(() => {
      expect(screen.queryByText("Finalizing your subscription...")).not.toBeInTheDocument();
    }, { timeout: 2000 });
    
    // Click the dashboard button
    const dashboardButton = screen.getByRole("button", { name: /Go to Dashboard/i });
    await act(async () => {
      fireEvent.click(dashboardButton);
    });
    
    // Verify redirect was called
    expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
  }, 15000);
  
  test("should handle thrown errors during sync", async () => {
    // Mock a rejection
    const syncError = new Error("Network error");
    vi.mocked(syncSubscriptionAfterSuccessAction).mockRejectedValue(syncError);
    
    await act(async () => {
      render(<StripeSuccessPage />);
      // Wait for promises to resolve
      await Promise.resolve();
      await Promise.resolve();
    });
    
    // Wait for loading to finish and error state to appear
    await waitFor(() => {
      expect(screen.queryByText("Finalizing your subscription...")).not.toBeInTheDocument();
    }, { timeout: 2000 });
    
    // Check error message
    expect(screen.getByText("Sync Failed")).toBeInTheDocument();
    expect(screen.getByText(/Network error/)).toBeInTheDocument();
  }, 15000);
}); 