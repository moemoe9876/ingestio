/*
<ai_context>
Defines the schema for extracted data.
</ai_context>
*/

import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { documentsTable } from "./documents-schema"
import { extractionJobsTable } from "./extraction-jobs-schema"
import { profilesTable } from "./profiles-schema"

export const extractedDataTable = pgTable("extracted_data", {
  id: uuid("id").defaultRandom().primaryKey(),
  extractionJobId: uuid("extraction_job_id")
    .notNull()
    .references(() => extractionJobsTable.id, { onDelete: "cascade" }),
  documentId: uuid("document_id")
    .notNull()
    .references(() => documentsTable.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => profilesTable.userId, { onDelete: "cascade" }),
  data: jsonb("data").notNull(),
  documentType: text("document_type"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertExtractedData = typeof extractedDataTable.$inferInsert
export type SelectExtractedData = typeof extractedDataTable.$inferSelect 