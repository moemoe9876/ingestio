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
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Download, Edit, Search, X } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { InteractiveDataField } from "./InteractiveDataField";

// Types
interface FieldData {
  value: string | number;
}

interface DataVisualizerProps {
  data: any;
  onSelect?: (path: string, value: any) => void;
  onEdit?: (path: string, newValue: string | number) => void;
  className?: string;
  selectedFieldPath?: string | null;
  editMode?: boolean;
}

// Helper functions
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
      // Process each line item as a separate object
      value.forEach((lineItem, index) => {
        if (typeof lineItem === "object") {
          if ("value" in lineItem) {
            // This is a simple line item with just a value
            result.push({
              field: `Line Item [${index + 1}]`,
              value: lineItem.value,
              path: `${currentKey}[${index}]`,
            });
          } else {
            // This is a properly structured line item with properties
            Object.entries(lineItem).forEach(([propKey, propValue]) => {
              if (propValue && typeof propValue === "object" && "value" in propValue) {
                result.push({
                  field: `Line Item [${index + 1}] ${formatFieldName(propKey)}`,
                  value: propValue.value,
                  path: `${currentKey}[${index}].${propKey}`,
                });
              } else {
                // Handle direct values in line items if they exist
                result.push({
                  field: `Line Item [${index + 1}] ${formatFieldName(propKey)}`,
                  value: propValue,
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
            path: `${currentKey}[${index}]`,
          });
        }
      });
    } else if (value && typeof value === "object") {
      if ("value" in value) {
        // This is a field data object
        result.push({
          field: formatFieldName(key),
          value: value.value,
          path: currentKey,
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
        path: currentKey,
      });
    }
  });

  return result;
};

export function DataVisualizer({ 
  data, 
  onSelect,
  onEdit,
  className,
  selectedFieldPath = null,
  editMode = false,
}: DataVisualizerProps) {
  const [viewMode, setViewMode] = useState<"tree" | "json">("tree");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Log what data was passed to the visualizer
  useEffect(() => {
    if (data) {
      // console.log("[VISUALIZER DEBUG] Displaying data with fields:", Object.keys(data));
      // console.log("[VISUALIZER DEBUG] Data structure type:", Array.isArray(data) ? "Array" : "Object");
    }
  }, [data]);

  // Filter data based on search query
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
        
        // Check if value is a FieldData object with a matching value
        const isFieldData = 
          value && 
          typeof value === "object" && 
          "value" in value;
          
        const valueMatches = 
          isFieldData &&
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
    
    return filterObject(data) || {};
  }, [data, searchQuery]);

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
    const headers = ["Field", "Value"];
    let csv = headers.join(",") + "\n";
    
    // Add data rows
    flatData.forEach(item => {
      const row = [
        `"${item.field}"`,
        `"${item.value}"`
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
  
  // Add a new function to handle editing fields
  const handleFieldEdit = (path: string, value: string | number) => {
    if (onEdit) {
      onEdit(path, value);
    }
  };
  
  // Recursive renderer for nested data structures
  const renderField = (key: string, data: any, path: string) => {
    if (!data) return null;
    
    // Explicitly skip rendering 'confidence' fields
    if (key.toLowerCase() === 'confidence') {
      return null;
    }

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
          
          <CollapsibleContent className="pl-2 mt-1">
            {/* Table-based horizontal layout for line items */}
            <div className="border rounded-md overflow-hidden mt-2 bg-card">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[80px] font-medium">Item</TableHead>
                    {/* Dynamically determine columns based on the first item's properties */}
                    {data[0] && typeof data[0] === 'object' && (
                      <>
                        {Object.keys(data[0]).map(itemKey => {
                          // Skip rendering certain metadata keys
                          if (itemKey === 'metadata') return null;
                          return (
                            <TableHead key={itemKey} className="font-medium">
                              {formatFieldName(itemKey)}
                            </TableHead>
                          );
                        })}
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((item, index) => (
                    <TableRow 
                      key={index}
                      className={`hover:bg-muted/50 transition-colors cursor-pointer ${selectedFieldPath && `${path}[${index}]`.startsWith(selectedFieldPath) ? "bg-primary/10" : ""}`}
                      onClick={() => onSelect && onSelect(`${path}[${index}]`, item)}
                    >
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      {/* Render each property value */}
                      {typeof item === 'object' ? (
                        <>
                          {Object.entries(item).map(([itemKey, itemValue]) => {
                            // Skip rendering certain metadata keys
                            if (itemKey === 'metadata') return null;
                            
                            // Handle field data objects with value
                            if (itemValue && typeof itemValue === 'object' && 'value' in itemValue) {
                              const value = itemValue.value as string | number;
                              
                              return (
                                <TableCell 
                                  key={itemKey}
                                  className={`group ${editMode ? "relative" : ""}`}>
                                  {editMode ? (
                                    <div className="relative">
                                      <span className="block whitespace-nowrap overflow-hidden text-ellipsis">{String(value)}</span>
                                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-end">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-6 w-6 p-0"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const newValue = prompt("Edit value:", String(value));
                                            if (newValue !== null && onEdit) {
                                              onEdit(`${path}[${index}].${itemKey}`, newValue);
                                            }
                                          }}
                                        >
                                          <Edit className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <span>{String(value)}</span>
                                  )}
                                </TableCell>
                              );
                            }
                            
                            // Handle simple values
                            return (
                              <TableCell key={itemKey}>
                                {typeof itemValue === 'object' ? JSON.stringify(itemValue) : String(itemValue)}
                              </TableCell>
                            );
                          })}
                        </>
                      ) : (
                        <TableCell colSpan={5}>{String(item)}</TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CollapsibleContent>
        </Collapsible>
      );
    }
    
    if (typeof data === 'object' && 'value' in data) {
      // This is a field with value
      return (
        <InteractiveDataField
          key={key}
          label={formattedKey}
          data={data as FieldData} // Cast to FieldData for type safety
          path={path}
          onSelect={onSelect}
          onEdit={editMode && onEdit ? handleFieldEdit : undefined}
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
            {Object.entries(data).map(([nestedKey, nestedValue]) => {
              // Explicitly skip rendering 'confidence' fields in nested objects
              if (nestedKey.toLowerCase() === 'confidence') {
                return null;
              }
              return renderField(nestedKey, nestedValue, `${path}.${nestedKey}`);
            })}
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
            {searchQuery ? "No results match your filters" : "No data available"}
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
          {searchQuery ? "No results match your filters" : "No data available"}
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Field</TableHead>
            <TableHead>Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {flatData.map((item, index) => (
            <TableRow 
              key={index}
              className={cn(
                "cursor-pointer hover:bg-muted/50",
                item.path && selectedFieldPath && item.path.startsWith(selectedFieldPath) ? "bg-primary/20" : ""
              )}
              id={`field-${item.path?.replace(/\./g, '-')}`}
              onClick={() => onSelect && item.path && onSelect(item.path, item)}
            >
              <TableCell className="font-medium">{item.field}</TableCell>
              <TableCell>{String(item.value)}</TableCell>
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
    <Card className={cn(
      "h-full flex flex-col overflow-hidden rounded-none border-0 bg-background", 
      className
    )}>
      <CardHeader className="px-4 py-3 flex flex-row items-center justify-between space-y-0 bg-card">
        <CardTitle className="text-lg">Extracted Data</CardTitle>
        <div className="flex gap-2">
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
      <div className="px-4 pb-2 pt-0 flex items-center gap-2 bg-card">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search fields..."
            className="pl-8 h-9 bg-background"
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
      
      <CardContent className="p-0 flex-1 overflow-y-auto bg-background">
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