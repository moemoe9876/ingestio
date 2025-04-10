"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { db } from "@/db/db"
import { documentsTable, InsertDocument, SelectDocument } from "@/db/schema"
import { trackServerEvent } from "@/lib/analytics/server"
import { getCurrentUser } from "@/lib/auth-utils"
import { checkRateLimit, SubscriptionTier } from "@/lib/rate-limiting/limiter"
import { createServerClient } from "@/lib/supabase/server"
import { ActionState } from "@/types/server-action-types"
import { getProfileByUserIdAction } from "./profiles-actions"
import { checkUserQuotaAction, incrementPagesProcessedAction } from "./user-usage-actions"

/**
 * Uploads a document to Supabase storage and creates a record in the documents table
 * Enforces rate limits and quota restrictions based on user tier
 */
export async function uploadDocumentAction(
  file: File,
  pageCount: number
): Promise<ActionState<SelectDocument>> {
  try {
    // 1. Authentication check
    const userId = await getCurrentUser()

    // 2. Rate limit check based on user tier
    const profileResult = await getProfileByUserIdAction(userId)
    if (!profileResult.isSuccess) {
      return { 
        isSuccess: false, 
        message: "Failed to get user profile",
        error: "404"
      }
    }

    const tier = (profileResult.data.membership || "starter") as SubscriptionTier
    const rateLimitResult = await checkRateLimit(userId, tier, "document_upload")
    
    if (!rateLimitResult.success) {
      return { 
        isSuccess: false, 
        message: "Rate limit exceeded", 
        error: "429" 
      }
    }

    // 3. Quota check
    const quotaResult = await checkUserQuotaAction(userId, pageCount)
    if (!quotaResult.isSuccess || !quotaResult.data?.hasQuota) {
      return { 
        isSuccess: false, 
        message: "Page quota exceeded", 
        error: "403" 
      }
    }

    // 4. File upload to Supabase storage
    const fileExtension = file.name.split('.').pop() || ''
    const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const storagePath = `${userId}/${fileName}`
    
    const supabase = createServerClient()
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, file)

    if (uploadError) {
      console.error("File upload error:", uploadError)
      return { 
        isSuccess: false, 
        message: "Failed to upload file", 
        error: uploadError.message 
      }
    }

    // 5. Insert document record
    const documentData: InsertDocument = {
      userId,
      originalFilename: file.name,
      storagePath,
      mimeType: file.type,
      fileSize: file.size,
      pageCount,
      status: "uploaded"
    }

    const [newDocument] = await db
      .insert(documentsTable)
      .values(documentData)
      .returning()

    // 6. Update usage metrics
    await incrementPagesProcessedAction(userId, pageCount)

    // 7. Track analytics
    await trackServerEvent("document_uploaded", userId, {
      document_id: newDocument.id,
      file_type: file.type,
      page_count: pageCount,
      file_size: file.size,
      membership_tier: tier
    })

    // 8. Revalidate path
    revalidatePath("/dashboard/documents")
    
    // 9. Redirect to document review page
    redirect(`/dashboard/documents/${newDocument.id}`)
    
    return {
      isSuccess: true,
      message: "Document uploaded successfully",
      data: newDocument
    }
  } catch (error) {
    console.error("Error uploading document:", error)
    return { 
      isSuccess: false, 
      message: error instanceof Error ? error.message : "Unknown error uploading document",
      error: "500"
    }
  }
} 