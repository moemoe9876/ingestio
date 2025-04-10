/*
<ai_context>
Defines the schema for extraction batches.
</ai_context>
*/

import { sql } from "drizzle-orm"
import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { profilesTable } from "./profiles-schema"

export const extractionBatchesTable = pgTable(
  "extraction_batches", 
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => profilesTable.userId, { onDelete: "cascade" }),
    name: text("name"),
    status: text("status").notNull(),
    documentCount: integer("document_count").default(0).notNull(),
    completedCount: integer("completed_count").default(0).notNull(),
    failedCount: integer("failed_count").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date())
  },
  (table) => ({
    statusCheck: sql`check (${table.status} in ('created', 'processing', 'completed', 'failed', 'partially_completed'))`
  })
)

export type InsertExtractionBatch = typeof extractionBatchesTable.$inferInsert
export type SelectExtractionBatch = typeof extractionBatchesTable.$inferSelect 