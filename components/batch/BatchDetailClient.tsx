"use client";

import { exportDocumentsAction, fetchBatchDetailAction, fetchDocumentsForBatchAction } from "@/actions/batch/batchActions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/use-toast";
import { detectArrayFields, ExportOptions, ExportOptionsModal } from "@/components/utilities/ExportOptionsModal";
import type { SelectDocument } from "@/db/schema/documents-schema";
import type { SelectExtractionBatch } from "@/db/schema/extraction-batches-schema";
import { formatDate, formatRelativeTime } from "@/lib/utils/date-utils";
import { AlertCircle, ArrowLeft, ChevronDown, ChevronUp, Download, Eye, FileText, ImageIcon, Loader2, MoreHorizontal, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useMemo } from "react";
import useSWR from "swr";

// Define status colors and labels, can be centralized if used elsewhere
const batchStatusColors: Record<string, string> = {
  pending_upload: "bg-gray-100 text-gray-800 border-gray-300",
  queued: "bg-blue-100 text-blue-800 border-blue-300",
  processing: "bg-indigo-100 text-indigo-800 border-indigo-300",
  completed: "bg-green-100 text-green-800 border-green-300",
  partially_completed: "bg-yellow-100 text-yellow-800 border-yellow-300",
  failed: "bg-red-100 text-red-800 border-red-300",
};
const batchStatusLabels: Record<string, string> = {
  pending_upload: "Pending Upload",
  queued: "Queued",
  processing: "Processing",
  completed: "Completed",
  partially_completed: "Partially Completed",
  failed: "Failed",
};

const docStatusColors: Record<string, string> = {
  uploaded: "bg-gray-100 text-gray-800 border-gray-300",
  processing: "bg-indigo-100 text-indigo-800 border-indigo-300",
  completed: "bg-green-100 text-green-800 border-green-300",
  failed: "bg-red-100 text-red-800 border-red-300",
  confirmed: "bg-teal-100 text-teal-800 border-teal-300",
};
const docStatusLabels: Record<string, string> = {
  uploaded: "Uploaded",
  processing: "Processing",
  completed: "Processed",
  failed: "Failed",
  confirmed: "Confirmed",
};

interface BatchDetailClientProps {
  initialBatch: SelectExtractionBatch;
  initialDocuments: SelectDocument[];
  initialTotalDocuments: number;
  batchId: string;
}

const DOCS_PER_PAGE = 10;

