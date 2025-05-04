import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PositionData } from "@/types/ui/highlighting";
import { Check, Pencil, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
  onEdit?: (path: string, newValue: string | number) => void;
  className?: string;
  showPositionInfo?: boolean;
  isEditable?: boolean;
}

export function InteractiveDataField({
  label,
  data,
  path,
  onHover,
  onSelect,
  onEdit,
  className,
  showPositionInfo = true,
  isEditable = false,
}: InteractiveDataFieldProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<string | number>(data.value);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Reset edit value when data changes
  useEffect(() => {
    setEditValue(data.value);
  }, [data.value]);
  
  // Focus the input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);
  
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
    if (isEditable && !isEditing) {
      setIsEditing(true);
    } else if (onSelect) {
      onSelect(path, data);
    }
  };
  
  const handleSave = () => {
    if (onEdit && editValue !== data.value) {
      onEdit(path, editValue);
    }
    setIsEditing(false);
  };
  
  const handleCancel = () => {
    setEditValue(data.value);
    setIsEditing(false);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
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
        isEditable && !isEditing ? "hover:bg-primary/10" : "",
        className
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={isEditing ? undefined : handleClick}
      tabIndex={0}
      role="button"
      aria-label={`${label}: ${data.value}`}
      onKeyDown={(e) => {
        if (!isEditing && (e.key === "Enter" || e.key === " ")) {
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
      
      {isEditing ? (
        <div className="flex-1 flex items-center gap-2">
          <Input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-8 py-1"
            onClick={(e) => e.stopPropagation()}
          />
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-6 w-6"
            onClick={handleSave}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-6 w-6"
            onClick={handleCancel}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex-1 flex items-center gap-2">
          <span>{String(data.value)}</span>
          {showPositionInfo && data.position && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-2">
              <span className="text-xs text-muted-foreground">
                (Page {data.position.page_number})
              </span>
            </div>
          )}
          {isEditable && (
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-6 w-6 opacity-0 group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
} 