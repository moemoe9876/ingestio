/*
<ai_context>
Main drag-and-drop upload component with validation for the batch upload system.
Provides file upload functionality with subscription tier-based limits and validation.
</ai_context>
*/

"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { validateFiles } from "@/lib/validation/file-schemas";
import {
  type FileConstraints,
  type FileDropzoneProps
} from "@/types/batch-types";
import { CloudUpload, FileText, Image as ImageIcon, Upload } from "lucide-react";
import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { toast } from "sonner";

interface FileDropzoneComponentProps extends Omit<FileDropzoneProps, 'config'> {
  constraints: FileConstraints;
  currentFileCount: number;
  onFilesAccepted: (files: File[]) => void;
  onFilesRejected: (rejections: FileRejection[]) => void;
  className?: string;
  disabled?: boolean;
}

export function FileDropzone({
  constraints,
  currentFileCount,
  onFilesAccepted,
  onFilesRejected,
  className,
  disabled = false,
}: FileDropzoneComponentProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  // Create dropzone configuration from constraints
  const dropzoneConfig = {
    maxFiles: constraints.maxFiles - currentFileCount,
    maxSize: constraints.maxFileSize * 1024 * 1024, // Convert MB to bytes
    accept: constraints.allowedTypes.reduce((acc, type) => {
      // Handle known types with specific extensions
      if (type === 'application/pdf') {
        acc[type] = ['.pdf'];
      } else if (type === 'image/jpeg') {
        acc[type] = ['.jpeg', '.jpg'];
      } else if (type === 'image/png') {
        acc[type] = ['.png'];
      } else {
        // Fallback: use MIME type as-is for unknown types
        acc[type] = [];
      }
      return acc;
    }, {} as Record<string, string[]>),
    multiple: true,
    disabled: disabled || currentFileCount >= constraints.maxFiles,
  };

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      if (disabled) return;
      
      setIsProcessing(true);

      try {
        // Validate files using our validation system
        const { validFiles, errors } = validateFiles(acceptedFiles, [], {
          maxFiles: constraints.maxFiles - currentFileCount,
          maxFileSize: constraints.maxFileSize * 1024 * 1024,
          allowDuplicates: false,
        });

        // Convert validation errors to FileRejection format
        const validationRejections: FileRejection[] = [];
        errors.forEach(error => {
          // More robust file matching
          const file = acceptedFiles.find(f => {
            if (error.details && typeof error.details === 'object' && 'fileName' in error.details) {
              return (error.details as { fileName: string }).fileName === f.name;
            }
            // Fallback: map to first file if no specific file identified
            return acceptedFiles.length === 1;
          });
          
          if (file) {
            validationRejections.push({
              file,
              errors: [{ code: error.code, message: error.message }]
            });
          }
        });

        // Combine dropzone rejections with validation rejections
        const allRejections = [...fileRejections, ...validationRejections];

        // Show toast notifications for rejections
        if (allRejections.length > 0) {
          const rejectionCount = allRejections.length;
          toast.error(
            `${rejectionCount} file${rejectionCount > 1 ? 's' : ''} could not be added`,
            {
              description: allRejections[0]?.errors[0]?.message || 'Please check file requirements'
            }
          );
        }

        // Show success toast for accepted files
        if (validFiles.length > 0) {
          toast.success(
            `${validFiles.length} file${validFiles.length > 1 ? 's' : ''} added successfully`
          );
        }

        // Call callbacks
        if (validFiles.length > 0) {
          onFilesAccepted(validFiles);
        }
        
        if (allRejections.length > 0) {
          onFilesRejected(allRejections);
        }

} catch (error) {
        console.error('Error processing dropped files:', error);
        const errorMessage = error instanceof Error 
          ? `File processing failed: ${error.message}`
          : 'An unexpected error occurred while processing files';
        toast.error(errorMessage);
       } finally {
        setIsProcessing(false);
      }
    },
    [constraints, currentFileCount, disabled, onFilesAccepted, onFilesRejected]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    ...dropzoneConfig,
  });

  const isAtLimit = currentFileCount >= constraints.maxFiles;
  const remainingSlots = Math.max(0, constraints.maxFiles - currentFileCount);

  return (
    <div className={cn("w-full", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "relative min-h-[200px] p-8 rounded-xl transition-all duration-200 ease-in-out",
          "border-2 border-dashed cursor-pointer",
          "flex flex-col items-center justify-center gap-4",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
          // Color states
          isDragActive && !isDragReject && !disabled && !isAtLimit && "border-primary bg-primary/5 scale-[1.02]",
          isDragReject && "border-destructive bg-destructive/5",
          disabled || isAtLimit ? "border-muted bg-muted/20 cursor-not-allowed opacity-60" : "border-muted-foreground/30 bg-secondary/30 hover:bg-secondary/50 hover:border-primary/50",
          isProcessing && "animate-pulse"
        )}
      >
        <input {...getInputProps()} disabled={disabled || isAtLimit} />
        
        <div className="flex flex-col items-center text-center space-y-4">
          {/* Upload Icon */}
          <div className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center transition-colors",
            isDragActive && !isDragReject && !disabled && !isAtLimit ? "bg-primary/20" : "bg-primary/10"
          )}>
            {isProcessing ? (
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : isDragActive ? (
              <CloudUpload className="w-8 h-8 text-primary" />
            ) : (
              <Upload className="w-8 h-8 text-primary" />
            )}
          </div>

          {/* Main Text */}
          <div className="space-y-2">
            <h4 className="text-lg font-semibold text-foreground">
              {isAtLimit ? "File limit reached" :
               isProcessing ? "Processing files..." :
               isDragActive ? "Drop files here to upload" :
               "Drag & drop your files here"}
            </h4>
            
            <p className="text-sm text-muted-foreground max-w-md">
              {isAtLimit ? `You've reached the maximum of ${constraints.maxFiles} files for this batch.` :
               isDragReject ? "Some files are not allowed. Please check file requirements." :
               disabled ? "File upload is currently disabled." :
               `Upload ${constraints.allowedTypes.join(', ').replace(/application\/|image\//g, '').toUpperCase()} files for your batch. ${remainingSlots} slot${remainingSlots !== 1 ? 's' : ''} remaining.`}
            </p>
          </div>

          {/* Browse Button */}
          {!disabled && !isAtLimit && (
            <Button
              variant="outline"
              size="lg"
              type="button"
              disabled={isProcessing}
              className="mt-2"
            >
              {isProcessing ? "Processing..." : "Browse Files"}
            </Button>
          )}
        </div>

        {/* Processing Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-background/50 rounded-xl flex items-center justify-center">
            <div className="flex items-center gap-2 text-sm font-medium">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Validating files...
            </div>
          </div>
        )}
      </div>

      {/* File Requirements */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center sm:text-left text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border/50">
        <div className="flex items-center justify-center sm:justify-start gap-2">
          <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
          <span>
            <span className="font-medium text-foreground">Max files:</span> {constraints.maxFiles}
          </span>
        </div>
        
        <div className="flex items-center justify-center sm:justify-start gap-2">
          <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
          <span>
            <span className="font-medium text-foreground">File types:</span> {
              constraints.allowedTypes
                .map(type => type.replace(/application\/|image\//, '').toUpperCase())
                .join(', ')
            }
          </span>
        </div>
        
        <div className="flex items-center justify-center sm:justify-start gap-2">
          <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
          <span>
            <span className="font-medium text-foreground">Max size:</span> {constraints.maxFileSize}MB
          </span>
        </div>
      </div>

      {/* Current Status */}
      {currentFileCount > 0 && (
        <div className="mt-3 text-center">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{currentFileCount}</span> of{" "}
            <span className="font-medium text-foreground">{constraints.maxFiles}</span> files selected
            {currentFileCount >= constraints.maxFiles && (
              <span className="text-amber-600 dark:text-amber-400 ml-2">
                • Limit reached
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

// Helper component for file type icons
export function FileTypeIcon({ mimeType, className }: { mimeType: string; className?: string }) {
  // Handle undefined or missing mime type
  if (!mimeType) {
    return <FileText className={cn("text-gray-500", className)} />;
  }
  
  if (mimeType === 'application/pdf') {
    return <FileText className={cn("text-red-500", className)} />;
  }
  
  if (mimeType.startsWith('image/')) {
    return <ImageIcon className={cn("text-blue-500", className)} />;
  }
  
  return <FileText className={cn("text-gray-500", className)} />;
}