export function BatchDetailClient({
  initialBatch: initialBatchFromProps,
  initialDocuments: initialDocumentsFromProps,
  initialTotalDocuments: initialTotalDocumentsFromProps,
  batchId,
}: BatchDetailClientProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [docPage, setDocPage] = React.useState(1);
  const [docSortBy, setDocSortBy] = React.useState<keyof SelectDocument>("createdAt");
  const [docSortOrder, setDocSortOrder] = React.useState<"asc" | "desc">("desc");
  const [docStatusFilter, setDocStatusFilter] = React.useState("all");
  const [rowSelection, setRowSelection] = React.useState<{ [key: string]: boolean }>({});

  const [showExportModal, setShowExportModal] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  const [documentIdsToExport, setDocumentIdsToExport] = React.useState<string[]>([]);
  const [availableArrayFieldsForExport, setAvailableArrayFieldsForExport] = React.useState<string[]>([]);
  
  const [showDeleteConfirmation, setShowDeleteConfirmation] = React.useState(false);
  const [documentsToDelete, setDocumentsToDelete] = React.useState<string[]>([]);

  const batchCacheKey = `batch-detail-${batchId}`;
  const {
    data: batchDataSWR,
    error: batchErrorSWR,
    isLoading: isLoadingBatchSWR,
  } = useSWR(
    batchCacheKey,
    () => fetchBatchDetailAction(batchId),
    {
      fallbackData: { isSuccess: true, message: "Initial batch data from props", data: { batch: initialBatchFromProps, documents: initialDocumentsFromProps, totalDocuments: initialTotalDocumentsFromProps } },
      refreshInterval: initialBatchFromProps.status === "processing" || initialBatchFromProps.status === "queued" ? 5000 : 0,
    }
  );

  const documentsCacheKey = `batch-documents-${batchId}-${docPage}-${docSortBy}-${docSortOrder}-${docStatusFilter}`;
  const { 
    data: documentsDataSWR, 
    error: documentsErrorSWR, 
    isLoading: isLoadingDocumentsSWR 
  } = useSWR(
    documentsCacheKey,
    () => fetchDocumentsForBatchAction(batchId, {
      page: docPage,
      limit: DOCS_PER_PAGE,
      sortBy: docSortBy,
      sortOrder: docSortOrder,
      statusFilter: docStatusFilter === "all" ? undefined : docStatusFilter,
    }),
    {
      fallbackData: { isSuccess: true, message: "Initial documents from props", data: { documents: initialDocumentsFromProps, totalCount: initialTotalDocumentsFromProps } },
      revalidateOnFocus: true,
      keepPreviousData: true,
    }
  );

  const batch = batchDataSWR?.data?.batch || initialBatchFromProps;
  const documents = documentsDataSWR?.data?.documents || initialDocumentsFromProps;
  const totalDocuments = documentsDataSWR?.data?.totalCount ?? initialTotalDocumentsFromProps;
  const totalDocPages = Math.ceil(totalDocuments / DOCS_PER_PAGE);

  const handleDocSort = (column: keyof SelectDocument) => {
    const newOrder = docSortBy === column && docSortOrder === "asc" ? "desc" : "asc";
    setDocSortBy(column);
    setDocSortOrder(newOrder);
    setDocPage(1);
  };

  const handleDocStatusFilter = (status: string) => {
    setDocStatusFilter(status);
    setDocPage(1);
  };

  const handleDocPageChange = (newPage: number) => {
    setDocPage(newPage);
  };
  
  const getBatchProgress = () => {
    if (!batch) return 0;
    const total = batch.documentCount || 0;
    const processed = (batch.completedCount || 0) + (batch.failedCount || 0);
    return total > 0 ? (processed / total) * 100 : 0;
  };

  const selectedDocumentIds = React.useMemo(() => {
    return Object.keys(rowSelection).filter(key => rowSelection[key]);
  }, [rowSelection]);

  const handleSelectAllDocuments = (checked: boolean) => {
    const newSelection: { [key: string]: boolean } = {};
    if (checked) {
      documents.forEach(doc => newSelection[doc.id] = true);
    }
    setRowSelection(newSelection);
  };

  const handleSelectDocument = (documentId: string, checked: boolean) => {
    setRowSelection(prev => ({ ...prev, [documentId]: checked }));
  };

  const isAllDocumentsOnPageSelected = useMemo(() => {
    if(documents.length === 0) return false;
    return documents.every(doc => rowSelection[doc.id]);
  }, [documents, rowSelection]);

  const handleOpenExportModal = (docIds: string[]) => {
    if (docIds.length === 0) return;
    setDocumentIdsToExport(docIds);
    const firstDocForFields = documents.find(d => d.id === docIds[0]);
    let dataToInspect = firstDocForFields?.extractedData as any;
    if (typeof dataToInspect === 'string') {
      try { dataToInspect = JSON.parse(dataToInspect); } catch (e) { dataToInspect = {}; }
    }
    const dataObject = dataToInspect?.data || dataToInspect || {};
    setAvailableArrayFieldsForExport(detectArrayFields(dataObject));
    setShowExportModal(true);
  };

  const handleExportSubmit = async (options: ExportOptions) => {
    if (documentIdsToExport.length === 0) return;
    setIsExporting(true);
    setShowExportModal(false);
    try {
      const result = await exportDocumentsAction(documentIdsToExport, options);
      if (result.isSuccess && result.data?.downloadUrl) {
        toast({
          title: "Export Successful",
          description: `${documentIdsToExport.length} document(s) are ready for download.`,
          action: <Button variant="outline" size="sm" onClick={() => window.open(result.data?.downloadUrl, '_blank')}>Download</Button>,
        });
        setRowSelection({});
      } else {
        throw new Error(result.message || "Failed to export documents.");
      }
    } catch (error) {
      toast({ title: "Export Failed", description: error instanceof Error ? error.message : "An unknown error occurred.", variant: "destructive" });
    } finally {
      setIsExporting(false);
      setDocumentIdsToExport([]);
    }
  };
  
  const handleDeleteSelectedConfirmation = () => {
    setDocumentsToDelete(selectedDocumentIds);
    setShowDeleteConfirmation(true);
  };

  const handleDeleteConfirmed = () => {
    toast({ title: "Deletion Simulated", description: `Simulated deletion of ${documentsToDelete.length} documents. (Not implemented)`});
    setShowDeleteConfirmation(false);
    setRowSelection({}); 
  };

  if (isLoadingBatchSWR && !batchDataSWR?.data?.batch && !initialBatchFromProps) {
    return <BatchDetailSkeleton />;
  }

  if (batchErrorSWR || (batchDataSWR && !batchDataSWR.isSuccess && !initialBatchFromProps)) {
    return (
      <Card className="m-4">
        <CardHeader>
          <CardTitle className="flex items-center"><AlertCircle className="mr-2 h-5 w-5 text-destructive"/>Error Loading Batch</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">{batchErrorSWR?.message?.toString() || batchDataSWR?.message || "Failed to load batch details. Please try again or contact support."}</p>
          <Button onClick={() => router.push('/dashboard/batches')} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Batches
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  if (!batch) {
      return (
        <Card className="m-4">
            <CardHeader><CardTitle>Batch Not Found</CardTitle></CardHeader>
            <CardContent><p>The requested batch (ID: {batchId}) could not be found or you do not have permission to view it.</p>
            <Button onClick={() => router.push('/dashboard/batches')} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Batches
          </Button>
            </CardContent>
        </Card>
      )
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={() => router.push('/dashboard/batches')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Batches
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
                <CardTitle className="text-2xl mb-1">{batch.name || `Batch ${batch.id.substring(0,8)}...`}</CardTitle>
                <Badge className={`${batchStatusColors[batch.status as keyof typeof batchStatusColors] || "bg-gray-200 text-gray-800"} border`}>
                    {batchStatusLabels[batch.status as keyof typeof batchStatusLabels] || batch.status}
                </Badge>
            </div>
          </div>
          <CardDescription className="mt-2">
            Submitted: {formatDate(batch.createdAt, "PPP p")} 
            {batch.completedAt && ` | Completed: ${formatDate(batch.completedAt, "PPP p")}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm">
            <div><span className="font-semibold">Total Documents:</span> {batch.documentCount}</div>
            <div><span className="font-semibold">Total Pages:</span> {batch.totalPages}</div>
            <div><span className="font-semibold">Prompt Strategy:</span> {batch.promptStrategy?.replace("_"," ") || "N/A"}</div>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-full">
                  <Progress value={getBatchProgress()} className="h-3" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Completed: {batch.completedCount || 0}</p>
                <p>Failed: {batch.failedCount || 0}</p>
                <p>Pending: {(batch.documentCount || 0) - (batch.completedCount || 0) - (batch.failedCount || 0)}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardContent>
      </Card>

      {selectedDocumentIds.length > 0 && (
        <Card className="sticky top-16 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-md">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{selectedDocumentIds.length} document(s) selected</p>
                <div className="space-x-2">
                    <Button variant="outline" size="sm" onClick={() => console.log('Redo selected', selectedDocumentIds)} disabled>
                        <RefreshCw className="mr-2 h-4 w-4"/> Redo
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleOpenExportModal(selectedDocumentIds)} disabled={isExporting}>
                        {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4"/>}
                         Export
                    </Button>
                    <Button variant="destructive" size="sm" onClick={handleDeleteSelectedConfirmation} disabled>
                        <Trash2 className="mr-2 h-4 w-4"/> Delete
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setRowSelection({})}>Clear</Button>
                </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Documents ({totalDocuments})</CardTitle>
          <div className="flex items-center space-x-2 pt-2">
            {["all", "uploaded", "processing", "completed", "failed", "confirmed"].map(s => (
                <Button key={s} variant={docStatusFilter === s ? "default" : "outline"} size="sm" onClick={() => handleDocStatusFilter(s)}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </Button>
              ))}
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingDocumentsSWR && documents.length === 0 && !documentsDataSWR?.data?.documents ? (
            <DocumentTableSkeleton />
          ) : documentsErrorSWR ? (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error Loading Documents</AlertTitle>
              <AlertDescription>{documentsErrorSWR.message?.toString() || "Could not load documents for this batch."}</AlertDescription>
            </Alert>
          ): documents.length === 0 ? (
            <div className="text-center py-10">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No documents found</h3>
              <p className="mt-1 text-sm text-gray-500">No documents match the current filter.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox 
                        checked={isAllDocumentsOnPageSelected}
                        onCheckedChange={(checked) => handleSelectAllDocuments(Boolean(checked))}
                        aria-label="Select all documents on page"
                    />
                  </TableHead>
                  <TableHead onClick={() => handleDocSort("originalFilename")} className="cursor-pointer hover:bg-muted/50 transition-colors">
                    File Name {docSortBy === "originalFilename" && (docSortOrder === "asc" ? <ChevronUp className="inline h-4 w-4" /> : <ChevronDown className="inline h-4 w-4" />)}
                  </TableHead>
                  <TableHead onClick={() => handleDocSort("status")} className="cursor-pointer hover:bg-muted/50 transition-colors">
                    Status {docSortBy === "status" && (docSortOrder === "asc" ? <ChevronUp className="inline h-4 w-4" /> : <ChevronDown className="inline h-4 w-4" />)}
                  </TableHead>
                  <TableHead>Extracted Name</TableHead> 
                  <TableHead>Line Items</TableHead> 
                  <TableHead onClick={() => handleDocSort("updatedAt")} className="cursor-pointer hover:bg-muted/50 transition-colors">
                    Last Update {docSortBy === "updatedAt" && (docSortOrder === "asc" ? <ChevronUp className="inline h-4 w-4" /> : <ChevronDown className="inline h-4 w-4" />)}
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => {
                  const docExtractedData = doc.extractedData as any;
                  return (
                    <TableRow key={doc.id} data-state={rowSelection[doc.id] && "selected"}>
                      <TableCell>
                           <Checkbox 
                              checked={rowSelection[doc.id] || false}
                              onCheckedChange={(checked) => handleSelectDocument(doc.id, Boolean(checked))}
                              aria-label={`Select document ${doc.originalFilename}`}
                          />
                      </TableCell>
                      <TableCell className="font-medium">
                        <Link href={`/dashboard/review/${doc.id}?batchId=${batchId}`} className="hover:underline flex items-center">
                          {doc.mimeType?.startsWith("image/") ? <ImageIcon className="mr-2 h-4 w-4 text-gray-500" /> : <FileText className="mr-2 h-4 w-4 text-gray-500" />}
                          {doc.originalFilename}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${docStatusColors[doc.status as keyof typeof docStatusColors] || "bg-gray-200 text-gray-800"} border`}>
                          {docStatusLabels[doc.status as keyof typeof docStatusLabels] || doc.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                          {docExtractedData?.name?.value || docExtractedData?.invoice_id?.value || docExtractedData?.document_name?.value || "N/A"}
                      </TableCell>
                       <TableCell>
                          {docExtractedData?.line_items?.value && Array.isArray(docExtractedData.line_items.value) ? 
                           `${docExtractedData.line_items.value.length} items` : 
                           (docExtractedData?.items?.value && Array.isArray(docExtractedData.items.value) ? 
                           `${docExtractedData.items.value.length} items` : "N/A")}
                      </TableCell>
                      <TableCell>{formatRelativeTime(doc.updatedAt)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/dashboard/review/${doc.id}?batchId=${batchId}&from=batchDetail`)}>
                              <Eye className="mr-2 h-4 w-4" /> Review / Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenExportModal([doc.id])} disabled={isExporting}>
                              <Download className="mr-2 h-4 w-4" /> Export File
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => console.log("Redo doc", doc.id)} disabled>
                              <RefreshCw className="mr-2 h-4 w-4" /> Redo Extraction
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive focus:bg-destructive/10"
                              onClick={() => {setDocumentsToDelete([doc.id]); setShowDeleteConfirmation(true);}} disabled>
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          {totalDocPages > 1 && (
            <div className="flex items-center justify-end space-x-2 py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDocPageChange(docPage - 1)}
                disabled={docPage <= 1 || isLoadingDocumentsSWR}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">Page {docPage} of {totalDocPages}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDocPageChange(docPage + 1)}
                disabled={docPage >= totalDocPages || isLoadingDocumentsSWR}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete {documentsToDelete.length} document(s) and their associated data. Redo and Delete are not yet implemented.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirmed} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ExportOptionsModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        documentIds={documentIdsToExport}
        availableArrayFields={availableArrayFieldsForExport}
        onSubmit={handleExportSubmit}
        isExporting={isExporting}
      />

    </div>
  );
}

function BatchDetailSkeleton() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <Skeleton className="h-10 w-40 mb-4" /> 
      <Card>
        <CardHeader>
            <Skeleton className="h-8 w-3/5 mb-2" />
            <Skeleton className="h-5 w-2/5" />
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
            </div>
            <Skeleton className="h-3 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
            <Skeleton className="h-7 w-1/4 mb-2"/>
            <div className="flex items-center space-x-2">
                {[...Array(5)].map((_,i) => <Skeleton key={i} className="h-9 w-24" />)}
            </div>
        </CardHeader>
        <CardContent>
          <DocumentTableSkeleton />
        </CardContent>
      </Card>
    </div>
  )
}

function DocumentTableSkeleton() {
    return (
        <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"><Skeleton className="h-5 w-full" /></TableHead>
                {[...Array(5)].map((_, i) => <TableHead key={i}><Skeleton className="h-5 w-full" /></TableHead>)} 
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(DOCS_PER_PAGE)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                  {[...Array(5)].map((_,j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)} 
                </TableRow>
              ))}
            </TableBody>
        </Table>
    )
} 