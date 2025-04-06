/*
<ai_context>
Defines the database schema for users table which stores core user information linked to Clerk.
</ai_context>
*/

import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core"

export const usersTable = pgTable("users", {
  userId: text("user_id").primaryKey().notNull(),
  email: text("email").notNull().unique(),
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
})

export type InsertUser = typeof usersTable.$inferInsert
export type SelectUser = typeof usersTable.$inferSelect 