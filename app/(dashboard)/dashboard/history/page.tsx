// app/(dashboard)/dashboard/history/page.tsx

"use client";

// --- Core Actions & State ---
import { deleteDocumentAction, fetchDocumentForReviewAction, fetchUserDocumentsAction } from "@/actions/db/documents";
// TODO: Implement and import toggleDocumentStarAction
// import { toggleDocumentStarAction } from "@/actions/db/documents";
import { SelectDocument as BaseSelectDocument } from "@/db/schema";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

// --- UI Components ---
import AnimatedGradientText from "@/components/magicui/animated-gradient-text";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"; // Re-added Card usage for Recent
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import DocumentViewer from "@/components/utilities/DocumentViewer";

// --- Libraries & Utils ---
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow, isThisMonth, isThisWeek, isToday, isYesterday } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Clock3, Download, Eye, FileArchive, FileIcon as FileGeneric, FileImage, FileText, Inbox, Loader2, MoreHorizontal, RefreshCw, Search, SlidersHorizontal, Trash2, UploadCloud, X } from "lucide-react"; // Added UploadCloud back
import Link from "next/link";
import { toast } from "sonner";

// --- Constants ---
const RECENT_DOC_COUNT = 4; // Keep it at 4 for the grid layout
const DEBOUNCE_DELAY = 400;

// --- Types ---
// TODO: Add 'starred: boolean' to this type after updating schema
type SelectDocument = BaseSelectDocument & { starred?: boolean };

type SortField = "originalFilename" | "status" | "createdAt" | "updatedAt" | "fileSize";
type SortOrder = "asc" | "desc";
type DocumentStatus = SelectDocument["status"] | "all";
type DocumentMimeType = SelectDocument["mimeType"];
type DocumentTypeFilter = "all" | "pdf" | "image" | "word" | "archive" | "other";
type DocumentDetail = {
   document: SelectDocument;
   signedUrl: string;
   extractedData: any | null;
};

