import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Webhook event idempotency table for Stripe
 * 
 * Security: This table has RLS enabled with the following policies:
 * - Deny all access by default
 * - Only the application service_role can read/write
 * - No public access is allowed
 */
export const processedStripeEventsTable = pgTable("processed_stripe_events", {
  eventId: text("event_id").primaryKey(), // This will store the Stripe event.id
  processedAt: timestamp("processed_at", { withTimezone: true }).defaultNow().notNull(),
});

export type InsertProcessedStripeEvent = typeof processedStripeEventsTable.$inferInsert;
export type SelectProcessedStripeEvent = typeof processedStripeEventsTable.$inferSelect; 