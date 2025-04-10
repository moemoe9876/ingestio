/*
<ai_context>
Defines the schema for tracking user usage against subscription limits.
</ai_context>
*/

import { integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core"
import { profilesTable } from "./profiles-schema"

export const userUsageTable = pgTable("user_usage", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => profilesTable.userId, { onDelete: "cascade" }),
  billingPeriodStart: timestamp("billing_period_start").notNull(),
  billingPeriodEnd: timestamp("billing_period_end").notNull(),
  pagesProcessed: integer("pages_processed").default(0).notNull(),
  pagesLimit: integer("pages_limit").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
}, (table) => {
  return {
    userBillingPeriodIdx: unique().on(table.userId, table.billingPeriodStart)
  }
})

export type InsertUserUsage = typeof userUsageTable.$inferInsert
export type SelectUserUsage = typeof userUsageTable.$inferSelect 