// --- Helper Functions (Keep existing helpers: formatDateDetailed, formatDateSmart, getStatusIcon, getStatusColorClasses, getFileIcon, getTimeGroup, formatFileSize) ---
const formatDateDetailed = (date: Date | string | undefined): string => {
  if (!date) return "N/A";
  try { return format(new Date(date), "MMM d, yyyy 'at' h:mm a"); }
  catch (e) { return "Invalid Date"; }
};
const formatDateSmart = (date: Date | string | undefined): string => {
  if (!date) return "N/A";
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    if (now.getTime() - d.getTime() < 24 * 60 * 60 * 1000) {
      return formatDistanceToNow(d, { addSuffix: true });
    }
    return format(d, "MMM d, yyyy");
  } catch (e) { return "Invalid Date"; }
};
const getStatusIcon = (status: SelectDocument["status"]): React.ReactNode => {
   const className = "h-2.5 w-2.5";
   switch (status) {
      case "completed": return <CheckCircle2 className={cn(className, "text-green-600 dark:text-green-500")} />;
      case "processing": return <Loader2 className={cn(className, "animate-spin text-blue-600 dark:text-blue-500")} />;
      case "failed": return <AlertCircle className={cn(className, "text-red-600 dark:text-red-500")} />;
      case "uploaded": return <Clock3 className={cn(className, "text-yellow-600 dark:text-yellow-500")} />;
      default: return null;
   }
};
const getStatusColorClasses = (status: SelectDocument["status"]): string => {
   switch (status) {
      case "completed": return "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20";
      case "processing": return "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20";
      case "failed": return "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20";
      case "uploaded": return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/20";
      default: return "bg-muted text-muted-foreground border-border";
   }
};
const getFileIcon = ({ mimeType, name }: { mimeType: string, name: string }): React.ReactNode => {
   const className = "h-5 w-5 shrink-0";
   if (mimeType.includes('pdf')) return <FileText className={cn(className, "text-red-500")} />;
   if (mimeType.includes('word')) return <FileText className={cn(className, "text-blue-500")} />;
   if (mimeType.includes('image')) return <FileImage className={cn(className, "text-green-500")} />;
   if (mimeType.includes('zip') || mimeType.includes('archive')) return <FileArchive className={cn(className, "text-amber-500")} />;
   const ext = name.split('.').pop()?.toLowerCase();
   if (ext === 'docx' || ext === 'doc') return <FileText className={cn(className, "text-blue-500")} />;
   if (ext === 'txt') return <FileText className={cn(className, "text-gray-500")} />;
   return <FileGeneric className={cn(className, "text-gray-500")} />;
};
const getTimeGroup = (date: Date): string => {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  if (isThisWeek(date, { weekStartsOn: 1 })) return "This Week";
  if (isThisMonth(date)) return "This Month";
  return format(date, "MMMM yyyy");
};
const formatFileSize = (bytes: number | undefined): string => {
  if (bytes === undefined || bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
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
  const [allDocuments, setAllDocuments] = useState<SelectDocument[]>([]);
  const [recentDocuments, setRecentDocuments] = useState<SelectDocument[]>([]); // State for recent docs grid
  const [filteredGroupedDocs, setFilteredGroupedDocs] = useState<Record<string, SelectDocument[]>>({});
  const [totalCount, setTotalCount] = useState(0);
  const [activeTab, setActiveTab] = useState<DocumentStatus | "starred">("all");

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<DocumentStatus>("all");
  const [typeFilter, setTypeFilter] = useState<DocumentTypeFilter>("all");
  const [sortBy, setSortBy] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [showFilterDialog, setShowFilterDialog] = useState(false);

  // UI State
  const [error, setError] = useState<string | null>(null);
  const [selectedDocumentDetail, setSelectedDocumentDetail] = useState<DocumentDetail | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Transitions
  const [isLoading, startLoadingTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isDetailLoading, startDetailLoadingTransition] = useTransition();
  const [isTogglingStar, startStarTransition] = useTransition();

  // Debounced search term
  const debouncedSearchTerm = useDebounce(searchTerm, DEBOUNCE_DELAY);

  // --- Fetching Logic ---
  const fetchAllDocumentsAndRecent = useCallback(() => {
    setError(null);
    startLoadingTransition(async () => {
      try {
        // Fetch ALL documents matching the *popover* filters and search term, sorted as requested
        const mainParams = {
          searchTerm: debouncedSearchTerm,
          statusFilter: statusFilter === "all" ? undefined : statusFilter,
          // typeFilter: typeFilter === "all" ? undefined : typeFilter, // TODO: Add typeFilter to backend action if needed
          sortBy,
          sortOrder,
          pageSize: 1000, // Fetch a large number for client-side filtering/grouping
          page: 1,
        };
        // Fetch recent documents separately, always sorted by createdAt desc
        const recentParams = {
          sortBy: "createdAt" as SortField,
          sortOrder: "desc" as SortOrder,
          pageSize: RECENT_DOC_COUNT,
          page: 1,
        };

        const [mainResult, recentResult] = await Promise.all([
          fetchUserDocumentsAction(mainParams),
          fetchUserDocumentsAction(recentParams) // Always fetch recent
        ]);

        // Process main results
        if (mainResult.isSuccess) {
          // TODO: Remove 'as any' once starred is added
          setAllDocuments(mainResult.data.documents as any);
          setTotalCount(mainResult.data.totalCount);
        } else {
          throw new Error(mainResult.message || "Failed to fetch documents");
        }

        // Process recent results
        if (recentResult.isSuccess) {
          // TODO: Remove 'as any' once starred is added
          setRecentDocuments(recentResult.data.documents as any);
        } else {
          console.warn("Could not fetch recent documents:", recentResult.message);
          setRecentDocuments([]);
        }

      } catch (err: any) {
        setError(err.message || "An unexpected error occurred");
        setAllDocuments([]);
        setTotalCount(0);
        setRecentDocuments([]);
        toast.error("Error loading history", { description: err.message });
      }
    });
  }, [debouncedSearchTerm, statusFilter, typeFilter, sortBy, sortOrder, startLoadingTransition]); // Added typeFilter

  // Initial Fetch & Refetch on Filters/Sort Change
  useEffect(() => {
    fetchAllDocumentsAndRecent();
  }, [fetchAllDocumentsAndRecent]); // Dependency array includes all filters/sort states

  // Client-side Filtering & Grouping based on Active Tab and fetched data
  useEffect(() => {
    let tabFiltered = [...allDocuments];

    // Apply Type Filter (client-side for now)
    if (typeFilter !== "all") {
       tabFiltered = tabFiltered.filter(doc => {
          const mime = doc.mimeType.toLowerCase();
          const ext = doc.originalFilename.split('.').pop()?.toLowerCase();
          if (typeFilter === 'pdf') return mime.includes('pdf');
          if (typeFilter === 'image') return mime.startsWith('image/');
          if (typeFilter === 'word') return mime.includes('word') || ext === 'docx' || ext === 'doc';
          if (typeFilter === 'archive') return mime.includes('zip') || mime.includes('archive');
          if (typeFilter === 'other') return !mime.includes('pdf') && !mime.startsWith('image/') && !mime.includes('word') && !mime.includes('zip') && !mime.includes('archive');
          return true;
       });
    }

    // Apply Tab Filter
    if (activeTab === "starred") {
      // TODO: Uncomment when 'starred' property exists
      // tabFiltered = tabFiltered.filter(doc => doc.starred);
      console.warn("'Starred' tab filtering skipped: 'starred' property missing on document type.");
      tabFiltered = []; // Show empty for now
    } else if (activeTab !== "all") {
      tabFiltered = tabFiltered.filter(doc => doc.status === activeTab);
    }

    // Grouping logic
    const grouped = tabFiltered.reduce((groups, doc) => {
      const group = getTimeGroup(new Date(doc.createdAt));
      if (!groups[group]) groups[group] = [];
      groups[group].push(doc);
      return groups;
    }, {} as Record<string, SelectDocument[]>);

    setFilteredGroupedDocs(grouped);

  }, [allDocuments, activeTab, typeFilter]);


  // --- Handlers ---
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleRefresh = () => {
     fetchAllDocumentsAndRecent(); // Refetch all data
  };

  const applyFiltersFromDialog = (newFilters: { status: DocumentStatus, type: DocumentTypeFilter, sort: SortField, order: SortOrder }) => {
     setStatusFilter(newFilters.status);
     setTypeFilter(newFilters.type);
     setSortBy(newFilters.sort);
     setSortOrder(newFilters.order);
     setShowFilterDialog(false);
     // Fetching is triggered by state changes in useEffect
  };

  const resetFilters = () => {
     setSearchTerm("");
     setStatusFilter("all");
     setTypeFilter("all");
     setSortBy("createdAt");
     setSortOrder("desc");
     setShowFilterDialog(false);
  };

  const handleDelete = (documentId: string, documentName: string) => {
    startDeleteTransition(async () => {
      const result = await deleteDocumentAction(documentId);
      if (result.isSuccess) {
        toast.success(`Document "${documentName}" deleted`);
        fetchAllDocumentsAndRecent(); // Refetch all data after delete
      } else {
        toast.error("Delete failed", { description: result.message });
      }
    });
  };

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

  // TODO: Implement Star Toggle Logic
  const toggleStar = (id: string) => {
     startStarTransition(async () => {
        const currentDoc = allDocuments.find(d => d.id === id);
        if (!currentDoc) return;
        // TODO: Remove this check once 'starred' is added
        if (currentDoc.starred === undefined) {
           toast.error("Cannot star document: 'starred' property missing.");
           return;
        }
        setAllDocuments(docs => docs.map(doc => doc.id === id ? { ...doc, starred: !doc.starred } : doc));
        try {
           // const result = await toggleDocumentStarAction(id, !currentDoc.starred);
           // if (!result.isSuccess) { /* Revert */ }
           console.log("TODO: Implement toggleDocumentStarAction in backend");
           toast.info("Star functionality backend not implemented yet.");
           setAllDocuments(docs => docs.map(doc => doc.id === id ? { ...doc, starred: currentDoc.starred } : doc));
        } catch (error: any) { /* Revert */ }
     });
  };


  // --- Memoized Values ---
  const timePeriodsOrder = ["Today", "Yesterday", "This Week", "This Month"];
  const documentCountInCurrentView = Object.values(filteredGroupedDocs).reduce((sum, docs) => sum + docs.length, 0);
  
  // Compute if any filters are active
  const areFiltersActive = searchTerm !== "" || statusFilter !== "all" || typeFilter !== "all" || 
                          sortBy !== "createdAt" || sortOrder !== "desc" || activeTab !== "all";

  // --- Render ---
  return (
     <TooltipProvider>
       <motion.div
         className="flex flex-col gap-6 md:gap-8 p-4 md:p-6 relative h-full"
         initial={{ opacity: 0 }}
         animate={{ opacity: 1 }}
         transition={{ duration: 0.5, ease: "easeOut" }}
       >
         {/* --- Header --- */}
         <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
           <motion.div 
             initial={{ opacity: 0, y: -20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ 
               duration: 0.7, 
               type: "spring",
               stiffness: 100
             }}
             className="relative"
           >
             <AnimatedGradientText
               gradientClasses="bg-gradient-to-r from-violet-500 via-blue-500 to-teal-500"
               className="text-2xl md:text-3xl font-extrabold tracking-tight"
               animationDuration={10}
             >
               Document History
             </AnimatedGradientText>
           </motion.div>
           <div className="flex items-center gap-2">
             <div className="relative flex-grow sm:flex-grow-0">
               <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
               <Input
                 type="search" placeholder="Search documents..."
                 className="pl-8 h-9 w-full sm:w-48 md:w-64 text-sm"
                 value={searchTerm} onChange={handleSearchChange} disabled={isLoading}
               />
               {searchTerm && (
                 <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => resetFilters()}>
                   <X className="h-3.5 w-3.5" /> <span className="sr-only">Clear search</span>
                 </Button>
               )}
             </div>
             <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
               <Tooltip delayDuration={100}>
                 <TooltipTrigger asChild>
                   <DialogTrigger asChild>
                     <Button variant="outline" size="icon" className="h-9 w-9 relative">
                       <SlidersHorizontal className="h-4 w-4" />
                       {(statusFilter !== 'all' || typeFilter !== 'all' || sortBy !== 'createdAt' || sortOrder !== 'desc') && (
                         <span className="absolute -top-1 -right-1 h-2 w-2 bg-primary rounded-full animate-pulse" />
                       )}
                     </Button>
                   </DialogTrigger>
                 </TooltipTrigger>
                 <TooltipContent><p>Filters & Sorting</p></TooltipContent>
               </Tooltip>
               <FilterDialogContent
                  currentFilters={{ status: statusFilter, type: typeFilter, sort: sortBy, order: sortOrder }}
                  onApply={applyFiltersFromDialog}
                  onReset={resetFilters}
               />
             </Dialog>
             <Tooltip delayDuration={100}>
               <TooltipTrigger asChild>
                 <Button variant="outline" size="icon" className="h-9 w-9" onClick={handleRefresh} disabled={isLoading}>
                   <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                 </Button>
               </TooltipTrigger>
               <TooltipContent><p>Refresh</p></TooltipContent>
             </Tooltip>
             {/* Moved Upload Button Here */}
             <Button variant="default" asChild className="shadow-sm hover:shadow-md transition-shadow shrink-0 h-9 px-3 text-sm">
                <Link href="/dashboard/upload">
                  <UploadCloud className="mr-1.5 h-4 w-4" /> Upload
                </Link>
              </Button>
           </div>
         </div>

         {/* --- Recent Documents Grid (Restored) --- */}
         {recentDocuments.length > 0 && !isLoading && !areFiltersActive && ( // Show only if no filters active
           <motion.div
             initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.1, duration: 0.5 }} className="space-y-2.5"
           >
             <h2 className="text-base font-semibold text-foreground/90 px-1">Recently Processed</h2>
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {recentDocuments.map((doc, index) => (
                  <motion.div
                    key={`recent-${doc.id}`}
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05, duration: 0.3 }}
                    whileHover={{ y: -2, transition: { duration: 0.15 } }} className="h-full"
                  >
                    <Card className="hover:shadow-md hover:border-primary/30 transition-all duration-200 ease-out group h-full flex flex-col border border-border/60 bg-card/60 backdrop-blur-sm overflow-hidden">
                      <CardHeader className="p-3 pb-1">
                        <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0"/>
                          <Tooltip delayDuration={200}>
                            <TooltipTrigger asChild><span className="truncate">{doc.originalFilename}</span></TooltipTrigger>
                            <TooltipContent side="top" align="start"><p>{doc.originalFilename}</p></TooltipContent>
                          </Tooltip>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 pt-1 flex justify-between items-center text-xs">
                        <Badge variant='outline' className={cn("capitalize flex items-center gap-1 px-1.5 py-0.5 font-medium", getStatusColorClasses(doc.status))}>
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
                ))}
             </div>
           </motion.div>
         )}


         {/* --- Tabs & Content Area --- */}
         <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="flex flex-col flex-1 -mt-2">
           <TabsList className="shrink-0 self-start px-1 h-9 mb-4">
             <TabsTrigger value="all" className="text-xs px-2.5 h-7">All</TabsTrigger>
             {/* TODO: Uncomment when 'starred' property exists */}
             {/* <TabsTrigger value="starred" className="text-xs px-2.5 h-7">Starred</TabsTrigger> */}
             <TabsTrigger value="completed" className="text-xs px-2.5 h-7">Completed</TabsTrigger>
             <TabsTrigger value="processing" className="text-xs px-2.5 h-7">Processing</TabsTrigger>
             <TabsTrigger value="failed" className="text-xs px-2.5 h-7">Failed</TabsTrigger>
           </TabsList>

           <TabsContent value={activeTab} className="flex-1 mt-0 overflow-hidden">
             <DocumentList
               groupedDocuments={filteredGroupedDocs}
               isLoading={isLoading}
               toggleStar={toggleStar}
               handleViewDetails={handleViewDetails}
               handleDelete={handleDelete}
               timePeriodsOrder={timePeriodsOrder}
               documentCountInView={documentCountInCurrentView}
               totalDocumentCount={totalCount}
               isDeleting={isDeleting}
               isTogglingStar={isTogglingStar}
             />
           </TabsContent>
         </Tabs>

         {/* --- Document Detail Sheet --- */}
         <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
           <SheetContent className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl p-0 flex flex-col gap-0 border-l border-border/70">
             <SheetHeader className="p-4 border-b">
               <SheetTitle className="truncate text-base font-semibold">{selectedDocumentDetail?.document.originalFilename ?? "Loading..."}</SheetTitle>
               {selectedDocumentDetail && <SheetDescription className="text-xs">ID: {selectedDocumentDetail.document.id}</SheetDescription>}
             </SheetHeader>
             <div className="flex-1 overflow-hidden">
               {isDetailLoading ? (
                 <div className="flex items-center justify-center h-full p-10"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
               ) : selectedDocumentDetail ? (
                 <ScrollArea className="h-full">
                   <div className="p-4 md:p-6 space-y-4">
                     <h3 className="text-sm font-semibold mb-1 text-foreground/90">Document Preview</h3>
                     <div className="h-[50vh] border rounded-md overflow-hidden bg-muted/30">
                       {selectedDocumentDetail.signedUrl ? (
                         <DocumentViewer url={selectedDocumentDetail.signedUrl} />
                       ) : (
                         <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-4">Preview Unavailable</div>
                       )}
                     </div>
                     <h3 className="text-sm font-semibold pt-4 mb-1 text-foreground/90">Extracted Data</h3>
                     {selectedDocumentDetail.extractedData ? (
                       <pre className="bg-muted/40 p-3 rounded-md text-[11px] leading-relaxed overflow-x-auto border border-border/50 max-h-[30vh]">
                         {JSON.stringify(selectedDocumentDetail.extractedData, null, 2)}
                       </pre>
                     ) : (
                       <p className="text-xs text-muted-foreground italic">No structured data was extracted.</p>
                     )}
                   </div>
                 </ScrollArea>
               ) : (
                 <div className="flex flex-col items-center justify-center h-full p-10 text-muted-foreground"><AlertCircle className="h-6 w-6 mb-2" /><p className="text-sm">Could not load details.</p></div>
               )}
             </div>
           </SheetContent>
         </Sheet>

       </motion.div>
     </TooltipProvider>
  );
}

