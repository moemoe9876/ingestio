/*
<ai_context>
Defines the schema for tracking user usage against subscription limits.
</ai_context>
*/

import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { profilesTable } from "./profiles-schema"

export const userUsageTable = pgTable("user_usage", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => profilesTable.userId, { onDelete: "cascade" }),
  billingPeriodStart: timestamp("billing_period_start", { withTimezone: true, mode: 'date' }).notNull(),
  billingPeriodEnd: timestamp("billing_period_end", { withTimezone: true, mode: 'date' }).notNull(),
  pagesProcessed: integer("pages_processed").default(0).notNull(),
  pagesLimit: integer("pages_limit").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
}, (table) => {
  return {
    // The old unique constraint "user_usage_user_id_billing_period_start_unique" was removed.
    // A new SQL-based unique constraint "user_usage_user_id_utc_month_unique"
    // on (user_id, DATE_TRUNC('month', billing_period_start AT TIME ZONE 'UTC'))
    // has been added directly in the migration file db/migrations/0002_fix_user_usage_period.sql.
    // userBillingPeriodIdx: unique().on(table.userId, table.billingPeriodStart)
  }
})

export type InsertUserUsage = typeof userUsageTable.$inferInsert
export type SelectUserUsage = typeof userUsageTable.$inferSelect 