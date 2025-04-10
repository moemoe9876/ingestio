/*
<ai_context>
Defines the schema for exports and related export format enum.
</ai_context>
*/

import { sql } from "drizzle-orm"
import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
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
    format: exportFormatEnum("format").notNull(),
    status: text("status").notNull(),
    filePath: text("file_path"),
    documentIds: uuid("document_ids").array().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date())
  },
  (table) => ({
    statusCheck: sql`check (${table.status} in ('processing', 'completed', 'failed'))`
  })
)

export type InsertExport = typeof exportsTable.$inferInsert
export type SelectExport = typeof exportsTable.$inferSelect 