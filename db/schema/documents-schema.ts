/*
<ai_context>
Defines the schema for documents and related document status enum.
</ai_context>
*/

import { integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { profilesTable } from "./profiles-schema"

export const documentStatusEnum = pgEnum("document_status", ["uploaded", "processing", "completed", "failed"])

export const documentsTable = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => profilesTable.userId, { onDelete: "cascade" }),
  originalFilename: text("original_filename").notNull(),
  storagePath: text("storage_path").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  pageCount: integer("page_count").notNull(),
  status: documentStatusEnum("status").default("uploaded").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertDocument = typeof documentsTable.$inferInsert
export type SelectDocument = typeof documentsTable.$inferSelect 