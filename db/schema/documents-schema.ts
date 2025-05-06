/*
<ai_context>
Defines the schema for documents and related document status enum.
</ai_context>
*/

import { createUTCDate } from "@/lib/utils/date-utils";
import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { documentStatusEnum } from "./enums"; // Import from enums.ts
import { extractionBatchesTable } from "./extraction-batches-schema"; // Import batch schema
import { profilesTable } from "./profiles-schema";

// export const documentStatusEnum = pgEnum("document_status", ["uploaded", "processing", "completed", "failed"]);

export const documentsTable = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => profilesTable.userId, { onDelete: "cascade" }),
  // Add batchId foreign key
  batchId: uuid("batch_id").references(() => extractionBatchesTable.id, {
    onDelete: "set null",
  }),
  originalFilename: text("original_filename").notNull(),
  storagePath: text("storage_path").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  pageCount: integer("page_count").notNull(),
  // Add extraction_prompt for per-document prompts
  extractionPrompt: text("extraction_prompt"),
  status: documentStatusEnum("status").default("uploaded").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => createUTCDate()),
});

export type InsertDocument = typeof documentsTable.$inferInsert;
export type SelectDocument = typeof documentsTable.$inferSelect;
