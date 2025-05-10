"use client";

import { fetchDocumentForReviewAction, updateExtractedDataAction } from "@/actions/db/documents";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { DataVisualizer } from "@/components/utilities/DataVisualizer";
import PdfViewerUrl from "@/components/utilities/PdfViewerUrl";
import { AlertCircle, Check, ChevronLeft, ChevronRight, Download, Loader2, MoveHorizontal, Trash2, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";

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

export interface ReviewModalContentProps {
  // Either provide documentId to fetch data internally
  documentId?: string;
  
  // Or provide initialData if data is already fetched (for modal usage)
  initialDocumentData?: ExtractedData;
  initialDocumentUrl?: string;
  initialFileName?: string;
  initialFileStatus?: string;
  
  // Optional callbacks for modal usage
  onClose?: () => void;
  onConfirm?: (data: ExtractedData) => void;
  
  // UI customization
  className?: string;
}

// Custom Document Viewer component specifically for this modal/page
const CustomDocumentViewer = ({ 
  url, 
  currentPage,
  setCurrentPage,
  setTotalPages,
  zoomLevel,
  dragMode 
}: { 
  url: string; 
  currentPage: number;
  setCurrentPage: (page: number) => void;
  setTotalPages: (pages: number) => void;
  zoomLevel: number;
  dragMode: boolean;
}) => {
  const [documentType, setDocumentType] = useState<"pdf" | "image" | "unknown">("unknown");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check document type based on extension or content type
    if (url) {
      if (url.endsWith('.pdf')) {
        setDocumentType("pdf");
        setLoading(false);
      } else if (url.endsWith('.png') || url.endsWith('.jpg') || url.endsWith('.jpeg')) {
        setDocumentType("image");
        setLoading(false);
      } else {
        // Make a HEAD request to check content type
        fetch(url, { method: 'HEAD' })
          .then(response => {
            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('pdf')) {
              setDocumentType("pdf");
            } else if (contentType.includes('image')) {
              setDocumentType("image");
            } else {
              setDocumentType("unknown");
            }
          })
          .catch(error => {
            console.error("Error determining document type:", error);
            setDocumentType("unknown");
          })
          .finally(() => {
            setLoading(false);
          });
      }
    }
  }, [url]);

  // PDF document loaded handler to set total pages
  const handleDocumentLoad = useCallback((numPages: number) => {
    setTotalPages(numPages);
  }, [setTotalPages]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg">
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-2"></div>
          <p className="text-sm text-gray-500">Loading document...</p>
        </div>
      </div>
    );
  }

  if (documentType === "pdf") {
    // Monitor changes in total pages
    useEffect(() => {
      // Create a custom event listener for document load
      const handleDocumentLoaded = (event: Event) => {
        if (event instanceof CustomEvent && event.detail && event.detail.numPages) {
          handleDocumentLoad(event.detail.numPages);
        }
      };
      
      // Create a custom event listener for page changes
      const handlePageChanged = (event: Event) => {
        if (event instanceof CustomEvent && event.detail && event.detail.pageNumber) {
          setCurrentPage(event.detail.pageNumber);
        }
      };
      
      // Add event listeners
      document.addEventListener('pdf-document-loaded', handleDocumentLoaded);
      document.addEventListener('pdf-page-changed', handlePageChanged);
      
      // Clean up
      return () => {
        document.removeEventListener('pdf-document-loaded', handleDocumentLoaded);
        document.removeEventListener('pdf-page-changed', handlePageChanged);
      };
    }, [handleDocumentLoad, setCurrentPage]);
    
    return (
      <div className="h-full w-full rounded-lg overflow-auto">
        <PdfViewerUrl 
          url={url} 
          zoomLevel={zoomLevel}
          className="w-full h-full"
          dragMode={dragMode}
        />
      </div>
    );
  }

  if (documentType === "image") {
    // For images we only have one page
    useEffect(() => {
      setTotalPages(1);
      setCurrentPage(1);
    }, [setTotalPages, setCurrentPage]);

    return (
      <div className="h-full w-full rounded-lg overflow-auto bg-gray-50 flex items-center justify-center">
        <div 
          className="relative inline-block transform-gpu transition-transform"
          style={{ 
            transform: `scale(${zoomLevel / 100})`,
            transformOrigin: 'center',
            cursor: dragMode ? 'grab' : 'default'
          }}
        >
          <img 
            src={url} 
            alt="Document" 
            className="max-w-none shadow-md"
            draggable={false}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg">
      <div className="flex flex-col items-center text-gray-500">
        <AlertCircle className="w-8 h-8 mb-2" />
        <p>Unsupported document type</p>
      </div>
    </div>
  );
};

