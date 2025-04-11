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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/use-toast";
import { DataVisualizer } from "@/components/utilities/DataVisualizer";
import DocumentViewer from "@/components/utilities/DocumentViewer";
import { ResizablePanels } from "@/components/utilities/ResizablePanels";
import {
  AlertCircle,
  Check,
  Download,
  Edit,
  Eye,
  Loader2,
  RotateCw
} from "lucide-react";
import { useEffect, useState, useTransition } from "react";

interface PageProps {
  params: {
    id: string;
  };
}

// Define types for our data structure
interface FieldData {
  value: string | number;
  confidence: number;
  position?: {
    page_number: number;
    bounding_box: [number, number, number, number]; // [x1, y1, x2, y2] as percentages
  };
}

interface HighlightRect {
  pageNumber: number;
  boundingBox: [number, number, number, number];
  color?: string;
  id: string;
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
  options?: {
    includePositions?: boolean;
    includeConfidence?: boolean;
  };
}

export default function ReviewPage({ params }: PageProps) {
  const { id } = params;
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
  const [hoveredField, setHoveredField] = useState<string | null>(null);
  const [hoveredFieldData, setHoveredFieldData] = useState<any | null>(null);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [currentHighlight, setCurrentHighlight] = useState<HighlightRect | null>(null);
  const [selectedFieldPath, setSelectedFieldPath] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [originalData, setOriginalData] = useState<ExtractedData | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);

  // Listen for sidebar toggle events
  useEffect(() => {
    const handleSidebarToggle = (e: CustomEvent) => {
      setSidebarCollapsed(e.detail.collapsed);
      
      // Trigger a resize event to ensure PDF viewer adjusts
      window.dispatchEvent(new Event('resize'));
    };
    
    window.addEventListener("sidebarToggle", handleSidebarToggle as EventListener);
    
    // Check localStorage on mount
    const savedState = localStorage.getItem("sidebarCollapsed");
    if (savedState !== null) {
      setSidebarCollapsed(savedState === "true");
    }
    
    return () => {
      window.removeEventListener("sidebarToggle", handleSidebarToggle as EventListener);
    };
  }, []);

  // Fetch document data
  useEffect(() => {
    const fetchDocumentData = async () => {
      try {
        setIsLoading(true);
        setHasError(false);
        setErrorMessage(null);
        
        if (!documentId) {
          throw new Error("Invalid document ID");
        }
        
        console.log("[UI DEBUG] Fetching document data for ID:", documentId);
        
        // Use the server action to fetch document data
        const result = await fetchDocumentForReviewAction(documentId);
        
        if (!result.isSuccess || !result.data) {
          throw new Error(result.message || "Failed to fetch document data");
        }
        
        const { document, signedUrl, extractedData: docData } = result.data;
        
       
        console.log("[UI DEBUG] Extraction metadata:", docData.metadata);
        console.log("[UI DEBUG] Extracted data structure:", Object.keys(docData.data || docData));
        
        // Add more detailed logging to see what's coming from the backend
        if (docData.data) {
          console.log("[UI DEBUG] Extracted data content sample:", 
            JSON.stringify(docData.data).slice(0, 1000) + (JSON.stringify(docData.data).length > 1000 ? '...' : ''));
        } else if (typeof docData === 'object') {
          console.log("[UI DEBUG] Extracted data content sample:", 
            JSON.stringify(docData).slice(0, 1000) + (JSON.stringify(docData).length > 1000 ? '...' : ''));
        }
        
        if (!docData) {
          throw new Error("No extracted data found");
        }
        
        setExtractedData(docData.data || docData);
        setExtractionMetadata(docData.metadata || {
          timestamp: document.updatedAt || document.createdAt,
          model: "gemini-2.0-flash-001",
          prompt: "",
          processingTimeMs: 0
        });
        setFileName(document.originalFilename);
        setPdfUrl(signedUrl);
        setOriginalData(docData.data || docData);
      } catch (error) {
        console.error("Error fetching document data:", error);
        setHasError(true);
        setErrorMessage(error instanceof Error ? error.message : "Failed to fetch document data");
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to fetch document data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDocumentData();
  }, [documentId, toast]);

  // Update hasUnsavedChanges whenever extractedData changes
  useEffect(() => {
    if (originalData && extractedData) {
      // Quick comparison using JSON stringify for determining if changes exist
      setHasUnsavedChanges(
        JSON.stringify(originalData) !== JSON.stringify(extractedData)
      );
    }
  }, [extractedData, originalData]);

  const handleConfirm = async () => {
    startTransition(async () => {
      try {
        // Save the data to the backend using the server action
        const result = await updateExtractedDataAction(
          documentId,
          extractionMetadata?.jobId || documentId, // Use jobId if available, fall back to documentId
          {
            data: extractedData,
            metadata: extractionMetadata
          }
        );
        
        if (!result.isSuccess) {
          throw new Error(result.message || "Failed to save data");
        }
        
        setEditMode(false);
        setConfirmed(true);
        
        toast({
          title: "Success",
          description: "Document data confirmed successfully.",
          variant: "default",
        });
      } catch (error) {
        console.error("Error confirming document:", error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to confirm document data. Please try again.",
          variant: "destructive",
        });
      }
    });
  };

  const handleExport = () => {
    if (!extractedData) return;
    
    if (exportFormat === "json") {
      const dataToExport = includeMetadata 
        ? { data: extractedData, metadata: extractionMetadata }
        : extractedData;
        
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
      // For other formats, we'll just show a toast for now
      toast({
        title: "Export Initiated",
        description: `Exporting data as ${exportFormat.toUpperCase()}...`,
        variant: "default",
      });
    }
    
    setShowExportDialog(false);
  };

  // Function to handle field hover in DataVisualizer and create a highlight for DocumentViewer
  const handleFieldHover = (path: string, data: any) => {
    setHoveredField(path);
    setHoveredFieldData(data);
    
    // Create highlight from position data if available
    if (data && data.position) {
      const highlight: HighlightRect = {
        pageNumber: data.position.page_number,
        boundingBox: data.position.bounding_box,
        color: 'var(--primary)',
        id: `highlight-${path}`
      };
      setCurrentHighlight(highlight);
    } else {
      setCurrentHighlight(null);
    }
  };

  // Function to handle field selection in DataVisualizer
  const handleFieldSelect = (path: string, data: any) => {
    setSelectedFieldPath(path);
    
    // Create persistent highlight for selected field if it has position data
    if (data && data.position) {
      const highlight: HighlightRect = {
        pageNumber: data.position.page_number,
        boundingBox: data.position.bounding_box,
        color: 'var(--primary)',
        id: `highlight-${path}`
      };
      setCurrentHighlight(highlight);
    }
    
    // Scroll corresponding element into view if exists
    const fieldElement = document.getElementById(`field-${path.replace(/\./g, '-')}`);
    if (fieldElement) {
      fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Helper function used by DocumentViewer to handle highlights
  const handleHighlight = (highlight: HighlightRect | null) => {
    setCurrentHighlight(highlight);
  };

  // Helper function to find a field in extractedData by clicking on a position in the PDF
  const findFieldByPosition = (pageNumber: number, position: [number, number]): { path: string; data: FieldData } | null => {
    if (!extractedData) return null;

    // Define tolerance for position matching (as a percentage)
    const POSITION_TOLERANCE = 5; 
    const [clickX, clickY] = position;

    // Recursive function to search through nested objects
    const searchInObject = (obj: any, path: string): { path: string; data: FieldData } | null => {
      if (!obj) return null;
      
      // Handle case when obj is an array
      if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
          const result = searchInObject(obj[i], `${path}[${i}]`);
          if (result) return result;
        }
        return null;
      }
      
      // Handle case when obj is FieldData with position
      if (obj.position && obj.value !== undefined && obj.confidence !== undefined) {
        const { position } = obj;
        if (position.page_number === pageNumber && position.bounding_box && position.bounding_box.length === 4) {
          const [x1, y1, x2, y2] = position.bounding_box;
          
          // Check if click position is within or near the bounding box
          if (
            clickX >= x1 - POSITION_TOLERANCE && 
            clickX <= x2 + POSITION_TOLERANCE && 
            clickY >= y1 - POSITION_TOLERANCE && 
            clickY <= y2 + POSITION_TOLERANCE
          ) {
            return { path, data: obj };
          }
        }
      }
      
      // Handle regular object - search through properties
      if (typeof obj === 'object') {
        for (const [key, value] of Object.entries(obj)) {
          if (typeof value === 'object') {
            const newPath = path ? `${path}.${key}` : key;
            const result = searchInObject(value, newPath);
            if (result) return result;
          }
        }
      }
      
      return null;
    };
    
    return searchInObject(extractedData, '');
  };

  // Handle click on PDF position from DocumentViewer
  const handlePdfPositionClick = (pageNumber: number, position: [number, number]) => {
    const foundField = findFieldByPosition(pageNumber, position);
    
    if (foundField) {
      // Select the field in DataVisualizer
      handleFieldSelect(foundField.path, foundField.data);
      
      // Optional: Show a toast notification that field was found
      toast({
        title: "Field Found",
        description: `Selected: ${foundField.path.split('.').pop() || foundField.path}`,
      });
    } else {
      // Optional: Show a toast that no field was found at this position
      toast({
        title: "No Field Found",
        description: "No data field found at this position.",
        variant: "default",
      });
    }
  };

  // Function to handle field editing in DataVisualizer
  const handleFieldEdit = (path: string, newValue: string | number) => {
    if (!editMode || !extractedData) return;
    
    // Create a deep copy of the data
    const updatedData = JSON.parse(JSON.stringify(extractedData));
    
    // Helper function to find and update the nested field
    const updateNestedField = (obj: any, pathParts: string[]): boolean => {
      const current = pathParts[0];
      
      // Handle array notation like path[0]
      const arrayMatch = current.match(/(\w+)\[(\d+)\]/);
      if (arrayMatch) {
        const [_, arrayName, indexStr] = arrayMatch;
        const index = parseInt(indexStr, 10);
        
        if (!obj[arrayName] || !Array.isArray(obj[arrayName]) || !obj[arrayName][index]) {
          return false;
        }
        
        if (pathParts.length === 1) {
          if (typeof obj[arrayName][index] === 'object' && 'value' in obj[arrayName][index]) {
            obj[arrayName][index].value = newValue;
            return true;
          }
          obj[arrayName][index] = newValue;
          return true;
        }
        
        return updateNestedField(obj[arrayName][index], pathParts.slice(1));
      }
      
      // Handle regular object properties
      if (!(current in obj)) {
        return false;
      }
      
      if (pathParts.length === 1) {
        if (typeof obj[current] === 'object' && 'value' in obj[current]) {
          obj[current].value = newValue;
          return true;
        }
        obj[current] = newValue;
        return true;
      }
      
      return updateNestedField(obj[current], pathParts.slice(1));
    };
    
    // Split the path by dots, but handle array notation
    const pathParts = path.split(/\.(?![^\[]*\])/);
    
    if (updateNestedField(updatedData, pathParts)) {
      setExtractedData(updatedData);
      toast({
        title: "Field Updated",
        description: `Updated ${path.split('.').pop()?.replace(/_/g, ' ')}`,
        variant: "default",
      });
    } else {
      toast({
        title: "Update Failed",
        description: `Could not update the field at path: ${path}`,
        variant: "destructive",
      });
    }
  };

  // Reset function to discard all changes
  const handleReset = () => {
    if (originalData) {
      setExtractedData(JSON.parse(JSON.stringify(originalData)));
      setEditMode(false);
      setConfirmed(false);
      setCurrentHighlight(null);
      setSelectedFieldPath(null);
      
      toast({
        title: "Changes Discarded",
        description: "All changes have been discarded and original data restored.",
        variant: "default",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full min-h-[500px] space-y-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-lg text-muted-foreground">Loading document data...</p>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full min-h-[500px] space-y-4">
        <Alert variant="destructive" className="max-w-lg">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {errorMessage || "An error occurred while loading the document data. Please try again."}
          </AlertDescription>
        </Alert>
        <Button 
          variant="outline" 
          onClick={() => window.location.reload()}
        >
          <RotateCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  if (!extractedData) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="flex flex-col items-center gap-4">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <h3 className="text-lg font-medium">Document Not Found</h3>
          <p className="text-sm text-muted-foreground">
            The document you're looking for could not be found or has no extracted data.
          </p>
          <Button onClick={() => window.history.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Document Review</h1>
        
        <div className="ml-auto flex items-center gap-4">
          {/* Confidence threshold filter */}
          <div className="flex items-center gap-2">
            <Label htmlFor="confidence-filter" className="text-sm">
              Confidence Threshold: {confidenceThreshold * 100}%
            </Label>
            <input
              id="confidence-filter"
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
              className="w-32"
              title={`Set confidence threshold to ${confidenceThreshold * 100}%`}
            />
          </div>
          
          {/* Edit mode toggle */}
          <Button
            variant={editMode ? "default" : "outline"}
            size="sm"
            onClick={() => setEditMode(!editMode)}
            aria-pressed={editMode}
          >
            {editMode ? (
              <>
                <Eye className="mr-2 h-4 w-4" aria-hidden="true" /> View Mode
              </>
            ) : (
              <>
                <Edit className="mr-2 h-4 w-4" aria-hidden="true" /> Edit Mode
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="h-[calc(100vh-200px)] w-full">
        <ResizablePanels
          leftPanel={
            <DataVisualizer
              data={extractedData}
              onHighlight={handleHighlight}
              onSelect={handleFieldSelect}
              onEdit={handleFieldEdit}
              selectedFieldPath={selectedFieldPath}
              confidenceThreshold={confidenceThreshold}
              editMode={editMode}
              options={{ includePositions: true }}
              className="h-full"
            />
          }
          rightPanel={
            <Card className="h-full flex flex-col overflow-hidden border-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle>Document Preview</CardTitle>
                  <CardDescription>
                    Original document for reference
                  </CardDescription>
                </div>
                {extractionMetadata && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="cursor-help">
                          {extractionMetadata.model}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent className="w-80">
                        <div className="space-y-2">
                          <p className="font-medium">Extraction Details</p>
                          <div className="text-xs space-y-1">
                            <div className="flex justify-between">
                              <span>Model:</span>
                              <span className="font-medium">{extractionMetadata.model}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Processing Time:</span>
                              <span className="font-medium">{Math.round(extractionMetadata.processingTimeMs / 1000)}s</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Timestamp:</span>
                              <span className="font-medium">{new Date(extractionMetadata.timestamp).toLocaleString()}</span>
                            </div>
                            {extractionMetadata.options && (
                              <>
                                <div className="flex justify-between mt-2">
                                  <span>Position Data:</span>
                                  <span className="font-medium">{extractionMetadata.options.includePositions ? "Enabled" : "Disabled"}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Confidence Scores:</span>
                                  <span className="font-medium">
                                    {extractionMetadata.options?.includePositions ? "Enabled" : "Disabled"}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </CardHeader>
              
              <CardContent className="flex-1 overflow-auto p-0 bg-muted/50 relative">
                {/* Document Panel */}
                <div className="h-full overflow-hidden flex flex-col relative bg-background border-r">
                  {pdfUrl ? (
                    <DocumentViewer 
                      url={pdfUrl} 
                      highlights={currentHighlight ? [currentHighlight] : []}
                      onPositionClick={handlePdfPositionClick}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <p className="text-muted-foreground">No document to display</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          }
          defaultLeftWidth={40}
          minLeftWidth={25}
          maxLeftWidth={60}
          storageKey="documentReviewPanels"
        />
      </div>

      <div className="flex justify-between">
        <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              onClick={() => {
                if (hasUnsavedChanges) {
                  setShowResetDialog(true);
                } else {
                  handleReset();
                }
              }}
              disabled={isPending}
            >
              Reset
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Discard all changes?</AlertDialogTitle>
              <AlertDialogDescription>
                This will reset all edited data back to the original values. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleReset}>Discard Changes</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        <div className="flex gap-2">
          <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
            <DialogTrigger asChild>
              <Button 
                variant="outline"
                onClick={() => setShowExportDialog(true)}
              >
                <Download className="mr-2 h-4 w-4" /> Export Data
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Export Extracted Data</DialogTitle>
                <DialogDescription>
                  Choose your preferred export format
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="export-format" className="text-right">
                    Format
                  </Label>
                  <Select
                    value={exportFormat}
                    onValueChange={setExportFormat}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="json">JSON</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="include-metadata" className="text-right">
                    Include Metadata
                  </Label>
                  <div className="col-span-3">
                    <Switch 
                      id="include-metadata" 
                      checked={includeMetadata}
                      onCheckedChange={setIncludeMetadata}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowExportDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleExport}>
                  <Download className="mr-2 h-4 w-4" /> Download
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Button
            onClick={handleConfirm}
            disabled={confirmed || isPending}
            className="bg-primary text-white hover:bg-primary/90 hover:text-white font-semibold"
            aria-label="Confirm extracted data"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> Processing...
              </>
            ) : confirmed ? (
              <>
                <Check className="mr-2 h-4 w-4" aria-hidden="true" /> Confirmed
              </>
            ) : (
              "Confirm Data"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
} 