"use client";

import { useResizeObserver } from "@wojtekmaj/react-hooks";
import { debounce } from "lodash";
import { AlertCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { PdfHighlightLayer } from "./PdfHighlightLayer";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

const options = {
  cMapUrl: "/cmaps/",
  standardFontDataUrl: "/standard_fonts/",
};

interface FieldLocation {
  page: number;
  coordinates?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface HighlightRect {
  pageNumber: number;
  boundingBox: [number, number, number, number]; // [x1, y1, x2, y2] as percentages
  color?: string;
  id: string;
}

interface PdfViewerUrlProps {
  url: string;
  zoomLevel?: number;
  onZoomChange?: (zoom: number) => void;
  highlightedField?: FieldLocation;
  highlights?: HighlightRect[];
  onPositionClick?: (pageNumber: number, position: [number, number]) => void;
  className?: string;
  dragMode?: boolean;
}

export default function PdfViewerUrl({ 
  url, 
  zoomLevel = 100,
  onZoomChange,
  highlightedField,
  highlights = [],
  onPositionClick,
  className,
  dragMode = false
}: PdfViewerUrlProps) {
  const [numPages, setNumPages] = useState<number>();
  const [containerRef, setContainerRef] = useState<HTMLElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>();
  const [error, setError] = useState<Error | null>(null);
  const [zoom, setZoom] = useState(zoomLevel);
  const [pageRefs, setPageRefs] = useState<(HTMLDivElement | null)[]>([]);
  const [pageHeights, setPageHeights] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const pdfContainerRef = useRef<HTMLDivElement>(null);

  // Sync zoom level with parent component
  useEffect(() => {
    setZoom(zoomLevel);
  }, [zoomLevel]);

  // Update local zoom and notify parent
  const updateZoom = (newZoom: number) => {
    setZoom(newZoom);
    if (onZoomChange) {
      onZoomChange(newZoom);
    }
  };

  // Initialize page refs when numPages changes
  useEffect(() => {
    if (numPages) {
      setPageRefs(Array(numPages).fill(null));
    }
  }, [numPages]);

  // Add debounced resize observer
  const debouncedResize = useCallback(
    debounce((entries: ResizeObserverEntry[]) => {
      const [entry] = entries;
      if (entry) {
        setContainerWidth(entry.contentRect.width);
      }
    }, 100),
    []
  );

  useResizeObserver(containerRef, {}, debouncedResize);

  // Add effect to handle manual resize events
  useEffect(() => {
    const handleResize = debounce(() => {
      if (containerRef) {
        setContainerWidth(containerRef.clientWidth);
      }
    }, 100);
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      handleResize.cancel();
    };
  }, [containerRef]);

  async function onDocumentLoadSuccess(page: PDFDocumentProxy): Promise<void> {
    setError(null);
    setNumPages(page._pdfInfo.numPages);
    // Reset position and zoom on new document
    setPosition({ x: 0, y: 0 });
    setZoom(100);
  }

  function onDocumentLoadError(err: Error): void {
    console.error("Error loading PDF:", err);
    setError(err);
  }

  const handleZoomIn = () => {
    const newZoom = Math.min(400, zoom + 25);
    updateZoom(newZoom);
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(25, zoom - 25);
    updateZoom(newZoom);
  };

  const handleResetView = () => {
    updateZoom(100);
    setPosition({ x: 0, y: 0 });
  };

  // Handle mouse down for dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    // Don't initiate drag if in position selection mode and not in drag mode
    if (onPositionClick && !dragMode) return;
    
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    
    // Prevent default behavior when dragging
    e.preventDefault();
  };

  // Handle mouse move for dragging
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
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

  // Set a ref for a specific page - use useCallback to prevent recreation on every render
  const setPageRef = useCallback((index: number, ref: HTMLDivElement | null) => {
    if (!ref) return; // Skip null refs
    
    setPageRefs(prev => {
      // If the ref is the same, return the previous state to prevent unnecessary updates
      if (prev[index] === ref) {
        return prev;
      }
      
      // Create a new array with the updated ref
      const newRefs = [...prev];
      newRefs[index] = ref;
      return newRefs;
    });
  }, []);

  // Create a memoized array of callbacks for each page
  const refCallbacks = useMemo(() => {
    if (!numPages) return [];
    
    return Array.from({ length: numPages }, (_, index) => 
      (ref: HTMLDivElement | null) => setPageRef(index, ref)
    );
  }, [numPages, setPageRef]);

  // Update page heights when a page is rendered
  const handlePageRenderSuccess = (page: any, pageNumber: number) => {
    setPageHeights(prev => {
      const newHeights = [...prev];
      newHeights[pageNumber - 1] = page.height;
      return newHeights;
    });
  };

  // Scroll to highlighted field
  useEffect(() => {
    if (highlights.length > 0) {
      const highlight = highlights[0]; // Get the first highlight
      if (highlight && highlight.pageNumber) {
        // Set current page to the highlighted page
        setCurrentPage(highlight.pageNumber);
        
        // Scroll the page into view
        const pageIndex = highlight.pageNumber - 1;
        const pageRef = pageRefs[pageIndex];
        
        if (pageRef) {
          // Scroll the page into view with a small delay to prevent rapid re-renders
          const timer = setTimeout(() => {
            pageRef.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 100);
          
          return () => clearTimeout(timer);
        }
      }
    }
  }, [highlights, pageRefs]);

  // Add click handler for the text layer
  const handleTextLayerClick = (e: React.MouseEvent, pageNumber: number) => {
    if (!containerRef || !onPositionClick || isDragging || dragMode) return;
    
    const pageRef = pageRefs[pageNumber - 1];
    if (!pageRef) return;
    
    const pageRect = pageRef.getBoundingClientRect();
    const scale = zoom / 100;
    
    // Calculate click position as percentage of page dimensions, accounting for panning
    const offsetX = (e.clientX - pageRect.left - position.x / scale);
    const offsetY = (e.clientY - pageRect.top - position.y / scale);
    
    // Convert to percentage
    const x = (offsetX / (containerWidth! * scale)) * 100;
    const y = (offsetY / (pageHeights[pageNumber - 1] * scale)) * 100;
    
    // Ensure values are within bounds
    const boundedX = Math.max(0, Math.min(100, x));
    const boundedY = Math.max(0, Math.min(100, y));
    
    console.log(`Clicked at page ${pageNumber}, position: ${boundedX}%, ${boundedY}%`);
    
    // Notify parent component about the click position
    onPositionClick(pageNumber, [boundedX, boundedY]);
  };

  // Add global event listeners for dragging
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };
    
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging && zoom > 100) {
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
  }, [isDragging, dragStart, zoom]);

  // Add wheel event for zooming 
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = -Math.sign(e.deltaY) * 10;
        const newZoom = Math.max(25, Math.min(400, zoom + delta));
        updateZoom(newZoom);
      }
    };
    
    containerRef?.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      containerRef?.removeEventListener('wheel', handleWheel);
    };
  }, [containerRef, zoom, updateZoom]);

  return (
    <div className={`flex flex-col h-full w-full box-border ${className || ''}`}>
      <div
        ref={setContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden h-full w-full box-border"
      >
        {error ? (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Failed to load PDF document. {error.message}
            </AlertDescription>
          </Alert>
        ) : (
          <div 
            ref={pdfContainerRef}
            className="h-full w-full box-border"
            style={{ 
              cursor: isDragging ? 'grabbing' : (dragMode ? 'grab' : 'default'),
              position: 'relative'
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            <div style={{ 
              transform: `scale(${zoom / 100})`, 
              transformOrigin: 'top center',
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
              translate: `${position.x}px ${position.y}px`
            }}>
              <Document
                file={url}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                options={options}
                loading={<div className="text-center py-4">Loading PDF...</div>}
              >
                {Array.from(new Array(numPages), (_el, index) => {
                  const pageNumber = index + 1;
                  return (
                    <div 
                      key={`page_container_${pageNumber}`} 
                      className="relative mb-4"
                      ref={refCallbacks[index]}
                    >
                      <Page
                        key={`page_${pageNumber}`}
                        pageNumber={pageNumber}
                        width={containerWidth}
                        renderTextLayer={true}
                        renderAnnotationLayer={true}
                        onRenderSuccess={(page) => handlePageRenderSuccess(page, pageNumber)}
                      />
                      
                      {/* Add highlight layer for each page */}
                      <PdfHighlightLayer
                        highlights={highlights}
                        currentPage={pageNumber}
                        containerWidth={containerWidth || 0}
                        containerHeight={pageHeights[index] || 0}
                        scale={zoom / 100}
                        position={position}
                      />
                      
                      {/* Add a transparent overlay for click handling */}
                      <div 
                        className="absolute inset-0"
                        onClick={(e) => handleTextLayerClick(e, pageNumber)}
                        style={{ 
                          pointerEvents: onPositionClick && !isDragging && !dragMode ? 'auto' : 'none',
                          cursor: 'default'
                        }}
                      />
                    </div>
                  );
                })}
              </Document>
            </div>
          </div>
        )}
      </div>
      
      {/* Add page navigation controls */}
      {numPages && numPages > 1 && (
        <div className="flex items-center justify-between border-t p-2 mt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="text-sm">
            Page {currentPage} of {numPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.min(numPages, currentPage + 1))}
            disabled={currentPage === numPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
} 