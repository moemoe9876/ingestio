"use server"

import { revalidatePath } from "next/cache"

import { getUserSubscriptionDataKVAction } from "@/actions/stripe/sync-actions"
import { db } from "@/db/db"
import { documentsTable, InsertDocument, SelectDocument } from "@/db/schema"
import { trackServerEvent } from "@/lib/analytics/server"
import { getCurrentUser } from "@/lib/auth-utils"
import { checkRateLimit, SubscriptionTier, validateTier } from "@/lib/rate-limiting/limiter"
import { createAdminClient } from "@/lib/supabase/server"
import { uploadToStorage } from "@/lib/supabase/storage-utils"
import { ActionState } from "@/types/server-action-types"
import { checkUserQuotaAction, incrementPagesProcessedAction } from "./user-usage-actions"

/**
 * Uploads a document to Supabase storage and creates a record in the documents table
 * Enforces rate limits and quota restrictions based on user tier
 */
export async function uploadDocumentAction(
  fileData: {
    name: string;
    type: string;
    size: number;
    fileBase64: string; // Base64 encoded file content
  },
  pageCount: number = 1
): Promise<ActionState<SelectDocument>> {
  try {
    // 1. Authentication check
    const userId = await getCurrentUser()

    // 2. Rate limit check based on user tier
    const subscriptionResult = await getUserSubscriptionDataKVAction();
    if (!subscriptionResult.isSuccess) {
      return { 
        isSuccess: false, 
        message: "Failed to retrieve user subscription data",
        error: "404"
      }
    }

    // Determine tier based on subscription status and planId
    let tier = "starter";
    if (subscriptionResult.data.status === 'active' && subscriptionResult.data.planId) {
      tier = subscriptionResult.data.planId as SubscriptionTier;
    }
    tier = validateTier(tier);
    
    const rateLimitResult = await checkRateLimit(userId, tier as SubscriptionTier, "document_upload")
    
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
    const fileExtension = fileData.name.split('.').pop() || ''
    const fileName = `${Date.now()}_${fileData.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const storagePath = `${userId}/${fileName}`
    
    // Convert base64 to Buffer for upload
    const fileBuffer = Buffer.from(fileData.fileBase64.split(',')[1], 'base64')
    
    // Use our storage utility with service role access to bypass RLS
    const uploadResult = await uploadToStorage(
      'documents',
      storagePath, // Pass the complete path with userId included
      fileBuffer,
      fileData.type
    );

    if (!uploadResult.success) {
      console.error("File upload error:", uploadResult.error)
      return { 
        isSuccess: false, 
        message: "Failed to upload file", 
        error: uploadResult.error 
      }
    }

    // 5. Insert document record
    const documentData: InsertDocument = {
      userId,
      originalFilename: fileData.name,
      storagePath,
      mimeType: fileData.type,
      fileSize: fileData.size,
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
      file_type: fileData.type,
      page_count: pageCount,
      file_size: fileData.size,
      membership_tier: tier
    })

    // 8. Revalidate paths
    revalidatePath("/dashboard/documents")
    revalidatePath("/dashboard/metrics")
    revalidatePath("/dashboard/history")

    // 9. Return success instead of redirecting
    // Let the client handle redirect after extraction
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
    const supabase = await createAdminClient()
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

    // Verify that the storage path belongs to the user as a security check
    if (!document.storage_path.startsWith(`${userId}/`)) {
      return {
        isSuccess: false,
        message: "Access denied: You can only delete your own documents",
        error: "403"
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
    revalidatePath("/dashboard/metrics")

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
    const supabase = await createAdminClient()
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

    // Additional security check to ensure storage path belongs to the user
    if (!documentData.storage_path.startsWith(`${userId}/`)) {
      return {
        isSuccess: false,
        message: "Access denied: You can only access your own documents",
        error: "403"
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

/**
 * Updates the extracted data for a document based on user edits or confirmations from the review page
 * Requires user authentication and ownership verification
 */
export async function updateExtractedDataAction(
  documentId: string,
  extractionJobId: string,
  updatedData: any
): Promise<ActionState<void>> {
  try {
    // 1. Authentication check
    const userId = await getCurrentUser()

    // 2. Verify document ownership
    const supabase = await createAdminClient()
    const { data: document, error: documentError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .eq("user_id", userId)
      .single()

    if (documentError || !document) {
      return {
        isSuccess: false,
        message: "Document not found or access denied",
        error: "404"
      }
    }

    // 3. Update the extracted data
    const { error: updateError } = await supabase
      .from("extracted_data")
      .update({ data: updatedData })
      .eq("document_id", documentId)
      .eq("extraction_job_id", extractionJobId)
      .eq("user_id", userId)

    if (updateError) {
      return {
        isSuccess: false,
        message: "Failed to update extracted data",
        error: updateError.message
      }
    }

    // 4. Optionally update document status to 'completed'
    const { error: statusError } = await supabase
      .from("documents")
      .update({ status: "completed" })
      .eq("id", documentId)
      .eq("user_id", userId)

    if (statusError) {
      console.error("Error updating document status:", statusError)
      // Continue even if status update fails
    }

    // 5. Track analytics event
    await trackServerEvent("extracted_data_updated", userId, {
      document_id: documentId,
      extraction_job_id: extractionJobId
    })

    // 6. Revalidate path to update UI
    revalidatePath(`/dashboard/documents/${documentId}`)
    revalidatePath("/dashboard/metrics")

    return {
      isSuccess: true,
      message: "Extracted data updated successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error updating extracted data:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Unknown error updating extracted data",
      error: "500"
    }
  }
}

/**
 * Fetches a paginated and filtered list of documents for the current user
 */
export async function fetchUserDocumentsAction({
  searchTerm = "",
  statusFilter = "all",
  page = 1,
  pageSize = 10,
  sortBy = "createdAt",
  sortOrder = "desc",
}: {
  searchTerm?: string;
  statusFilter?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}): Promise<
  ActionState<{ documents: SelectDocument[]; totalCount: number }>
> {
  try {
    // 1. Authentication check
    const userId = await getCurrentUser()

    // 2. Initialize query
    const supabase = await createAdminClient()
    let query = supabase
      .from("documents")
      .select("*", { count: "exact" }) // Select all columns and get count
      .eq("user_id", userId)

    // 3. Apply filters
    if (searchTerm) {
      query = query.ilike("original_filename", `%${searchTerm}%`)
    }
    if (statusFilter && statusFilter !== "all") {
      query = query.eq("status", statusFilter as 'uploaded' | 'processing' | 'completed' | 'failed')
    }

    // 4. Apply sorting - Convert camelCase field names to snake_case for database
    // Map of frontend field names to database column names
    const fieldNameMap: Record<string, string> = {
      "originalFilename": "original_filename",
      "createdAt": "created_at",
      "updatedAt": "updated_at",
      "status": "status"
    };
    
    // Get the correct database field name
    const dbFieldName = fieldNameMap[sortBy] || sortBy;
    
    // Apply the sort
    query = query.order(dbFieldName, {
      ascending: sortOrder === "asc",
    });

    // 5. Apply pagination
    const offset = (page - 1) * pageSize
    query = query.range(offset, offset + pageSize - 1)

    // 6. Execute query
    const { data: documentsData, error, count } = await query

    if (error) {
      console.error("Error fetching documents:", error)
      return {
        isSuccess: false,
        message: "Failed to fetch documents",
        error: error.message,
      }
    }

    // 7. Map data to SelectDocument type
    const documents: SelectDocument[] = documentsData.map((doc) => ({
      id: doc.id,
      userId: doc.user_id,
      originalFilename: doc.original_filename,
      storagePath: doc.storage_path,
      mimeType: doc.mime_type,
      fileSize: doc.file_size,
      pageCount: doc.page_count,
      status: doc.status,
      createdAt: new Date(doc.created_at),
      updatedAt: doc.updated_at ? new Date(doc.updated_at) : new Date(doc.created_at),
    }))

    return {
      isSuccess: true,
      message: "Documents fetched successfully",
      data: { documents, totalCount: count || 0 },
    }
  } catch (error) {
    console.error("Error fetching documents:", error)
    return {
      isSuccess: false,
      message:
        error instanceof Error ? error.message : "Unknown error fetching documents",
      error: "500",
    }
  }
} 