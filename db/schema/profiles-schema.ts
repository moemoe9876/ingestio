/*
<ai_context>
Defines the database schema for profiles.
</ai_context>
*/

import { pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { usersTable } from "./users-schema"

export const membershipEnum = pgEnum("membership", ["starter", "plus", "growth"])

export const profilesTable = pgTable("profiles", {
  userId: text("user_id").primaryKey().notNull().references(() => usersTable.userId, { onDelete: 'cascade' }),
  membership: membershipEnum("membership").notNull().default("starter"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
})

export type InsertProfile = typeof profilesTable.$inferInsert
export type SelectProfile = typeof profilesTable.$inferSelect
