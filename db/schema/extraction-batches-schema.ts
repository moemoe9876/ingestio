/*
<ai_context>
Defines the schema for extraction batches.
</ai_context>
*/

import {
    integer, // Import pgEnum
    pgTable,
    text,
    timestamp,
    uuid
} from "drizzle-orm/pg-core";
import { batchStatusEnum } from "./enums"; // Import from enums.ts
import { profilesTable } from "./profiles-schema";

// Define the enum
// export const batchStatusEnum = pgEnum("batch_status_enum", [
//   "pending_upload",
//   "queued",
//   "processing",
//   "completed",
//   "partially_completed",
//   "failed",
// ]);

export const extractionBatchesTable = pgTable("extraction_batches", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => profilesTable.userId, { onDelete: "cascade" }),
  name: text("name"),
  // Add extractionPrompt
  extractionPrompt: text("extraction_prompt").notNull(),
  // Update status to use the enum and set default
  status: batchStatusEnum("status").default("pending_upload").notNull(),
  documentCount: integer("document_count").default(0).notNull(),
  completedCount: integer("completed_count").default(0).notNull(),
  failedCount: integer("failed_count").default(0).notNull(),
  // Add totalPages
  totalPages: integer("total_pages").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  // Add completedAt
  completedAt: timestamp("completed_at"),
});
// Remove the old statusCheck constraint

export type InsertExtractionBatch = typeof extractionBatchesTable.$inferInsert;
export type SelectExtractionBatch = typeof extractionBatchesTable.$inferSelect;
