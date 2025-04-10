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

/**
 * Deletes a document and its associated file from storage
 * Requires user authentication and ownership verification
 */
export async function deleteDocumentAction(
  documentId: string
): Promise<ActionState<void>> {
  try {
    // 1. Authentication check
    const userId = await getCurrentUser()

    // 2. Check if document exists and belongs to the user
    const supabase = createServerClient()
    const { data: document, error: fetchError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .eq("user_id", userId)
      .single()

    if (fetchError || !document) {
      return {
        isSuccess: false,
        message: "Document not found or access denied",
        error: "404"
      }
    }

    // 3. Delete the file from storage
    const { error: storageError } = await supabase.storage
      .from("documents")
      .remove([document.storage_path])

    if (storageError) {
      console.error("Storage deletion error:", storageError)
      // Continue with database deletion even if storage deletion fails
      // This prevents orphaned records, and storage cleanup can be done later
    }

    // 4. Delete the document record from the database
    // This will trigger cascading deletes for related records
    const { error: deleteError } = await supabase
      .from("documents")
      .delete()
      .eq("id", documentId)
      .eq("user_id", userId)

    if (deleteError) {
      return {
        isSuccess: false,
        message: "Failed to delete document",
        error: deleteError.message
      }
    }

    // 5. Track analytics event
    await trackServerEvent("document_deleted", userId, {
      document_id: documentId,
      file_type: document.mime_type,
      page_count: document.page_count
    })

    // 6. Revalidate path to update UI
    revalidatePath("/dashboard/documents")

    return {
      isSuccess: true,
      message: "Document deleted successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error deleting document:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Unknown error deleting document",
      error: "500"
    }
  }
}

/**
 * Fetches document data for review, including metadata, a signed URL for the document,
 * and any associated extracted data
 */
export async function fetchDocumentForReviewAction(
  documentId: string
): Promise<ActionState<{
  document: SelectDocument;
  signedUrl: string;
  extractedData: any | null;
}>> {
  try {
    // 1. Authentication check
    const userId = await getCurrentUser()

    // 2. Fetch document data and verify ownership
    const supabase = createServerClient()
    const { data: documentData, error: documentError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .eq("user_id", userId)
      .single()

    if (documentError || !documentData) {
      return {
        isSuccess: false,
        message: "Document not found or access denied",
        error: "404"
      }
    }

    // Map database fields to our schema types
    const document: SelectDocument = {
      id: documentData.id,
      userId: documentData.user_id,
      originalFilename: documentData.original_filename,
      storagePath: documentData.storage_path,
      mimeType: documentData.mime_type,
      fileSize: documentData.file_size,
      pageCount: documentData.page_count,
      status: documentData.status,
      createdAt: new Date(documentData.created_at),
      updatedAt: new Date(documentData.updated_at)
    }

    // 3. Generate signed URL for the document
    const { data: signedUrlData, error: signedUrlError } = await supabase
      .storage
      .from("documents")
      .createSignedUrl(document.storagePath, 60 * 30) // 30 minutes expiry

    if (signedUrlError || !signedUrlData) {
      console.error("Error generating signed URL:", signedUrlError)
      return {
        isSuccess: false,
        message: "Failed to generate document access URL",
        error: signedUrlError?.message || "Unknown error"
      }
    }

    // 4. Fetch associated extracted data if available
    const { data: extractedData, error: extractedDataError } = await supabase
      .from("extracted_data")
      .select("*")
      .eq("document_id", documentId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (extractedDataError) {
      console.error("Error fetching extracted data:", extractedDataError)
      // Continue without extracted data - it might not exist yet
    }

    // 5. Track analytics event
    await trackServerEvent("document_viewed", userId, {
      document_id: documentId,
      file_type: document.mimeType,
      has_extracted_data: !!extractedData
    })

    return {
      isSuccess: true,
      message: "Document data fetched successfully",
      data: {
        document,
        signedUrl: signedUrlData.signedUrl,
        extractedData: extractedData?.data || null
      }
    }
  } catch (error) {
    console.error("Error fetching document data:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Unknown error fetching document data",
      error: "500"
    }
  }
} 