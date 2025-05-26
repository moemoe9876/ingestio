"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import PdfViewer from "@/components/utilities/PdfViewer";
import { cn } from "@/lib/utils";
import { formatFileSize } from "@/lib/utils/format-file-size"; // Assuming this is correctly imported
import { File as FileIcon, Upload as UploadIcon, X, AlertCircle } from "lucide-react"; // Added AlertCircle
import { useCallback, useEffect, useState } from "react";
import { useDropzone, FileRejection } from "react-dropzone"; // Imported FileRejection
import { toast } from "sonner"; // Using sonner for feedback

interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
  onPromptChange?: (prompt: string) => void;
  initialPrompt?: string;
}

export function FileUpload({ onFileSelect, onPromptChange, initialPrompt = "" }: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [detectedFileType, setDetectedFileType] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [rejectionErrors, setRejectionErrors] = useState<string[]>([]); // State for rejection errors

  const suggestPrompt = useCallback((type: string) => {
    let suggestedPrompt = prompt;
    if (!prompt || prompt === initialPrompt) { // Only suggest if prompt is empty or initial
      switch (type) {
        case 'invoice':
          suggestedPrompt = "Extract invoice number, date, due date, vendor name, vendor address, line items, subtotal, tax, and total amount.";
          break;
        case 'resume':
          suggestedPrompt = "Extract name, contact information, work experience, education, skills, and certifications.";
          break;
        case 'form':
          suggestedPrompt = "Extract all form fields with their labels and values.";
          break;
        default:
          // No change if type is not recognized or prompt is already custom
          break;
      }
      if (suggestedPrompt !== prompt) {
        setPrompt(suggestedPrompt);
        if (onPromptChange) {
          onPromptChange(suggestedPrompt);
        }
      }
    }
  }, [prompt, initialPrompt, onPromptChange, setPrompt]); // Dependencies for suggestPrompt

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      setRejectionErrors([]); // Clear previous rejection errors

      if (fileRejections.length > 0) {
        const currentRejectionErrors: string[] = [];
        fileRejections.forEach(({ file, errors }) => {
          errors.forEach(error => {
            let message = `${file.name}: `;
            if (error.code === 'file-too-large') {
              message += `File is too large (max 100MB).`;
            } else if (error.code === 'file-invalid-type') {
              message += `Invalid file type.`;
            } else {
              message += error.message;
            }
            currentRejectionErrors.push(message);
            toast.error("File Rejected", { description: message });
          });
        });
        setRejectionErrors(currentRejectionErrors);
      }

      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setSelectedFile(file);
        onFileSelect(file);
        setDetectedFileType(null); // Reset detected type for new file

        const fileName = file.name.toLowerCase();
        if (fileName.includes('invoice') || fileName.includes('receipt')) {
          setDetectedFileType('invoice');
          suggestPrompt('invoice');
        } else if (fileName.includes('resume') || fileName.includes('cv')) {
          setDetectedFileType('resume');
          suggestPrompt('resume');
        } else if (fileName.includes('form')) {
          setDetectedFileType('form');
          suggestPrompt('form');
        }
      } else if (fileRejections.length === 0 && selectedFile) {
        // If no files accepted and no new rejections, but a file was previously selected,
        // it means the user might have tried to drop a file while one was already selected (multiple: false)
        // or an unhandled dropzone internal state. We can optionally clear the selection or notify.
        // For now, we'll assume react-dropzone handles this by not calling onDrop if multiple:false and file exists.
      }
    },
    [onFileSelect, suggestPrompt, selectedFile] // suggestPrompt is now memoized
  );

  useEffect(() => {
    let objectUrl: string | null = null;
    if (selectedFile && selectedFile.type.startsWith("image/")) {
      objectUrl = URL.createObjectURL(selectedFile);
      setImagePreviewUrl(objectUrl);
    } else {
      setImagePreviewUrl(null); // Clear if not an image or no file
    }

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        setImagePreviewUrl(null);
      }
    };
  }, [selectedFile]);

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newPrompt = e.target.value;
    setPrompt(newPrompt);
    if (onPromptChange) {
      onPromptChange(newPrompt);
    }
  };

  const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
    },
    maxSize: 100 * 1024 * 1024, // 100MB
    multiple: false,
  });

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setDetectedFileType(null);
    onFileSelect(null);
    setRejectionErrors([]); // Clear errors when file is removed
  };

  return (
    <div className="w-full space-y-6">
      <div className="file-upload-container min-h-[180px]">
        {!selectedFile ? (
          <div
            {...getRootProps()}
            className={cn(
              "min-h-[180px] p-6 rounded-lg",
              "transition-all duration-200 ease-in-out",
              "border-2 border-dashed cursor-pointer",
              "flex flex-col items-center justify-center gap-4",
              isDragActive ? "border-primary bg-primary/5 scale-[1.02]" : "border-muted-foreground/30 bg-secondary/30 hover:bg-secondary/50 hover:border-primary/50",
              isDragAccept && "border-green-500 bg-green-50 dark:bg-green-950/20",
              isDragReject && "border-red-500 bg-red-50 dark:bg-red-950/20",
            )}
          >
            <input {...getInputProps()} />
            
            <div className="flex flex-col items-center text-center">
              <div className="upload-icon-container w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <UploadIcon className="w-8 h-8 text-primary" />
              </div>
              
              <h4 className="text-base font-medium text-foreground mb-1">
                {isDragActive 
                  ? isDragAccept 
                    ? "Drop to upload your file" 
                    : "This file type is not supported"
                  : "Drag & Drop your file here"}
              </h4>
              
              <p className="text-sm text-muted-foreground mb-2">
                Upload a PDF, PNG or JPEG file
              </p>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                type="button"
              >
                Browse Files
              </Button>
              
              <p className="text-xs text-muted-foreground mt-3">
                Maximum file size: 100MB
              </p>
            </div>
          </div>
        ) : (
          <div className="selected-file-container p-5 rounded-lg border border-muted bg-secondary/40 transition-all">
            <div className="flex flex-row items-center">
              <div className="file-icon-container w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-4 flex-shrink-0">
                <FileIcon className="w-5 h-5 text-primary" />
              </div>
              
              <div className="flex-grow min-w-0">
                <p className="text-sm font-medium truncate text-foreground">
                  {selectedFile?.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(selectedFile?.size ?? 0)}
                  {detectedFileType && <span className="ml-1">• Detected: {detectedFileType}</span>}
                </p>
              </div>
              
              {selectedFile && selectedFile.type === "application/pdf" && <PdfViewer file={selectedFile} />}
              {selectedFile && selectedFile.type.startsWith("image/") && imagePreviewUrl && (
                <div className="ml-2 border rounded overflow-hidden">
                  <img 
                    src={imagePreviewUrl} 
                    alt="Preview" 
                    className="max-h-20 max-w-20 object-contain"
                  />
                </div>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={handleRemoveFile}
                className="flex-shrink-0 ml-2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 w-4" />
                <span className="sr-only">Remove file</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {rejectionErrors.length > 0 && (
        <div className="mt-4 space-y-1">
          {rejectionErrors.map((error, index) => (
            <div key={index} className="flex items-center text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
              {error}
            </div>
          ))}
        </div>
      )}

      <div className="extraction-instructions-container space-y-2">
        <Label htmlFor="extraction-prompt" className="text-sm font-medium">Extraction Instructions</Label>
        <Textarea
          id="extraction-prompt"
          placeholder="Describe what data you want to extract from this document (e.g., 'Extract invoice number, date, vendor name, line items, and total amount')"
          value={prompt}
          onChange={handlePromptChange}
          className="min-h-[120px] resize-none border-muted focus:border-primary"
        />
        <p className="text-xs text-muted-foreground">
          Provide specific instructions to improve extraction accuracy
        </p>
      </div>
      
      <div className="extraction-options-container">
      </div>
    </div>
  );
}