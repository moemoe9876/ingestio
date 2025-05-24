/*
<ai_context>
TypeScript types for file upload and batch operations.
Provides type safety for the batch upload system.
</ai_context>
*/

import { type FileRejection } from 'react-dropzone';

// File item interfaces
export interface FileItem {
  name: string;
  size: number;
  type: string;
  valid: boolean;
  errorMessage?: string;
}

export type ValidatedFile = File & {
  id: string;
  preview?: string;
} & (
  | { status: Extract<FileUploadStatus, 'pending'> }
  | { status: Extract<FileUploadStatus, 'uploading'>; progress: number }
  | { status: Extract<FileUploadStatus, 'uploaded'>; progress?: number } // progress can be optional for uploaded if it's always 100 and not needed
  | { status: Extract<FileUploadStatus, 'error'>; errorMessage: string; progress?: number }
);

// File validation results
export interface FileValidationResult {
  valid: boolean;
  file: File;
  errors: FileValidationError[];
}

export interface FileValidationError {
  code: string;
  message: string;
  field?: string;
}

// Upload progress tracking
export interface UploadProgress {
  fileId: string;
  fileName: string;
  progress: number;
  status: FileUploadStatus;
  errorMessage?: string;
}

// Dropzone configuration
export interface DropzoneConfig {
  maxFiles: number;
  maxSize: number; // in bytes
  acceptedFileTypes: Record<string, string[]>;
  multiple: boolean;
  disabled?: boolean;
}

// File constraints by subscription tier
export interface FileConstraints {
  maxFiles: number;
  maxFileSize: number; // in MB
  allowedTypes: string[];
  description: string;
}

// Batch upload types
export type PromptStrategy = 'global' | 'per_document' | 'auto';

export type BatchUploadData = {
  files: File[];
  batchName?: string;
} & (
  | { promptStrategy: 'global'; globalPrompt: string }
  | { promptStrategy: 'per_document'; perDocumentPrompts: Record<string, string> }
  | { promptStrategy: 'auto' }
);

// Component prop types
export interface FileDropzoneProps {
  onFilesAccepted: (files: File[]) => void;
  onFilesRejected: (rejections: FileRejection[]) => void;
  config: DropzoneConfig;
  constraints: FileConstraints;
  className?: string;
  disabled?: boolean;
  currentFileCount: number;
}

export interface FilePreviewProps {
  files: ValidatedFile[];
  onRemoveFile: (fileId: string) => void;
  onRetryUpload?: (fileId: string) => void;
  showProgress?: boolean;
  className?: string;
}

// Validation schema types
export interface FileValidationSchema {
  maxSize: number;
  allowedTypes: string[];
  maxFiles: number;
  minFiles?: number;
}

// Error types
export const FILE_ERROR_CODES = {
  FILE_TOO_LARGE: 'file-too-large',
  FILE_INVALID_TYPE: 'file-invalid-type',
  TOO_MANY_FILES: 'too-many-files',
  FILE_TOO_SMALL: 'file-too-small',
  UPLOAD_FAILED: 'upload-failed',
  SUBSCRIPTION_LIMIT: 'subscription-limit',
  DUPLICATE_FILE: 'duplicate-file',
  INVALID_FILE_NAME: 'invalid-file-name',
} as const;

export type FileErrorCode = typeof FILE_ERROR_CODES[keyof typeof FILE_ERROR_CODES];

// Subscription plan integration
export interface SubscriptionLimits {
  planId: string;
  planName: string;
  maxBatchFiles: number;
  maxFileSize: number;
  allowedFeatures: string[];
}

// Define shared status types
export type FileUploadStatus = 'pending' | 'uploading' | 'uploaded' | 'error';
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

// Batch processing status
export interface BatchStatus {
  id: string;
  name: string;
  totalFiles: number;
  processedFiles: number;
  failedFiles: number;
  status: ProcessingStatus | 'partially_completed';
  createdAt: Date;
  updatedAt: Date;
}

// File metadata for display
export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  webkitRelativePath?: string;
}

// Upload session management
export interface UploadSession {
  id: string;
  files: ValidatedFile[];
  batchName: string;
  totalSize: number;
  status: 'preparing' | ProcessingStatus;
  startedAt: Date;
  completedAt?: Date;
  errorMessage?: string;
}