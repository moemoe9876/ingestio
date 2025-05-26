"use client";

import { createBatchUploadAction } from "@/actions/batch/batchActions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getPlanById, PlanId } from "@/lib/config/subscription-plans";
import { FileConstraints, ValidatedFile } from "@/types/batch-types";
import { StripeCustomerDataKV } from "@/types/stripe-kv-types";
import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { FileRejection } from "react-dropzone";
import { toast } from "sonner";
import { BatchReview } from "./batch-review";
import { FileDropzone } from "./FileDropzone";
import { FilePreview } from "./FilePreview";
import { PlanInfo } from "./plan-info";
import { PromptConfiguration } from "./prompt-configuration";
import { WizardNav } from "./wizard-nav";

// Removed: const generateUniqueId = ... (will use crypto.randomUUID())

type PromptStrategy = "global" | "per-document" | "auto";

// Enhanced FileRejection with unique ID
interface EnhancedFileRejection extends FileRejection {
  id: string;
}

interface BatchUploadWizardProps {
  initialSubscriptionData: StripeCustomerDataKV;
}

export default function BatchUploadWizard({
  initialSubscriptionData,
}: BatchUploadWizardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [batchName, setBatchName] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // File management state
  // selectedFiles now stores the actual File objects, primarily for FormData submission.
  // validatedFiles stores the enriched ValidatedFile objects (with IDs) for UI and internal tracking.
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [validatedFiles, setValidatedFiles] = useState<ValidatedFile[]>([]);
  const [fileRejections, setFileRejections] = useState<EnhancedFileRejection[]>([]);

  // Prompt configuration state
  const [promptStrategy, setPromptStrategy] = useState<PromptStrategy>("global");
  const [globalPrompt, setGlobalPrompt] = useState("");
  const [perDocPrompts, setPerDocPrompts] = useState<Record<string, string>>({}); // Keyed by ValidatedFile.id

  // Subscription state
  const [userPlanId, setUserPlanId] = useState<PlanId | null>(null);
  const [userTier, setUserTier] = useState<string | null>(null);
  const [batchFileLimit, setBatchFileLimit] = useState<number | null>(null);
  const [fileConstraints, setFileConstraints] = useState<FileConstraints | null>(null);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true);

  useEffect(() => {
    if (initialSubscriptionData) {
      let planId: PlanId = "starter";
      const status = initialSubscriptionData.status || "none";
      if (status !== "none" && "planId" in initialSubscriptionData) {
        planId = (initialSubscriptionData.planId as PlanId) || "starter";
      }
      setUserPlanId(planId);
      setUserTier(status);
      const plan = getPlanById(planId);
      setBatchFileLimit(plan.batchProcessingLimit);

      const constraints: FileConstraints = {
        maxFiles: plan.batchProcessingLimit,
        maxFileSize: 10, // 10MB per file
        allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
        description: `Up to ${plan.batchProcessingLimit} files, 10MB each`,
      };
      setFileConstraints(constraints);
      setIsLoadingSubscription(false);
    }
  }, [initialSubscriptionData]);

  const handleFilesAccepted = useCallback((files: File[]) => {
    // Add to selectedFiles for FormData
    setSelectedFiles(prev => [...prev, ...files]);

    const newValidatedFiles: ValidatedFile[] = files.map((file) => {
      // Create a new object that extends the file with additional properties
      const fileId = crypto.randomUUID(); // Fix: Use crypto.randomUUID()
      const validatedFile = {
        // Spread the file object to preserve all its properties
        // ...file, // Spreading File object directly can be problematic. Access properties explicitly.
        // Explicitly preserve key file properties
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream', // Fallback type
        lastModified: file.lastModified,
        // Add our custom properties with guaranteed unique ID
        id: fileId,
        status: 'pending' as const,
        // Add webkitRelativePath if it exists, otherwise undefined
        webkitRelativePath: (file as any).webkitRelativePath || '',
      };
      return validatedFile as ValidatedFile; // Cast to ensure type compatibility
    });
    setValidatedFiles(prev => [...prev, ...newValidatedFiles]);
  }, []);

  const handleFilesRejected = useCallback((rejections: FileRejection[]) => {
    const enhancedRejections: EnhancedFileRejection[] = rejections.map(rejection => ({
      ...rejection,
      id: crypto.randomUUID(), // Fix: Use crypto.randomUUID()
    }));
    setFileRejections(prev => [...prev, ...enhancedRejections]);
  }, []);

  const handleRemoveFile = useCallback((fileIdToRemove: string) => {
    // Find the file to remove from validatedFiles to get its original File object reference (if needed)
    const fileToRemoveFromValidated = validatedFiles.find(vf => vf.id === fileIdToRemove);

    if (fileToRemoveFromValidated) {
      // Remove from selectedFiles (actual File objects) by comparing the original File object.
      // This assumes that the File objects in selectedFiles correspond to those in validatedFiles.
      // A more robust way would be to store a mapping or ensure selectedFiles also uses IDs if possible.
      // For now, we'll filter by name and size as a proxy if direct object comparison is tricky.
      setSelectedFiles(prev => prev.filter(
        f => !(f.name === fileToRemoveFromValidated.name && f.size === fileToRemoveFromValidated.size)
      ));
    }

    // Remove from validatedFiles using the unique ID
    setValidatedFiles(prev => prev.filter(f => f.id !== fileIdToRemove));

    // Remove from perDocPrompts using the unique ID
    setPerDocPrompts(prevPrompts => {
      const newPrompts = { ...prevPrompts };
      delete newPrompts[fileIdToRemove]; // Assuming perDocPrompts is keyed by ValidatedFile.id
      return newPrompts;
    });

    // Also remove from rejections if it matches the ID (though unlikely to be in both)
    setFileRejections(prev => prev.filter(r => r.id !== fileIdToRemove));
  }, [validatedFiles]);


  const handleRemoveAllFiles = useCallback(() => {
    setSelectedFiles([]);
    setValidatedFiles([]);
    setFileRejections([]);
    setPerDocPrompts({});
  }, []);

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return validatedFiles.length > 0; // Use validatedFiles for UI consistency
      case 2:
        if (promptStrategy === "global") {
          return globalPrompt.trim().length > 0;
        } else if (promptStrategy === "per-document") {
          // Ensure prompts are provided for all *validated* files
          return validatedFiles.every(file =>
            perDocPrompts[file.id] && perDocPrompts[file.id].trim().length > 0
          );
        } else if (promptStrategy === "auto") {
          return true;
        }
        return false;
      default:
        return true;
    }
  };

  const handleNextStep = () => {
    if (currentStep < 3 && validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
      setSubmissionError(null);
    } else {
      const errorMessage = currentStep === 1
        ? "Please upload at least one valid file before proceeding."
        : promptStrategy === "global"
        ? "Please enter a global prompt before proceeding."
        : "Please enter prompts for all documents before proceeding.";
      toast.error(errorMessage);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setSubmissionError(null);
    }
  };

  const handleSubmitBatch = () => {
    if (!validateStep(2)) { // Validate step 2 requirements before submitting from step 3
      toast.error("Please complete all required prompt configurations before submitting.");
      return;
    }

    setIsSubmitting(true);
    setSubmissionError(null);

    startTransition(async () => {
      try {
        const formData = new FormData();

        if (batchName.trim()) {
          formData.append("batchName", batchName.trim());
        }

        // Use selectedFiles for FormData as these are the raw File objects
        selectedFiles.forEach(file => {
          formData.append("files", file);
        });

        formData.append("promptStrategy", promptStrategy);

        if (promptStrategy === "global") {
          formData.append("globalPrompt", globalPrompt);
        } else if (promptStrategy === "per-document") {
          // Ensure perDocPrompts are correctly mapped if keys are file IDs
          // The backend action `createBatchUploadAction` expects perDocPrompts to be keyed by original file names.
          // We need to map our ID-keyed prompts back to name-keyed prompts.
          const nameKeyedPerDocPrompts: Record<string, string> = {};
          validatedFiles.forEach(vf => {
            if (perDocPrompts[vf.id]) {
              nameKeyedPerDocPrompts[vf.name] = perDocPrompts[vf.id];
            }
          });
          formData.append("perDocPrompts", JSON.stringify(nameKeyedPerDocPrompts));
        }

        toast.info("Submitting batch...", { duration: 5000 });
        const result = await createBatchUploadAction(formData);

        if (result.isSuccess) {
          toast.success(result.message || "Batch submitted successfully!");
          router.push(`/dashboard/batches/${result.data?.batchId}`);
        } else {
          const errorMessage = result.message || "Batch submission failed";
          setSubmissionError(errorMessage);
          toast.error(`Batch submission failed: ${errorMessage}`);
        }
      } catch (error) {
        console.error("Batch submission error:", error);
        const errorMessage = "An unexpected error occurred during batch submission";
        setSubmissionError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsSubmitting(false);
      }
    });
  };

  if (isLoadingSubscription) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-5xl">
        <div className="flex flex-col items-center justify-center min-h-[300px]">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-muted-foreground">Loading your subscription details...</p>
        </div>
      </div>
    );
  }

  const hasBatchAccess = userPlanId && userPlanId !== 'starter' && (userTier === 'active' || userTier === 'trialing');
  if (!hasBatchAccess) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-5xl">
        <Card className="w-full">
          <CardContent className="p-8 text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <AlertTitle className="text-xl font-semibold">Subscription Required</AlertTitle>
            <AlertDescription className="text-muted-foreground">
              Batch processing is a premium feature. Please upgrade your plan to continue.
            </AlertDescription>
            <Button onClick={() => router.push('/dashboard/settings?tab=billing')} size="lg" className="mt-2 bg-black text-white hover:bg-black/90">
              View Upgrade Options
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-5xl">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-2xl">New Batch Upload</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Follow the steps below to upload and process your documents in bulk.
          </p>
        </div>

        {userPlanId && fileConstraints && <PlanInfo plan={userPlanId} fileLimit={fileConstraints.maxFiles} />}
        <WizardNav currentStep={currentStep} />

        <Card className="shadow-lg border-border/80">
          <CardContent className="p-5 sm:p-6">
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="batchName" className="text-sm font-medium">
                    Batch Name (Optional)
                  </Label>
                  <Input
                    id="batchName"
                    placeholder="e.g., Q4 Invoices, Client Onboarding Docs"
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Give your batch a descriptive name for easier identification later.
                  </p>
                </div>

                {fileConstraints && (
                  <FileDropzone
                    constraints={fileConstraints}
                    currentFileCount={validatedFiles.length} // Use validatedFiles.length for current count
                    onFilesAccepted={handleFilesAccepted}
                    onFilesRejected={handleFilesRejected}
                    disabled={validatedFiles.length >= fileConstraints.maxFiles}
                  />
                )}

                {(validatedFiles.length > 0 || fileRejections.length > 0) && (
                  <FilePreview
                    files={validatedFiles} // Pass validatedFiles (which have IDs)
                    // Pass fileRejections if FilePreview is updated to show them
                    onRemoveFile={handleRemoveFile} // Uses ID
                    onConfirmRemoveAll={handleRemoveAllFiles}
                    showProgress={false}
                  />
                )}
              </div>
            )}
            
            {currentStep === 2 && (
              <PromptConfiguration
                promptStrategy={promptStrategy}
                setPromptStrategy={setPromptStrategy}
                globalPrompt={globalPrompt}
                setGlobalPrompt={setGlobalPrompt}
                perDocumentPrompts={perDocPrompts} // Keyed by ValidatedFile.id
                setPerDocumentPrompts={setPerDocPrompts}
                files={validatedFiles.map(f => ({ // Pass validatedFiles for UI consistency
                  name: f.name,
                  size: f.size,
                  type: f.type,
                  valid: true, // Assuming these are valid at this stage
                  id: f.id, // Pass ID for keying perDocPrompts
                }))}
              />
            )}
            
            {currentStep === 3 && (
              <div className="space-y-4">
                <BatchReview 
                  batchName={batchName}
                  files={validatedFiles.map(f => ({ // Use validatedFiles
                    name: f.name,
                    size: f.size,
                    type: f.type,
                    valid: true,
                  }))}
                  promptStrategy={promptStrategy}
                  globalPrompt={globalPrompt}
                  perDocumentPrompts={perDocPrompts} // This will be keyed by ID
                />
                
                {submissionError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Submission Error</AlertTitle>
                    <AlertDescription>{submissionError}</AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>



        <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/60">
          {currentStep > 1 ? (
            <Button 
              variant="outline" 
              onClick={handlePreviousStep} 
              disabled={isSubmitting || isPending} 
              className="py-2.5 px-6"
            >
              {currentStep === 2 ? "Back to Files" : "Back to Prompts"}
            </Button>
          ) : (
            <div></div> 
          )}
          
          <div className="flex items-center gap-3">
            {currentStep < 3 ? (
              <Button 
                onClick={handleNextStep}
                disabled={!validateStep(currentStep) || isPending}
                className="py-2.5 px-6 bg-black text-white hover:bg-black/90 disabled:bg-gray-300"
                size="lg"
              >
                {currentStep === 1 ? "Next: Configure Prompts" : "Next: Review Batch"}
              </Button>
            ) : (
              <Button 
                onClick={handleSubmitBatch}
                disabled={isSubmitting || !validateStep(2) || validatedFiles.length === 0}
                className="py-2.5 px-6 font-semibold bg-black text-white hover:bg-black/90 disabled:bg-gray-300"
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  "Submit Batch"
                )}
              </Button>
            )}
            
            <div className="text-xs text-muted-foreground">
              Step {currentStep} of 3
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}