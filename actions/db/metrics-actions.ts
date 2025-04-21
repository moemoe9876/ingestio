"use server"

import { db } from "@/db/db"
import {
  documentsTable,
  extractionJobsTable
} from "@/db/schema"
import { trackServerEvent } from "@/lib/analytics/server"
import { getCurrentUser } from "@/lib/auth-utils"
import { ActionState } from "@/types"
import { and, count, desc, eq, gte, lte, sql } from "drizzle-orm"
import { getProfileByUserIdAction } from "./profiles-actions"
import { getCurrentUserUsageAction } from "./user-usage-actions"

/**
 * Fetch user metrics data for dashboard
 */
export async function fetchUserMetricsAction(
  dateRange?: { 
    from: string; // ISO string
    to: string;   // ISO string
  }
): Promise<ActionState<{
  usageMetrics: {
    pagesProcessed: number;
    pagesLimit: number;
    usagePercentage: number;
    remainingPages: number;
  };
  documentMetrics: {
    totalDocuments: number;
    successRate: number;
    averageProcessingTime: number | null;
    statusDistribution: {
      status: string;
      count: number;
    }[];
    docTypeDistribution: {
      mimeType: string;
      count: number;
    }[];
    processingVolume: {
      date: string;
      count: number;
    }[];
    topErrors: {
      error: string;
      count: number;
    }[];
  }
}>> {
  try {
    // Authenticate user
    const userId = await getCurrentUser()

    // Get current date if not provided in date range
    const now = new Date()
    let fromDate = new Date(now.getFullYear(), now.getMonth(), 1) // Start of current month
    let toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999) // End of current month

    // Override with provided date range if present
    if (dateRange?.from) {
      fromDate = new Date(dateRange.from)
    }
    if (dateRange?.to) {
      toDate = new Date(dateRange.to)
      // Ensure the toDate includes the entire day
      toDate.setHours(23, 59, 59, 999)
    }

    // Get profile and current usage in parallel
    const [profileResult, usageResult] = await Promise.all([
      getProfileByUserIdAction(userId),
      getCurrentUserUsageAction(userId)
    ])

    // Handle case where profile or usage isn't found
    if (!profileResult.isSuccess) {
      return {
        isSuccess: false,
        message: "Failed to retrieve user profile"
      }
    }

    if (!usageResult.isSuccess) {
      return {
        isSuccess: false,
        message: "Failed to retrieve user usage data"
      }
    }

    // Calculate usage metrics
    const { pagesProcessed, pagesLimit } = usageResult.data
    const usagePercentage = Math.round((pagesProcessed / pagesLimit) * 100)
    const remainingPages = pagesLimit - pagesProcessed

    // Fetch document metrics in parallel for better performance
    const [
      totalDocumentsResult,
      statusDistributionResult,
      mimeTypeDistributionResult,
      processingVolumeResult,
      extractionStatsResult,
      topErrorsResult
    ] = await Promise.all([
      // Total documents count - count ALL documents regardless of status
      db.select({
        count: count()
      })
      .from(documentsTable)
      .where(and(
        eq(documentsTable.userId, userId),
        gte(documentsTable.createdAt, fromDate),
        lte(documentsTable.createdAt, toDate)
      )),

      // Status distribution
      db.select({
        status: documentsTable.status,
        count: count()
      })
      .from(documentsTable)
      .where(and(
        eq(documentsTable.userId, userId),
        gte(documentsTable.createdAt, fromDate),
        lte(documentsTable.createdAt, toDate)
      ))
      .groupBy(documentsTable.status),

      // Document type distribution - include all document types
      db.select({
        mimeType: documentsTable.mimeType,
        count: count()
      })
      .from(documentsTable)
      .where(and(
        eq(documentsTable.userId, userId),
        gte(documentsTable.createdAt, fromDate),
        lte(documentsTable.createdAt, toDate)
      ))
      .groupBy(documentsTable.mimeType),

      // Processing volume over time (by day) - count creation dates, not processing dates
      db.select({
        date: sql<string>`DATE(${documentsTable.createdAt})`,
        count: count()
      })
      .from(documentsTable)
      .where(and(
        eq(documentsTable.userId, userId),
        gte(documentsTable.createdAt, fromDate),
        lte(documentsTable.createdAt, toDate)
      ))
      .groupBy(sql`DATE(${documentsTable.createdAt})`)
      .orderBy(sql`DATE(${documentsTable.createdAt})`),

      // Extraction job stats (success rate and avg time)
      db.select({
        totalJobs: count(),
        successJobs: count(
          and(
            eq(extractionJobsTable.status, "completed")
          )
        ),
        // Estimate processing time from created_at to updated_at
        // This is an approximation since we don't store actual processing time
        avgProcessingTime: sql<number>`AVG(
          EXTRACT(EPOCH FROM (${extractionJobsTable.updatedAt} - ${extractionJobsTable.createdAt}))
        )`
      })
      .from(extractionJobsTable)
      .where(and(
        eq(extractionJobsTable.userId, userId),
        gte(extractionJobsTable.createdAt, fromDate),
        lte(extractionJobsTable.createdAt, toDate)
      )),

      // Top error messages
      db.select({
        error: extractionJobsTable.errorMessage,
        count: count()
      })
      .from(extractionJobsTable)
      .where(and(
        eq(extractionJobsTable.userId, userId),
        eq(extractionJobsTable.status, "failed"),
        sql`${extractionJobsTable.errorMessage} IS NOT NULL`,
        gte(extractionJobsTable.createdAt, fromDate),
        lte(extractionJobsTable.createdAt, toDate)
      ))
      .groupBy(extractionJobsTable.errorMessage)
      .orderBy(desc(count()))
      .limit(5)
    ])

    // Calculate success rate
    const extractionStats = extractionStatsResult[0]
    const totalJobs = extractionStats?.totalJobs || 0
    const successJobs = extractionStats?.successJobs || 0
    const successRate = totalJobs > 0 ? Math.round((successJobs / totalJobs) * 100) : 100
    const avgProcessingTime = extractionStats?.avgProcessingTime || null

    // Track analytics event
    await trackServerEvent("metrics_dashboard_viewed", userId, {
      dateRange: {
        from: fromDate.toISOString(),
        to: toDate.toISOString()
      }
    })

    return {
      isSuccess: true,
      message: "Metrics data retrieved successfully",
      data: {
        usageMetrics: {
          pagesProcessed,
          pagesLimit,
          usagePercentage,
          remainingPages
        },
        documentMetrics: {
          totalDocuments: totalDocumentsResult[0]?.count || 0,
          successRate,
          averageProcessingTime: avgProcessingTime,
          statusDistribution: statusDistributionResult.map(item => ({
            status: item.status || 'unknown',
            count: item.count
          })),
          docTypeDistribution: mimeTypeDistributionResult.map(item => ({
            mimeType: item.mimeType || 'unknown',
            count: item.count
          })),
          processingVolume: processingVolumeResult.map(item => ({
            date: item.date,
            count: item.count
          })),
          topErrors: topErrorsResult.map(item => ({
            error: item.error || 'Unknown error',
            count: item.count
          }))
        }
      }
    }
  } catch (error) {
    console.error("Error fetching metrics data:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to retrieve metrics data"
    }
  }
} 