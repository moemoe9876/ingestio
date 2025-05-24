/*
<ai_context>
Defines the schema for exports and related export format enum.
</ai_context>
*/

import { createUTCDate } from "@/lib/utils/date-utils"
import { sql } from "drizzle-orm"
import { jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { exportFileFormatEnum, exportStatusEnum, exportTypeEnum } from "./enums"
import { profilesTable } from "./profiles-schema"

export const exportFormatEnum = pgEnum("export_format", ["json", "csv", "excel"])

// Custom type for UUID array
const uuidArray = sql`uuid[]`

export const exportsTable = pgTable(
  "exports", 
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => profilesTable.userId, { onDelete: "cascade" }),
    documentIds: jsonb("document_ids").notNull(),
    fileName: text("file_name").notNull(),
    storagePath: text("storage_path").notNull(),
    fileFormat: exportFileFormatEnum("file_format").notNull(),
    exportType: exportTypeEnum("export_type").notNull(),
    arrayFieldToExpand: text("array_field_to_expand"),
    status: exportStatusEnum("status").default("processing").notNull(),
    errorMessage: text("error_message"),
    downloadUrl: text("download_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => createUTCDate()),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => ({
    statusCheck: sql`check (${table.status} in ('processing', 'completed', 'failed'))`
  })
)

export type InsertExport = typeof exportsTable.$inferInsert
export type SelectExport = typeof exportsTable.$inferSelect 