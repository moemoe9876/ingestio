/*
<ai_context>
Zod schemas for file validation in the batch upload system.
Provides type-safe validation with detailed error messages.
</ai_context>
*/

import { FILE_ERROR_CODES, type FileErrorCode } from '@/types/batch-types';
import { z } from 'zod';

// Constants for file validation
export const MAX_FILE_SIZE_MB = 50;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png'
] as const;

export const ALLOWED_FILE_EXTENSIONS = [
  '.pdf',
  '.jpeg',
  '.jpg', 
  '.png'
] as const;

// File constraints by subscription tier
export const SUBSCRIPTION_FILE_LIMITS = {
  starter: {
    maxFiles: 0, // No batch processing for starter
    maxFileSize: MAX_FILE_SIZE_MB,
    allowedTypes: ALLOWED_MIME_TYPES,
  },
  plus: {
    maxFiles: 50,
    maxFileSize: MAX_FILE_SIZE_MB,
    allowedTypes: ALLOWED_MIME_TYPES,
  },
  growth: {
    maxFiles: 200,
    maxFileSize: MAX_FILE_SIZE_MB,
    allowedTypes: ALLOWED_MIME_TYPES,
  },
} as const;

// Base file validation schema
export const FileValidationSchema = z.object({
  name: z.string().min(1, 'File name is required'),
  size: z.number()
    .positive('File size must be positive')
    .max(MAX_FILE_SIZE_BYTES, `File size must be less than ${MAX_FILE_SIZE_MB}MB`),
  type: z.enum(ALLOWED_MIME_TYPES, {
    errorMap: () => ({ message: 'File type must be PDF, JPEG, or PNG' })
  }),
  lastModified: z.number().optional(),
});

// Extended file validation with business rules
export const BatchFileValidationSchema = z.object({
  files: z.array(FileValidationSchema)
    .min(1, 'At least one file is required')
    .max(200, 'Maximum 200 files allowed'),
  totalSize: z.number()
    .max(5 * 1024 * 1024 * 1024, 'Total batch size cannot exceed 5GB'), // 5GB total limit
});

// Subscription-aware validation schema
export const createSubscriptionFileValidationSchema = (planType: keyof typeof SUBSCRIPTION_FILE_LIMITS) => {
  const limits = SUBSCRIPTION_FILE_LIMITS[planType];
  
  return z.object({
    files: z.array(FileValidationSchema)
      .min(1, 'At least one file is required')
      .max(limits.maxFiles, `Your ${planType} plan allows maximum ${limits.maxFiles} files per batch`),
    totalSize: z.number()
      .max(limits.maxFiles * limits.maxFileSize * 1024 * 1024, 
           `Total size exceeds plan limit`),
  });
};

// File name validation
export const FileNameSchema = z.string()
  .min(1, 'File name cannot be empty')
  .max(255, 'File name too long')
  .regex(/^[^<>:"/\\|?*\x00-\x1f]*$/, 'File name contains invalid characters')
  .refine((name) => !name.startsWith('.'), 'File name cannot start with a dot')
  .refine((name) => !name.endsWith('.'), 'File name cannot end with a dot');

// Batch metadata validation
export const BatchMetadataSchema = z.object({
  name: z.string()
    .min(1, 'Batch name is required')
    .max(100, 'Batch name too long')
    .regex(/^[a-zA-Z0-9\s\-_\.]+$/, 'Batch name can only contain letters, numbers, spaces, hyphens, underscores, and dots'),
  description: z.string()
    .max(500, 'Description too long')
    .optional(),
  promptStrategy: z.enum(['global', 'per_document', 'auto'], {
    errorMap: () => ({ message: 'Invalid prompt strategy' })
  }),
  globalPrompt: z.string()
    .max(5000, 'Global prompt too long')
    .optional(),
  perDocumentPrompts: z.record(z.string(), z.string().max(5000, 'Prompt too long'))
    .optional(),
});

// Upload progress validation
export const UploadProgressSchema = z.object({
  fileId: z.string().uuid('Invalid file ID'),
  progress: z.number().min(0).max(100),
  status: z.enum(['pending', 'uploading', 'completed', 'error']),
  errorMessage: z.string().optional(),
});

// Validation error formatting
export interface ValidationError {
  code: FileErrorCode;
  message: string;
  field?: string;
  details?: unknown;
}

// Custom validation functions
const isAllowedMimeType = (type: string): type is typeof ALLOWED_MIME_TYPES[number] => 
  ALLOWED_MIME_TYPES.includes(type as typeof ALLOWED_MIME_TYPES[number]);

export function validateFileType(file: File): ValidationError | null {
  if (!isAllowedMimeType(file.type)) {
    return {
      code: FILE_ERROR_CODES.FILE_INVALID_TYPE,
      message: `File type "${file.type}" is not allowed. Only PDF, JPEG, and PNG files are supported.`,
      field: 'type'
    };
  }
  return null;
}

export function validateFileSize(file: File, maxSizeBytes: number = MAX_FILE_SIZE_BYTES): ValidationError | null {
  if (file.size > maxSizeBytes) {
    const maxSizeMB = Math.round(maxSizeBytes / (1024 * 1024));
    return {
      code: FILE_ERROR_CODES.FILE_TOO_LARGE,
      message: `File size (${formatFileSize(file.size)}) exceeds the ${maxSizeMB}MB limit.`,
      field: 'size'
    };
  }
  return null;
}

export function validateFileName(fileName: string): ValidationError | null {
  try {
    FileNameSchema.parse(fileName);
    return null;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        code: FILE_ERROR_CODES.INVALID_FILE_NAME,
        message: error.errors[0]?.message || 'Invalid file name',
        field: 'name'
      };
    }
    return {
      code: FILE_ERROR_CODES.INVALID_FILE_NAME,
      message: 'Invalid file name',
      field: 'name'
    };
  }
}

