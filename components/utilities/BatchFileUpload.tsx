'use client';

import React, { useState, useCallback } from 'react'; // Add React and useCallback back
import { useDropzone, FileRejection, Accept } from 'react-dropzone';
import { XCircleIcon, UploadCloudIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface BatchFileUploadProps {
  maxFiles: number;
  allowedMimeTypes?: string[]; // e.g., ['image/jpeg', 'application/pdf']
  maxFileSize?: number; // in bytes
  onFilesChange: (files: File[]) => void;
  className?: string;
}

export function BatchFileUpload({
  maxFiles,
  allowedMimeTypes,
  maxFileSize,
  onFilesChange,
  className,
}: BatchFileUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: FileRejection[]) => {
    setFileErrors([]); // Clear previous errors

    // Handle accepted files
    const currentTotal = selectedFiles.length;
    const availableSlots = maxFiles - currentTotal;

    if (acceptedFiles.length > availableSlots) {
        setFileErrors(prev => [...prev, `Cannot add ${acceptedFiles.length} file(s). You can only add ${availableSlots} more file(s) (max ${maxFiles}).`]);
        // Only add files up to the limit
        const filesToAdd = acceptedFiles.slice(0, availableSlots);
        if (filesToAdd.length > 0) {
            const newFiles = [...selectedFiles, ...filesToAdd];
            setSelectedFiles(newFiles);
            onFilesChange(newFiles);
        }
    } else {
        const newFiles = [...selectedFiles, ...acceptedFiles];
        setSelectedFiles(newFiles);
        onFilesChange(newFiles);
    }

    // Handle rejected files
    const rejectionErrors: string[] = fileRejections.map(({ file, errors }) => {
        const mainError = errors[0]; // Usually, the first error is the most relevant (size, type)
        let message = `${file.name}: `;
        if (mainError.code === 'file-too-large') {
            message += `File is larger than ${maxFileSize ? (maxFileSize / 1024 / 1024).toFixed(2) : 'N/A'} MB`;
        } else if (mainError.code === 'file-invalid-type') {
            message += `Invalid file type.`;
        } else {
            message += mainError.message;
        }
        return message;
    });
    setFileErrors(prev => [...prev, ...rejectionErrors]);

  }, [selectedFiles, maxFiles, maxFileSize, onFilesChange]);


  const handleRemoveFile = (indexToRemove: number) => {
    const updatedFiles = selectedFiles.filter((_, index) => index !== indexToRemove);
    setSelectedFiles(updatedFiles);
    onFilesChange(updatedFiles);
    // Clear errors related to this specific file if needed, or re-validate
    setFileErrors([]); // Simple clear for now, might need more specific error removal later
  };

   // Convert allowedMimeTypes to the format react-dropzone expects
   const acceptProp: Accept | undefined = allowedMimeTypes
    ? allowedMimeTypes.reduce((acc, type) => {
        acc[type] = [];
        return acc;
      }, {} as Accept)
    : undefined;

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    // maxFiles is handled manually in onDrop to account for cumulative additions
    maxSize: maxFileSize,
    accept: acceptProp,
    disabled: selectedFiles.length >= maxFiles, // Disable dropzone if max files reached
  });


  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Dropzone Area */}
      <div
        {...getRootProps()}
        className={cn(
          "flex flex-col items-center justify-center w-full h-32 px-4 py-6 text-center border-2 border-dashed rounded-lg cursor-pointer transition-colors",
          "border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500",
          isDragActive && "border-blue-500 bg-blue-50 dark:bg-blue-900/30",
          isDragReject && "border-red-500 bg-red-50 dark:bg-red-900/30",
          (selectedFiles.length >= maxFiles) && "cursor-not-allowed opacity-60 border-gray-400 bg-gray-100 dark:bg-gray-800 dark:border-gray-700"
        )}
      >
        <input {...getInputProps()} />
        <UploadCloudIcon className={cn("w-8 h-8 mb-2", isDragActive ? "text-blue-600" : "text-gray-500 dark:text-gray-400", isDragReject && "text-red-600")} />
        {isDragActive ? (
          isDragReject ? <p className="text-red-600">Some files will be rejected</p> : <p className="text-blue-600">Drop the files here ...</p>
        ) : (
          selectedFiles.length >= maxFiles ? (
            <p className="text-gray-600 dark:text-gray-400">Maximum files ({maxFiles}) reached.</p>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
          )
        )}
        <p>Max files: {maxFiles}</p>
        {allowedMimeTypes && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Allowed: {allowedMimeTypes.join(', ')}</p>}
        {maxFileSize && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Max size: {(maxFileSize / 1024 / 1024).toFixed(2)} MB</p>}
         <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Max files: {maxFiles}</p>
      </div>

      {/* File Errors */}
      {fileErrors.length > 0 && (
         <Alert variant="destructive">
          <XCircleIcon className="h-4 w-4" />
          <AlertTitle>File Errors</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-5">
              {fileErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Selected Files List */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Selected Files ({selectedFiles.length}/{maxFiles}):</h4>
          <ul className="space-y-1">
            {selectedFiles.map((file, index) => (
              <li key={index} className="flex items-center justify-between p-2 border rounded-md bg-gray-50 dark:bg-gray-800">
                <span className="text-sm truncate pr-2">{file.name} ({(file.size / 1024).toFixed(2)} KB)</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveFile(index)}
                  className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  aria-label={`Remove ${file.name}`}
                >
                  <XCircleIcon className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
