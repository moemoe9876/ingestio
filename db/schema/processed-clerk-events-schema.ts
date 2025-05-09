import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Webhook event idempotency table for Clerk
 * 
 * Security: This table has RLS enabled with the following policies:
 * - Deny all access by default
 * - Only the application service_role can read/write
 * - No public access is allowed
 */
export const processedClerkEventsTable = pgTable("processed_clerk_events", {
  eventId: text("event_id").primaryKey(), // This will store the svix_id
  processedAt: timestamp("processed_at", { withTimezone: true }).defaultNow().notNull(),
});

export type InsertProcessedClerkEvent = typeof processedClerkEventsTable.$inferInsert;
export type SelectProcessedClerkEvent = typeof processedClerkEventsTable.$inferSelect; 