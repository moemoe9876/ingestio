import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface ResizablePanelsProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  defaultLeftWidth?: number; // percentage
  minLeftWidth?: number; // percentage
  maxLeftWidth?: number; // percentage
  storageKey?: string;
  className?: string;
}

export function ResizablePanels({
  leftPanel,
  rightPanel,
  defaultLeftWidth = 50,
  minLeftWidth = 30,
  maxLeftWidth = 70,
  storageKey = "panelSizes",
  className,
}: ResizablePanelsProps) {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  
  // Load saved panel sizes on mount
  useEffect(() => {
    if (storageKey) {
      const savedWidth = localStorage.getItem(storageKey);
      if (savedWidth !== null) {
        setLeftWidth(Number(savedWidth));
      }
    }
  }, [storageKey]);
  
  // Save panel sizes when they change
  useEffect(() => {
    if (storageKey) {
      localStorage.setItem(storageKey, String(leftWidth));
    }
  }, [leftWidth, storageKey]);
  
  const handleMouseDown = () => {
    isDragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const mouseX = e.clientX - containerRect.left;
      
      // Calculate new width as percentage
      let newLeftWidth = (mouseX / containerWidth) * 100;
      
      // Apply constraints
      newLeftWidth = Math.max(minLeftWidth, Math.min(maxLeftWidth, newLeftWidth));
      
      setLeftWidth(newLeftWidth);
    };
    
    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [minLeftWidth, maxLeftWidth]);
  
  return (
    <div 
      ref={containerRef}
      className={cn("flex h-full w-full overflow-hidden rounded-lg box-border", className)}
    >
      <div 
        className="overflow-y-auto overflow-x-hidden h-full box-border"
        style={{ width: `${leftWidth}%` }}
      >
        {leftPanel}
      </div>
      
      <div 
        className="w-1 bg-border hover:bg-primary/50 cursor-col-resize flex-shrink-0 h-full"
        onMouseDown={handleMouseDown}
      />
      
      <div 
        className="overflow-y-auto overflow-x-hidden h-full box-border"
        style={{ width: `${100 - leftWidth}%` }}
      >
        {rightPanel}
      </div>
    </div>
  );
} 