"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FileUpload } from "@/components/utilities/FileUpload";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { FileIcon, FileText, Upload, AlertCircle, CheckCircle2, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { motion, AnimatePresence } from "framer-motion";

// Define the stages of the upload process
enum UploadStage {
  UPLOAD = "upload",
  PROCESSING = "processing",
  COMPLETE = "complete",
  ERROR = "error"
}

interface ExtractionOptions {
  includeConfidence: boolean;
  includePositions: boolean;
  detectDocumentType: boolean;
  temperature: number;
}

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [extractionPrompt, setExtractionPrompt] = useState<string>("");
  const [extractionOptions, setExtractionOptions] = useState<ExtractionOptions>({
    includeConfidence: true,
    includePositions: false,
    detectDocumentType: true,
    temperature: 0.1
  });
  const [loading, setLoading] = useState(false);
  const [uploadStage, setUploadStage] = useState<UploadStage>(UploadStage.UPLOAD);
  const [progress, setProgress] = useState(0);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
  };

  const handlePromptChange = (prompt: string, options?: ExtractionOptions) => {
    setExtractionPrompt(prompt);
    if (options && Object.keys(options).length > 0) {
      setExtractionOptions(options);
    }
  };

  // Simulate progress updates during processing
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (uploadStage === UploadStage.PROCESSING) {
      interval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + Math.random() * 10;
          if (newProgress >= 100) {
            clearInterval(interval);
            return 100;
          }
          return newProgress;
        });
      }, 500);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [uploadStage]);

  // When progress reaches 100%, move to complete stage after a short delay
  useEffect(() => {
    if (progress === 100 && uploadStage === UploadStage.PROCESSING) {
      const timeout = setTimeout(() => {
        setUploadStage(UploadStage.COMPLETE);
      }, 500);
      
      return () => clearTimeout(timeout);
    }
  }, [progress, uploadStage]);

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file to upload");
      return;
    }

    try {
      setLoading(true);
      setUploadStage(UploadStage.PROCESSING);
      setProgress(0);
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append("file", file);
      
      // Add the extraction prompt if provided
      if (extractionPrompt) {
        formData.append("extractionPrompt", extractionPrompt);
      }
      
      // Add extraction options
      if (extractionOptions) {
        formData.append("options", JSON.stringify(extractionOptions));
      }
      
      // Upload the file to the server
      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload document");
      }

      const { documentId } = await uploadResponse.json();
      setDocumentId(documentId);
      
      // Update progress to almost complete
      setProgress(90);
      
      // Simulate a short delay before completing
      setTimeout(() => {
        setProgress(100);
      }, 500);
      
    } catch (error) {
      console.error("Error processing request:", error);
      setError(error instanceof Error ? error.message : "An unknown error occurred");
      setUploadStage(UploadStage.ERROR);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setExtractionPrompt("");
    setLoading(false);
    setUploadStage(UploadStage.UPLOAD);
    setProgress(0);
    setError(null);
  };

  const handleGoToReview = () => {
    if (documentId) {
      router.push(`/dashboard/review/${documentId}`);
    }
  };

  const renderUploadStage = () => {
    return (
      <motion.div 
        className="upload-form-container space-y-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
      >
        <div className="upload-header flex flex-col items-center justify-center text-center mb-8">
          <h3 className="text-2xl font-bold mb-3">Upload Document</h3>
          <p className="text-muted-foreground mx-auto max-w-md">
            Upload a document for automated data extraction. We support PDF files and images up to 100MB.
          </p>
        </div>
        
        <Card className="upload-card border border-muted shadow-sm bg-card/50">
          <CardContent className="pt-6">
            <FileUpload 
              onFileSelect={handleFileSelect} 
              onPromptChange={handlePromptChange}
              initialPrompt={extractionPrompt}
            />
          </CardContent>
        </Card>
        
        <div className="extract-button-container flex justify-center mt-8">
          <Button 
            onClick={handleUpload} 
            disabled={!file || loading}
            size="lg"
            className="extract-data-button w-full max-w-md py-6 relative overflow-hidden group"
          >
            {loading ? (
              <>
                <RotateCw className="mr-2 h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <Upload className="h-5 w-5" />
                  Extract Data
                </span>
                <span className="absolute inset-0 bg-primary/10 w-0 group-hover:w-full transition-all duration-300 ease-in-out" />
              </>
            )}
          </Button>
        </div>
      </motion.div>
    );
  };

  const renderProcessingStage = () => {
    return (
      <motion.div 
        className="processing-container space-y-10"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
      >
        <div className="flex flex-col items-center justify-center text-center">
          <div className="processing-icon-container w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-5">
            <RotateCw className="h-10 w-10 text-primary animate-spin" />
          </div>
          <h3 className="text-2xl font-bold mb-3">Processing Your Document</h3>
          <p className="text-muted-foreground mx-auto max-w-md">
            We're extracting data from your document. This may take a moment depending on the document size and complexity.
          </p>
        </div>
        
        <Card className="progress-card border border-muted shadow-sm bg-card/50 max-w-md mx-auto">
          <CardContent className="pt-6 pb-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Progress value={progress} className="h-2" />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Extracting data...</span>
                  <span>{Math.round(progress)}%</span>
                </div>
              </div>
              
              <div className="space-y-5 pt-4">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 flex items-center justify-center">
                    <CheckCircle2 className={`h-5 w-5 ${progress >= 30 ? "text-green-500" : "text-muted-foreground/30"}`} />
                  </div>
                  <span className={progress >= 30 ? "text-foreground" : "text-muted-foreground/70"}>
                    Document uploaded
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 flex items-center justify-center">
                    <CheckCircle2 className={`h-5 w-5 ${progress >= 60 ? "text-green-500" : "text-muted-foreground/30"}`} />
                  </div>
                  <span className={progress >= 60 ? "text-foreground" : "text-muted-foreground/70"}>
                    Document analyzed
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 flex items-center justify-center">
                    <CheckCircle2 className={`h-5 w-5 ${progress >= 90 ? "text-green-500" : "text-muted-foreground/30"}`} />
                  </div>
                  <span className={progress >= 90 ? "text-foreground" : "text-muted-foreground/70"}>
                    Data extraction complete
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  const renderCompleteStage = () => {
    return (
      <motion.div 
        className="success-container space-y-10"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
      >
        <div className="flex flex-col items-center justify-center text-center">
          <div className="success-icon-container w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-5">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
          </div>
          <h3 className="text-2xl font-bold mb-3">Document Processed Successfully</h3>
          <p className="text-muted-foreground mx-auto max-w-md">
            Your document has been processed and the data has been extracted. You can now review and verify the extracted information.
          </p>
        </div>
        
        <div className="action-buttons-container flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
          <Button 
            onClick={handleGoToReview} 
            size="lg"
            className="w-full sm:w-auto font-medium"
          >
            <FileText className="mr-2 h-5 w-5" />
            Review Extracted Data
          </Button>
          
          <Button 
            onClick={handleReset} 
            variant="outline" 
            size="lg"
            className="w-full sm:w-auto font-medium"
          >
            <Upload className="mr-2 h-5 w-5" />
            Upload Another Document
          </Button>
        </div>
      </motion.div>
    );
  };

  const renderErrorStage = () => {
    return (
      <motion.div 
        className="error-container space-y-8"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
      >
        <div className="flex flex-col items-center justify-center text-center">
          <div className="error-icon-container w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-5">
            <AlertCircle className="h-10 w-10 text-red-500" />
          </div>
          <h3 className="text-2xl font-bold mb-3">Processing Error</h3>
          <p className="text-muted-foreground mx-auto max-w-md">
            We encountered an error while processing your document. Please try again.
          </p>
        </div>
        
        <Alert variant="destructive" className="max-w-md mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error || "An unknown error occurred while processing your document."}
          </AlertDescription>
        </Alert>
        
        <div className="flex justify-center">
          <Button 
            onClick={handleReset} 
            size="lg"
            className="w-full max-w-md"
          >
            Try Again
          </Button>
        </div>
      </motion.div>
    );
  };

  const renderContent = () => {
    switch (uploadStage) {
      case UploadStage.UPLOAD:
        return renderUploadStage();
      case UploadStage.PROCESSING:
        return renderProcessingStage();
      case UploadStage.COMPLETE:
        return renderCompleteStage();
      case UploadStage.ERROR:
        return renderErrorStage();
      default:
        return renderUploadStage();
    }
  };

  return (
    <div className="upload-page-container flex justify-center px-4 py-8">
      <div className="w-full max-w-3xl">
        <AnimatePresence mode="wait">
          {renderContent()}
        </AnimatePresence>
      </div>
    </div>
  );
} 