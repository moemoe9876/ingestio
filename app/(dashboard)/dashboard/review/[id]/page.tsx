"use client";

import { fetchDocumentForReviewAction, updateExtractedDataAction } from "@/actions/db/documents";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  FileText,
  Loader2,
  RotateCw
} from "lucide-react";
import { useEffect, useState } from "react";

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

  const handleConfirm = async () => {
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

  const handleFieldHover = (path: string, data: any) => {
    setHoveredField(path);
    setHoveredFieldData(data);
    
    // If the data has location information, we could highlight it in the PDF viewer
    // This would require additional implementation in the PdfViewerUrl component
  };

  const handleFieldSelect = (path: string, data: any) => {
    // Set the selected field path
    setSelectedFieldPath(path);
    
    // If the data has position information, highlight it in the PDF viewer
    if (data.position && extractionMetadata?.options?.includePositions !== false) {
      setCurrentHighlight({
        pageNumber: data.position.page_number,
        boundingBox: data.position.bounding_box,
        id: path,
        color: '#3b82f6' // Use a different color for selected highlights
      });
    }
    
    // Handle field selection - could be used for editing specific fields
    if (editMode) {
      // Implement field editing logic here
      toast({
        title: "Field Selected",
        description: `Selected field: ${path}`,
        variant: "default",
      });
    }
  };

  // Handle highlight events from the data visualizer
  const handleHighlight = (highlight: HighlightRect | null) => {
    // Only set the highlight if position data is available (based on extraction options)
    if (highlight || extractionMetadata?.options?.includePositions !== false) {
      setCurrentHighlight(highlight);
    }
  };

  // Find a field in the extracted data by its position
  const findFieldByPosition = (pageNumber: number, position: [number, number]): { path: string; data: FieldData } | null => {
    // If position data is not included in extraction, don't attempt to find fields by position
    if (extractionMetadata?.options?.includePositions === false) {
      return null;
    }
    
    const [clickX, clickY] = position;
    
    // Helper function to recursively search through the data
    const searchInObject = (obj: any, path: string): { path: string; data: FieldData } | null => {
      if (!obj || typeof obj !== 'object') return null;
      
      // Check if this is a field with position data
      if ('value' in obj && 'confidence' in obj && obj.position) {
        const pos = obj.position;
        if (pos.page_number === pageNumber) {
          const [x1, y1, x2, y2] = pos.bounding_box;
          // Check if the click is within this field's bounding box
          if (clickX >= x1 && clickX <= x2 && clickY >= y1 && clickY <= y2) {
            return { path, data: obj };
          }
        }
        return null;
      }
      
      // If it's an array, search through each item
      if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
          const result = searchInObject(obj[i], `${path}[${i}]`);
          if (result) return result;
        }
        return null;
      }
      
      // If it's an object, search through each property
      for (const key in obj) {
        const newPath = path ? `${path}.${key}` : key;
        const result = searchInObject(obj[key], newPath);
        if (result) return result;
      }
      
      return null;
    };
    
    return searchInObject(extractedData, '');
  };

  // Handle clicks on the PDF viewer
  const handlePdfPositionClick = (pageNumber: number, position: [number, number]) => {
    const field = findFieldByPosition(pageNumber, position);
    
    if (field) {
      // Highlight the field in the data visualizer
      setSelectedFieldPath(field.path);
      
      // Create a highlight for the PDF viewer
      setCurrentHighlight({
        pageNumber: pageNumber,
        boundingBox: field.data.position!.bounding_box,
        id: field.path,
        color: '#3b82f6' // Use a different color for clicked highlights
      });
      
      // Scroll the field into view in the data visualizer
      const fieldElement = document.getElementById(`field-${field.path.replace(/\./g, '-')}`);
      if (fieldElement) {
        fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Add a temporary highlight effect
        fieldElement.classList.add('bg-primary/20');
        setTimeout(() => {
          fieldElement.classList.remove('bg-primary/20');
        }, 2000);
      }
      
      toast({
        title: "Field Found",
        description: `Found field: ${field.path.split('.').pop()?.replace(/_/g, ' ')}`,
        variant: "default",
      });
    } else {
      // No field found at this position
      setCurrentHighlight(null);
      setSelectedFieldPath(null);
      
      toast({
        title: "No Field Found",
        description: "No data field was found at this position.",
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
        
        <div className="ml-auto flex gap-2">
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
              selectedFieldPath={selectedFieldPath}
              confidenceThreshold={confidenceThreshold}
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
                {pdfUrl ? (
                  <DocumentViewer 
                    url={pdfUrl} 
                    highlights={currentHighlight ? [currentHighlight] : []}
                    onPositionClick={handlePdfPositionClick}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-6 h-full">
                    <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">{fileName || "Document Preview"}</h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      Preview not available
                    </p>
                  </div>
                )}
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
        <Button
          variant="outline"
          onClick={() => {
            setEditMode(false);
            setConfirmed(false);
          }}
        >
          Reset
        </Button>
        
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
            disabled={confirmed}
            className="bg-primary text-white hover:bg-primary/90 hover:text-white font-semibold"
            aria-label="Confirm extracted data"
          >
            {confirmed ? (
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