"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Download, Search, SlidersHorizontal, X } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { InteractiveDataField } from "./InteractiveDataField";

// Types
interface PositionData {
  page_number: number;
  bounding_box: [number, number, number, number];
}

interface FieldData {
  value: string | number;
  confidence: number;
  position?: PositionData;
}

interface HighlightRect {
  pageNumber: number;
  boundingBox: [number, number, number, number];
  color?: string;
  id: string;
}

interface DataVisualizerProps {
  data: any;
  onHighlight?: (highlight: HighlightRect | null) => void;
  onSelect?: (path: string, value: any) => void;
  onEdit?: (path: string, newValue: string | number) => void;
  className?: string;
  selectedFieldPath?: string | null;
  confidenceThreshold?: number;
  editMode?: boolean;
  options?: {
    includePositions?: boolean;
  };
}

// Helper functions
const getConfidenceColor = (confidence: number) => {
  if (confidence >= 0.9) return "bg-green-100 text-green-800 hover:bg-green-200";
  if (confidence >= 0.7) return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
  return "bg-red-100 text-red-800 hover:bg-red-200";
};

const formatFieldName = (name: string) => {
  return name
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

// Flatten nested data for table view
const flattenData = (data: any, prefix = ""): Record<string, any>[] => {
  if (!data || typeof data !== "object") return [];

  const result: Record<string, any>[] = [];

  Object.entries(data).forEach(([key, value]) => {
    const currentKey = prefix ? `${prefix}.${key}` : key;

    // Special handling for line_items
    if ((key === "line_items" || key.includes("items") || key.includes("products")) && Array.isArray(value)) {
      console.log(`Rendering line items array with ${value.length} items`);
      // Process each line item as a separate object
      value.forEach((lineItem, index) => {
        if (typeof lineItem === "object") {
          if ("value" in lineItem && "confidence" in lineItem) {
            // This is a simple line item with just a value (wrong format but we'll handle it)
            result.push({
              field: `Line Item [${index + 1}]`,
              value: lineItem.value,
              confidence: lineItem.confidence,
              path: `${currentKey}[${index}]`,
              location: (lineItem as FieldData).position,
            });
          } else {
            // This is a properly structured line item with properties
            Object.entries(lineItem).forEach(([propKey, propValue]) => {
              if (propValue && typeof propValue === "object" && "value" in propValue) {
                // Check if confidence exists, default to 1 if not
                const confidence = "confidence" in propValue ? propValue.confidence as number : 1;
                result.push({
                  field: `Line Item [${index + 1}] ${formatFieldName(propKey)}`,
                  value: propValue.value,
                  confidence: confidence,
                  path: `${currentKey}[${index}].${propKey}`,
                  location: "position" in propValue ? (propValue as FieldData).position : undefined,
                });
              } else {
                // Handle direct values in line items if they exist
                result.push({
                  field: `Line Item [${index + 1}] ${formatFieldName(propKey)}`,
                  value: propValue,
                  confidence: 1,
                  path: `${currentKey}[${index}].${propKey}`,
                });
              }
            });
          }
        } else {
          // Handle primitive values in line_items array if they exist
          result.push({
            field: `Line Item [${index + 1}]`,
            value: lineItem,
            confidence: 1,
            path: `${currentKey}[${index}]`,
          });
        }
      });
    } else if (value && typeof value === "object") {
      if ("value" in value && "confidence" in value) {
        // This is a field data object
        result.push({
          field: formatFieldName(key),
          value: value.value,
          confidence: value.confidence,
          path: currentKey,
          location: (value as FieldData).position,
        });
      } else if (Array.isArray(value)) {
        // Handle arrays
        value.forEach((item, index) => {
          const arrayResults = flattenData(item, `${currentKey}[${index}]`);
          arrayResults.forEach(item => {
            item.field = `${formatFieldName(key)} [${index + 1}] ${item.field}`;
            result.push(item);
          });
        });
      } else {
        // Handle nested objects
        const nestedResults = flattenData(value, currentKey);
        result.push(...nestedResults);
      }
    } else {
      // Handle primitive values
      result.push({
        field: formatFieldName(key),
        value: value,
        confidence: 1,
        path: currentKey,
      });
    }
  });

  return result;
};

export function DataVisualizer({ 
  data, 
  onHighlight, 
  onSelect,
  onEdit,
  className,
  selectedFieldPath = null,
  confidenceThreshold = 0,
  editMode = false,
  options = { includePositions: true }
}: DataVisualizerProps) {
  const [viewMode, setViewMode] = useState<"tree" | "json">("tree");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [minConfidence, setMinConfidence] = useState(confidenceThreshold);
  const [showConfidenceFilter, setShowConfidenceFilter] = useState(false);

  // Log what data was passed to the visualizer
  useEffect(() => {
    if (data) {
      console.log("[VISUALIZER DEBUG] Displaying data with fields:", Object.keys(data));
      console.log("[VISUALIZER DEBUG] Data structure type:", Array.isArray(data) ? "Array" : "Object");
    }
  }, [data]);

  // Update minConfidence when confidenceThreshold changes
  useEffect(() => {
    setMinConfidence(confidenceThreshold);
  }, [confidenceThreshold]);

  // Filter data based on search query and confidence threshold
  const filteredData = useMemo(() => {
    if (!data) return {};
    
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
        
        // Check if value is a FieldData object with a matching value and sufficient confidence
        const isFieldData = 
          value && 
          typeof value === "object" && 
          "value" in value && 
          "confidence" in value;
          
        const valueMatches = 
          isFieldData &&
          String(value.value).toLowerCase().includes(searchLower);
          
        const hasEnoughConfidence = 
          !isFieldData || 
          (value as FieldData).confidence >= minConfidence;
        
        if ((keyMatches || valueMatches) && hasEnoughConfidence) {
          filteredObj[key] = value;
          hasMatch = true;
        } else if (typeof value === "object" && hasEnoughConfidence) {
          const filteredValue = filterObject(value);
          if (filteredValue !== null) {
            filteredObj[key] = filteredValue;
            hasMatch = true;
          }
        }
      });
      
      return hasMatch ? filteredObj : null;
    };
    
    return filterObject(data) || {};
  }, [data, searchQuery, minConfidence]);

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
    const allPaths = getAllPaths(filteredData);
    setExpandedSections(new Set(allPaths));
  };

  const collapseAll = () => {
    setExpandedSections(new Set());
  };

  // Export data as CSV
  const exportAsCSV = () => {
    const flatData = flattenData(data);
    
    // Create CSV header
    const headers = ["Field", "Value", "Confidence"];
    let csv = headers.join(",") + "\n";
    
    // Add data rows
    flatData.forEach(item => {
      const row = [
        `"${item.field}"`,
        `"${item.value}"`,
        item.confidence
      ];
      csv += row.join(",") + "\n";
    });
    
    // Create and download the file
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "extracted_data.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export data as JSON
  const exportAsJSON = () => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "extracted_data.json");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle field hover
  const handleFieldHover = (path: string, position: PositionData | null) => {
    if (position && onHighlight) {
      onHighlight({
        pageNumber: position.page_number,
        boundingBox: position.bounding_box,
        id: path,
      });
    } else if (onHighlight) {
      onHighlight(null);
    }
  };
  
  // Add a new function to handle editing fields
  const handleFieldEdit = (path: string, value: string | number) => {
    if (onEdit) {
      onEdit(path, value);
    }
  };
  
  // Recursive renderer for nested data structures
  const renderField = (key: string, data: any, path: string) => {
    if (!data) return null;
    
    const formattedKey = key.replace(/_/g, " ");
    const isExpanded = expandedSections.has(path);
    
    // Special handling for line_items
    if ((key === "line_items" || key.includes("items") || key.includes("products")) && Array.isArray(data)) {
      return (
        <Collapsible
          key={key}
          open={isExpanded}
          onOpenChange={() => toggleSection(path)}
          className="w-full mb-4"
        >
          <div className="border-l-2 border-transparent hover:border-l-2 hover:border-primary/40 transition-colors">
            <CollapsibleTrigger className="flex items-center w-full p-2 text-left rounded-md hover:bg-accent/50 group">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 mr-2 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 mr-2 text-muted-foreground" />
              )}
              <h3 className="font-semibold capitalize text-sm">{formattedKey}</h3>
              <Badge variant="outline" className="ml-2 text-xs bg-muted/50">
                {data.length}
              </Badge>
            </CollapsibleTrigger>
          </div>
          
          <CollapsibleContent className="pl-6 mt-1 space-y-2">
            {data.map((item, index) => (
              <div key={index} className="p-2 border border-muted rounded-md mb-2">
                <h4 className="text-sm font-medium mb-1">Item {index + 1}</h4>
                {typeof item === 'object' ? (
                  "value" in item && "confidence" in item ? (
                    // Handle simple line items with just value/confidence
                    <InteractiveDataField
                      key={`${path}[${index}]`}
                      label={`Item ${index + 1}`}
                      data={item}
                      path={`${path}[${index}]`}
                      onHover={handleFieldHover}
                      onSelect={onSelect}
                      onEdit={editMode && onEdit ? handleFieldEdit : undefined}
                      showPositionInfo={options.includePositions !== false}
                      isEditable={editMode}
                      className={`${path}[${index}]` === selectedFieldPath ? "bg-primary/20 border border-primary" : ""}
                    />
                  ) : (
                    // Handle complex line items with multiple properties
                    <div className="grid grid-cols-1 gap-2">
                      {Object.entries(item).map(([itemKey, itemValue]) => (
                        <div key={itemKey}>
                          {itemValue && typeof itemValue === 'object' && "value" in itemValue ? (
                            <InteractiveDataField
                              key={`${path}[${index}].${itemKey}`}
                              label={itemKey.replace(/_/g, " ")}
                              data={{
                                value: itemValue.value as string | number,
                                confidence: "confidence" in itemValue ? itemValue.confidence as number : 1,
                                position: "position" in itemValue ? itemValue.position as PositionData : undefined
                              }}
                              path={`${path}[${index}].${itemKey}`}
                              onHover={handleFieldHover}
                              onSelect={onSelect}
                              onEdit={editMode && onEdit ? handleFieldEdit : undefined}
                              showPositionInfo={options.includePositions !== false}
                              isEditable={editMode}
                              className={`${path}[${index}].${itemKey}` === selectedFieldPath ? "bg-primary/20 border border-primary" : ""}
                            />
                          ) : (
                            <div className="flex items-center justify-between">
                              <span className="capitalize text-sm font-medium">{itemKey.replace(/_/g, " ")}:</span>
                              <span>{String(itemValue)}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  <div>{String(item)}</div>
                )}
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      );
    }
    
    if (typeof data === 'object' && 'value' in data && 'confidence' in data) {
      // This is a field with value and confidence
      return (
        <InteractiveDataField
          key={key}
          label={formattedKey}
          data={data}
          path={path}
          onHover={handleFieldHover}
          onSelect={onSelect}
          onEdit={editMode && onEdit ? handleFieldEdit : undefined}
          showPositionInfo={options.includePositions !== false}
          isEditable={editMode}
          className={cn(
            path === selectedFieldPath ? "bg-primary/20 border border-primary" : "",
            "mb-2"
          )}
        />
      );
    }
    
    if (Array.isArray(data)) {
      // Handle array of items
      return (
        <Collapsible
          key={key}
          open={isExpanded}
          onOpenChange={() => toggleSection(path)}
          className="w-full mb-4"
        >
          <div className="border-l-2 border-transparent hover:border-l-2 hover:border-primary/40 transition-colors">
            <CollapsibleTrigger className="flex items-center w-full p-2 text-left rounded-md hover:bg-accent/50 group">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 mr-2 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 mr-2 text-muted-foreground" />
              )}
              <h3 className="font-semibold capitalize text-sm">{formattedKey}</h3>
              <Badge variant="outline" className="ml-2 text-xs bg-muted/50">
                {data.length}
              </Badge>
            </CollapsibleTrigger>
          </div>
          
          <CollapsibleContent className="pl-6 mt-1 space-y-2">
            {data.map((item, index) => (
              <div key={index} className="space-y-2">
                {typeof item === 'object' ? (
                  Object.entries(item).map(([itemKey, itemValue]) => 
                    renderField(itemKey, itemValue, `${path}.${index}.${itemKey}`)
                  )
                ) : (
                  <div className="flex items-center justify-between p-2">
                    <span>Item {index + 1}</span>
                    <span>{String(item)}</span>
                  </div>
                )}
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      );
    }
    
    if (typeof data === 'object') {
      // Handle nested objects
      return (
        <Collapsible
          key={key}
          open={isExpanded}
          onOpenChange={() => toggleSection(path)}
          className="w-full mb-4"
        >
          <div className="border-l-2 border-transparent hover:border-l-2 hover:border-primary/40 transition-colors">
            <CollapsibleTrigger className="flex items-center w-full p-2 text-left rounded-md hover:bg-accent/50 group">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 mr-2 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 mr-2 text-muted-foreground" />
              )}
              <h3 className="font-semibold capitalize text-sm">{formattedKey}</h3>
            </CollapsibleTrigger>
          </div>
          
          <CollapsibleContent className="pl-6 mt-1 space-y-2">
            {Object.entries(data).map(([nestedKey, nestedValue]) => 
              renderField(nestedKey, nestedValue, `${path}.${nestedKey}`)
            )}
          </CollapsibleContent>
        </Collapsible>
      );
    }
    
    // Handle primitive values
    return (
      <div key={key} className="flex items-center justify-between p-2 mb-2 rounded-md hover:bg-accent/50">
        <span className="font-medium capitalize">{formattedKey}:</span>
        <span>{String(data)}</span>
      </div>
    );
  };
  
  // Render tree view
  const renderTreeView = () => {
    return (
      <div className="space-y-4 p-4">
        {Object.entries(filteredData).length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery || minConfidence > 0 ? "No results match your filters" : "No data available"}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-end mb-2 gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={expandAll}
                className="text-xs h-7 px-2"
              >
                Expand All
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={collapseAll}
                className="text-xs h-7 px-2"
              >
                Collapse All
              </Button>
            </div>
            <div className="space-y-4">
              {Object.entries(filteredData).map(([key, value], index) => (
                <React.Fragment key={key}>
                  {index > 0 && <Separator className="my-2" />}
                  {renderField(key, value, key)}
                </React.Fragment>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };
  
  // Render table view
  const renderTableView = () => {
    const flatData = useMemo(() => flattenData(filteredData), [filteredData]);

    if (flatData.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          {searchQuery || minConfidence > 0 ? "No results match your filters" : "No data available"}
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Field</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Confidence</TableHead>
            {options.includePositions !== false && <TableHead>Page</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {flatData.map((item, index) => (
            <TableRow 
              key={index}
              className={cn(
                "cursor-pointer hover:bg-muted/50",
                item.path === selectedFieldPath ? "bg-primary/20" : ""
              )}
              id={`field-${item.path?.replace(/\./g, '-')}`}
              onMouseEnter={() => onHighlight && item.location && onHighlight({
                pageNumber: item.location.page_number,
                boundingBox: item.location.bounding_box,
                id: item.path,
              })}
              onClick={() => onSelect && item.path && onSelect(item.path, item)}
            >
              <TableCell className="font-medium">{item.field}</TableCell>
              <TableCell>{String(item.value)}</TableCell>
              <TableCell>
                <Badge 
                  variant="outline" 
                  className={cn("text-xs", getConfidenceColor(item.confidence))}
                >
                  {Math.round(item.confidence * 100)}%
                </Badge>
              </TableCell>
              {options.includePositions !== false && (
                <TableCell>
                  {item.location?.page_number ? `Page ${item.location.page_number}` : "-"}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };
  
  // Render JSON view
  const renderJsonView = () => {
    return (
      <pre className="overflow-auto text-xs p-4 bg-muted/50 rounded-md">
        <code>{JSON.stringify(filteredData, null, 2)}</code>
      </pre>
    );
  };

  return (
    <Card className={cn("h-full flex flex-col overflow-hidden rounded-none", className)}>
      <CardHeader className="px-4 py-3 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">Extracted Data</CardTitle>
        <div className="flex gap-2">
          <Popover open={showConfidenceFilter} onOpenChange={setShowConfidenceFilter}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Filter</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Confidence Filter</h4>
                  <div className="flex items-center justify-between">
                    <label htmlFor="confidence-filter" className="text-sm">Min: {Math.round(minConfidence * 100)}%</label>
                    <input 
                      id="confidence-filter"
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.05" 
                      value={minConfidence}
                      onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
                      className="w-2/3"
                      aria-label="Minimum confidence threshold"
                    />
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <div className="flex gap-1">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8" 
              onClick={exportAsCSV}
              title="Export as CSV"
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              CSV
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8" 
              onClick={exportAsJSON}
              title="Export as JSON"
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              JSON
            </Button>
          </div>
        </div>
      </CardHeader>
      <div className="px-4 pb-2 pt-0 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search fields..."
            className="pl-8 h-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-0.5 top-0.5 h-8 w-8 p-0"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <Tabs defaultValue="tree" value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
          <TabsList className="h-9">
            <TabsTrigger value="tree" className="text-xs">Tree</TabsTrigger>
            <TabsTrigger value="json" className="text-xs">JSON</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      <CardContent className="p-0 flex-1 overflow-y-auto max-h-[calc(100vh-300px)]">
        {data ? (
          <>
            {viewMode === "tree" && renderTreeView()}
            {viewMode === "json" && renderJsonView()}
          </>
        ) : (
          <div className="flex items-center justify-center h-full p-4 text-muted-foreground text-sm">
            No data available
          </div>
        )}
      </CardContent>
    </Card>
  );
} 