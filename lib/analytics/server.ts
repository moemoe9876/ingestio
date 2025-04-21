import { PostHog } from "posthog-node";

let posthogClientInstance: PostHog | null = null;

export function getPostHogServerClient(): PostHog {
  if (!posthogClientInstance) {
    const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com"; // Or your region

    if (!apiKey) {
      // Fallback or throw error - depends on if observability is critical
      console.warn("PostHog API Key not found for server client. LLM Observability disabled.");
      // Return a mock client or handle appropriately
      // Using 'any' to bypass strict type checking for the mock object
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { capture: async () => {}, shutdown: async () => {} } as any;
    }

    posthogClientInstance = new PostHog(apiKey, {
      host: host,
      flushAt: 1, // Send events immediately
      flushInterval: 0,
      // Optional: Disable if you encounter issues during build/serverless init
      // enable: process.env.NODE_ENV === 'production',
    });
    console.log("PostHog Server Client Initialized.");
  }
  return posthogClientInstance;
}

// Optional: Function to gracefully shutdown
export async function shutdownPostHogClient(): Promise<void> {
  const client = getPostHogServerClient();
  // Check if the client is not the mock object and has a shutdown method
  if (client && typeof client.shutdown === 'function') {
    try {
      await client.shutdown();
      posthogClientInstance = null;
      console.log("PostHog Server Client Shutdown.");
    } catch (error) {
      console.error("Error shutting down PostHog client:", error);
    }
  }
}

/**
 * Track an event on the server side
 */
export async function trackServerEvent(
  eventName: string, 
  userId: string, 
  properties?: Record<string, any>
) {
  try {
    const client = getPostHogServerClient();
    await client.capture({
      distinctId: userId,
      event: eventName,
      properties
    });
  } catch (error) {
    console.error("Failed to track server event:", error);
  }
}

/**
 * Identify a user on the server side
 */
export async function identifyServerUser(
  userId: string,
  userProperties?: Record<string, any>
) {
  try {
    const client = getPostHogServerClient();
    await client.identify({
      distinctId: userId,
      properties: userProperties
    });
  } catch (error) {
    console.error("Failed to identify server user:", error);
  }
} 