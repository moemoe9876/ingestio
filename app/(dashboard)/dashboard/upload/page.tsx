"use client";

import { extractDocumentDataAction } from "@/actions/ai/extraction-actions";
import { uploadDocumentAction } from "@/actions/db/documents";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { FileUpload } from "@/components/utilities/FileUpload";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, FileText, RotateCw, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

// Define the stages of the upload process
enum UploadStage {
  UPLOAD = "upload",
  PROCESSING = "processing",
  COMPLETE = "complete",
  ERROR = "error"
}

// Add this utility function to convert a File to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export default function UploadPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [extractionPrompt, setExtractionPrompt] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [uploadStage, setUploadStage] = useState<UploadStage>(UploadStage.UPLOAD);
  const [progress, setProgress] = useState(0);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
  };

  const handlePromptChange = (prompt: string) => {
    setExtractionPrompt(prompt);
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

  // Update handleUpload to use the utility function
  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file to upload");
      toast({
        title: "Error",
        description: "Please select a file to upload",
        variant: "destructive"
      });
      return;
    }

    try {
      setUploadStage(UploadStage.PROCESSING);
      setProgress(0);
      
      startTransition(async () => {
        try {
          // Convert File to base64 
          const fileBase64 = await fileToBase64(file);
          
          // Prepare file data for server action
          const fileData = {
            name: file.name,
            type: file.type,
            size: file.size,
            fileBase64
          };
          
          // Step 1: Upload document with serializable data
          // pageCount argument removed as it's now determined server-side
          const uploadResult = await uploadDocumentAction(fileData);
          
          if (!uploadResult.isSuccess) {
            throw new Error(uploadResult.message || "Failed to upload document");
          }
          
          // Store document ID
          setDocumentId(uploadResult.data?.id || null);
          setProgress(50);
          
          // Step 2: Extract data from document
          if (uploadResult.data?.id) {
            const extractionResult = await extractDocumentDataAction({
              documentId: uploadResult.data.id,
              extractionPrompt: extractionPrompt,
              includeConfidence: false,
              includePositions: false,
              useSegmentation: false,
              segmentationThreshold: 0.5,
              maxPagesPerSegment: 5,
              skipClassification: false,
            });
            
            if (!extractionResult.isSuccess) {
              throw new Error(extractionResult.message || "Failed to extract data");
            }
            
            setProgress(100);
            
            // Manually handle redirect to the review page after a short delay
            setTimeout(() => {
              if (uploadResult.data?.id) {
                router.push(`/dashboard/review/${uploadResult.data.id}`);
              }
            }, 1000);
          }
        } catch (error) {
          console.error("Error processing request:", error);
          setError(error instanceof Error ? error.message : "An unknown error occurred");
          setUploadStage(UploadStage.ERROR);
          toast({
            title: "Error",
            description: error instanceof Error ? error.message : "An unknown error occurred",
            variant: "destructive"
          });
        }
      });
    } catch (error) {
      console.error("Error processing request:", error);
      setError(error instanceof Error ? error.message : "An unknown error occurred");
      setUploadStage(UploadStage.ERROR);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    }
  };

  const handleReset = () => {
    setFile(null);
    setExtractionPrompt("");
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
            disabled={!file || isPending}
            size="lg"
            className="extract-data-button w-full max-w-md py-6 relative overflow-hidden group"
          >
            {isPending ? (
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
                    Processing document
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 flex items-center justify-center">
                    <CheckCircle2 className={`h-5 w-5 ${progress >= 90 ? "text-green-500" : "text-muted-foreground/30"}`} />
                  </div>
                  <span className={progress >= 90 ? "text-foreground" : "text-muted-foreground/70"}>
                    Extracting data
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 flex items-center justify-center">
                    <CheckCircle2 className={`h-5 w-5 ${progress === 100 ? "text-green-500" : "text-muted-foreground/30"}`} />
                  </div>
                  <span className={progress === 100 ? "text-foreground" : "text-muted-foreground/70"}>
                    Finalizing extraction
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
        className="complete-container space-y-10"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
      >
        <div className="flex flex-col items-center justify-center text-center">
          <div className="complete-icon-container w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-5">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
          </div>
          <h3 className="text-2xl font-bold mb-3">Processing Complete!</h3>
          <p className="text-muted-foreground mx-auto max-w-md">
            We've successfully extracted the data from your document. You can now review and edit the results.
          </p>
        </div>
        
        <div className="action-buttons flex flex-col gap-4 items-center">
          <Button 
            onClick={handleGoToReview}
            variant="default" 
            size="lg"
            className="w-full max-w-md py-6"
          >
            <FileText className="h-5 w-5 mr-2" />
            Review Extracted Data
          </Button>
          
          <Button
            onClick={handleReset}
            variant="outline"
            size="lg"
            className="w-full max-w-md py-6"
          >
            <Upload className="h-5 w-5 mr-2" />
            Upload Another Document
          </Button>
        </div>
      </motion.div>
    );
  };

  const renderErrorStage = () => {
    return (
      <motion.div 
        className="error-container space-y-10"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
      >
        <div className="flex flex-col items-center justify-center text-center">
          <div className="error-icon-container w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-5">
            <AlertCircle className="h-10 w-10 text-destructive" />
          </div>
          <h3 className="text-2xl font-bold mb-3">Processing Error</h3>
          <p className="text-muted-foreground mx-auto max-w-md">
            We encountered an error while processing your document.
          </p>
        </div>
        
        <Alert variant="destructive" className="max-w-md mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error || "An unknown error occurred. Please try again."}
          </AlertDescription>
        </Alert>
        
        <div className="action-buttons flex flex-col gap-4 items-center">
          <Button
            onClick={handleReset}
            variant="default"
            size="lg"
            className="w-full max-w-md py-6"
          >
            <Upload className="h-5 w-5 mr-2" />
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
