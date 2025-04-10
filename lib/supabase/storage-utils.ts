import { getCurrentUser } from '@/lib/auth-utils';
import { createAdminClient } from './server';

/**
 * Uploads a file to Supabase storage with proper error handling
 * @param bucketName The storage bucket name
 * @param path The storage path including filename
 * @param fileBuffer The file data buffer
 * @param contentType The MIME type of the file
 * @returns Object with success status and result data or error message
 */
export async function uploadToStorage(
  bucketName: string,
  path: string,
  fileBuffer: Buffer,
  contentType: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    // Get current user ID for ownership verification
    const userId = await getCurrentUser();
    
    // Ensure path starts with user ID for permission scoping
    const securePath = path.startsWith(`${userId}/`) 
      ? path 
      : `${userId}/${path}`;
    
    // Use admin client for storage operations to bypass RLS
    // We'll still enforce access control through our code
    const supabase = await createAdminClient();
    
    // Debug log for storage issue
    console.log(`Uploading file to ${bucketName}/${securePath} for user ${userId}`);
    
    // Upload file
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(securePath, fileBuffer, {
        contentType,
        upsert: false,
      });
    
    if (error) {
      console.error('Storage upload error:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
    
    return { 
      success: true, 
      data 
    };
  } catch (error) {
    console.error('Storage utility error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error during upload' 
    };
  }
}

/**
 * Downloads a file from Supabase storage with proper permissions checks
 * @param bucketName The storage bucket name
 * @param path The storage path including filename
 * @returns Object with success status and file data or error message
 */
export async function downloadFromStorage(
  bucketName: string,
  path: string
): Promise<{ success: boolean; data?: Blob; error?: string }> {
  try {
    // Get current user ID for ownership verification
    const userId = await getCurrentUser();
    
    // Use admin client for storage operations to bypass RLS
    // We'll still enforce access control through our code
    const supabase = await createAdminClient();
    
    // Verify if path belongs to user (basic security check)
    if (!path.startsWith(`${userId}/`)) {
      return { 
        success: false, 
        error: 'Access denied: You can only access your own files' 
      };
    }
    
    // Download file
    const { data, error } = await supabase.storage
      .from(bucketName)
      .download(path);
    
    if (error) {
      console.error('Storage download error:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
    
    return { 
      success: true, 
      data 
    };
  } catch (error) {
    console.error('Storage utility error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error during download' 
    };
  }
} 