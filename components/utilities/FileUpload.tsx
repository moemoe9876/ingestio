"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Upload as UploadIcon, File as FileIcon, X } from "lucide-react";
import PdfViewer from "@/components/utilities/PdfViewer";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onPromptChange?: (prompt: string, options?: any) => void;
  initialPrompt?: string;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (
    Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  );
}

export function FileUpload({ onFileSelect, onPromptChange, initialPrompt = "" }: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState(initialPrompt);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      setSelectedFile(file);
      onFileSelect(file);
      setFile(file);
    },
    [onFileSelect]
  );

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newPrompt = e.target.value;
    setPrompt(newPrompt);
    if (onPromptChange) {
      onPromptChange(newPrompt, {});
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
                </p>
              </div>
              
              {file && file.type === "application/pdf" && <PdfViewer file={file} />}
              {file && file.type.startsWith("image/") && (
                <div className="ml-2 border rounded overflow-hidden">
                  <img 
                    src={URL.createObjectURL(file)} 
                    alt="Preview" 
                    className="max-h-20 max-w-20 object-contain"
                  />
                </div>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedFile(null)}
                className="flex-shrink-0 ml-2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
                <span className="sr-only">Remove file</span>
              </Button>
            </div>
          </div>
        )}
      </div>

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
    </div>
  );
}
