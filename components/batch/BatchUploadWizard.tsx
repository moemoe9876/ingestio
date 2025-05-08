"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getPlanById, PlanId } from "@/lib/config/subscription-plans"
import { formatFileSize } from "@/lib/utils/format-file-size"
import { StripeCustomerDataKV } from "@/types/stripe-kv-types"
import { AlertCircle, FileText, Image as ImageIcon, UploadCloud, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState, useTransition } from "react"
import { FileRejection, useDropzone } from "react-dropzone"
import { BatchReview } from "./batch-review"
import { PlanInfo } from "./plan-info"
import { PromptConfiguration } from "./prompt-configuration"
import { WizardNav } from "./wizard-nav"

type PromptStrategy = "global" | "per-document" | "auto"

interface BatchUploadWizardProps {
  initialSubscriptionData: StripeCustomerDataKV
}

const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_FILE_TYPES = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpeg", ".jpg"],
  "image/png": [".png"],
};

export default function BatchUploadWizard({
  initialSubscriptionData
}: BatchUploadWizardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [fileRejections, setFileRejections] = useState<FileRejection[]>([])
  const [promptStrategy, setPromptStrategy] = useState<PromptStrategy>("global")
  const [globalPrompt, setGlobalPrompt] = useState("")
  const [perDocPrompts, setPerDocPrompts] = useState<Record<string, string>>({})
  
  const [userPlanId, setUserPlanId] = useState<PlanId | null>(null)
  const [userTier, setUserTier] = useState<string | null>(null)
  const [batchFileLimit, setBatchFileLimit] = useState<number | null>(null)
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true)
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null)

  useEffect(() => {
    if (initialSubscriptionData) {
      let planId: PlanId = "starter"
      const status = initialSubscriptionData.status || "none"
      if (status !== "none" && "planId" in initialSubscriptionData) {
        planId = (initialSubscriptionData.planId as PlanId) || "starter"
      }
      setUserPlanId(planId)
      setUserTier(status)
      const plan = getPlanById(planId)
      setBatchFileLimit(plan.batchProcessingLimit)
      setIsLoadingSubscription(false)
    }
  }, [initialSubscriptionData])

  const onDrop = useCallback((acceptedFiles: File[], rejectedDropFiles: FileRejection[]) => {
    const currentValidFileCount = selectedFiles.length;
    const spaceAvailable = batchFileLimit === null ? Infinity : batchFileLimit - currentValidFileCount;

    const filesToAdd = acceptedFiles.slice(0, Math.max(0, spaceAvailable));
    const filesExceedingLimit = acceptedFiles.slice(Math.max(0, spaceAvailable));

    setSelectedFiles(prev => [...prev, ...filesToAdd]);
    
    let newRejections = [...rejectedDropFiles];
    if (filesExceedingLimit.length > 0) {
      filesExceedingLimit.forEach(file => {
        newRejections.push({ 
          file, 
          errors: [{ code: "too-many-files", message: `Batch limit of ${batchFileLimit} files reached.` }] 
        });
      });
    }
    setFileRejections(prev => [...prev, ...newRejections]);

  }, [selectedFiles, batchFileLimit]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ALLOWED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE_BYTES,
  });

  const removeFile = (fileName: string, isRejected: boolean) => {
    if (isRejected) {
      setFileRejections(prev => prev.filter(r => r.file.name !== fileName));
    } else {
      setSelectedFiles(prev => prev.filter(f => f.name !== fileName));
    }
  }

  const handleNextStep = () => currentStep < 3 && setCurrentStep(currentStep + 1)
  const handlePreviousStep = () => currentStep > 1 && setCurrentStep(currentStep - 1)
  const handleSubmitBatch = () => {
    startTransition(() => {
      // In a real implementation, we would prepare FormData and call createBatchUploadAction
      // For now we'll just simulate the data preparation that would happen
      
      // 1. Create FormData object
      const formData = new FormData();
      
      // 2. Add all the selected files
      selectedFiles.forEach(file => {
        formData.append("files", file);
      });
      
      // 3. Add the prompt strategy
      formData.append("promptStrategy", promptStrategy);
      
      // 4. Conditionally add the global prompt or per-document prompts
      if (promptStrategy === "global") {
        formData.append("globalPrompt", globalPrompt);
      } else if (promptStrategy === "per-document") {
        // Convert the per-document prompts object to a JSON string
        formData.append("perDocumentPrompts", JSON.stringify(perDocPrompts));
      }
      
      console.log("Submitting batch with:", { 
        fileCount: selectedFiles.length, 
        promptStrategy, 
        globalPrompt: promptStrategy === "global" ? globalPrompt : undefined,
        perDocPromptCount: promptStrategy === "per-document" ? Object.keys(perDocPrompts).length : undefined
      });
      
      // TODO: Call the actual server action with formData when implemented:
      // createBatchUploadAction(formData)
      //   .then(result => {
      //     if (result.success) {
      //       router.push('/dashboard/batches')
      //     } else {
      //       // Handle errors
      //     }
      //   })
      
      // For MVP, we'll just redirect to the batches page after a delay
      setTimeout(() => {
        router.push('/dashboard/batches')
      }, 1000)
    })
  }

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

  if (subscriptionError) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-5xl">
        <Alert variant="destructive" className="w-full">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Subscription</AlertTitle>
          <AlertDescription>{subscriptionError}</AlertDescription>
        </Alert>
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

  const validFileCount = selectedFiles.length

  return (
    <div className="container mx-auto py-6 px-4 max-w-5xl">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">New Batch Upload</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Follow the steps below to upload and process your documents in bulk.
          </p>
        </div>

        <PlanInfo plan={userPlanId || 'starter'} fileLimit={batchFileLimit || 0} />
        <WizardNav currentStep={currentStep} />

        <Card className="shadow-lg border-border/80">
          <CardContent className="p-5 sm:p-6">
            {currentStep === 1 && (
              <div className="space-y-4">
                <div 
                  {...getRootProps()} 
                  className={`relative group p-6 py-8 border-2 border-dashed rounded-xl text-center transition-colors duration-200 ease-in-out cursor-pointer 
                    ${isDragActive 
                      ? "border-primary bg-primary/10 dark:bg-primary/20 ring-2 ring-primary ring-offset-2 ring-offset-background"
                      : "border-neutral-300 dark:border-neutral-600 hover:border-primary/70 dark:hover:border-primary/70 bg-background dark:bg-neutral-800/30"}`}
                >
                  <input {...getInputProps()} />
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <UploadCloud className={`mx-auto h-12 w-12 mb-1 transition-transform duration-200 ease-in-out group-hover:scale-110 
                      ${isDragActive ? "text-primary" : "text-neutral-400 dark:text-neutral-500 group-hover:text-primary/80"}`}
                    />
                    <p className="text-lg font-semibold text-foreground">
                      Drag & drop files here
                    </p>
                    <p className="text-sm text-muted-foreground mb-3">
                      Upload your PDF, JPG, or PNG files to begin processing.
                    </p>
                    <Button 
                      type="button" 
                      variant="default" 
                      size="lg" 
                      className="bg-black text-white hover:bg-black/90 dark:bg-black dark:text-white dark:hover:bg-black/90 font-medium"
                    >
                      Select Files to Upload
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {currentStep === 2 && (
              <div className="space-y-4">
                <PromptConfiguration
                  promptStrategy={promptStrategy as any}
                  setPromptStrategy={(val) => setPromptStrategy(val as any)}
                  globalPrompt={globalPrompt}
                  setGlobalPrompt={setGlobalPrompt}
                  perDocumentPrompts={perDocPrompts}
                  setPerDocumentPrompts={setPerDocPrompts}
                  files={selectedFiles.map(f => ({
                    name: f.name,
                    size: f.size,
                    type: f.type,
                    valid: true,
                  }))}
                />
              </div>
            )}
            
            {currentStep === 3 && (
              <BatchReview 
                files={selectedFiles.map(f => ({
                  name: f.name,
                  size: f.size,
                  type: f.type,
                  valid: true,
                }))}
                promptStrategy={promptStrategy === "auto" ? "auto-detect" : promptStrategy}
                globalPrompt={globalPrompt}
                perDocumentPrompts={perDocPrompts}
              />
            )}
          </CardContent>
        </Card>

        {currentStep === 1 && (
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center sm:text-left text-xs text-muted-foreground bg-muted/50 dark:bg-neutral-800/40 p-3 rounded-lg border border-border/70">
            <div><span className="font-medium text-foreground">Max files per batch:</span> {batchFileLimit ?? "N/A"}</div>
            <div><span className="font-medium text-foreground">Allowed types:</span> PDF, JPG, PNG</div>
            <div><span className="font-medium text-foreground">Max file size:</span> {MAX_FILE_SIZE_MB}MB</div>
          </div>
        )}

        {(selectedFiles.length > 0 || fileRejections.length > 0) && currentStep === 1 && (
          <div className="space-y-2 pt-4 border-t border-border/60">
            <h3 className="text-xl font-semibold text-foreground mb-3">Upload Queue ({validFileCount} valid)</h3>
            <div className="max-h-[240px] overflow-y-auto space-y-2 pr-2 border border-border/60 rounded-md p-3">
              {selectedFiles.map(file => (
                <Card key={`${file.name}-valid`} className="p-3 shadow-sm border-green-500/30 bg-green-500/5 dark:bg-green-500/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      {file.type === "application/pdf" ? <FileText className="h-6 w-6 text-green-600 dark:text-green-400 flex-shrink-0" /> : <ImageIcon className="h-6 w-6 text-green-600 dark:text-green-400 flex-shrink-0" />}
                      <div className="truncate">
                        <p className="text-sm font-medium text-green-700 dark:text-green-300 truncate">{file.name}</p>
                        <p className="text-xs text-green-600 dark:text-green-400/80">{formatFileSize(file.size)} - Ready to upload</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeFile(file.name, false)} className="text-muted-foreground hover:text-destructive flex-shrink-0">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
              {fileRejections.map(({ file, errors }) => (
                <Card key={`${file.name}-rejected`} className="p-3 shadow-sm border-destructive/50 bg-destructive/10 dark:bg-destructive/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <AlertCircle className="h-6 w-6 text-destructive flex-shrink-0" />
                      <div className="truncate">
                        <p className="text-sm font-medium text-destructive truncate">{file.name}</p>
                        <p className="text-xs text-destructive/80">{formatFileSize(file.size)} - {errors.map(e => e.message).join(", ")}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeFile(file.name, true)} className="text-destructive/80 hover:text-destructive flex-shrink-0">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
        
        <div className="flex items-center mt-6 pt-4 border-t border-border/60">
          {currentStep > 1 ? (
            <Button variant="outline" onClick={handlePreviousStep} disabled={isPending} className="text-base py-2.5 px-6 border-black text-black hover:bg-black/10">
              {currentStep === 2 ? "Back to Files" : "Back to Prompts"}
            </Button>
          ) : (
            <div></div> 
          )}
          
          <div className="ml-auto">
            {currentStep < 3 ? (
              <Button 
                onClick={handleNextStep}
                disabled={
                  (currentStep === 1 && validFileCount === 0) ||
                  (currentStep === 2 && (
                    (promptStrategy === "global" && !globalPrompt.trim()) ||
                    (promptStrategy === "per-document" && selectedFiles.some(f => !(perDocPrompts[f.name] && perDocPrompts[f.name].trim())))
                  )) ||
                  isPending
                }
                className="text-base py-2.5 px-6 bg-black text-white hover:bg-black/90 disabled:bg-gray-300"
                size="lg"
              >
                {currentStep === 1 ? "Next: Configure Prompts" : "Next: Review Batch"}
              </Button>
            ) : (
              <Button 
                onClick={handleSubmitBatch}
                disabled={isPending || validFileCount === 0}
                className="text-base py-2.5 px-6 font-semibold bg-black text-white hover:bg-black/90 disabled:bg-gray-300"
                size="lg"
              >
                {isPending ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  "Submit Batch"
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 