// --- Filter Dialog Component ---
function FilterDialogContent({ currentFilters, onApply, onReset }: {
  currentFilters: { status: DocumentStatus, type: DocumentTypeFilter, sort: SortField, order: SortOrder },
  onApply: (newFilters: { status: DocumentStatus, type: DocumentTypeFilter, sort: SortField, order: SortOrder }) => void,
  onReset: () => void
}) {
  const [status, setStatus] = useState(currentFilters.status);
  const [type, setType] = useState(currentFilters.type);
  const [sort, setSort] = useState(currentFilters.sort);
  const [order, setOrder] = useState(currentFilters.order);

  const handleApplyClick = () => {
    onApply({ status, type, sort, order });
  };

  return (
    <DialogContent className="sm:max-w-[450px]">
      <DialogHeader>
        <DialogTitle>Filters & Sorting</DialogTitle>
        <DialogDescription>Refine the list of documents.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        {/* Status Filter */}
        <div className="grid grid-cols-4 items-center gap-4">
          <label htmlFor="status-filter" className="text-right text-sm font-medium">Status</label>
          <Select value={status} onValueChange={(v) => setStatus(v as DocumentStatus)} >
            <SelectTrigger id="status-filter" className="col-span-3 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="uploaded">Uploaded</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {/* Type Filter */}
        <div className="grid grid-cols-4 items-center gap-4">
          <label htmlFor="type-filter" className="text-right text-sm font-medium">Type</label>
          <Select value={type} onValueChange={(v) => setType(v as DocumentTypeFilter)}>
            <SelectTrigger id="type-filter" className="col-span-3 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
              <SelectItem value="image">Image</SelectItem>
              <SelectItem value="word">Word Doc</SelectItem>
              <SelectItem value="archive">Archive (Zip)</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {/* Sort By */}
        <div className="grid grid-cols-4 items-center gap-4">
          <label htmlFor="sort-by" className="text-right text-sm font-medium">Sort By</label>
          <Select value={sort} onValueChange={(v) => setSort(v as SortField)}>
            <SelectTrigger id="sort-by" className="col-span-3 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt">Date Processed</SelectItem>
              <SelectItem value="originalFilename">Filename</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="fileSize">Size</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {/* Sort Order */}
        <div className="grid grid-cols-4 items-center gap-4">
          <label htmlFor="sort-order" className="text-right text-sm font-medium">Order</label>
          <Select value={order} onValueChange={(v) => setOrder(v as SortOrder)}>
            <SelectTrigger id="sort-order" className="col-span-3 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Descending</SelectItem>
              <SelectItem value="asc">Ascending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onReset}>Reset</Button>
        <Button onClick={handleApplyClick}>Apply Filters</Button>
      </DialogFooter>
    </DialogContent>
  );
}


