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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit,
  Eye,
  Loader2,
  RotateCw,
  Trash2,
  ZoomIn,
  ZoomOut,
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
    } else {
      toast({ title: "Export Initiated", description: `Exporting data as ${exportFormat.toUpperCase()}...`, variant: "default" });
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

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 25, 50));
  const handlePrevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const handleNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));

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
          {pdfUrl ? <DocumentViewer url={pdfUrl} /> : <div className="flex h-full items-center justify-center text-muted-foreground"><p>No document preview.</p></div>}
        </div>
      </div> 
      
      {/* Data Extraction Form Pane */}
      <div className="w-full lg:w-1/2 h-1/2 lg:h-screen bg-white p-4 flex flex-col gap-4 overflow-y-auto">
        {/* Status Indicator */}
        {processingStatus !== 'idle' && (
          <div className={`rounded-lg p-3 flex items-center transition-all duration-300 shadow ${
            processingStatus === 'success' ? 'bg-green-50 text-green-700' :
            processingStatus === 'error' ? 'bg-red-50 text-red-700' :
            'bg-blue-50 text-blue-700' // For processing
          }`}>
            {processingStatus === 'success' && <><Check size={16} className="mr-2" /><span className="text-sm font-medium">Data saved!</span></>}
            {processingStatus === 'error' && <><AlertCircle size={16} className="mr-2" /><span className="text-sm font-medium">Error saving.</span></>}
            {processingStatus === 'processing' && <><Loader2 size={16} className="mr-2 animate-spin" /><span className="text-sm font-medium">Processing...</span></>}
          </div>
        )}
        
        {/* Header section for title and file info */}
        <div className="bg-gray-50 rounded-lg p-4 shadow">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">Edit file result</h2>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="font-medium text-gray-600">File Name:</span><span className="text-gray-700 truncate ml-2">{fileName || 'N/A'}</span></div>
            <div className="flex justify-between"><span className="font-medium text-gray-600">Status:</span><span className={`text-gray-700 ${confirmed ? 'text-green-600' : 'text-yellow-600'}`}>{confirmed ? 'Confirmed' : 'Pending'}</span></div>
            {extractionMetadata && <div className="flex justify-between"><span className="font-medium text-gray-600">Processed by:</span><span className="text-gray-700">{extractionMetadata.model}</span></div>}
          </div>
        </div>
        
        {/* Extracted Data Section with Edit Mode Button */}
        <div className="bg-gray-50 rounded-lg p-4 shadow flex-1 flex flex-col min-h-[300px]">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold text-gray-700">Extracted Data</h3>
            <Button variant={editMode ? "default" : "outline"} size="sm" onClick={() => setEditMode(!editMode)} aria-pressed={editMode} className={editMode ? "bg-indigo-600 hover:bg-indigo-700" : "border-gray-300 text-gray-700"}>
              {editMode ? <><Eye className="mr-2 h-4 w-4" /> View Mode</> : <><Edit className="mr-2 h-4 w-4" /> Edit Mode</>}
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <DataVisualizer data={extractedData} onSelect={handleFieldSelect} onEdit={handleFieldEdit} selectedFieldPath={selectedFieldPath} editMode={editMode} className="bg-white rounded shadow-inner" />
          </div>
        </div>
        
        {/* Action Buttons Footer */}
        <div className="mt-auto pt-4 border-t border-gray-200">
          <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
            <div className="flex justify-between items-center">
              <AlertDialogTrigger asChild>
                <Button variant="outline" onClick={() => { if (hasUnsavedChanges) setShowResetDialog(true); else handleReset(); }} disabled={isPending || !hasUnsavedChanges} className="border-gray-300 text-gray-700 hover:bg-gray-100">
                  <Trash2 size={16} className="mr-2" />Reset
                </Button>
              </AlertDialogTrigger>
              <div className="flex gap-2">
                <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
                  <DialogTrigger asChild><Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-100"><Download className="mr-2 h-4 w-4" />Export</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Export Extracted Data</DialogTitle><DialogDescription>Choose format and options.</DialogDescription></DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="export-format" className="text-right">Format</Label><Select value={exportFormat} onValueChange={setExportFormat}><SelectTrigger className="col-span-3"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="json">JSON</SelectItem><SelectItem value="csv">CSV</SelectItem><SelectItem value="xlsx">Excel</SelectItem></SelectContent></Select></div>
                      <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="include-metadata" className="text-right">Include Metadata</Label><div className="col-span-3"><Switch id="include-metadata" checked={includeMetadata} onCheckedChange={setIncludeMetadata} /></div></div>
                    </div>
                    <DialogFooter><Button variant="outline" onClick={() => setShowExportDialog(false)}>Cancel</Button><Button onClick={handleExport}><Download className="mr-2 h-4 w-4" />Download</Button></DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button onClick={handleConfirm} disabled={confirmed || isPending || !hasUnsavedChanges} className={`bg-indigo-600 text-white ${(!hasUnsavedChanges && !confirmed) || isPending ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-700'}`}>
                  {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : confirmed ? <><Check className="mr-2 h-4 w-4" />Confirmed</> : <><Check className="mr-2 h-4 w-4" />Confirm Changes</>}
                </Button>
              </div>
            </div>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Discard Changes?</AlertDialogTitle><AlertDialogDescription>This will reset data to original values. Action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleReset}>Discard</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
} 