import { cn } from "@/lib/utils";
import { HighlightRect } from "@/types/ui/highlighting";

interface PdfHighlightLayerProps {
  highlights: HighlightRect[];
  currentPage: number;
  containerWidth: number;
  containerHeight: number;
  scale: number;
  position?: { x: number, y: number };
  className?: string;
}

export function PdfHighlightLayer({
  highlights,
  currentPage,
  containerWidth,
  containerHeight,
  scale,
  position = { x: 0, y: 0 },
  className,
}: PdfHighlightLayerProps) {
  // Filter highlights for the current page
  const pageHighlights = highlights.filter(h => h.pageNumber === currentPage);
  
  return (
    <div 
      className={cn(
        "absolute inset-0 pointer-events-none",
        className
      )}
    >
      {pageHighlights.map((highlight) => {
        const [x1, y1, x2, y2] = highlight.boundingBox;
        
        // Convert percentage to pixels based on container dimensions
        const left = (x1 / 100) * containerWidth * scale;
        const top = (y1 / 100) * containerHeight * scale;
        const width = ((x2 - x1) / 100) * containerWidth * scale;
        const height = ((y2 - y1) / 100) * containerHeight * scale;
        
        return (
          <div
            key={highlight.id}
            className="absolute border-2 bg-primary/20 transition-all duration-200 animate-pulse"
            style={{
              left: `${left}px`,
              top: `${top}px`,
              width: `${width}px`,
              height: `${height}px`,
              borderColor: highlight.color || 'var(--primary)',
              backgroundColor: highlight.color ? `${highlight.color}20` : 'var(--primary-20)',
              animationDuration: '2s',
            }}
          />
        );
      })}
    </div>
  );
} 