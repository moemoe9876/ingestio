"use server";

import { getPostHogServerClient } from "@/lib/analytics/server";
import { withTracing } from "@posthog/ai";
import { randomUUID } from "node:crypto";

/**
 * Generates a unique trace ID to use across related AI calls
 * @returns A unique trace ID
 */
export async function generateTraceId(): Promise<string> {
  return randomUUID();
}

/**
 * Creates an observable model for AI generation that sends events to PostHog
 * @param model - The model instance to wrap with tracing
 * @param userId - The user ID to associate with this AI call
 * @param traceId - Optional trace ID to link related AI calls
 * @param properties - Additional properties to include in PostHog events
 * @param privacyMode - Optional flag to enable privacy mode (defaults to false)
 * @param groups - Optional groups to associate with the event
 * @returns An observable model that reports telemetry to PostHog
 */
export async function getObservableModel(
  model: any,
  userId: string,
  traceId?: string,
  properties?: Record<string, any>,
  privacyMode?: boolean,
  groups?: Record<string, string>
): Promise<any> {
  const phClient = getPostHogServerClient();
  const trace = traceId || await generateTraceId();
  
  return withTracing(
    model,
    phClient,
    {
      posthogDistinctId: userId,
      posthogTraceId: trace,
      posthogProperties: properties,
      posthogPrivacyMode: privacyMode,
      posthogGroups: groups
    }
  );
}

/**
 * Creates an observable structured model for AI generation that sends events to PostHog
 * @param model - The structured model to observe
 * @param userId - The user ID to associate with this AI call
 * @param traceId - Optional trace ID to link related AI calls
 * @param properties - Additional properties to include in PostHog events
 * @param privacyMode - Optional flag to enable privacy mode (defaults to false)
 * @param groups - Optional groups to associate with the event
 * @returns An observable structured model that reports telemetry to PostHog
 */
export async function getObservableStructuredModel(
  model: any,
  userId: string,
  traceId?: string,
  properties?: Record<string, any>,
  privacyMode?: boolean,
  groups?: Record<string, string>
): Promise<any> {
  const phClient = getPostHogServerClient();
  const trace = traceId || await generateTraceId();
  
  return withTracing(
    model,
    phClient,
    {
      posthogDistinctId: userId,
      posthogTraceId: trace,
      posthogProperties: properties,
      posthogPrivacyMode: privacyMode,
      posthogGroups: groups
    }
  );
} 