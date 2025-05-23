"use client";

import { fetchUserBatchListAction } from "@/actions/batch/batchActions";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatRelativeTime } from "@/lib/utils/date-utils";
import { ChevronDown, ChevronUp, Eye, MoreHorizontal, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import useSWR from "swr";

interface BatchListClientProps {
  initialBatches: any[];
  initialTotalCount: number;
  initialPage: number;
  initialSortBy: string;
  initialSortOrder: string;
  initialStatusFilter: string;
  initialNameFilter: string;
}

const statusColors = {
  pending_upload: "secondary",
  queued: "outline",
  processing: "default",
  completed: "success",
  partially_completed: "warning",
  failed: "destructive",
} as const;

const statusLabels = {
  pending_upload: "Pending Upload",
  queued: "Queued",
  processing: "Processing",
  completed: "Completed", 
  partially_completed: "Partially Completed",
  failed: "Failed",
} as const;

export function BatchListClient({
  initialBatches,
  initialTotalCount,
  initialPage,
  initialSortBy,
  initialSortOrder,
  initialStatusFilter,
  initialNameFilter,
}: BatchListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [page, setPage] = useState(initialPage);
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [sortOrder, setSortOrder] = useState(initialSortOrder);
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [nameFilter, setNameFilter] = useState(initialNameFilter);
  const [searchInput, setSearchInput] = useState(initialNameFilter);

  // Create cache key for SWR
  const cacheKey = `batches-${page}-${sortBy}-${sortOrder}-${statusFilter}-${nameFilter}`;
  
  const { data, error, isLoading, mutate } = useSWR(
    cacheKey,
    () => fetchUserBatchListAction({
      page,
      limit: 10,
      sortBy: sortBy as any,
      sortOrder: sortOrder as any,
      statusFilter: statusFilter === "all" ? undefined : statusFilter,
      nameFilter: nameFilter || undefined,
    }),
    {
      fallbackData: { isSuccess: true, data: { batches: initialBatches, totalCount: initialTotalCount } },
      refreshInterval: 5000, // Poll every 5 seconds
      revalidateOnFocus: true,
    }
  );

  const updateURL = useCallback((updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    router.push(`/dashboard/batches?${params.toString()}`);
  }, [router, searchParams]);

  const handleSort = (column: string) => {
    const newOrder = sortBy === column && sortOrder === "asc" ? "desc" : "asc";
    setSortBy(column);
    setSortOrder(newOrder);
    setPage(1);
    updateURL({ sort: column, order: newOrder, page: "1" });
  };

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    setPage(1);
    updateURL({ status: status === "all" ? "" : status, page: "1" });
  };

  const handleSearch = () => {
    setNameFilter(searchInput);
    setPage(1);
    updateURL({ search: searchInput || "", page: "1" });
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    updateURL({ page: newPage.toString() });
  };

  const getProgress = (batch: any) => {
    const total = batch.documentCount || 0;
    const processed = (batch.completedCount || 0) + (batch.failedCount || 0);
    return total > 0 ? (processed / total) * 100 : 0;
  };

  const batches = data?.isSuccess ? data.data.batches : [];
  const totalCount = data?.isSuccess ? data.data.totalCount : 0;
  const totalPages = Math.ceil(totalCount / 10);

  if (error || (data && !data.isSuccess)) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            Failed to load batches. Please try again.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search batches</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="search"
                  placeholder="Search by batch name..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <Button onClick={handleSearch} size="sm">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Label htmlFor="status-filter">Status</Label>
              <Select value={statusFilter} onValueChange={handleStatusFilter}>
                <SelectTrigger id="status-filter" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="queued">Queued</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="partially_completed">Partially Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button asChild>
                <Link href="/dashboard/batch-upload">
                  <Plus className="h-4 w-4 mr-2" />
                  New Batch
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Batches Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : batches.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-muted-foreground mb-4">
                No batches found{nameFilter && ` matching "${nameFilter}"`}
              </div>
              <Button asChild>
                <Link href="/dashboard/batch-upload">
                  <Plus className="h-4 w-4 mr-2" />
                  Create your first batch
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      onClick={() => handleSort("name")}
                      className="h-auto p-0 font-semibold"
                    >
                      Batch Name
                      {sortBy === "name" && (
                        sortOrder === "asc" ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      onClick={() => handleSort("status")}
                      className="h-auto p-0 font-semibold"
                    >
                      Status
                      {sortBy === "status" && (
                        sortOrder === "asc" ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Documents</TableHead>
                  <TableHead>Pages</TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      onClick={() => handleSort("created_at")}
                      className="h-auto p-0 font-semibold"
                    >
                      Created
                      {sortBy === "created_at" && (
                        sortOrder === "asc" ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((batch: any) => (
                  <TableRow key={batch.id}>
                    <TableCell>
                      <Link 
                        href={`/dashboard/batches/${batch.id}`}
                        className="font-medium hover:underline"
                      >
                        {batch.name || batch.id.substring(0, 8) + "..."}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColors[batch.status as keyof typeof statusColors]}>
                        {statusLabels[batch.status as keyof typeof statusLabels]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="w-24">
                              <Progress value={getProgress(batch)} className="h-2" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              Completed: {batch.completedCount || 0}, 
                              Failed: {batch.failedCount || 0}, 
                              Pending: {(batch.documentCount || 0) - (batch.completedCount || 0) - (batch.failedCount || 0)}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>{batch.documentCount || 0}</TableCell>
                    <TableCell>{batch.totalPages || 0}</TableCell>
                    <TableCell>
                      {formatRelativeTime(batch.createdAt)}
                    </TableCell>
                    <TableCell>
                      {batch.completedAt ? formatRelativeTime(batch.completedAt) : "-"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/batches/${batch.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Batch
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Batch</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this batch? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction variant="destructive">
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {Math.min((page - 1) * 10 + 1, totalCount)} to {Math.min(page * 10, totalCount)} of {totalCount} batches
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              disabled={page <= 1}
              onClick={() => handlePageChange(page - 1)}
            >
              Previous
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              disabled={page >= totalPages}
              onClick={() => handlePageChange(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}