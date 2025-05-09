import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const processedClerkEventsTable = pgTable("processed_clerk_events", {
  eventId: text("event_id").primaryKey(), // This will store the svix_id
  processedAt: timestamp("processed_at", { withTimezone: true }).defaultNow().notNull(),
});

export type InsertProcessedClerkEvent = typeof processedClerkEventsTable.$inferInsert;
export type SelectProcessedClerkEvent = typeof processedClerkEventsTable.$inferSelect; 