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

  // Loading state flag
  const [isDocumentLoading, setIsDocumentLoading] = useState(true);

  async function onDocumentLoadSuccess(page: PDFDocumentProxy): Promise<void> {
    setError(null);
    setNumPages(page._pdfInfo.numPages);
    // Reset position and zoom on new document
    setPosition({ x: 0, y: 0 });
    setZoom(100);
    setIsDocumentLoading(false); // Set loading to false on success
  }

  function onDocumentLoadError(err: Error): void {
    console.error("Error loading PDF:", err);
    setError(err);
    setIsDocumentLoading(false); // Also set loading to false on error
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
    <div 
      className={`pdf-viewer-container h-full w-full overflow-hidden ${className}`}
      ref={setContainerRef}
    >
      {error ? (
        <div className="flex h-full items-center justify-center p-4">
          <Alert variant="destructive" className="max-w-lg">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Loading PDF</AlertTitle>
            <AlertDescription>
              {error.message || "Could not load the document preview."}
              <Button variant="link" size="sm" onClick={() => window.location.reload()} className="p-0 h-auto ml-2">Reload?</Button>
            </AlertDescription>
          </Alert>
        </div>
      ) : !url ? (
        <div className="flex h-full items-center justify-center text-muted-foreground">
          No PDF URL provided.
        </div>
      ) : (
        <div 
          ref={pdfContainerRef}
          className={`pdf-content-wrapper relative h-full w-full overflow-auto ${isDragging ? 'cursor-grabbing' : dragMode ? 'cursor-grab' : 'cursor-auto'}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp} // Stop dragging if mouse leaves the container
          style={{ transform: `translate(${position.x}px, ${position.y}px)` }} 
        >
          <Document
            file={url}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            options={options}
            loading={<div className="text-center py-4 absolute inset-0 flex items-center justify-center bg-background/50 z-10"><p>Loading PDF document...</p></div>}
            className="relative" // Added relative positioning for absolute loading overlay
          >
            {/* Only render pages if document is loaded and width is known */}
            {!isDocumentLoading && containerWidth && numPages && Array.from(new Array(numPages), (_el, index) => {
              const pageNumber = index + 1;
              const pageProps = { 
                scale: zoom / 100, 
                onRenderSuccess: (page: any) => handlePageRenderSuccess(page, pageNumber)
              };
              
              return (
                <div 
                  key={`page_container_${pageNumber}`} 
                  className="relative mb-4 shadow-md bg-white" // Added shadow and background
                  ref={refCallbacks[index]}
                >
                  {/* Conditional Page Rendering */}
                  <Page
                    key={`page_${pageNumber}`}
                    pageNumber={pageNumber}
                    width={containerWidth}
                    {...pageProps}
                    // Adding click handler to the Page component
                    // Note: May need refinement depending on interaction needs
                    onClick={(e: React.MouseEvent) => {
                       if (onPositionClick && !dragMode) {
                         // We might need more sophisticated position calculation here 
                         // if the TextLayer click isn't sufficient or reliable.
                       }
                    }}
                  />
                  {/* Highlight Layer */}
                  {highlights && highlights.length > 0 && (
                    <PdfHighlightLayer 
                      highlights={highlights.filter(h => h.pageNumber === pageNumber)}
                      currentPage={pageNumber}
                      scale={zoom / 100}
                      containerWidth={containerWidth}
                      containerHeight={pageHeights[index] || 0}
                      position={position}
                    />
                  )}
                </div>
              );
            })}
          </Document>
        </div>
      )}
      <div className="pdf-controls absolute bottom-4 right-4 flex gap-2 z-20">
        <Button variant="outline" size="icon" onClick={handleZoomOut} title="Zoom Out">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zm-4 0H7" /></svg>
        </Button>
        <span className="bg-background/80 px-2 py-1 rounded text-sm">{Math.round(zoom)}%</span>
        <Button variant="outline" size="icon" onClick={handleZoomIn} title="Zoom In">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zm-4 0h8M13 11h-4v4H7v-4H3v-2h4V7h2v2h4v2z" /></svg>
        </Button>
        <Button variant="outline" size="icon" onClick={handleResetView} title="Reset View">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9M4 12v5h.581m15.357 2A8.001 8.001 0 004.581 15M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </Button>
      </div>
    </div>
  );
} 