/*
<ai_context>
Defines the schema for processing queue tables used for managing background batch processing.
Includes queue management and queue items with status tracking, retry logic, and performance indexes.
</ai_context>
*/

import { createUTCDate } from "@/lib/utils/date-utils";
import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid
} from "drizzle-orm/pg-core";
import { extractionBatchesTable } from "./extraction-batches-schema";
import { profilesTable } from "./profiles-schema";

// Enums for queue management
export const queueStatusEnum = pgEnum("queue_status_enum", [
  "active",
  "paused",
  "failed",
  "completed"
]);

export const queueItemStatusEnum = pgEnum("queue_item_status_enum", [
  "pending",
  "processing", 
  "completed",
  "failed",
  "retrying",
  "cancelled"
]);

export const queueItemPriorityEnum = pgEnum("queue_item_priority_enum", [
  "low",
  "normal", 
  "high",
  "urgent"
]);

// Main queue table for organizing processing queues
export const processingQueuesTable = pgTable("processing_queues", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  status: queueStatusEnum("status").default("active").notNull(),
  maxConcurrentJobs: integer("max_concurrent_jobs").default(5).notNull(),
  retryLimit: integer("retry_limit").default(3).notNull(),
  processingTimeoutMinutes: integer("processing_timeout_minutes").default(30).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => createUTCDate()),
});

// Queue items table for individual jobs
export const queueItemsTable = pgTable("queue_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  queueId: uuid("queue_id")
    .notNull()
    .references(() => processingQueuesTable.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => profilesTable.userId, { onDelete: "cascade" }),
  batchId: uuid("batch_id")
    .references(() => extractionBatchesTable.id, { onDelete: "cascade" }),
  
  // Job identification and configuration
  jobType: text("job_type").notNull(), // e.g., 'document_extraction', 'batch_export'
  jobData: jsonb("job_data").notNull(), // Flexible data for different job types
  priority: queueItemPriorityEnum("priority").default("normal").notNull(),
  
  // Status and processing info
  status: queueItemStatusEnum("status").default("pending").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  maxRetries: integer("max_retries").default(3).notNull(),
  
  // Timing
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).defaultNow().notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  nextRetryAt: timestamp("next_retry_at", { withTimezone: true }),
  
  // Results and errors
  result: jsonb("result"),
  errorMessage: text("error_message"),
  errorDetails: jsonb("error_details"),
  
  // Processing worker identification
  workerId: text("worker_id"),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  lockTimeout: timestamp("lock_timeout", { withTimezone: true }),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => createUTCDate()),
});

// Queue statistics table for monitoring and analytics
export const queueStatsTable = pgTable("queue_stats", {
  id: uuid("id").defaultRandom().primaryKey(),
  queueId: uuid("queue_id")
    .notNull()
    .references(() => processingQueuesTable.id, { onDelete: "cascade" }),
  
  // Hourly aggregated stats
  statsHour: timestamp("stats_hour", { withTimezone: true }).notNull(),
  
  // Job counts
  jobsProcessed: integer("jobs_processed").default(0).notNull(),
  jobsCompleted: integer("jobs_completed").default(0).notNull(),
  jobsFailed: integer("jobs_failed").default(0).notNull(),
  jobsRetried: integer("jobs_retried").default(0).notNull(),
  
  // Timing metrics (in milliseconds)
  avgProcessingTime: integer("avg_processing_time").default(0).notNull(),
  maxProcessingTime: integer("max_processing_time").default(0).notNull(),
  minProcessingTime: integer("min_processing_time").default(0).notNull(),
  
  // Queue health indicators
  backlogSize: integer("backlog_size").default(0).notNull(),
  activeJobs: integer("active_jobs").default(0).notNull(),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => createUTCDate()),
});

// Type exports for TypeScript inference
export type InsertProcessingQueue = typeof processingQueuesTable.$inferInsert;
export type SelectProcessingQueue = typeof processingQueuesTable.$inferSelect;

export type InsertQueueItem = typeof queueItemsTable.$inferInsert;
export type SelectQueueItem = typeof queueItemsTable.$inferSelect;

export type InsertQueueStats = typeof queueStatsTable.$inferInsert;
export type SelectQueueStats = typeof queueStatsTable.$inferSelect;

// Job type constants for better type safety
export const JOB_TYPES = {
  DOCUMENT_EXTRACTION: 'document_extraction',
  BATCH_EXPORT: 'batch_export',
  BATCH_COMPLETION_CHECK: 'batch_completion_check',
  CLEANUP_EXPIRED_EXPORTS: 'cleanup_expired_exports',
} as const;

export type JobType = typeof JOB_TYPES[keyof typeof JOB_TYPES];