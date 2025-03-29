/**
 * Client-side analytics helpers for PostHog
 * These functions are meant to be used in client components
 * 
 * Note: We rely on the PostHogProvider for initialization,
 * so these helpers just use the window.posthog instance
 */

// Type definition for PostHog browser client
interface PostHogClient {
  capture: (event: string, properties?: Record<string, any>) => void;
  identify: (userId: string, userProperties?: Record<string, any>) => void;
  reset: () => void;
}

// Check if PostHog is available (browser environment)
const hasPostHog = (): boolean => {
  return typeof window !== 'undefined' && 'posthog' in window;
};

// Get the PostHog client from the window object
const getPostHogClient = (): PostHogClient | null => {
  if (!hasPostHog()) return null;
  return (window as any).posthog as PostHogClient;
};

/**
 * Track an event on the client side
 */
export function trackEvent(
  eventName: string,
  properties?: Record<string, any>
): void {
  try {
    const posthog = getPostHogClient();
    if (posthog) {
      posthog.capture(eventName, properties);
    }
  } catch (error) {
    console.error('Failed to track event:', error);
  }
}

/**
 * Identify a user on the client side
 */
export function identifyUser(
  userId: string,
  userProperties?: Record<string, any>
): void {
  try {
    const posthog = getPostHogClient();
    if (posthog) {
      posthog.identify(userId, userProperties);
    }
  } catch (error) {
    console.error('Failed to identify user:', error);
  }
}

/**
 * Reset the user identity (for logout)
 */
export function resetUser(): void {
  try {
    const posthog = getPostHogClient();
    if (posthog) {
      posthog.reset();
    }
  } catch (error) {
    console.error('Failed to reset user:', error);
  }
} 