import { useState } from "react";
import { cn } from "@/lib/utils";

interface PositionData {
  page_number: number;
  bounding_box: [number, number, number, number];
}

interface FieldData {
  value: string | number;
  confidence: number;
  position?: PositionData;
}

interface InteractiveDataFieldProps {
  label: string;
  data: FieldData;
  path: string;
  onHover?: (path: string, position: PositionData | null) => void;
  onSelect?: (path: string, data: FieldData) => void;
  className?: string;
  showPositionInfo?: boolean;
}

export function InteractiveDataField({
  label,
  data,
  path,
  onHover,
  onSelect,
  className,
  showPositionInfo = true,
}: InteractiveDataFieldProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  const handleMouseEnter = () => {
    setIsHovered(true);
    if (onHover && data.position) {
      onHover(path, data.position);
    }
  };
  
  const handleMouseLeave = () => {
    setIsHovered(false);
    if (onHover) {
      onHover(path, null);
    }
  };
  
  const handleClick = () => {
    if (onSelect) {
      onSelect(path, data);
    }
  };
  
  // Determine confidence color
  const getConfidenceColor = () => {
    if (data.confidence >= 0.8) return "bg-green-500";
    if (data.confidence >= 0.5) return "bg-yellow-500";
    return "bg-red-500";
  };
  
  const hasPosition = Boolean(data.position);
  
  return (
    <div
      id={`field-${path.replace(/\./g, '-')}`}
      className={cn(
        "group flex items-center p-2 rounded-md transition-colors",
        isHovered ? "bg-accent" : "hover:bg-accent/50",
        hasPosition ? "cursor-pointer" : "cursor-default",
        className
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      tabIndex={0}
      role="button"
      aria-label={`${label}: ${data.value}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          handleClick();
        }
      }}
    >
      <div className="flex items-center gap-2 mr-3">
        <div 
          className={cn(
            "w-2 h-2 rounded-full",
            getConfidenceColor()
          )}
          title={`Confidence: ${Math.round(data.confidence * 100)}%`}
        />
        <span className="font-medium">{label}:</span>
      </div>
      <div className="flex items-center gap-2">
        <span>{String(data.value)}</span>
        {showPositionInfo && data.position && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-2">
            <span className="text-xs text-muted-foreground">
              (Page {data.position.page_number})
            </span>
          </div>
        )}
      </div>
    </div>
  );
} 