export default function ReviewModalContent({
  documentId,
  initialDocumentData,
  initialDocumentUrl,
  initialFileName,
  initialFileStatus = "pending",
  onClose,
  onConfirm,
  className,
}: ReviewModalContentProps) {
  const { toast } = useToast();
  const [editMode, setEditMode] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [exportFormat, setExportFormat] = useState("json");
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isLoading, setIsLoading] = useState(documentId ? true : false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(initialDocumentData || null);
  const [extractionMetadata, setExtractionMetadata] = useState<ExtractionMetadata | null>(null);
  const [fileName, setFileName] = useState<string | null>(initialFileName || null);
  const [fileStatus, setFileStatus] = useState<string>(initialFileStatus);
  const [pdfUrl, setPdfUrl] = useState<string | null>(initialDocumentUrl || null);
  const [selectedFieldPath, setSelectedFieldPath] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [originalData, setOriginalData] = useState<ExtractedData | null>(initialDocumentData || null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [processingStatus, setProcessingStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [dragMode, setDragMode] = useState(false);

  // Fetch document data if documentId is provided
  useEffect(() => {
    if (!documentId) return;
    
    const fetchDocumentData = async () => {
      try {
        setIsLoading(true);
        setHasError(false);
        setErrorMessage(null);
        
        const result = await fetchDocumentForReviewAction(documentId);
        
        if (!result.isSuccess || !result.data) {
          throw new Error(result.message || "Failed to fetch document data");
        }
        
        const { document, signedUrl, extractedData: docData } = result.data;
        
        setExtractedData(docData.data || docData);
        setExtractionMetadata(docData.metadata || {
          timestamp: document.updatedAt || document.createdAt,
          model: "gemini-2.0-flash-001",
          prompt: "",
          processingTimeMs: 0
        });
        setFileName(document.originalFilename);
        setFileStatus(document.status || "pending");
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
      setHasUnsavedChanges(
        JSON.stringify(originalData) !== JSON.stringify(extractedData)
      );
    }
  }, [extractedData, originalData]);

  // Update PDF page when currentPage changes in parent component
  useEffect(() => {
    // Dispatch a custom event to notify the PDF viewer to change pages
    if (pdfUrl && currentPage > 0 && currentPage <= totalPages) {
      const event = new CustomEvent('change-pdf-page', {
        detail: { pageNumber: currentPage }
      });
      document.dispatchEvent(event);
    }
  }, [currentPage, totalPages, pdfUrl]);

  const handleConfirm = async () => {
    setProcessingStatus('processing');
    
    startTransition(async () => {
      try {
        if (documentId) {
          // Save the data to the backend using the server action
          const result = await updateExtractedDataAction(
            documentId,
            extractionMetadata?.jobId || documentId,
            {
              data: extractedData,
              metadata: extractionMetadata
            }
          );
          
          if (!result.isSuccess) {
            throw new Error(result.message || "Failed to save data");
          }
        }
        
        setEditMode(false);
        setConfirmed(true);
        setProcessingStatus('success');
        setFileStatus('confirmed');
        
        // Call the onConfirm callback if provided (for modal usage)
        if (onConfirm && extractedData) {
          onConfirm(extractedData);
        }
        
        toast({
          title: "Success",
          description: "Document data confirmed successfully.",
          variant: "default",
        });
      } catch (error) {
        console.error("Error confirming document:", error);
        setProcessingStatus('error');
        
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
    
    const dataToExport = extractedData;
    const jsonString = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `document_${documentId || 'export'}.json`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle field selection in DataVisualizer
  const handleFieldSelect = (path: string, data: any) => {
    setSelectedFieldPath(path);
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
    }
  };

  // Reset function to discard all changes
  const handleReset = () => {
    if (originalData) {
      setExtractedData(JSON.parse(JSON.stringify(originalData)));
      setEditMode(false);
      setConfirmed(false);
      setSelectedFieldPath(null);
      
      toast({
        title: "Changes Discarded",
        description: "All changes have been discarded and original data restored.",
        variant: "default",
      });
    }
  };

  // Handle zoom functions
  const handleZoomIn = () => {
    if (zoomLevel < 200) setZoomLevel(zoomLevel + 25);
  };

  const handleZoomOut = () => {
    if (zoomLevel > 50) setZoomLevel(zoomLevel - 25);
  };

  // Handle page navigation
  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const toggleDragMode = () => {
    setDragMode(!dragMode);
  };

  // Connect the reset view function to our drag mode and zoom controls
  const handleResetView = () => {
    setZoomLevel(100);
    setDragMode(false);
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
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-lg font-medium">Error Loading Document</p>
        <p className="text-sm text-muted-foreground">{errorMessage || "An error occurred while loading the document."}</p>
        {onClose && (
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        )}
      </div>
    );
  }

  if (!extractedData || !pdfUrl) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="flex flex-col items-center gap-4">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <h3 className="text-lg font-medium">Document Not Available</h3>
          <p className="text-sm text-muted-foreground">
            The document you're looking for could not be found or has no extracted data.
          </p>
          {onClose && (
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col lg:flex-row w-full h-full bg-gray-50 ${className}`}>
      {/* PDF Viewer - Left Column */}
      <div className="w-full lg:w-1/2 h-1/2 lg:h-full bg-white p-4 overflow-hidden flex flex-col">
        {/* Document Preview Controls */}
        <div className="flex justify-center items-center mb-4">
          <div className="flex items-center bg-gray-100 rounded-lg px-2 py-1 shadow-sm">
            <button 
              onClick={handlePrevPage}
              className="p-1.5 hover:bg-gray-200 rounded-md transition-colors duration-200"
              aria-label="Previous page"
              title="Previous page"
              disabled={currentPage <= 1}
            >
              <ChevronLeft size={18} className={currentPage <= 1 ? "text-gray-400" : "text-gray-700"} />
            </button>
            
            <div className="px-3 flex items-center space-x-2">
              <span className="text-gray-700">{currentPage}</span>
              <span className="text-gray-500">of</span>
              <span className="text-gray-700">{totalPages}</span>
            </div>
            
            <button 
              onClick={handleNextPage}
              className="p-1.5 hover:bg-gray-200 rounded-md transition-colors duration-200"
              aria-label="Next page"
              title="Next page"
              disabled={currentPage >= totalPages}
            >
              <ChevronRight size={18} className={currentPage >= totalPages ? "text-gray-400" : "text-gray-700"} />
            </button>
            
            <div className="mx-2 h-5 w-px bg-gray-300"></div>
            
            <button 
              onClick={handleZoomOut}
              className="p-1.5 hover:bg-gray-200 rounded-md transition-colors duration-200"
              aria-label="Zoom out"
              title="Zoom out"
              disabled={zoomLevel <= 50}
            >
              <ZoomOut size={18} className={zoomLevel <= 50 ? "text-gray-400" : "text-gray-700"} />
            </button>
            
            <span className="px-3 text-gray-700">{zoomLevel}%</span>
            
            <button 
              onClick={handleZoomIn}
              className="p-1.5 hover:bg-gray-200 rounded-md transition-colors duration-200"
              aria-label="Zoom in"
              title="Zoom in"
              disabled={zoomLevel >= 200}
            >
              <ZoomIn size={18} className={zoomLevel >= 200 ? "text-gray-400" : "text-gray-700"} />
            </button>
          </div>
        </div>
        
        {/* Drag Mode & Reset View Buttons */}
        <div className="flex items-center ml-4 mb-4 space-x-2">
          <Button 
            variant="default" 
            size="sm" 
            onClick={toggleDragMode}
            className={`bg-gray-800 hover:bg-gray-900 text-white ${dragMode ? "ring-2 ring-primary/30" : ""}`}
          >
            Drag Mode
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleResetView}
            className="border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            <MoveHorizontal className="mr-2 h-4 w-4" />
            Reset View
          </Button>
        </div>
        
        {/* Document Viewer */}
        <div className="flex-1 bg-gray-50 rounded-lg overflow-hidden">
          <CustomDocumentViewer
            url={pdfUrl}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            setTotalPages={setTotalPages}
            zoomLevel={zoomLevel}
            dragMode={dragMode}
          />
        </div>
      </div>
      
      {/* Data Extraction Form - Right Column */}
      <div className="w-full lg:w-1/2 h-1/2 lg:h-full bg-white p-4 overflow-y-auto">
        {/* Success Status Indicator */}
        {processingStatus === 'success' && (
          <div className="mb-4 rounded-lg p-3 bg-green-50 text-green-700 flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-green-100 p-1 rounded-full mr-2">
                <Check size={16} className="text-green-600" />
              </div>
              <span className="text-sm font-medium">File status updated successfully!</span>
            </div>
            <button 
              onClick={() => setProcessingStatus('idle')} 
              className="text-green-700 hover:text-green-800"
              aria-label="Dismiss notification"
            >
              <span className="sr-only">Dismiss</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        )}
        
        {/* Title and File Info */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Edit file result</h2>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">File Name</p>
                <p className="text-base text-gray-900 truncate">{fileName || 'document.pdf'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">File Status</p>
                <div className="flex items-center">
                  <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                    fileStatus === 'confirmed' ? 'bg-green-500' : 
                    fileStatus === 'processing' ? 'bg-blue-500' : 
                    fileStatus === 'error' ? 'bg-red-500' : 
                    'bg-yellow-500'
                  }`}></span>
                  <p className="text-base text-gray-900 capitalize">{fileStatus}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Search Field */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search fields..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        {/* Extracted Data */}
        <div className="mb-8 bg-white rounded-lg border border-gray-200">
          <DataVisualizer
            data={extractedData}
            onSelect={handleFieldSelect}
            onEdit={handleFieldEdit}
            selectedFieldPath={selectedFieldPath}
            editMode={editMode}
            className="rounded-lg"
          />
        </div>
        
        {/* Action Toolbar */}
        <div className="flex justify-between items-center">
          {/* Left-aligned buttons */}
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={handleReset}
              size="sm"
              className="border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              <Trash2 size={18} className="mr-2" />
              Reset
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleExport}
              className="border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </div>
          
          {/* Center - Export As button */}
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleExport}
            className="border-gray-200 text-gray-700 hover:bg-gray-50 rounded-full"
          >
            Export As
          </Button>
          
          {/* Right-aligned buttons */}
          <div className="flex items-center space-x-4">
            <Button
              onClick={handleConfirm}
              disabled={confirmed || isPending}
              size="sm"
              className="bg-primary text-white hover:bg-primary/90"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" /> Confirm
                </>
              )}
            </Button>
            
            <div className="flex items-center">
              <button 
                onClick={handlePrevPage}
                className="p-1 hover:bg-gray-100 rounded-md transition-colors duration-200"
                title="Previous item"
                aria-label="Go to previous item"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-gray-600 mx-1">7 of 23</span>
              <button 
                onClick={handleNextPage}
                className="p-1 hover:bg-gray-100 rounded-md transition-colors duration-200"
                title="Next item"
                aria-label="Go to next item"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 