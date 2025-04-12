// app/(dashboard)/dashboard/history/page.tsx

"use client";

import { deleteDocumentAction, fetchDocumentForReviewAction, fetchUserDocumentsAction } from "@/actions/db/documents"; // Added fetchDocumentForReviewAction
import AnimatedGradientText from "@/components/magicui/animated-gradient-text"; // Assuming path is correct
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"; // Import Carousel
import { Input } from "@/components/ui/input";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"; // Import Sheet
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import DocumentViewer from "@/components/utilities/DocumentViewer"; // Import DocumentViewer
import { SelectDocument } from "@/db/schema";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ArrowDown, ArrowUp, Calendar, CheckCircle2, Clock, Eye, FileText, FilterX, Inbox, Loader2, Search, Trash2, UploadCloud, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

// --- Constants ---
const PAGE_SIZE = 10; // Slightly increased page size
const RECENT_DOC_COUNT = 4;
const DEBOUNCE_DELAY = 500;

// --- Types ---
type SortField = "originalFilename" | "status" | "createdAt" | "updatedAt";
type SortOrder = "asc" | "desc";
type DocumentDetail = {
   document: SelectDocument;
   signedUrl: string;
   extractedData: any | null;
};

// --- Helper Functions ---
const formatDateSmart = (date: Date | string | undefined): string => {
  if (!date) return "N/A";
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    if (now.getTime() - d.getTime() < 7 * 24 * 60 * 60 * 1000) {
      return formatDistanceToNow(d, { addSuffix: true });
    }
    return format(d, "MMM d, yyyy 'at' h:mm a"); // More precise default format
  } catch (e) {
    return "Invalid Date";
  }
};

const getStatusVariant = (status: SelectDocument["status"]): "default" | "secondary" | "destructive" | "outline" => {
   switch (status) {
      case "completed": return "default";
      case "processing": return "secondary";
      case "failed": return "destructive";
      case "uploaded": return "outline";
      default: return "outline";
   }
};

const getStatusIcon = (status: SelectDocument["status"]): React.ReactNode => {
   const className = "h-3 w-3";
   switch (status) {
      case "completed": return <CheckCircle2 className={className} />;
      case "processing": return <Loader2 className={cn(className, "animate-spin")} />;
      case "failed": return <AlertCircle className={className} />;
      case "uploaded": return <Clock className={className} />;
      default: return null;
   }
};

const getStatusColorClasses = (status: SelectDocument["status"]): string => {
   switch (status) {
      case "completed": return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-200/80 dark:border-green-700/50";
      case "processing": return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200/80 dark:border-blue-700/50";
      case "failed": return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200/80 dark:border-red-700/50";
      case "uploaded": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 border-yellow-200/80 dark:border-yellow-700/50";
      default: return "bg-muted text-muted-foreground border-border/80";
   }
};