// --- Document List Component (Vercel Style) ---
function DocumentList({
  groupedDocuments,
  isLoading,
  toggleStar,
  handleViewDetails,
  handleDelete,
  timePeriodsOrder,
  documentCountInView,
  totalDocumentCount,
  isDeleting,
  isTogglingStar
}: {
  groupedDocuments: Record<string, SelectDocument[]>;
  isLoading: boolean;
  toggleStar: (id: string) => void;
  handleViewDetails: (id: string) => void;
  handleDelete: (id: string, name: string) => void;
  timePeriodsOrder: string[];
  documentCountInView: number;
  totalDocumentCount: number;
  isDeleting: boolean;
  isTogglingStar: boolean;
}) {

  const orderedGroups = useMemo(() => {
    const groups = Object.entries(groupedDocuments);
    groups.sort(([keyA], [keyB]) => {
      const indexA = timePeriodsOrder.indexOf(keyA);
      const indexB = timePeriodsOrder.indexOf(keyB);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      if (keyA === "Older") return 1; // Older should be defined if grouping by month/year
      if (keyB === "Older") return -1;
      try {
        const dateA = new Date(keyA); // Assumes format like "July 2024"
        const dateB = new Date(keyB);
        return dateB.getTime() - dateA.getTime();
      } catch (e) { return keyA.localeCompare(keyB); }
    });
    return groups;
  }, [groupedDocuments, timePeriodsOrder]);

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-5 w-24 rounded" />
            <div className="bg-card rounded-lg border border-border/50 overflow-hidden">
              {Array.from({ length: 2 }).map((_, j) => (
                <div key={j} className="flex items-center p-3 border-b border-border/50 last:border-0">
                  <Skeleton className="h-8 w-8 rounded-md mr-3" />
                  <Skeleton className="h-10 w-10 rounded-md mr-3" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-1/2 rounded" />
                    <Skeleton className="h-3 w-1/3 rounded" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full mr-4" />
                  <Skeleton className="h-8 w-24 rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (documentCountInView === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center h-full">
        <div className="p-4 rounded-full bg-muted mb-4">
          <Inbox className="h-10 w-10 text-muted-foreground/50" />
        </div>
        <h3 className="text-lg font-medium mb-1">No Matching Documents</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          {totalDocumentCount > 0 ? "Try adjusting your filters or search query." : "Upload some documents to get started."}
        </p>
        {totalDocumentCount === 0 && (
           <Button size="sm" asChild className="mt-4"><Link href="/dashboard/upload"><UploadCloud className="mr-2 h-4 w-4" /> Upload Document</Link></Button>
        )}
      </div>
    );
  }

  return (
    <ScrollArea className="h-full"> {/* Make ScrollArea take full height */}
      <div className="space-y-5 p-4 pt-2 pb-6">
        <AnimatePresence>
          {orderedGroups.map(([period, docs]) => (
            <motion.div
              key={period} layout
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{period}</h3>
                <div className="h-px flex-1 bg-border/70" />
                <span className="text-xs text-muted-foreground">{docs.length}</span>
              </div>

              <div className="bg-card/50 rounded-lg border border-border/60 overflow-hidden shadow-sm">
                {docs.map((doc, index) => (
                  <motion.div
                    key={doc.id} layout="position"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.02 }}
                    className={cn(
                      "flex items-center p-2.5 hover:bg-accent/50 transition-colors duration-150",
                      index !== docs.length - 1 && "border-b border-border/50",
                    )}
                  >
                    {/* TODO: Uncomment Star Button when 'starred' is available */}
                    {/* <Tooltip delayDuration={100}> ... </Tooltip> */}

                    <div className="h-8 w-8 bg-muted rounded-md flex items-center justify-center mr-2.5 shrink-0">
                      {getFileIcon({ mimeType: doc.mimeType, name: doc.originalFilename })}
                    </div>

                    <div className="min-w-0 flex-1 cursor-pointer" onClick={() => handleViewDetails(doc.id)}>
                      <Tooltip delayDuration={300}>
                        <TooltipTrigger asChild>
                          <div className="font-medium text-sm truncate hover:text-primary" title={doc.originalFilename}>
                            {doc.originalFilename}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent><p>{doc.originalFilename}</p></TooltipContent>
                      </Tooltip>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {formatDateDetailed(doc.createdAt)} • {formatFileSize(doc.fileSize)}
                      </div>
                    </div>

                    <div className="mx-3 shrink-0">
                       <Tooltip delayDuration={200}>
                         <TooltipTrigger>
                           <Badge variant='outline' className={cn("text-[11px] capitalize flex items-center gap-1 px-1.5 py-0.5 font-medium cursor-default", getStatusColorClasses(doc.status))}>
                             {getStatusIcon(doc.status)} {doc.status}
                           </Badge>
                         </TooltipTrigger>
                         <TooltipContent><p>Status: {doc.status}</p></TooltipContent>
                       </Tooltip>
                    </div>

                    <div className="flex items-center ml-2 shrink-0">
                      <Tooltip delayDuration={100}>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleViewDetails(doc.id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>View Details</p></TooltipContent>
                      </Tooltip>
                      <Tooltip delayDuration={100}>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Download className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Download</p></TooltipContent>
                      </Tooltip>
                      <DropdownMenu>
                        <Tooltip delayDuration={100}>
                          <TooltipTrigger asChild>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                          </TooltipTrigger>
                          <TooltipContent><p>More Actions</p></TooltipContent>
                        </Tooltip>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => toast.info("Rename action clicked (not implemented)")}>Rename</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toast.info("Share action clicked (not implemented)")}>Share</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toast.info("Download action clicked (not implemented)")}>Download</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                onSelect={(e) => e.preventDefault()}
                                disabled={isDeleting}
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
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
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ScrollArea>
  );
}