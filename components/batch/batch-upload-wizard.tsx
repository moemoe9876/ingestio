"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getPlanById, PlanId } from "@/lib/config/subscription-plans"
import { formatFileSize } from "@/lib/utils/format-file-size"
import { StripeCustomerDataKV } from "@/types/stripe-kv-types"
import { AlertCircle, BadgePercent, Check, FileText, Image as ImageIcon, UploadCloud, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState, useTransition } from "react"
import { FileRejection, useDropzone } from "react-dropzone"
import { PlanInfo } from "./plan-info"
import { WizardNav } from "./wizard-nav"

type PromptStrategy = "global" | "per_document" | "auto"

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
  const handleSubmitBatch = () => console.log("Submit batch called with:", { selectedFiles }) 

  if (isLoadingSubscription) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-3xl">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-muted-foreground">Loading your subscription details...</p>
        </div>
      </div>
    );
  }

  if (subscriptionError) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-3xl">
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
      <div className="container mx-auto py-8 px-4 max-w-3xl">
        <Card className="w-full">
          <CardContent className="p-8 text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <AlertTitle className="text-xl font-semibold">Subscription Required</AlertTitle>
            <AlertDescription className="text-muted-foreground">
              Batch processing is a premium feature. Please upgrade your plan to continue.
            </AlertDescription>
            <Button onClick={() => router.push('/dashboard/settings?tab=billing')} size="lg" className="mt-2">
              View Upgrade Options
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const validFileCount = selectedFiles.length

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">New Batch Upload</h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Follow the steps below to upload and process your documents in bulk.
          </p>
        </div>

        <PlanInfo plan={userPlanId || 'starter'} fileLimit={batchFileLimit || 0} />
        <WizardNav currentStep={currentStep} />

        <Card className="shadow-lg border-border/80">
          <CardContent className="p-6 sm:p-8">
            {currentStep === 1 && (
              <div className="space-y-6">
                <div 
                  {...getRootProps()} 
                  className={`relative group p-8 py-12 border-2 border-dashed rounded-xl text-center transition-colors duration-200 ease-in-out cursor-pointer 
                    ${isDragActive 
                      ? "border-primary bg-primary/10 dark:bg-primary/20 ring-2 ring-primary ring-offset-2 ring-offset-background"
                      : "border-neutral-300 dark:border-neutral-600 hover:border-primary/70 dark:hover:border-primary/70 bg-background dark:bg-neutral-800/30"}`}
                >
                  <input {...getInputProps()} />
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <UploadCloud className={`mx-auto h-16 w-16 mb-2 transition-transform duration-200 ease-in-out group-hover:scale-110 
                      ${isDragActive ? "text-primary" : "text-neutral-400 dark:text-neutral-500 group-hover:text-primary/80"}`}
                    />
                    <p className="text-lg font-semibold text-foreground">
                      Drag & drop files here
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Upload your PDF, JPG, or PNG files to begin processing.
                    </p>
                    <Button 
                      type="button" 
                      variant="default" 
                      size="lg" 
                      className="bg-foreground text-background dark:bg-background dark:text-foreground hover:bg-foreground/90 dark:hover:bg-background/90 font-medium"
                    >
                      Select Files to Upload
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {currentStep === 2 && (
              <div className="text-center py-12">
                <BadgePercent className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Configure Prompts</h3>
                <p className="text-muted-foreground">Define how Ingestio should extract data from your documents.</p>
              </div>
            )}
            
            {currentStep === 3 && (
              <div className="text-center py-12">
                <Check className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Review & Submit</h3>
                <p className="text-muted-foreground">Review your batch details before starting the extraction process.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {currentStep === 1 && (
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center sm:text-left text-xs text-muted-foreground bg-muted/50 dark:bg-neutral-800/40 p-4 rounded-lg border border-border/70">
            <div><span className="font-medium text-foreground">Max files per batch:</span> {batchFileLimit ?? "N/A"}</div>
            <div><span className="font-medium text-foreground">Allowed types:</span> PDF, JPG, PNG</div>
            <div><span className="font-medium text-foreground">Max file size:</span> {MAX_FILE_SIZE_MB}MB</div>
          </div>
        )}

        {(selectedFiles.length > 0 || fileRejections.length > 0) && currentStep === 1 && (
          <div className="space-y-2 pt-6 border-t border-border/60">
            <h3 className="text-xl font-semibold text-foreground mb-4">Upload Queue ({validFileCount} valid)</h3>
            <div className="max-h-[280px] overflow-y-auto space-y-3 pr-2 border border-border/60 rounded-md p-3">
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
        
        <div className="flex items-center mt-8 pt-6 border-t border-border/60">
          {currentStep > 1 ? (
            <Button variant="outline" onClick={handlePreviousStep} disabled={isPending} className="text-base py-2.5 px-6">
              {currentStep === 2 ? "Back to Files" : "Back to Prompts"}
            </Button>
          ) : (
            <div></div> 
          )}
          
          <div className="ml-auto">
            {currentStep < 3 ? (
              <Button 
                onClick={handleNextStep}
                disabled={(currentStep === 1 && validFileCount === 0) || isPending}
                className="text-base py-2.5 px-6"
                size="lg"
              >
                {currentStep === 1 ? "Next: Configure Prompts" : "Next: Review Batch"}
              </Button>
            ) : (
              <Button 
                onClick={handleSubmitBatch}
                disabled={isPending || validFileCount === 0}
                className="text-base py-2.5 px-6 font-semibold"
                size="lg"
              >
                Submit Batch
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 