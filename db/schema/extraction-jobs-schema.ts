/*
<ai_context>
Defines the schema for extraction jobs and related extraction status enum.
</ai_context>
*/

import { jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { documentsTable } from "./documents-schema"
import { extractionBatchesTable } from "./extraction-batches-schema"
import { profilesTable } from "./profiles-schema"

export const extractionStatusEnum = pgEnum("extraction_status", ["queued", "processing", "completed", "failed"])

export const extractionJobsTable = pgTable("extraction_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => profilesTable.userId, { onDelete: "cascade" }),
  documentId: uuid("document_id")
    .notNull()
    .references(() => documentsTable.id, { onDelete: "cascade" }),
  batchId: uuid("batch_id")
    .references(() => extractionBatchesTable.id, { onDelete: "set null" }),
  status: extractionStatusEnum("status").default("queued").notNull(),
  extractionPrompt: text("extraction_prompt"),
  extractionOptions: jsonb("extraction_options").default({}).notNull(),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertExtractionJob = typeof extractionJobsTable.$inferInsert
export type SelectExtractionJob = typeof extractionJobsTable.$inferSelect 