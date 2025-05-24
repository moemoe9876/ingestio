"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog, DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { Download, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

export interface ExportOptions {
  fileFormat: "json" | "csv" | "excel";
  exportType: "normal" | "multi_row";
  arrayFieldToExpand: string | null; // Only if exportType is 'multi_row'
  // includeMetadata: boolean; // Example of another option, can be added if needed
}

interface ExportOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentIds: string[]; // To know which documents are being exported
  availableArrayFields: string[]; // e.g., ['line_items', 'addresses'] for multi-row selection
  onSubmit: (options: ExportOptions) => void;
  isExporting: boolean;
}

export function ExportOptionsModal({
  isOpen,
  onClose,
  documentIds,
  availableArrayFields,
  onSubmit,
  isExporting,
}: ExportOptionsModalProps) {
  const [fileFormat, setFileFormat] = useState<"json" | "csv" | "excel">("json");
  const [exportType, setExportType] = useState<"normal" | "multi_row">("normal");
  const [selectedArrayField, setSelectedArrayField] = useState<string | null>(null);

  const handleSubmit = () => {
    if (exportType === "multi_row" && !selectedArrayField) {
      // Basic validation: if multi-row, a field must be selected
      toast({
        title: "Validation Error",
        description: "Please select a field to expand for multi-row export.",
        variant: "destructive",
      });
      return;
    }
    onSubmit({
      fileFormat,
      exportType,
      arrayFieldToExpand: exportType === "multi_row" ? selectedArrayField : null,
    });
  };

  // Reset array field if export type changes from multi-row
  useEffect(() => {
    if (exportType !== "multi_row") {
      setSelectedArrayField(null);
    }
  }, [exportType]);

  const canSubmit = () => {
    if (isExporting) return false;
    if (fileFormat === "json") return true; // JSON doesn't need multi-row specifics from this modal yet
    if (exportType === "multi_row") return !!selectedArrayField;
    return true; // For normal CSV/Excel
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Export Options</DialogTitle>
          <DialogDescription>
            Select the format and options for exporting {documentIds.length} document(s).
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="file-format">File Format</Label>
            <Select value={fileFormat} onValueChange={(value) => setFileFormat(value as any)}>
              <SelectTrigger id="file-format">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">JSON (.json)</SelectItem>
                <SelectItem value="csv">CSV (.csv)</SelectItem>
                <SelectItem value="excel">Excel (.xlsx)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {fileFormat !== "json" && (
            <>
              <div className="grid gap-2">
                <Label>Export Type</Label>
                <RadioGroup value={exportType} onValueChange={(value) => setExportType(value as any)} className="flex space-x-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="normal" id="normal" />
                    <Label htmlFor="normal" className="font-normal">Normal (One row per document)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="multi_row" id="multi_row" disabled={availableArrayFields.length === 0} />
                    <Label htmlFor="multi_row" className={`font-normal ${availableArrayFields.length === 0 ? 'text-muted-foreground' : ''}`}>
                        Multi-row (Expand an array field)
                        {availableArrayFields.length === 0 && " (No array fields detected)"}
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {exportType === "multi_row" && availableArrayFields.length > 0 && (
                <div className="grid gap-2 pl-6 border-l-2 border-muted ml-2">
                  <Label htmlFor="array-field">Field to Expand</Label>
                  <Select value={selectedArrayField || ""} onValueChange={(value) => setSelectedArrayField(value)}>
                    <SelectTrigger id="array-field">
                      <SelectValue placeholder="Select array field" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableArrayFields.map((field) => (
                        <SelectItem key={field} value={field}>{field.replace(/_/g, ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                   <p className="text-xs text-muted-foreground">
                    Each item in the selected array field will create a new row. Other document data will be duplicated for each of these rows.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={!canSubmit() || isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export File(s)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper to find potential array fields from a sample document's extracted data
// This is a basic example and might need to be more robust
export function detectArrayFields(extractedDataSample: Record<string, any> | null): string[] {
  if (!extractedDataSample) return [];
  const arrayFields: string[] = [];
  for (const key in extractedDataSample) {
    if (Array.isArray(extractedDataSample[key])) {
      arrayFields.push(key);
    } else if (typeof extractedDataSample[key] === 'object' && extractedDataSample[key] !== null && Array.isArray(extractedDataSample[key].value)) {
      // Handle cases where value is nested like { value: [], ...otherProps }
      arrayFields.push(key);
    }
  }
  return arrayFields;
} 