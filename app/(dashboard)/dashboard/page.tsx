"use client";

import { fetchUserDocumentsAction } from "@/actions/db/documents";
import { fetchUserMetricsAction } from "@/actions/db/metrics-actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SelectDocument } from "@/db/schema";
import { useUser } from "@clerk/nextjs";
import { differenceInDays, formatDistanceToNow } from "date-fns";
import { AlertTriangle, CheckCircle2, Clock, Eye, FileText, UploadCloud } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>(null);
  const [recentDocuments, setRecentDocuments] = useState<SelectDocument[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboardData() {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch metrics and recent documents in parallel
        const [metricsResult, recentDocsResult] = await Promise.all([
          fetchUserMetricsAction(),
          fetchUserDocumentsAction({
            page: 1,
            pageSize: 7,
            sortBy: "createdAt",
            sortOrder: "desc"
          })
        ]);

        if (metricsResult.isSuccess) {
          setMetrics(metricsResult.data);
        } else {
          setError(metricsResult.message);
        }

        if (recentDocsResult.isSuccess) {
          setRecentDocuments(recentDocsResult.data.documents);
        } else {
          setError(prev => prev || recentDocsResult.message);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setError("Failed to load dashboard data");
      } finally {
        setIsLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  // Calculate days left in billing cycle
  const getDaysLeftInBillingCycle = () => {
    if (!metrics?.usageMetrics?.billingPeriodEnd) return "N/A";
    
    const billingEndDate = new Date(metrics.usageMetrics.billingPeriodEnd);
    const today = new Date();
    const daysLeft = differenceInDays(billingEndDate, today);
    
    return daysLeft > 0 ? daysLeft : 0;
  };

  // Format file size helper
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  // Get file icon based on mimetype
  const getFileIcon = (mimeType: string) => {
    // Could be extended with different icons based on file type
    return <FileText className="h-8 w-8 text-primary/70" />;
  };

  // Get status color for badge
  const getStatusColorClasses = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/20 text-green-500 hover:bg-green-500/30";
      case "processing":
        return "bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30";
      case "failed":
        return "bg-red-500/20 text-red-500 hover:bg-red-500/30";
      default:
        return "bg-blue-500/20 text-blue-500 hover:bg-blue-500/30";
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-3 w-3" />;
      case "processing":
        return <Clock className="h-3 w-3" />;
      case "failed":
        return <AlertTriangle className="h-3 w-3" />;
      default:
        return <UploadCloud className="h-3 w-3" />;
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">
          Welcome, {user?.firstName || "User"}
        </h2>
      </div>
      
      {/* KPI Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="Total Documents"
          value={isLoading ? "..." : metrics?.documentMetrics?.totalDocuments || 0}
          description="Documents uploaded"
          icon={FileText}
          isLoading={isLoading}
        />
        
        <MetricCard
          title="Avg. Processing Time"
          value={isLoading ? "..." : metrics?.documentMetrics?.averageProcessingTime
            ? `${Math.round(metrics.documentMetrics.averageProcessingTime)}s`
            : "N/A"}
          description="Average extraction time"
          icon={Clock}
          isLoading={isLoading}
        />
        
        <MetricCard
          title="Success Rate"
          value={isLoading ? "..." : `${metrics?.documentMetrics?.successRate || 0}%`}
          description="Processing success rate"
          icon={CheckCircle2}
          isLoading={isLoading}
        />
      </div>
      
      {/* Main Content Area (Two Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Wider) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Upload Card */}
          <Card className="border-border overflow-hidden">
            <CardContent className="pt-6 flex flex-col md:flex-row items-center gap-4">
              <div className="flex-shrink-0 bg-primary/10 p-4 rounded-full">
                <UploadCloud className="h-12 w-12 text-primary" />
              </div>
              <div className="flex-grow text-center md:text-left">
                <h3 className="text-xl font-semibold mb-2">Upload New Document</h3>
                <p className="text-muted-foreground mb-4">
                  Process your documents to extract structured data
                </p>
                <Button asChild size="lg" className="mt-2">
                  <Link href="/dashboard/upload">Upload Document</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Usage Snapshot Card */}
          <Card className="border-border overflow-hidden">
            <CardHeader>
              <CardTitle>Current Usage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <>
                  <Skeleton className="h-5 w-full max-w-[250px] mb-2" />
                  <Skeleton className="h-4 w-full mb-4" />
                  <Skeleton className="h-4 w-24" />
                </>
              ) : metrics?.usageMetrics ? (
                <>
                  <div>
                    <p className="mb-2 font-medium">
                      {metrics.usageMetrics.pagesProcessed} / {metrics.usageMetrics.pagesLimit} pages used
                    </p>
                    <Progress value={metrics.usageMetrics.usagePercentage} className="h-2" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {getDaysLeftInBillingCycle()} days left in current billing cycle
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">No usage data available</p>
              )}
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm" asChild className="hover:bg-accent hover:text-accent-foreground transition-colors">
                <Link href="/dashboard/settings?tab=billing">Manage Subscription</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        {/* Right Column (Narrower) */}
        <div className="lg:col-span-1">
          {/* Recent Documents Feed Card */}
          <Card className="border-border h-full overflow-hidden">
            <CardHeader>
              <CardTitle>Recent Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({length: 5}).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : recentDocuments.length > 0 ? (
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-3">
                    {recentDocuments.map((doc) => (
                      <div 
                        key={doc.id} 
                        className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors group relative"
                      >
                        <Link 
                          href={`/dashboard/review/${doc.id}`}
                          className="absolute inset-0 z-0"
                          aria-label={`View details for ${doc.originalFilename}`}
                        >
                          <span className="sr-only">View details</span>
                        </Link>
                        
                        <div className="flex items-center gap-3 w-full relative z-10 pointer-events-none">
                          {getFileIcon(doc.mimeType)}
                          <div className="flex-1 min-w-0">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <p className="text-sm font-medium truncate">
                                    {doc.originalFilename}
                                  </p>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{doc.originalFilename}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatFileSize(doc.fileSize)} • {doc.pageCount} {doc.pageCount === 1 ? 'page' : 'pages'}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                          <Badge 
                            variant="outline"
                            className={`capitalize ml-auto ${getStatusColorClasses(doc.status)}`}
                          >
                            <span className="flex items-center gap-1">
                              {getStatusIcon(doc.status)}
                              <span>{doc.status}</span>
                            </span>
                          </Badge>
                        </div>
                        
                        <div className="relative z-10 pointer-events-auto ml-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            asChild
                          >
                            <Link href={`/dashboard/review/${doc.id}`}>
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">View</span>
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="py-8 text-center">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <h3 className="mt-4 text-sm font-medium">No documents yet</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Upload your first document to get started.
                  </p>
                  <Button className="mt-4" asChild>
                    <Link href="/dashboard/upload">Upload Document</Link>
                  </Button>
                </div>
              )}
            </CardContent>
            {recentDocuments.length > 0 && (
              <CardFooter>
                <Button variant="secondary" size="sm" asChild className="w-full">
                  <Link href="/dashboard/history">View All History</Link>
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
} 