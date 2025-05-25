"use client";

import { Button } from "@/components/ui/button";
import { MoveHorizontal, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import PdfViewerUrl from "./PdfViewerUrl";

interface DocumentViewerProps {
  url: string;
  onPositionClick?: (pageNumber: number, position: [number, number]) => void;
}

// Define the interface for the PdfViewerUrl handle
export interface PdfViewerHandle {
  resetView: () => void;
  // Add other methods or properties if PdfViewerUrl exposes more
}

export default function DocumentViewer({ 
  url, 
  onPositionClick
}: DocumentViewerProps) {
  const [documentType, setDocumentType] = useState<"pdf" | "image" | "unknown">("unknown");
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragMode, setDragMode] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  // Reference to PdfViewerUrl component
  const pdfViewerRef = useRef<PdfViewerHandle | null>(null);

  useEffect(() => {
    // Check document type based on extension
    if (url) {
      if (url.endsWith('.pdf')) {
        setDocumentType("pdf");
      } else if (url.endsWith('.png') || url.endsWith('.jpg') || url.endsWith('.jpeg')) {
        setDocumentType("image");
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
    
    // Reset zoom and position on new document
    setZoom(100);
    setPosition({ x: 0, y: 0 });
  }, [url]);

  const handleZoomIn = () => {
    setZoom(prevZoom => Math.min(prevZoom + 25, 400));
  };

  const handleZoomOut = () => {
    setZoom(prevZoom => Math.max(prevZoom - 25, 25));
  };

  const handleResetView = () => {
    // Reset local state
    setZoom(100);
    setPosition({ x: 0, y: 0 });
    
    // Reset PdfViewerUrl state if available
    if (pdfViewerRef.current && pdfViewerRef.current.resetView) {
      pdfViewerRef.current.resetView();
    }
  };

  // Handle mouse down for dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only initiate drag if in dragMode.
    if (!dragMode) return;
    
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    e.preventDefault();
  };

  // Handle mouse move for dragging
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && dragMode) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  // Handle mouse up to stop dragging
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Toggle between drag mode and position selection mode
  const toggleDragMode = () => {
    setDragMode(!dragMode);
  };

  // Handle click on image with position calculation
  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    // Only trigger onPositionClick if NOT in dragMode and onPositionClick is provided
    if (dragMode || !onPositionClick) return;
    
    const imgElement = e.currentTarget;
    const rect = imgElement.getBoundingClientRect();
    
    // Calculate position as percentage of image dimensions, accounting for zoom and pan
    const zoomFactor = zoom / 100;
    const offsetX = (e.clientX - rect.left) / zoomFactor;
    const offsetY = (e.clientY - rect.top) / zoomFactor;
    
    const x = (offsetX / imgElement.naturalWidth) * 100;
    const y = (offsetY / imgElement.naturalHeight) * 100;
    
    // Ensure values are within bounds
    const boundedX = Math.max(0, Math.min(100, x));
    const boundedY = Math.max(0, Math.min(100, y));
    
    // Notify parent component about the click position (use page 1 for images)
    onPositionClick(1, [boundedX, boundedY]);
  };

  // Cleanup event listeners
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };
    
    const handleGlobalMouseMove = (e: MouseEvent) => {
      // Also check dragMode here to ensure global mouse move respects the mode
      if (isDragging && dragMode) { 
        setPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y
        });
      }
    };
    
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('mousemove', handleGlobalMouseMove);
    
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, [isDragging, dragStart, dragMode]);

  if (loading) {
    return <div className="flex items-center justify-center h-full">Loading document...</div>;
  }

  if (documentType === "pdf") {
    return (
      <div className="flex flex-col h-full w-full box-border">
        <div className="flex items-center justify-between gap-2 mb-2 p-2 bg-gray-50 rounded-md shadow-sm">
          <Button 
            variant={dragMode ? "default" : "outline"} 
            size="sm" 
            onClick={toggleDragMode}
            title={dragMode ? "Switch to selection mode" : "Switch to drag mode"}
          >
            {dragMode ? "Drag Mode" : "Selection Mode"}
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm">{zoom}%</span>
            <Button variant="outline" size="icon" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleResetView}>
              <MoveHorizontal className="h-4 w-4 mr-1" />
              Reset View
            </Button>
          </div>
        </div>
        {/* New container for PDF with grey background and padding */}
        <div className="flex-1 bg-gray-100 p-4 rounded-md shadow-inner overflow-auto">
          <PdfViewerUrl 
            ref={pdfViewerRef}
            url={url} 
            onPositionClick={dragMode ? undefined : onPositionClick}
            zoomLevel={zoom}
            onZoomChange={setZoom}
            className="w-full h-full box-border" 
            dragMode={dragMode}
          />
        </div>
      </div>
    );
  } else if (documentType === "image") {
    return (
      <div className="flex flex-col h-full w-full box-border">
        <div className="flex items-center justify-between gap-2 mb-2 p-2 bg-gray-50 rounded-md shadow-sm">
          <Button 
            variant={dragMode ? "default" : "outline"} 
            size="sm" 
            onClick={toggleDragMode}
            title={dragMode ? "Switch to selection mode" : "Switch to drag mode"}
          >
            {dragMode ? "Drag Mode" : "Selection Mode"}
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm">{zoom}%</span>
            <Button variant="outline" size="icon" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleResetView}>
              <MoveHorizontal className="h-4 w-4 mr-1" />
              Reset View
            </Button>
          </div>
        </div>
        
        {/* Modified container for Image with grey background and padding */}
        <div 
          ref={containerRef}
          className="flex-1 overflow-auto relative h-full w-full box-border bg-gray-100 p-4 rounded-md shadow-inner" 
          style={{ 
            cursor: isDragging ? 'grabbing' : (dragMode ? 'grab' : 'default')
          }}
        >
          <div 
            className="relative inline-block" 
            style={{ 
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top left',
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
              translate: `${position.x}px ${position.y}px`
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            <img 
              ref={imageRef}
              src={url} 
              alt="Document" 
              className="max-w-none"
              onClick={!dragMode && onPositionClick ? handleImageClick : undefined}
              draggable={false}
            />
          </div>
        </div>
      </div>
    );
  } else {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Unsupported document type
      </div>
    );
  }
} 