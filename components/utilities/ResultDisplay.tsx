"use client";

import { Button } from "@/components/ui/button";
import { Braces, Copy, RotateCcw, ChevronDown, ChevronRight, Search, X } from "lucide-react";
import { useState, useMemo } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface FieldData {
  value: string | number;
  confidence: number;
  location?: {
    page: number;
    coordinates?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
}

type ExtractedData = {
  [key: string]: FieldData | FieldData[] | { [key: string]: any };
};

interface ResultDisplayProps {
  result: ExtractedData;
  schema: string;
  onReset: () => void;
  onFieldHover?: (field: string, data: any) => void;
}

// Helper function to get confidence color based on score
const getConfidenceColor = (confidence: number) => {
  if (confidence >= 0.9) return "bg-green-100 text-green-800 hover:bg-green-200";
  if (confidence >= 0.7) return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
  return "bg-red-100 text-red-800 hover:bg-red-200";
};

// Helper function to format field names for display
const formatFieldName = (name: string) => {
  return name
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export function ResultDisplay({ 
  result, 
  schema, 
  onReset,
  onFieldHover 
}: ResultDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [schemaCopied, setSchemaCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSchemaCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(schema, null, 2));
    setSchemaCopied(true);
    setTimeout(() => setSchemaCopied(false), 2000);
  };

  const toggleSection = (path: string) => {
    const newExpandedSections = new Set(expandedSections);
    if (newExpandedSections.has(path)) {
      newExpandedSections.delete(path);
    } else {
      newExpandedSections.add(path);
    }
    setExpandedSections(newExpandedSections);
  };

  const expandAll = () => {
    const allPaths = getAllPaths(result);
    setExpandedSections(new Set(allPaths));
  };

  const collapseAll = () => {
    setExpandedSections(new Set());
  };

  // Get all possible paths in the data for expand/collapse all functionality
  const getAllPaths = (data: any, basePath = ""): string[] => {
    if (!data || typeof data !== "object") return [];
    
    let paths: string[] = [];
    
    Object.keys(data).forEach(key => {
      const currentPath = basePath ? `${basePath}.${key}` : key;
      paths.push(currentPath);
      
      if (data[key] && typeof data[key] === "object") {
        paths = [...paths, ...getAllPaths(data[key], currentPath)];
      }
    });
    
    return paths;
  };

  // Filter data based on search query
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return result;
    
    const searchLower = searchQuery.toLowerCase();
    
    const filterObject = (obj: any): any => {
      if (!obj || typeof obj !== "object") return null;
      
      // For arrays
      if (Array.isArray(obj)) {
        const filteredArray = obj
          .map(item => filterObject(item))
          .filter(item => item !== null);
        return filteredArray.length > 0 ? filteredArray : null;
      }
      
      // For objects
      const filteredObj: any = {};
      let hasMatch = false;
      
      Object.entries(obj).forEach(([key, value]) => {
        const keyMatches = key.toLowerCase().includes(searchLower);
        
        // Check if value is a FieldData object with a matching value
        const valueMatches = 
          value && 
          typeof value === "object" && 
          "value" in value && 
          String(value.value).toLowerCase().includes(searchLower);
        
        if (keyMatches || valueMatches) {
          filteredObj[key] = value;
          hasMatch = true;
        } else if (typeof value === "object") {
          const filteredValue = filterObject(value);
          if (filteredValue !== null) {
            filteredObj[key] = filteredValue;
            hasMatch = true;
          }
        }
      });
      
      return hasMatch ? filteredObj : null;
    };
    
    return filterObject(result) || {};
  }, [result, searchQuery]);

  // Recursive component for rendering any data structure
  const DynamicDataRenderer = ({ data, path = "" }: { data: any; path?: string }) => {
    if (!data) return null;
    
    // Handle arrays
    if (Array.isArray(data)) {
      return (
        <div className="space-y-2">
          {data.map((item, index) => (
            <div key={index} className="pl-4 border-l-2 border-muted">
              <div className="text-sm font-medium text-muted-foreground mb-1">
                Item {index + 1}
              </div>
              <DynamicDataRenderer data={item} path={`${path}[${index}]`} />
            </div>
          ))}
        </div>
      );
    }
    
    // Handle objects
    if (typeof data === "object") {
      // Check if this is a field data object (with value and confidence)
      if ("value" in data && "confidence" in data) {
        const fieldData = data as FieldData;
        return (
          <div 
            className="flex items-center gap-2"
            onMouseEnter={() => onFieldHover && path && onFieldHover(path, fieldData)}
          >
            <span className="font-medium">{String(fieldData.value)}</span>
            <Badge 
              variant="outline" 
              className={cn("text-xs", getConfidenceColor(fieldData.confidence))}
            >
              {Math.round(fieldData.confidence * 100)}%
            </Badge>
            {fieldData.location && (
              <span className="text-xs text-muted-foreground">
                Page {fieldData.location.page}
              </span>
            )}
          </div>
        );
      }
      
      // Regular object with nested properties
      return (
        <div className="space-y-2">
          {Object.entries(data).map(([key, value]) => {
            const currentPath = path ? `${path}.${key}` : key;
            const isExpanded = expandedSections.has(currentPath);
            
            // Check if value is an object or array that needs collapsible treatment
            const isComplexValue = value && typeof value === "object";
            
            return (
              <div key={key} className="border-l-2 border-muted pl-4 py-1">
                {isComplexValue ? (
                  <Collapsible open={isExpanded}>
                    <CollapsibleTrigger 
                      onClick={() => toggleSection(currentPath)}
                      className="flex items-center gap-2 hover:bg-muted/50 rounded px-2 py-1 w-full text-left"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className="font-medium">{formatFieldName(key)}</span>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-1 ml-6">
                      <DynamicDataRenderer data={value} path={currentPath} />
                    </CollapsibleContent>
                  </Collapsible>
                ) : (
                  <div className="flex items-center justify-between px-2">
                    <span className="text-sm font-medium">{formatFieldName(key)}:</span>
                    <span className="text-sm">{String(value)}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }
    
    // Primitive values
    return <span>{String(data)}</span>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Extracted Data</h2>
        <div className="space-x-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Braces className="w-4 h-4 mr-2" />
                Schema
              </Button>
            </PopoverTrigger>
            <PopoverContent className="max-h-[500px] max-w-[700px] w-full overflow-y-auto">
              <div className="relative p-4 rounded-lg bg-muted">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleSchemaCopy}
                  className="absolute top-2 right-2"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  {schemaCopied ? "Copied!" : "Copy"}
                </Button>
                <pre className="overflow-auto">
                  <code className="text-xs">
                    {JSON.stringify(schema, null, 2)}
                  </code>
                </pre>
              </div>
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="w-4 h-4 mr-2" />
            {copied ? "Copied!" : "Copy"}
          </Button>
          <Button variant="outline" size="sm" onClick={onReset}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Process Another PDF
          </Button>
        </div>
      </div>
      
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search extracted data..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1 h-7 w-7 p-0"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={expandAll}>
          Expand All
        </Button>
        <Button variant="outline" size="sm" onClick={collapseAll}>
          Collapse All
        </Button>
      </div>
      
      <div className="p-4 rounded-lg bg-muted overflow-auto max-h-[600px]">
        {Object.keys(filteredData).length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery ? "No results match your search" : "No data available"}
          </div>
        ) : (
          <DynamicDataRenderer data={filteredData} />
        )}
      </div>
      
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Confidence indicators:</span>
        <Badge variant="outline" className={getConfidenceColor(0.95)}>High (90-100%)</Badge>
        <Badge variant="outline" className={getConfidenceColor(0.8)}>Medium (70-89%)</Badge>
        <Badge variant="outline" className={getConfidenceColor(0.5)}>Low (0-69%)</Badge>
      </div>
    </div>
  );
}
