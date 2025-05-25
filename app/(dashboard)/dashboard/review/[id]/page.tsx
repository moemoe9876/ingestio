"use client";

import { fetchDocumentForReviewAction, updateExtractedDataAction } from "@/actions/db/documents";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { DataVisualizer } from "@/components/utilities/DataVisualizer";
import DocumentViewer from "@/components/utilities/DocumentViewer";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  Check,
  Download,
  FileText,
  Loader2,
  MoreVertical,
  RotateCw,
  Trash2
} from "lucide-react";
import * as React from "react";
import { useEffect, useState, useTransition } from "react";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

// Define types for our data structure
interface FieldData {
  value: string | number;
}

type ExtractedData = {
  [key: string]: FieldData | FieldData[] | { [key: string]: any };
};

interface ExtractionMetadata {
  timestamp: string;
  model: string;
  prompt: string;
  processingTimeMs: number;
  jobId?: string;
}

export default function ReviewPage({ params }: PageProps) {
  const { id } = React.use(params);
  const documentId = id;
  const { toast } = useToast();
  const [editMode, setEditMode] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [exportFormat, setExportFormat] = useState("json");
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [extractionMetadata, setExtractionMetadata] = useState<ExtractionMetadata | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [selectedFieldPath, setSelectedFieldPath] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [originalData, setOriginalData] = useState<ExtractedData | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [processingStatus, setProcessingStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [showMenuDialog, setShowMenuDialog] = useState(false);

  // Listen for sidebar toggle events
  useEffect(() => {
    const handleSidebarToggle = (e: CustomEvent) => {
      setSidebarCollapsed(e.detail.collapsed);
      window.dispatchEvent(new Event('resize'));
    };
    window.addEventListener("sidebarToggle", handleSidebarToggle as EventListener);
    const savedState = localStorage.getItem("sidebarCollapsed");
    if (savedState !== null) setSidebarCollapsed(savedState === "true");
    return () => window.removeEventListener("sidebarToggle", handleSidebarToggle as EventListener);
  }, []);

  // Fetch document data
  useEffect(() => {
    const fetchDocumentData = async () => {
      try {
        setIsLoading(true);
        setHasError(false);
        setErrorMessage(null);
        if (!documentId) throw new Error("Invalid document ID");
        const result = await fetchDocumentForReviewAction(documentId);
        if (!result.isSuccess || !result.data) throw new Error(result.message || "Failed to fetch document data");
        const { document, signedUrl, extractedData: docData } = result.data;
        if (!docData) throw new Error("No extracted data found");
        setExtractedData(docData.data || docData);
        setExtractionMetadata(docData.metadata || {
          timestamp: document.updatedAt?.toISOString() || document.createdAt.toISOString(),
          model: "gemini-2.0-flash-001",
          prompt: "",
          processingTimeMs: 0
        });
        setFileName(document.originalFilename);
        setPdfUrl(signedUrl);
        setOriginalData(docData.data || docData);
        
        // Set the total pages based on document metadata or default to 1
        if (document.pageCount) {
          setTotalPages(document.pageCount);
        }
      } catch (error) {
        setHasError(true);
        setErrorMessage(error instanceof Error ? error.message : "Failed to fetch document data");
        toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to fetch document data.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchDocumentData();
  }, [documentId, toast]);

  useEffect(() => {
    if (originalData && extractedData) {
      setHasUnsavedChanges(JSON.stringify(originalData) !== JSON.stringify(extractedData));
    }
  }, [extractedData, originalData]);

  const handleConfirm = async () => {
    setProcessingStatus('processing');
    startTransition(async () => {
      try {
        const result = await updateExtractedDataAction(documentId, extractionMetadata?.jobId || documentId, { data: extractedData, metadata: extractionMetadata });
        if (!result.isSuccess) throw new Error(result.message || "Failed to save data");
        setEditMode(false);
        setConfirmed(true);
        setProcessingStatus('success');
        toast({ title: "Success", description: "Document data confirmed successfully.", variant: "default" });
      } catch (error) {
        setProcessingStatus('error');
        toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to confirm document data.", variant: "destructive" });
      }
    });
  };

  const handleExport = () => {
    if (!extractedData) return;
    if (exportFormat === "json") {
      const dataToExport = includeMetadata ? { data: extractedData, metadata: extractionMetadata } : extractedData;
      const jsonString = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `document_${documentId}.json`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (exportFormat === "csv") {
      // TODO: Implement CSV export
      toast({ 
        title: "Not Implemented", 
        description: "CSV export is coming soon.", 
        variant: "destructive" 
      });
     }
    setShowExportDialog(false);
  };

  const handleFieldSelect = (path: string, data: any) => {
    setSelectedFieldPath(path);
    const fieldElement = document.getElementById(`field-${path.replace(/\./g, '-')}`);
    if (fieldElement) fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleFieldEdit = (path: string, newValue: string | number) => {
    if (!editMode || !extractedData) return;
    const updatedData = JSON.parse(JSON.stringify(extractedData));
    const updateNestedField = (obj: any, pathParts: string[]): boolean => {
      const current = pathParts[0];
      const arrayMatch = current.match(/(\w+)\[(\d+)\]/);
      if (arrayMatch) {
        const [_, arrayName, indexStr] = arrayMatch;
        const index = parseInt(indexStr, 10);
        if (!obj[arrayName] || !Array.isArray(obj[arrayName]) || !obj[arrayName][index]) return false;
        if (pathParts.length === 1) {
          if (typeof obj[arrayName][index] === 'object' && 'value' in obj[arrayName][index]) obj[arrayName][index].value = newValue; else obj[arrayName][index] = newValue;
          return true;
        }
        return updateNestedField(obj[arrayName][index], pathParts.slice(1));
      }
      if (!(current in obj)) return false;
      if (pathParts.length === 1) {
        if (typeof obj[current] === 'object' && 'value' in obj[current]) obj[current].value = newValue; else obj[current] = newValue;
        return true;
      }
      return updateNestedField(obj[current], pathParts.slice(1));
    };
    const pathParts = path.split(/\.(?![^\[]*\])/);
    if (updateNestedField(updatedData, pathParts)) {
      setExtractedData(updatedData);
      toast({ title: "Field Updated", description: `Updated ${path.split('.').pop()?.replace(/_/g, ' ')}`, variant: "default" });
    } else {
      toast({ title: "Update Failed", description: `Could not update field: ${path}`, variant: "destructive" });
    }
  };

  const handleReset = () => {
    if (originalData) {
      setExtractedData(JSON.parse(JSON.stringify(originalData)));
      setEditMode(false);
      setConfirmed(false);
      setSelectedFieldPath(null);
      toast({ title: "Changes Discarded", description: "Original data restored.", variant: "default" });
    }
  };

  const handlePrevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const handleNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));

  // Helper function to get display value from data
  const getDisplayValue = (data: any, key: string) => {
    const value = data?.[key];
    if (typeof value === 'object' && value?.value !== undefined) {
      return value.value;
    }
    return value || 'N/A';
  };

  if (isLoading) return <div className="flex flex-col items-center justify-center w-full h-full min-h-[500px] space-y-4"><Loader2 className="w-10 h-10 text-primary animate-spin" /><p className="text-lg text-muted-foreground">Loading...</p></div>;
  if (hasError) return <div className="flex flex-col items-center justify-center w-full h-full min-h-[500px] space-y-4"><Alert variant="destructive" className="max-w-lg"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{errorMessage || "Failed to load data."}</AlertDescription></Alert><Button variant="outline" onClick={() => window.location.reload()}><RotateCw className="mr-2 h-4 w-4" />Retry</Button></div>;
  if (!extractedData) return <div className="flex items-center justify-center h-[80vh]"><div className="flex flex-col items-center gap-4"><AlertCircle className="h-8 w-8 text-destructive" /><h3 className="text-lg font-medium">Document Not Found</h3><p className="text-sm text-muted-foreground">No data or document.</p><Button onClick={() => window.history.back()}>Go Back</Button></div></div>;

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-var(--header-height))] w-full bg-gray-50">
      {/* Left Panel: Document Viewer */}
      <div 
        className={cn(
          "document-viewer-container relative transition-all duration-300 ease-in-out",
          sidebarCollapsed ? "lg:w-full" : "lg:w-1/2",
          "w-full h-1/2 lg:h-full bg-white p-6 flex flex-col gap-4"
        )}
      >
        {pdfUrl && (
          <>
            <DocumentViewer url={pdfUrl} />
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={currentPage <= 1} className="h-8 px-3">←</Button>
              <span className="text-sm text-gray-600 font-medium">Page {currentPage} of {totalPages}</span>
              <Button variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage >= totalPages} className="h-8 px-3">→</Button>
            </div>
          </>
        )}
      </div>

      {/* Right Panel: Simplified Data View */}
      <div className="w-full lg:w-1/2 bg-white p-6 flex flex-col gap-6 overflow-y-auto lg:h-full">
        {/* DocumentViewer aligns with the START of this container on the right panel */}
        <div className="bg-white rounded-md border border-gray-200 flex flex-col flex-grow overflow-hidden">
          {/* Header elements (filename, status, menu, processing banner) are now INSIDE this container */}
          <div className="p-4 border-b border-gray-200">
            {/* Simple Header (Filename, Status Icon, Menu) */} 
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-gray-500" />
                <h1 className="text-lg font-semibold text-gray-900 truncate">{fileName || 'Document'}</h1>
                <div className={`h-2 w-2 rounded-full ${confirmed ? 'bg-green-500' : 'bg-yellow-500'}`} />
              </div>
              <Dialog open={showMenuDialog} onOpenChange={setShowMenuDialog}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Options</DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-col gap-3">
                    <Button variant="outline" onClick={() => { setShowMenuDialog(false); setShowExportDialog(true); }} className="justify-start">
                      <Download className="mr-2 h-4 w-4" />Export Data
                    </Button>
                    <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" onClick={() => { setShowMenuDialog(false); if (hasUnsavedChanges) setShowResetDialog(true); else handleReset(); }} disabled={!hasUnsavedChanges} className="justify-start">
                          <Trash2 className="mr-2 h-4 w-4" />Reset Changes
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Discard Changes?</AlertDialogTitle>
                          <AlertDialogDescription>This will reset data to original values. Action cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleReset}>Discard</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Status Banner (conditional) */} 
            {processingStatus !== 'idle' && (
              <div className={`rounded-md p-3 mt-3 flex items-center transition-all duration-300 text-sm ${ 
                processingStatus === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
                processingStatus === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
                'bg-blue-50 text-blue-700 border border-blue-200'
              }`}>
                {processingStatus === 'success' && <><Check className="mr-2 h-4 w-4" /><span className="font-medium">Changes saved successfully!</span></>}
                {processingStatus === 'error' && <><AlertCircle className="mr-2 h-4 w-4" /><span className="font-medium">Error saving changes</span></>}
                {processingStatus === 'processing' && <><Loader2 className="mr-2 h-4 w-4 animate-spin" /><span className="font-medium">Saving changes...</span></>}
              </div>
            )}
          </div>
          
          {/* DataVisualizer scroll area */} 
          <div className="p-4 flex-grow overflow-y-auto">
            <DataVisualizer 
              data={extractedData} 
              onSelect={handleFieldSelect} 
              onEdit={handleFieldEdit} 
              selectedFieldPath={selectedFieldPath} 
              editMode={editMode} 
              className="bg-white h-full"
            />
          </div>
        </div>
        
        {/* Simple Bottom Action */}
        <div className="pt-4">
          <Button 
            onClick={handleConfirm} 
            disabled={confirmed || isPending || !hasUnsavedChanges} 
            className="w-full h-12 text-base font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : confirmed ? (
              <>
                <Check className="mr-2 h-5 w-5" />
                Confirmed
              </>
            ) : (
              <>
                <Check className="mr-2 h-5 w-5" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Data</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="export-format" className="text-right">Format</Label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Include Metadata</Label>
              <div className="col-span-3">
                <Switch checked={includeMetadata} onCheckedChange={setIncludeMetadata} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>Cancel</Button>
            <Button onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}