// --- Custom Hook ---
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// --- HistoryPage Component ---
export default function HistoryPage() {
  // State
  const [documents, setDocuments] = useState<SelectDocument[]>([]);
  const [recentDocuments, setRecentDocuments] = useState<SelectDocument[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [error, setError] = useState<string | null>(null);
  const [selectedDocumentDetail, setSelectedDocumentDetail] = useState<DocumentDetail | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isDetailLoading, startDetailLoadingTransition] = useTransition();


  // Transitions
  const [isLoading, startLoadingTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  // Debounced search term
  const debouncedSearchTerm = useDebounce(searchTerm, DEBOUNCE_DELAY);

  // Fetching Logic
  const fetchDocuments = useCallback((isInitialLoad = false) => {
    setError(null);
    startLoadingTransition(async () => {
      try {
        // For the main table view
        const mainParams = {
           searchTerm: debouncedSearchTerm,
           statusFilter,
           page: currentPage,
           pageSize: PAGE_SIZE,
           sortBy,
           sortOrder,
        };
        
        // Force recently processed to ALWAYS show the most recent documents
        // completely independent of main table sorting
        const recentParams = { 
          searchTerm: "",  // No search filtering for recent docs
          statusFilter: "all", // No status filtering for recent docs
          sortBy: "createdAt",
          sortOrder: "desc" as const,
          page: 1,  // Always first page
          pageSize: RECENT_DOC_COUNT 
        };

        // Fetch main documents and recent documents in parallel
        const mainResultPromise = fetchUserDocumentsAction(mainParams);
        const shouldFetchRecent = isInitialLoad || (debouncedSearchTerm === "" && statusFilter === "all");
        const recentResultPromise = shouldFetchRecent ? fetchUserDocumentsAction(recentParams) : Promise.resolve(null);

        const [mainResult, recentResult] = await Promise.all([mainResultPromise, recentResultPromise]);

        if (mainResult.isSuccess) {
          setDocuments(mainResult.data.documents);
          setTotalCount(mainResult.data.totalCount);
        } else {
          throw new Error(mainResult.message || "Failed to fetch documents");
        }

        if (recentResult?.isSuccess) {
          // Make sure recent documents are actually sorted by date (newest first)
          const sortedRecentDocs = [...recentResult.data.documents].sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setRecentDocuments(sortedRecentDocs);
        } else if (shouldFetchRecent) {
           console.warn("Could not fetch recent documents:", recentResult?.message);
           setRecentDocuments([]);
        } else if (!shouldFetchRecent) {
           setRecentDocuments([]);
        }

      } catch (err: any) {
        setError(err.message || "An unexpected error occurred");
        setDocuments([]); setTotalCount(0); setRecentDocuments([]);
        toast.error("Error loading history", { description: err.message });
      }
    });
  }, [debouncedSearchTerm, statusFilter, currentPage, sortBy, sortOrder, startLoadingTransition]);

  // Effects
  useEffect(() => {
    const isInitial = currentPage === 1 && debouncedSearchTerm === "" && statusFilter === "all";
    fetchDocuments(isInitial);
  }, [fetchDocuments, currentPage, debouncedSearchTerm, statusFilter, sortBy, sortOrder]);

  // Handlers
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

   const handleSortChange = (field: SortField) => {
      if (sortBy === field) {
         setSortOrder(prev => (prev === "asc" ? "desc" : "asc"));
      } else {
         if (field === "createdAt" || field === "updatedAt") {
           setSortBy(field);
           setSortOrder("desc");
         } else {
           setSortBy(field);
           setSortOrder("asc");
         }
      }
      setCurrentPage(1);
   };

   const handlePageChange = (newPage: number) => {
      if (newPage >= 1 && newPage <= totalPages) {
         setCurrentPage(newPage);
      }
   };

   const handleClearFilters = (filterToClear: 'search' | 'status' | 'all' = 'all', event?: React.MouseEvent) => {
      if (event) {
         event.preventDefault();
      }
      if (filterToClear === 'search' || filterToClear === 'all') setSearchTerm("");
      if (filterToClear === 'status' || filterToClear === 'all') setStatusFilter("all");
      if(filterToClear === 'all') {
         setSortBy("createdAt");
         setSortOrder("desc");
      }
      setCurrentPage(1);
   };


   const handleDelete = (documentId: string, documentName: string) => {
      startDeleteTransition(async () => {
         const result = await deleteDocumentAction(documentId);
         if (result.isSuccess) {
            toast.success(`Document "${documentName}" deleted`);
            const newTotalCount = totalCount - 1;
            if (documents.length === 1 && currentPage > 1) {
               setCurrentPage(currentPage - 1);
            } else {
               fetchDocuments();
            }
         } else {
            toast.error("Delete failed", { description: result.message });
         }
      });
   };

   // Handle opening the detail sheet
   const handleViewDetails = (docId: string) => {
      startDetailLoadingTransition(async () => {
         setSelectedDocumentDetail(null);
         setIsSheetOpen(true);
         const result = await fetchDocumentForReviewAction(docId);
         if (result.isSuccess) {
            setSelectedDocumentDetail(result.data);
         } else {
            toast.error("Error loading details", { description: result.message });
            setIsSheetOpen(false);
         }
      });
   };

  // Memoized Values
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const showClearFilters = searchTerm !== "" || statusFilter !== "all";

  const skeletonRows = useMemo(() => (
    Array.from({ length: PAGE_SIZE }).map((_, index) => (
      <TableRow key={`skeleton-${index}`} className="animate-pulse">
        <TableCell className="py-2.5 px-4"><Skeleton className="h-5 w-3/4" /></TableCell>
        <TableCell className="py-2.5 px-4"><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
        <TableCell className="py-2.5 px-4"><Skeleton className="h-5 w-28" /></TableCell>
        <TableCell className="py-2.5 px-4 text-right"><Skeleton className="h-7 w-16 inline-block" /></TableCell>
      </TableRow>
    ))
  ), []);

  const renderPagination = () => {
      if (totalPages <= 1) return null;
       const pages = [];
       const delta = 1;
       const left = currentPage - delta;
       const right = currentPage + delta;
       let range = [];
       let rangeWithDots: (number | string)[] = [];

       for (let i = 1; i <= totalPages; i++) {
          if (i === 1 || i === totalPages || (i >= left && i <= right)) {
          range.push(i);
          }
       }

       let l: number | null = null;
       for (let i of range) {
          if (l) {
             if (i - l === 2) {
               rangeWithDots.push(l + 1);
             } else if (i - l !== 1) {
               rangeWithDots.push('...');
             }
          }
          rangeWithDots.push(i);
          l = i;
       }

       return (
          <Pagination>
             <PaginationContent>
               <PaginationItem>
                  <PaginationPrevious
                     href="#"
                     onClick={(e) => { e.preventDefault(); handlePageChange(currentPage - 1); }}
                     aria-disabled={currentPage === 1 || isLoading}
                     className={cn(currentPage === 1 || isLoading ? "pointer-events-none opacity-50" : "", "h-8 px-2")}
                     tabIndex={currentPage === 1 || isLoading ? -1 : undefined}
                  />
               </PaginationItem>
               {rangeWithDots.map((item, index) => (
                  <PaginationItem key={index}>
                     {item === '...' ? (
                     <PaginationEllipsis className="h-8 w-8"/>
                     ) : (
                     <PaginationLink
                        href="#"
                        onClick={(e) => { e.preventDefault(); handlePageChange(item as number); }}
                        isActive={currentPage === item}
                        aria-current={currentPage === item ? "page" : undefined}
                        className="h-8 w-8"
                     >
                        {item}
                     </PaginationLink>
                     )}
                  </PaginationItem>
               ))}
               <PaginationItem>
                  <PaginationNext
                     href="#"
                     onClick={(e) => { e.preventDefault(); handlePageChange(currentPage + 1); }}
                     aria-disabled={currentPage === totalPages || isLoading}
                     className={cn(currentPage === totalPages || isLoading ? "pointer-events-none opacity-50" : "", "h-8 px-2")}
                     tabIndex={currentPage === totalPages || isLoading ? -1 : undefined}
                  />
               </PaginationItem>
             </PaginationContent>
          </Pagination>
       );
  };

  // --- Render ---
  return (
     <TooltipProvider>
       {/* Optional: Subtle background pattern */}
       {/* <DotPattern className={cn("[mask-image:radial-gradient(ellipse_at_center,white,transparent_60%)] fixed inset-0 -z-10",)} /> */}
       <motion.div
         className="flex flex-col gap-6 md:gap-8 p-4 md:p-6 lg:p-8 relative"
         initial={{ opacity: 0, y: 15 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ duration: 0.6, ease: "easeOut" }}
       >
         {/* --- Header --- */}
         <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
           <div>
             <AnimatedGradientText className="mb-1 inline-block px-3 py-1">
               <h1 className="text-2xl md:text-3xl font-bold tracking-tight !text-foreground">Processing History</h1>
             </AnimatedGradientText>
             <p className="text-muted-foreground max-w-xl text-sm md:text-base px-3">
               Track, review, and manage all your document processing tasks.
             </p>
           </div>
           <Button variant="default" asChild className="shadow-sm hover:shadow-md transition-shadow shrink-0 self-start sm:self-center">
             <Link href="/dashboard/upload">
               <UploadCloud className="mr-2 h-4 w-4" /> Upload New
             </Link>
           </Button>
         </div>

         {/* --- Recent Documents Carousel --- */}
         {recentDocuments.length > 0 && !isLoading && (
           <motion.div
             initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.1, duration: 0.5 }}
             className="space-y-3"
           >
             <h2 className="text-lg font-semibold text-foreground/90">Recently Processed</h2>
             <Carousel opts={{ align: "start", loop: false, skipSnaps: false }} className="w-full">
               <CarouselContent className="-ml-4">
                 {recentDocuments.map((doc, index) => (
                   <CarouselItem key={`recent-${doc.id}`} className="basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4 pl-4">
                     <motion.div
                       initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                       transition={{ delay: index * 0.05, duration: 0.3 }}
                       whileHover={{ y: -2, transition: { duration: 0.2 } }}
                       className="h-full"
                     >
                       <Card className="hover:shadow-md hover:border-primary/30 transition-all duration-200 ease-out group h-full flex flex-col border-border/70 bg-card/80 backdrop-blur-sm">
                         <CardHeader className="p-3 pb-1">
                           <CardTitle className="text-sm font-medium flex items-center gap-2">
                             <FileText className="h-4 w-4 text-muted-foreground shrink-0"/>
                             <Tooltip delayDuration={200}>
                               <TooltipTrigger asChild><span className="truncate">{doc.originalFilename}</span></TooltipTrigger>
                               <TooltipContent side="top" align="start"><p>{doc.originalFilename}</p></TooltipContent>
                             </Tooltip>
                           </CardTitle>
                         </CardHeader>
                         <CardContent className="p-3 pt-1 flex justify-between items-center text-xs">
                           <Badge
                             variant={getStatusVariant(doc.status)}
                             className={cn("capitalize flex items-center gap-1 px-1.5 py-0.5 font-normal text-[11px]", getStatusColorClasses(doc.status))}
                           >
                             {getStatusIcon(doc.status)} {doc.status}
                           </Badge>
                           <Tooltip delayDuration={200}>
                             <TooltipTrigger asChild><p className="text-muted-foreground cursor-default">{formatDateSmart(doc.createdAt)}</p></TooltipTrigger>
                             <TooltipContent side="top"><p>{format(new Date(doc.createdAt), "PPP p")}</p></TooltipContent>
                           </Tooltip>
                         </CardContent>
                         <CardFooter className="p-3 pt-0 mt-auto">
                           <Button variant="secondary" size="sm" className="w-full h-8 text-xs" onClick={() => handleViewDetails(doc.id)}>
                             <Eye className="mr-1.5 h-3.5 w-3.5"/> View Details
                           </Button>
                         </CardFooter>
                       </Card>
                     </motion.div>
                   </CarouselItem>
                 ))}
               </CarouselContent>
               {recentDocuments.length > RECENT_DOC_COUNT && (
                  <>
                     <CarouselPrevious className="absolute left-[-12px] top-1/2 -translate-y-1/2 z-10" />
                     <CarouselNext className="absolute right-[-12px] top-1/2 -translate-y-1/2 z-10" />
                  </>
               )}
             </Carousel>
           </motion.div>
         )}

         {/* --- All Documents Section --- */}
         <Card className="border border-border/70 overflow-hidden shadow-sm relative bg-card/80 backdrop-blur-sm">
           {/* Optional: Animated Border */}
           {/* <BorderBeam size={250} duration={12} delay={9} /> */}
           <CardHeader className="p-4 border-b border-border/70 bg-muted/20 dark:bg-muted/5">
             <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
               <div className="flex-1">
                 <CardTitle className="text-base md:text-lg">All Documents</CardTitle>
                 <CardDescription className="text-xs md:text-sm mt-0.5">
                   {isLoading ? "Loading..." : `${totalCount} document${totalCount !== 1 ? 's' : ''} found`}
                 </CardDescription>
               </div>
               <div className="flex flex-col sm:flex-row gap-2 md:gap-2.5 shrink-0">
                 <div className="relative flex-grow sm:flex-grow-0">
                   <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                   <Input
                     type="search" placeholder="Search..."
                     className="pl-8 h-9 w-full sm:w-36 md:w-48 text-xs md:text-sm"
                     value={searchTerm} onChange={handleSearchChange} disabled={isLoading}
                   />
                 </div>
                 <Select value={statusFilter} onValueChange={handleStatusFilterChange} disabled={isLoading}>
                   <SelectTrigger className="w-full sm:w-[120px] h-9 text-xs md:text-sm">
                     <SelectValue placeholder="Status" />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="all">All Statuses</SelectItem>
                     <SelectItem value="completed">Completed</SelectItem>
                     <SelectItem value="processing">Processing</SelectItem>
                     <SelectItem value="uploaded">Uploaded</SelectItem>
                     <SelectItem value="failed">Failed</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
             </div>
              {/* Active Filters */}
             {showClearFilters && (
                <div className="mt-3 flex flex-wrap gap-2 items-center">
                   <span className="text-xs text-muted-foreground mr-1">Active filters:</span>
                   {searchTerm && (
                       <Badge variant="secondary" className="px-2 py-0.5 text-xs rounded">
                           Search: "{searchTerm}"
                           <button 
                               onClick={(e) => handleClearFilters('search', e)} 
                               className="ml-1 opacity-70 hover:opacity-100" 
                               aria-label="Clear search filter">
                               <X className="h-3 w-3"/>
                           </button>
                       </Badge>
                   )}
                   {statusFilter !== 'all' && (
                       <Badge variant="secondary" className="px-2 py-0.5 text-xs rounded capitalize">
                           Status: {statusFilter}
                           <button 
                               onClick={(e) => handleClearFilters('status', e)} 
                               className="ml-1 opacity-70 hover:opacity-100"
                               aria-label="Clear status filter">
                               <X className="h-3 w-3"/>
                           </button>
                       </Badge>
                   )}
                   <Button variant="ghost" size="sm" onClick={(e) => handleClearFilters('all', e)} className="h-auto px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground">
                      <FilterX className="h-3 w-3 mr-1"/> Clear All
                   </Button>
                </div>
             )}
           </CardHeader>
           <CardContent className="p-0">
             {error && (
               <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="m-4 text-destructive bg-destructive/5 p-3 rounded-md border border-destructive/20 text-sm flex items-center gap-2"><AlertCircle className="h-4 w-4" /><p>Error: {error}</p></motion.div>
             )}
             <div className="overflow-x-auto">
               <Table className="min-w-full text-sm">
                 <TableHeader>
                   <TableRow className="bg-muted/30 dark:bg-muted/10 border-b border-border/70">
                     {[
                       { label: "Document", field: "originalFilename", sortable: true, className: "w-[40%] pl-4" },
                       { label: "Status", field: "status", sortable: true },
                       { label: "Processed", field: "createdAt", sortable: true },
                       { label: "Actions", sortable: false, className:"text-right pr-4 w-[100px]" }
                     ].map((head) => (
                       <TableHead key={head.field || head.label} className={cn("px-4 py-2 h-9 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap", head.className)}>
                         {head.sortable ? (
                           <Button variant="ghost" size="sm" onClick={() => handleSortChange(head.field as SortField)} className="-ml-3 h-8 data-[state=open]:bg-accent text-xs px-2" disabled={isLoading}>
                             <span>{head.label}</span>
                             {sortBy === head.field && ( sortOrder === "asc" ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" /> )}
                           </Button>
                         ) : head.label}
                       </TableHead>
                     ))}
                   </TableRow>
                 </TableHeader>
                 <TableBody className="divide-y divide-border/50">
                   <AnimatePresence initial={false}>
                     {isLoading ? skeletonRows : documents.length > 0 ? (
                       documents.map((doc, index) => (
                         <motion.tr
                           key={doc.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                           transition={{ duration: 0.2, delay: index * 0.01 }}
                           className="group hover:bg-muted/40 dark:hover:bg-muted/50 transition-colors duration-150"
                         >
                           <TableCell className="py-2.5 px-4 font-medium">
                             <Tooltip delayDuration={200}>
                               <TooltipTrigger asChild>
                                 <div className="flex items-center gap-2.5">
                                   <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0"/>
                                   <span className="truncate max-w-[300px] md:max-w-[400px] lg:max-w-none" title={doc.originalFilename}>{doc.originalFilename}</span>
                                 </div>
                               </TooltipTrigger>
                               <TooltipContent side="top" align="start"><p>{doc.originalFilename}</p></TooltipContent>
                             </Tooltip>
                           </TableCell>
                           <TableCell className="py-2.5 px-4">
                             <Tooltip delayDuration={200}>
                               <TooltipTrigger>
                                 <Badge variant={getStatusVariant(doc.status)} className={cn("text-xs capitalize flex items-center gap-1 px-1.5 py-0.5 font-medium cursor-default", getStatusColorClasses(doc.status))}>
                                   {getStatusIcon(doc.status)} {doc.status}
                                 </Badge>
                               </TooltipTrigger>
                               <TooltipContent><p>Status: {doc.status}</p></TooltipContent>
                             </Tooltip>
                           </TableCell>
                           <TableCell className="py-2.5 px-4 whitespace-nowrap">
                             <Tooltip delayDuration={200}>
                               <TooltipTrigger asChild>
                                 <div className="flex items-center gap-1.5 text-muted-foreground text-xs cursor-default">
                                   <Calendar className="h-3.5 w-3.5" />
                                   <span>{formatDateSmart(doc.createdAt)}</span>
                                 </div>
                               </TooltipTrigger>
                               <TooltipContent side="top"><p>{format(new Date(doc.createdAt), "PPP p")}</p></TooltipContent>
                             </Tooltip>
                           </TableCell>
                           <TableCell className="py-2 pr-4 text-right">
                             <div className="flex justify-end items-center gap-0.5">
                               <Tooltip delayDuration={100}>
                                 <TooltipTrigger asChild>
                                   <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleViewDetails(doc.id)} aria-label={`View ${doc.originalFilename}`}>
                                     <Eye className="h-4 w-4" />
                                   </Button>
                                 </TooltipTrigger>
                                 <TooltipContent><p>View Details</p></TooltipContent>
                               </Tooltip>
                               <AlertDialog>
                                 <Tooltip delayDuration={100}>
                                   <TooltipTrigger asChild>
                                     <AlertDialogTrigger asChild>
                                       <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" disabled={isDeleting} aria-label={`Delete ${doc.originalFilename}`}>
                                         {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                       </Button>
                                     </AlertDialogTrigger>
                                   </TooltipTrigger>
                                   <TooltipContent><p>Delete</p></TooltipContent>
                                 </Tooltip>
                                 <AlertDialogContent>
                                   <AlertDialogHeader>
                                     <AlertDialogTitle>Permanently Delete?</AlertDialogTitle>
                                     <AlertDialogDescription> This will permanently delete "<span className="font-semibold">{doc.originalFilename}</span>". This action cannot be undone.</AlertDialogDescription>
                                   </AlertDialogHeader>
                                   <AlertDialogFooter>
                                     <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                                     <AlertDialogAction onClick={() => handleDelete(doc.id, doc.originalFilename)} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                       {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Delete
                                     </AlertDialogAction>
                                   </AlertDialogFooter>
                                 </AlertDialogContent>
                               </AlertDialog>
                             </div>
                           </TableCell>
                         </motion.tr>
                       ))
                     ) : (
                       <TableRow>
                         <TableCell colSpan={4} className="h-52 text-center">
                           <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                             <Inbox className="h-10 w-10 text-muted-foreground/30" />
                             <p className="font-medium text-base">No Documents Found</p>
                             <p className="text-sm max-w-xs text-center">
                               {searchTerm || statusFilter !== 'all' ? "Try adjusting filters or search." : "Your processed documents will appear here."}
                             </p>
                             {(searchTerm || statusFilter !== 'all') ? (
                               <Button 
                                   variant="outline" 
                                   size="sm" 
                                   onClick={(e) => handleClearFilters('all', e)} 
                                   className="mt-2 text-xs">
                                   <FilterX className="h-3.5 w-3.5 mr-1.5"/> Clear Filters
                               </Button>
                             ) : (
                               <Button size="sm" asChild className="mt-2"><Link href="/dashboard/upload"><UploadCloud className="mr-2 h-4 w-4" /> Upload Document</Link></Button>
                             )}
                           </motion.div>
                         </TableCell>
                       </TableRow>
                     )}
                   </AnimatePresence>
                 </TableBody>
               </Table>
             </div>
           </CardContent>

           {/* Pagination */}
           {totalPages > 1 && (
             <CardFooter className="p-3 md:p-4 border-t border-border/70 bg-muted/20 dark:bg-muted/5">
               <div className="flex items-center justify-between w-full">
                  <p className="text-xs text-muted-foreground hidden sm:block">
                     Showing <span className="font-medium">{documents.length}</span> of <span className="font-medium">{totalCount}</span> documents
                  </p>
                  {renderPagination()}
                  <p className="text-xs text-muted-foreground hidden sm:block">
                     Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span>
                  </p>
               </div>
             </CardFooter>
           )}
         </Card>

         {/* Document Detail Sheet */}
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetContent className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl p-0 flex flex-col">
              <SheetHeader className="p-4 border-b">
                <SheetTitle className="truncate text-lg">{selectedDocumentDetail?.document.originalFilename ?? "Loading..."}</SheetTitle>
                {selectedDocumentDetail && <SheetDescription>Details for document ID: {selectedDocumentDetail.document.id}</SheetDescription>}
              </SheetHeader>
              <div className="flex-1 overflow-y-auto">
                {isDetailLoading ? (
                  <div className="flex items-center justify-center h-full p-10">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : selectedDocumentDetail ? (
                  <div className="p-4 md:p-6 space-y-4">
                    <h3 className="font-semibold mb-2">Document Preview</h3>
                     <div className="h-[500px] border rounded-md overflow-hidden bg-muted/30">
                        {selectedDocumentDetail.signedUrl ? (
                           <DocumentViewer url={selectedDocumentDetail.signedUrl} />
                        ) : (
                           <div className="flex items-center justify-center h-full text-muted-foreground">Preview Unavailable</div>
                        )}
                     </div>
                     <h3 className="font-semibold pt-4 mb-2">Extracted Data</h3>
                     <pre className="bg-muted/50 p-3 rounded-md text-xs overflow-x-auto">
                       {JSON.stringify(selectedDocumentDetail.extractedData ?? { message: "No extracted data available." }, null, 2)}
                     </pre>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full p-10 text-muted-foreground">
                    Could not load document details.
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>


       </motion.div>
     </TooltipProvider>
  );
}