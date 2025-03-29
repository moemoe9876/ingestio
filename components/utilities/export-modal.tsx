"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Download, FileJson, FileSpreadsheet, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface ExportModalProps {
  documentName: string;
  documentId: string;
  trigger?: React.ReactNode;
}

export function ExportModal({
  documentName,
  documentId,
  trigger,
}: ExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<
    "json" | "csv" | "xlsx" | null
  >(null);
  const [exporting, setExporting] = useState(false);

  const handleExport = () => {
    if (!selectedFormat) return;

    setExporting(true);
    // Simulate export process
    setTimeout(() => {
      setExporting(false);
      // Here you would trigger the actual download
      console.log(`Exporting ${documentName} as ${selectedFormat}`);
    }, 1500);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Export Document Data</DialogTitle>
          <DialogDescription>
            Choose a format to export the extracted data
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Document</Label>
            <div className="flex items-center gap-2 rounded-md border p-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">{documentName}</span>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Export Format</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={selectedFormat === "json" ? "default" : "outline"}
                className="flex flex-col items-center justify-center gap-2 h-auto py-4 bg-background"
                onClick={() => setSelectedFormat("json")}
              >
                <FileJson className="h-8 w-8" />
                <span className="text-xs">JSON</span>
              </Button>
              <Button
                variant={selectedFormat === "csv" ? "default" : "outline"}
                className="flex flex-col items-center justify-center gap-2 h-auto py-4 bg-background"
                onClick={() => setSelectedFormat("csv")}
              >
                <FileText className="h-8 w-8" />
                <span className="text-xs">CSV</span>
              </Button>
              <Button
                variant={selectedFormat === "xlsx" ? "default" : "outline"}
                className="flex flex-col items-center justify-center gap-2 h-auto py-4 bg-background"
                onClick={() => setSelectedFormat("xlsx")}
              >
                <FileSpreadsheet className="h-8 w-8" />
                <span className="text-xs">Excel</span>
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Export Options</Label>
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-md border p-2">
                <span className="text-sm">Include metadata</span>
                <Badge variant="outline">Enabled</Badge>
              </div>
              <div className="flex items-center justify-between rounded-md border p-2">
                <span className="text-sm">Include confidence scores</span>
                <Badge variant="outline">Enabled</Badge>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setSelectedFormat(null)}
            disabled={exporting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={!selectedFormat || exporting}
          >
            {exporting ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" /> Download
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 