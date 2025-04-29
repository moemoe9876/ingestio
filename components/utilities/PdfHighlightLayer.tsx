import { cn } from "@/lib/utils";
import React from "react";

interface HighlightRect {
  pageNumber: number;
  boundingBox: [number, number, number, number]; // [x1, y1, x2, y2] as percentages
  color?: string;
  id: string;
}

interface PdfHighlightLayerProps {
  highlights: HighlightRect[];
  pageNumber: number;
  onPositionClick?: (pageNumber: number, position: [number, number]) => void;
  dragMode?: boolean;
  className?: string;
}

export function PdfHighlightLayer({
  highlights,
  pageNumber,
  onPositionClick,
  dragMode = false,
  className,
}: PdfHighlightLayerProps) {
  // Filter highlights for the current page
  const pageHighlights = highlights.filter(h => h.pageNumber === pageNumber);
  
  // Handle click on the overlay to determine position
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onPositionClick || dragMode) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    // Ensure values are within bounds
    const boundedX = Math.max(0, Math.min(100, x));
    const boundedY = Math.max(0, Math.min(100, y));
    
    onPositionClick(pageNumber, [boundedX, boundedY]);
  };
  
  return (
    <>
      {/* Highlights layer */}
      <div 
        className={cn(
          "absolute inset-0 pointer-events-none",
          className
        )}
      >
        {pageHighlights.map((highlight) => {
          const [x1, y1, x2, y2] = highlight.boundingBox;
          
          return (
            <div
              key={highlight.id}
              className="absolute border-2 bg-primary/20 transition-all duration-200 animate-pulse"
              style={{
                left: `${x1}%`,
                top: `${y1}%`,
                width: `${x2 - x1}%`,
                height: `${y2 - y1}%`,
                borderColor: highlight.color || 'var(--primary)',
                backgroundColor: highlight.color ? `${highlight.color}20` : 'var(--primary-20)',
                animationDuration: '2s',
              }}
            />
          );
        })}
      </div>
      
      {/* Click overlay - only active when not in drag mode */}
      {onPositionClick && !dragMode && (
        <div 
          className="absolute inset-0 cursor-crosshair"
          onClick={handleOverlayClick}
        />
      )}
    </>
  );
} 