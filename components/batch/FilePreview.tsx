/*
<ai_context>
Individual file preview component with metadata display for the batch upload system.
Shows file details, validation status, upload progress, and provides removal capabilities.
</ai_context>
*/

"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatFileSize } from "@/lib/validation/file-schemas";
import { type FilePreviewProps, type ValidatedFile } from "@/types/batch-types";
import { AlertCircle, CheckCircle, FileText, Image as ImageIcon, RefreshCw, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface FilePreviewItemProps {
  file: ValidatedFile;
  onRemove: (fileId: string) => void;
  onRetry?: (fileId: string) => void;
  showProgress?: boolean;
  className?: string;
}

function FilePreviewItem({
  file,
  onRemove,
  onRetry,
  showProgress = false,
  className
}: FilePreviewItemProps) {
  const [isRemoving, setIsRemoving] = useState(false);

const handleRemove = async () => {
     setIsRemoving(true);
     try {
       await onRemove(file.id);
     } catch (error) {
       console.error('Error removing file:', error);
      // Show error feedback to user
      toast.error('Failed to remove file. Please try again.');
     } finally {
       setIsRemoving(false);
     }
   };

  const handleRetry = () => {
    if (onRetry) {
      onRetry(file.id);
    }
  };

  const getStatusIcon = () => {
    switch (file.status) {
      case 'uploaded':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'uploading':
        return <div className="h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getFileTypeIcon = () => {
    // Handle undefined or missing file type
    if (!file.type) {
      return <FileText className="h-6 w-6 text-gray-500 flex-shrink-0" />;
    }
    
    if (file.type === 'application/pdf') {
      return <FileText className="h-6 w-6 text-red-500 flex-shrink-0" />;
    }
    if (file.type.startsWith('image/')) {
      return <ImageIcon className="h-6 w-6 text-blue-500 flex-shrink-0" />;
    }
    return <FileText className="h-6 w-6 text-gray-500 flex-shrink-0" />;
  };

  const getStatusColor = () => {
    switch (file.status) {
      case 'uploaded':
        return 'border-green-500/30 bg-green-500/5';
      case 'uploading':
        return 'border-blue-500/30 bg-blue-500/5';
      case 'error':
        return 'border-red-500/30 bg-red-500/5';
      default:
        return 'border-border bg-background';
    }
  };

  return (
    <Card className={cn("transition-all duration-200", getStatusColor(), className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* File Info */}
          <div className="flex items-start gap-3 min-w-0 flex-1">
            {/* File Type Icon */}
            <div className="mt-0.5">
              {getFileTypeIcon()}
            </div>

            {/* File Details */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-sm text-foreground truncate">
                  {file.name}
                </h4>
                {getStatusIcon()}
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                <span>{formatFileSize(file.size)}</span>
                <span className="capitalize">
                  {file.type 
                    ? file.type.replace('application/', '').replace('image/', '')
                    : 'Unknown'
                  }
                </span>
                {file.lastModified && (
                  <span>
                    {new Date(file.lastModified).toLocaleDateString()}
                  </span>
                )}
              </div>

              {/* Status Message */}
              {file.status === 'error' && file.errorMessage && (
                <div className="flex items-center gap-1 text-xs text-red-600 mb-2">
                  <AlertCircle className="h-3 w-3" />
                  <span>{file.errorMessage}</span>
                </div>
              )}

              {file.status === 'uploaded' && (
                <div className="flex items-center gap-1 text-xs text-green-600 mb-2">
                  <CheckCircle className="h-3 w-3" />
                  <span>Upload completed successfully</span>
                </div>
              )}

              {/* Upload Progress */}
              {showProgress && file.status === 'uploading' && typeof file.progress === 'number' && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Uploading...</span>
                    <span className="font-medium">{Math.round(file.progress)}%</span>
                  </div>
                  <Progress value={file.progress} className="h-1.5" />
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Retry Button */}
            {file.status === 'error' && onRetry && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleRetry}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Retry upload</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Remove Button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRemove}
                    disabled={isRemoving || file.status === 'uploading'}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    {isRemoving ? (
                      <div className="h-4 w-4 border-2 border-destructive border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Remove file</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function FilePreview({
  files,
  onRemoveFile,
  onRetryUpload,
  showProgress = false,
  className,
  onConfirmRemoveAll
}: FilePreviewProps & { onConfirmRemoveAll: () => void }) {
  if (files.length === 0) {
    return null;
  }

  const errorFiles = files.filter(f => f.status === 'error');
  const uploadingFiles = files.filter(f => f.status === 'uploading');
  const completedFiles = files.filter(f => f.status === 'uploaded');

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-foreground">
            Selected Files ({files.length})
          </h3>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {completedFiles.length > 0 && (
              <span className="text-green-600">
                {completedFiles.length} uploaded
              </span>
            )}
            {uploadingFiles.length > 0 && (
              <span className="text-blue-600">
                {uploadingFiles.length} uploading
              </span>
            )}
            {errorFiles.length > 0 && (
              <span className="text-red-600">
                {errorFiles.length} failed
              </span>
            )}
          </div>
        </div>

        {/* Bulk Actions */}
        <div className="flex items-center gap-2">
          {errorFiles.length > 0 && onRetryUpload && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                errorFiles.forEach(file => onRetryUpload(file.id));
              }}
              className="text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry All
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={onConfirmRemoveAll}
            className="text-xs text-destructive hover:text-destructive"
          >
            <X className="h-3 w-3 mr-1" />
            Remove All
          </Button>
        </div>
      </div>

      {/* File List */}
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {files.map((file) => (
          <FilePreviewItem
            key={file.id}
            file={file}
            onRemove={onRemoveFile}
            onRetry={onRetryUpload}
            showProgress={showProgress}
          />
        ))}
      </div>

      {/* Summary */}
      {files.length > 3 && (
        <div className="pt-3 border-t border-border text-xs text-muted-foreground text-center">
          <p>
            Total size: {formatFileSize(files.reduce((sum, file) => sum + file.size, 0))}
            {files.length > 10 && ` • All ${files.length} files are shown in the scrollable list above`}
          </p>
        </div>
      )}
    </div>
  );
}

// Export individual item component for reuse
export { FilePreviewItem };
