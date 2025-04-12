"use client";

import { deleteDocumentAction, fetchUserDocumentsAction } from "@/actions/db/documents";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SelectDocument } from "@/db/schema";
import { AlertCircle, Calendar, Eye, Loader2, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

// Helper to format dates
const formatDate = (date: Date | string | undefined): string => {
  if (!date) return "N/A";
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (e) {
    return "Invalid Date";
  }
};

const PAGE_SIZE = 10;

export default function HistoryPage() {
  const [documents, setDocuments] = useState<SelectDocument[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  const [isLoading, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Fetch documents function
  const fetchDocuments = useCallback(() => {
    setError(null);
    startTransition(async () => {
      const result = await fetchUserDocumentsAction({
        searchTerm,
        statusFilter,
        page: currentPage,
        pageSize: PAGE_SIZE,
        sortBy: "createdAt",
        sortOrder: "desc",
      });

      if (result.isSuccess) {
        setDocuments(result.data.documents);
        setTotalCount(result.data.totalCount);
      } else {
        setError(result.message || "Failed to fetch documents");
        setDocuments([]);
        setTotalCount(0);
        toast.error("Error fetching documents", { description: result.message });
      }
    });
  }, [searchTerm, statusFilter, currentPage, startTransition]);

  // Initial fetch and refetch on filter/page changes
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Handle search term change with debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setCurrentPage(1); // Reset to page 1 on search
      fetchDocuments();
    }, 500); // 500ms debounce

    return () => clearTimeout(handler);
  }, [searchTerm, fetchDocuments]);

  // Handle filter change
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1); // Reset to page 1 on filter change
    // useEffect will trigger refetch
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    // useEffect will trigger refetch
  };

  // Handle document deletion
  const handleDelete = (documentId: string) => {
    startDeleteTransition(async () => {
      const result = await deleteDocumentAction(documentId);
      if (result.isSuccess) {
        toast.success("Document deleted successfully");
        // Refetch documents for the current page
        fetchDocuments(); 
      } else {
        toast.error("Failed to delete document", { description: result.message });
      }
    });
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Document History</h1>
        <p className="text-muted-foreground">
          View and manage your previously processed documents
        </p>
      </div>
      
      <Card className="border-border">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Filter documents by status or search by name
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by filename..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={isLoading}
              />
            </div>
            
            <Select 
              value={statusFilter} 
              onValueChange={handleStatusFilterChange}
              disabled={isLoading}
            >
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="uploaded">Uploaded</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      <Card className="border-border">
        <CardHeader>
          <CardTitle>Document List</CardTitle>
          <CardDescription>
            {isLoading ? "Loading documents..." : `${totalCount} ${totalCount === 1 ? "document" : "documents"} found`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 flex items-center gap-2 text-destructive bg-destructive/10 p-3 rounded-md">
              <AlertCircle className="h-5 w-5" />
              <p>Error: {error}</p>
            </div>
          )}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Document</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      <div className="flex justify-center items-center">
                        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                        Loading...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : documents.length > 0 ? (
                  documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium truncate" title={doc.originalFilename}>{doc.originalFilename}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize whitespace-nowrap ${
                          doc.status === "completed" 
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : doc.status === "processing"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                            : doc.status === "failed"
                            ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" // uploaded or other
                        }`}>
                          {doc.status}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1.5 text-muted-foreground" />
                          {formatDate(doc.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" asChild title="Review">
                            <Link href={`/dashboard/review/${doc.id}`}>
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">View</span>
                            </Link>
                          </Button>
                          {/* <Button variant="ghost" size="icon" title="Download">
                            <Download className="h-4 w-4" />
                            <span className="sr-only">Download</span>
                          </Button> */} 
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-destructive hover:text-destructive hover:bg-destructive/10" 
                                title="Delete"
                                disabled={isDeleting}
                              >
                                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                <span className="sr-only">Delete</span>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the
                                  document "{doc.originalFilename}" and all associated extracted data.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDelete(doc.id)} 
                                  disabled={isDeleting}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No documents found matching your criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {totalCount > PAGE_SIZE && (
            <div className="mt-6">
              {/* Replace with actual Pagination component if available */}
              <div className="flex justify-center items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handlePageChange(currentPage - 1)} 
                  disabled={currentPage === 1 || isLoading}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handlePageChange(currentPage + 1)} 
                  disabled={currentPage === totalPages || isLoading}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 