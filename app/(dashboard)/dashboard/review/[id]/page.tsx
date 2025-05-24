"use client";

import { exportDocumentsAction } from "@/actions/batch/batchActions";
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
  DialogTrigger
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { DataVisualizer } from "@/components/utilities/DataVisualizer";
import DocumentViewer from "@/components/utilities/DocumentViewer";
import { detectArrayFields, ExportOptions, ExportOptionsModal } from "@/components/utilities/ExportOptionsModal";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  RotateCw,
  Trash2,
  ZoomIn,
  ZoomOut
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
  const [editMode, setEditMode] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [exportFormat, setExportFormat] = useState("json");
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
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
  const [documentStatus, setDocumentStatus] = useState<string | null>(null);
  const [batchDocumentIds, setBatchDocumentIds] = useState<string[]>([]);
  const [currentDocumentIndex, setCurrentDocumentIndex] = useState(-1);

  // --- New states for export functionality ---
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [availableArrayFields, setAvailableArrayFields] = useState<string[]>([]);

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
        
        const currentExtractedData = docData.data || docData;
        setExtractedData(currentExtractedData);
        setAvailableArrayFields(detectArrayFields(currentExtractedData)); // Detect array fields

        setExtractionMetadata(docData.metadata || {
          timestamp: document.updatedAt?.toISOString() || document.createdAt.toISOString(),
          model: "gemini-2.0-flash-001",
          prompt: "",
          processingTimeMs: 0
        });
        setFileName(document.originalFilename);
        setPdfUrl(signedUrl);
        setOriginalData(JSON.parse(JSON.stringify(docData.data || docData)));
        setDocumentStatus(document.status);
        setConfirmed(document.status === 'confirmed');

        // Fetch document IDs for batch navigation if batchId is present in query params
        const queryParams = new URLSearchParams(window.location.search);
        const batchId = queryParams.get('batchId');
        if (batchId) {
          // This would ideally be a new server action: fetchDocumentIdsForBatchAction(batchId)
          // For now, this is a placeholder. In a real scenario, you'd fetch this.
          // console.log("Would fetch document IDs for batch:", batchId);
          // Example: setBatchDocumentIds(["doc1", documentId, "doc3"]); 
          // setCurrentDocumentIndex(1);
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

  const handleSaveChanges = async () => {
    if (!hasUnsavedChanges) return;
    setProcessingStatus('processing');
    startTransition(async () => {
      try {
        const result = await updateExtractedDataAction(documentId, extractionMetadata?.jobId || documentId, { data: extractedData, metadata: extractionMetadata });
        if (!result.isSuccess) throw new Error(result.message || "Failed to save data");
        setOriginalData(JSON.parse(JSON.stringify(extractedData)));
        setHasUnsavedChanges(false);
        setEditMode(false);
        setProcessingStatus('success');
        toast({ title: "Success", description: "Changes saved successfully.", variant: "default" });
      } catch (error) {
        setProcessingStatus('error');
        toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to save changes.", variant: "destructive" });
      }
    });
  };
  
  const handleMarkConfirmed = async () => {
    if (confirmed) return;
    setProcessingStatus('processing');
    startTransition(async () => {
      setConfirmed(true);
      setDocumentStatus('confirmed');
      setEditMode(false);
      setProcessingStatus('success');
      toast({ title: "Success", description: "Document marked as confirmed.", variant: "default" });
    });
  };

  const handleOpenExportModal = () => {
    if (extractedData) {
      setAvailableArrayFields(detectArrayFields(extractedData));
    }
    setShowExportModal(true);
  };

  const handleExportSubmit = async (options: ExportOptions) => {
    setIsExporting(true);
    setShowExportModal(false);
    try {
      const result = await exportDocumentsAction([documentId], options);
      if (result.isSuccess && result.data?.downloadUrl) {
        toast({
          title: "Export Successful",
          description: "Your file is ready for download.",
          action: <Button variant="outline" size="sm" onClick={() => window.open(result.data?.downloadUrl, '_blank')}>Download</Button>,
        });
      } else {
        throw new Error(result.message || "Failed to export document.");
      }
    } catch (error) {
      toast({ title: "Export Failed", description: error instanceof Error ? error.message : "An unknown error occurred.", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
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
      setSelectedFieldPath(null);
      toast({ title: "Changes Discarded", description: "Original data restored.", variant: "default" });
    }
  };

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 25, 50));
  const handlePrevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const handleNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));

  // TODO: Implement actual previous/next document navigation based on batchDocumentIds
  const handlePrevDocument = () => {
    if (currentDocumentIndex > 0) {
      // router.push(`/dashboard/review/${batchDocumentIds[currentDocumentIndex - 1]}`);
      toast({title: "Navigate", description: "Previous document (not implemented)"});
    }
  };
  const handleNextDocument = () => {
    if (currentDocumentIndex < batchDocumentIds.length - 1) {
      // router.push(`/dashboard/review/${batchDocumentIds[currentDocumentIndex + 1]}`);
      toast({title: "Navigate", description: "Next document (not implemented)"});
    }
  };

  if (isLoading) return <div className="flex flex-col items-center justify-center w-full h-full min-h-[500px] space-y-4"><Loader2 className="w-10 h-10 text-primary animate-spin" /><p className="text-lg text-muted-foreground">Loading...</p></div>;
  if (hasError) return <div className="flex flex-col items-center justify-center w-full h-full min-h-[500px] space-y-4"><Alert variant="destructive" className="max-w-lg"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{errorMessage || "Failed to load data."}</AlertDescription></Alert><Button variant="outline" onClick={() => window.location.reload()}><RotateCw className="mr-2 h-4 w-4" />Retry</Button></div>;
  if (!extractedData) return <div className="flex items-center justify-center h-[80vh]"><div className="flex flex-col items-center gap-4"><AlertCircle className="h-8 w-8 text-destructive" /><h3 className="text-lg font-medium">Document Not Found</h3><p className="text-sm text-muted-foreground">No data or document.</p><Button onClick={() => window.history.back()}>Go Back</Button></div></div>;

  return (
    <div className="flex flex-col lg:flex-row w-full h-screen bg-gray-100">
      {/* PDF Viewer Pane */}
      <div className="w-full lg:w-1/2 h-1/2 lg:h-screen bg-white p-4 flex flex-col gap-4">
        {/* PDF Navigation Controls (Moved Inside) */}
        <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg shadow">
          <div className="flex items-center space-x-2">
            <Button onClick={handlePrevPage} variant="ghost" size="icon" aria-label="Previous page" title="Previous page" disabled={currentPage <= 1}><ChevronLeft size={18} /></Button>
            <div className="px-2 flex items-center space-x-1">
              <input type="text" value={currentPage} onChange={(e) => { const p = parseInt(e.target.value); if (!isNaN(p) && p > 0 && p <= totalPages) setCurrentPage(p); }} className="w-10 text-center bg-gray-100 rounded border border-gray-300 px-1 py-0.5 text-sm" aria-label="Current page" />
              <span className="text-sm text-gray-500">of {totalPages}</span>
            </div>
            <Button onClick={handleNextPage} variant="ghost" size="icon" aria-label="Next page" title="Next page" disabled={currentPage >= totalPages}><ChevronRight size={18} /></Button>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={handleZoomOut} variant="ghost" size="icon" aria-label="Zoom out" title="Zoom out" disabled={zoomLevel <= 50}><ZoomOut size={18} /></Button>
            <span className="text-sm text-gray-700 w-10 text-center">{zoomLevel}%</span>
            <Button onClick={handleZoomIn} variant="ghost" size="icon" aria-label="Zoom in" title="Zoom in" disabled={zoomLevel >= 200}><ZoomIn size={18} /></Button>
          </div>
        </div>
        
        {/* Document Viewer */}
        <div className="flex-1 bg-gray-200 rounded-lg overflow-auto shadow-inner">
          <div className="flex-1 overflow-hidden">
            {pdfUrl ? (
              <DocumentViewer 
                url={pdfUrl} 
              />
            ) : (
              <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-800">
                <p className="text-muted-foreground">No document to display.</p>
              </div>
            )}
          </div>
        </div> 
        
        {/* Right Sidebar for Data Visualization */}
        <div className={`transition-all duration-300 ease-in-out ${sidebarCollapsed ? "w-0" : "w-full md:w-2/5 lg:w-1/3"} border-l bg-background overflow-y-auto flex flex-col`}>
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-lg font-semibold">Extracted Data</h2>
            <div className="flex items-center space-x-2">
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${ documentStatus === 'confirmed' ? 'bg-green-100 text-green-700' : documentStatus === 'failed' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>File Status: {documentStatus || 'Processing'}</span>
              <Switch id="edit-mode" checked={editMode} onCheckedChange={setEditMode} disabled={confirmed} />
              <Label htmlFor="edit-mode" className="text-sm">Edit Mode</Label>
            </div>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="p-2 border-b space-x-1 flex flex-wrap justify-start items-center">
            <Button onClick={handleSaveChanges} size="sm" disabled={!editMode || !hasUnsavedChanges || isPending || processingStatus === 'processing'} variant="default">
              {(isPending && processingStatus === 'processing') && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes
            </Button>
            <Button onClick={handleMarkConfirmed} size="sm" variant="default" disabled={editMode || confirmed || isPending || processingStatus === 'processing'}>
               {(isPending && processingStatus === 'processing') && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Mark as Confirmed
            </Button>
            <Button onClick={() => setShowResetDialog(true)} size="sm" variant="outline" disabled={!editMode || !hasUnsavedChanges || isPending || processingStatus === 'processing' || isExporting }>
               Reset Changes
            </Button>
            <Dialog open={showExportDialog} onOpenChange={setShowExportModal}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" onClick={handleOpenExportModal} disabled={isExporting || isPending}>
                  {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} 
                  Export As...
                </Button>
              </DialogTrigger>
              <ExportOptionsModal
                isOpen={showExportModal}
                onClose={() => setShowExportModal(false)}
                documentIds={[documentId]}
                availableArrayFields={availableArrayFields}
                onSubmit={handleExportSubmit}
                isExporting={isExporting}
              />
            </Dialog>
            {/* Placeholder for Delete button */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive" className="bg-red-600 hover:bg-red-700 text-white" disabled={isExporting || isPending}>
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                  <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the document and its extracted data.
                      </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => console.log("Delete document") /* TODO: Implement delete */} className="bg-destructive hover:bg-destructive/90">
                          Delete Permanently
                      </AlertDialogAction>
                  </AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>
          </div>

          <div className="flex-grow overflow-y-auto p-4">
            <DataVisualizer data={extractedData} onSelect={handleFieldSelect} onEdit={handleFieldEdit} selectedFieldPath={selectedFieldPath} editMode={editMode} className="bg-white rounded shadow-inner" />
          </div>
        </div>
      </div>
    </div>
  );
} 