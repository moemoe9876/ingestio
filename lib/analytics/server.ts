import { PostHog } from "posthog-node";

// Initialize PostHog client for server-side tracking
let posthogInstance: PostHog | null = null;

/**
 * Get or create the PostHog client instance for server-side event tracking
 */
export function getPostHogClient(): PostHog {
  if (!posthogInstance) {
    const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    
    if (!apiKey) {
      throw new Error("Missing NEXT_PUBLIC_POSTHOG_KEY environment variable");
    }
    
    posthogInstance = new PostHog(apiKey, {
      host: "https://eu.i.posthog.com",
      flushAt: 1, // Send events immediately
      flushInterval: 0,
    });
  }
  
  return posthogInstance;
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
    const client = getPostHogClient();
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
    const client = getPostHogClient();
    await client.identify({
      distinctId: userId,
      properties: userProperties
    });
  } catch (error) {
    console.error("Failed to identify server user:", error);
  }
} 