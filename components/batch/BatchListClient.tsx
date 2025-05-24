"use client";

import { fetchUserBatchListAction } from "@/actions/batch/batchActions";
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
  pending_upload: "bg-gray-100 text-gray-800 border-gray-300",
  queued: "bg-blue-100 text-blue-800 border-blue-300",
  processing: "bg-indigo-100 text-indigo-800 border-indigo-300",
  completed: "bg-green-100 text-green-800 border-green-300",
  partially_completed: "bg-yellow-100 text-yellow-800 border-yellow-300",
  failed: "bg-red-100 text-red-800 border-red-300",
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
      fallbackData: { isSuccess: true, message: "Initial data loaded", data: { batches: initialBatches, totalCount: initialTotalCount } },
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

  if (isLoading && !data) { // Show skeleton when initial data is loading and no fallback data is present
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/4" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-1" />
                <div className="flex gap-2 mt-1">
                  <Skeleton className="h-10 flex-1" />
                  <Skeleton className="h-10 w-10" />
                </div>
              </div>
              <div className="w-full sm:w-48">
                <Skeleton className="h-4 w-16 mb-1" />
                <Skeleton className="h-10 w-full mt-1" />
              </div>
              <div className="flex items-end">
                <Skeleton className="h-10 w-32" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  {[...Array(7)].map((_, i) => (
                    <TableHead key={i}><Skeleton className="h-4 w-full" /></TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(7)].map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-end space-x-2 py-4">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
        <CardContent className="pt-6">
          {isLoading && batches.length === 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  {[...Array(7)].map((_, i) => (
                    <TableHead key={i}><Skeleton className="h-4 w-full" /></TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(7)].map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : batches.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-xl font-semibold">No Batches Found</h3>
              <p className="text-muted-foreground mt-2">
                You haven\'t created any batches yet. Get started by uploading your first batch.
              </p>
              <Button asChild className="mt-4">
                <Link href="/dashboard/batch-upload">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Batch
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead onClick={() => handleSort("name")} className="cursor-pointer">
                    Batch Name / ID
                    {sortBy === "name" && (sortOrder === "asc" ? <ChevronUp className="inline h-4 w-4" /> : <ChevronDown className="inline h-4 w-4" />)}
                  </TableHead>
                  <TableHead onClick={() => handleSort("status")} className="cursor-pointer">
                    Status
                    {sortBy === "status" && (sortOrder === "asc" ? <ChevronUp className="inline h-4 w-4" /> : <ChevronDown className="inline h-4 w-4" />)}
                  </TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead onClick={() => handleSort("documentCount")} className="cursor-pointer">
                    Documents
                    {sortBy === "documentCount" && (sortOrder === "asc" ? <ChevronUp className="inline h-4 w-4" /> : <ChevronDown className="inline h-4 w-4" />)}
                  </TableHead>
                  <TableHead onClick={() => handleSort("totalPages")} className="cursor-pointer">
                    Pages
                    {sortBy === "totalPages" && (sortOrder === "asc" ? <ChevronUp className="inline h-4 w-4" /> : <ChevronDown className="inline h-4 w-4" />)}
                  </TableHead>
                  <TableHead onClick={() => handleSort("createdAt")} className="cursor-pointer">
                    Submitted
                    {sortBy === "createdAt" && (sortOrder === "asc" ? <ChevronUp className="inline h-4 w-4" /> : <ChevronDown className="inline h-4 w-4" />)}
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((batch: any) => (
                  <TableRow key={batch.id}>
                    <TableCell>
                      <Link href={`/dashboard/batches/${batch.id}`} className="hover:underline">
                        {batch.name || `${batch.id.substring(0, 8)}...`}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[batch.status as keyof typeof statusColors] || "bg-gray-100 text-gray-800 border-gray-300"}>
                        {statusLabels[batch.status as keyof typeof statusLabels] || batch.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Progress value={getProgress(batch)} className="w-24" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Completed: {batch.completedCount || 0}</p>
                            <p>Failed: {batch.failedCount || 0}</p>
                            <p>Pending: {(batch.documentCount || 0) - (batch.completedCount || 0) - (batch.failedCount || 0)}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>{batch.documentCount}</TableCell>
                    <TableCell>{batch.totalPages}</TableCell>
                    <TableCell>{formatRelativeTime(batch.createdAt)}</TableCell>
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
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              // Placeholder for delete action
                              console.log("Delete batch", batch.id);
                              // Consider adding a confirmation dialog here
                            }}
                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Batch
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-end space-x-2 py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}