export function validateBatchLimits(
  files: File[], 
  currentFileCount: number, 
  maxFiles: number
): ValidationError | null {
  const totalFiles = currentFileCount + files.length;
  
  if (totalFiles > maxFiles) {
    return {
      code: FILE_ERROR_CODES.TOO_MANY_FILES,
      message: `Adding ${files.length} files would exceed the limit of ${maxFiles} files per batch.`,
      field: 'files'
    };
  }
  return null;
}

export function validateDuplicateFiles(
  newFiles: File[], 
  existingFiles: File[]
): ValidationError[] {
  const errors: ValidationError[] = [];
  const existingNames = new Set(existingFiles.map(f => f.name));
  
  newFiles.forEach(file => {
    if (existingNames.has(file.name)) {
      errors.push({
        code: FILE_ERROR_CODES.DUPLICATE_FILE,
        message: `A file named "${file.name}" has already been added.`,
        field: 'name',
        details: { fileName: file.name }
      });
    }
  });
  
  return errors;
}

// Comprehensive file validation function
export function validateFiles(
  files: File[],
  currentFiles: File[] = [],
  options: {
    maxFiles?: number;
    maxFileSize?: number;
    allowDuplicates?: boolean;
  } = {}
): { validFiles: File[]; errors: ValidationError[] } {
  const validFiles: File[] = [];
  const errors: ValidationError[] = [];
  
  const {
    maxFiles = 200,
    maxFileSize = MAX_FILE_SIZE_BYTES,
    allowDuplicates = false
  } = options;
  
  // Check batch limits
  const batchLimitError = validateBatchLimits(files, currentFiles.length, maxFiles);
  if (batchLimitError) {
    errors.push(batchLimitError);
    return { validFiles, errors };
  }
  
  // Check for duplicates if not allowed
  if (!allowDuplicates) {
    const duplicateErrors = validateDuplicateFiles(files, currentFiles);
    errors.push(...duplicateErrors);
  }
  
  // Validate each file individually
  files.forEach(file => {
    const fileErrors: ValidationError[] = [];
    
    // File type validation
    const typeError = validateFileType(file);
    if (typeError) fileErrors.push(typeError);
    
    // File size validation
    const sizeError = validateFileSize(file, maxFileSize);
    if (sizeError) fileErrors.push(sizeError);
    
    // File name validation
    const nameError = validateFileName(file.name);
    if (nameError) fileErrors.push(nameError);
    
    if (fileErrors.length > 0) {
      errors.push(...fileErrors);
    } else {
      validFiles.push(file);
    }
  });
  
  return { validFiles, errors };
}

// Utility function for file size formatting
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  let i = Math.floor(Math.log(bytes) / Math.log(k));
  
  // Ensure index i is within the bounds of the sizes array
  if (i >= sizes.length) {
    i = sizes.length - 1;
  }
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Get validation schema for subscription tier
export function getValidationSchemaForPlan(planType: keyof typeof SUBSCRIPTION_FILE_LIMITS) {
  return createSubscriptionFileValidationSchema(planType);
}

// Export validation constants
export const VALIDATION_CONSTANTS = {
  MAX_FILE_SIZE_MB,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
  ALLOWED_FILE_EXTENSIONS,
  SUBSCRIPTION_FILE_LIMITS,
} as const;