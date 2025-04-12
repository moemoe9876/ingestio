"use client";

import { fetchUserDocumentsAction } from "@/actions/db/documents";
import { fetchUserMetricsAction } from "@/actions/db/metrics-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChartComponent, PieChartComponent } from "@/components/ui/charts";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@clerk/nextjs";
import { formatDistanceToNow } from "date-fns";
import { ChevronRight, FileText } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>(null);
  const [recentDocuments, setRecentDocuments] = useState<any[]>([]);

  useEffect(() => {
    async function fetchDashboardData() {
      setIsLoading(true);
      try {
        // Fetch metrics data
        const metricsResult = await fetchUserMetricsAction();
        if (metricsResult.isSuccess) {
          setMetrics(metricsResult.data);
        }

        // Fetch recent documents
        const recentDocsResult = await fetchUserDocumentsAction({
          page: 1,
          pageSize: 5,
          sortBy: "createdAt",
          sortOrder: "desc"
        });
        if (recentDocsResult.isSuccess) {
          setRecentDocuments(recentDocsResult.data.documents);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  // Calculate accuracy from metrics if available
  const getAccuracy = () => {
    if (metrics?.documentMetrics?.successRate) {
      return metrics.documentMetrics.successRate;
    }
    return 95; // Fallback value
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">
          Welcome, {user?.firstName || "User"}
        </h2>
      </div>
      
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="rounded-md">
          <TabsTrigger value="overview" className="rounded-md">Overview</TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-md">Analytics</TabsTrigger>
          <TabsTrigger value="reports" className="rounded-md">Reports</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="rounded-lg overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">{metrics?.documentMetrics?.totalDocuments || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      Documents processed
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
            
            <Card className="rounded-lg overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Processing Rate</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">{getAccuracy()}%</div>
                    <p className="text-xs text-muted-foreground">
                      Success rate
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
            
            <Card className="rounded-lg overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pages Usage</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">
                      {metrics?.usageMetrics?.pagesProcessed || 0}/{metrics?.usageMetrics?.pagesLimit || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {metrics?.usageMetrics?.usagePercentage || 0}% of monthly allocation
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
            
            <Card className="rounded-lg overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Processing Time</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">
                      {metrics?.documentMetrics?.averageProcessingTime 
                        ? `${Math.round(metrics.documentMetrics.averageProcessingTime)}s` 
                        : "N/A"}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Average extraction time
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4 rounded-lg overflow-hidden">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Document processing volume over time.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-[300px] bg-muted/10 rounded-lg flex items-center justify-center">
                    <Skeleton className="h-64 w-full" />
                  </div>
                ) : metrics?.documentMetrics?.processingVolume ? (
                  <div className="h-[300px]">
                    <LineChartComponent
                      title=""
                      data={metrics.documentMetrics.processingVolume.map((item: any) => ({
                        label: item.date,
                        value: item.count
                      }))}
                      height={300}
                    />
                  </div>
                ) : (
                  <div className="h-[300px] bg-muted/10 rounded-lg flex items-center justify-center">
                    <p className="text-muted-foreground">No activity data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card className="col-span-3 rounded-lg overflow-hidden">
              <CardHeader className="flex justify-between items-start">
                <div>
                  <CardTitle>Recent Documents</CardTitle>
                  <CardDescription>
                    Your latest processed documents.
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/history">
                    View All
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {Array.from({length: 3}).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : recentDocuments.length > 0 ? (
                  <div className="space-y-4">
                    {recentDocuments.map((doc) => (
                      <Link 
                        href={`/dashboard/review/${doc.id}`}
                        key={doc.id} 
                        className="flex items-center gap-4 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                      >
                        <FileText className="h-9 w-9 text-primary/70" />
                        <div className="flex-1 space-y-1 overflow-hidden">
                          <p className="text-sm font-medium truncate">{doc.originalFilename}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true })}
                            <span className="mx-2">•</span>
                            <span className="capitalize">{doc.status}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`text-xs font-medium ${
                            doc.status === "completed" ? "text-green-500" : 
                            doc.status === "failed" ? "text-red-500" : 
                            "text-yellow-500"
                          }`}>
                            {doc.status === "completed" ? "Completed" : 
                             doc.status === "processing" ? "Processing" :
                             doc.status === "failed" ? "Failed" : "Uploaded"}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
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
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="analytics" className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-[450px] w-full" />
            </div>
          ) : metrics ? (
            <div className="grid gap-4 md:grid-cols-2">
              <PieChartComponent
                title="Document Status Distribution"
                description="Breakdown of documents by processing status"
                data={metrics.documentMetrics.statusDistribution.map((item: any) => ({
                  label: item.status === "completed" ? "Completed" : 
                         item.status === "processing" ? "Processing" :
                         item.status === "failed" ? "Failed" : "Uploaded",
                  count: item.count
                }))}
              />
              <PieChartComponent
                title="Document Type Distribution"
                description="Breakdown of documents by MIME type"
                data={metrics.documentMetrics.docTypeDistribution.map((item: any) => ({
                  label: item.mimeType.split('/')[1] || item.mimeType,
                  count: item.count
                }))}
              />
            </div>
          ) : (
            <Card className="rounded-lg overflow-hidden">
              <CardHeader>
                <CardTitle>Analytics Content</CardTitle>
                <CardDescription>
                  No analytics data available yet.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[450px] bg-muted/10 rounded-lg flex items-center justify-center">
                  <p className="text-muted-foreground">Process some documents to see analytics</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="reports" className="space-y-4">
          <Card className="rounded-lg overflow-hidden">
            <CardHeader className="flex justify-between items-start">
              <div>
                <CardTitle>Error Reports</CardTitle>
                <CardDescription>
                  Most common errors encountered during processing.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[450px] bg-muted/10 rounded-lg flex items-center justify-center">
                  <Skeleton className="h-64 w-full" />
                </div>
              ) : metrics?.documentMetrics?.topErrors && metrics.documentMetrics.topErrors.length > 0 ? (
                <div className="space-y-4">
                  {metrics.documentMetrics.topErrors.map((error: any, index: number) => (
                    <div key={index} className="border p-4 rounded-lg">
                      <div className="text-sm font-medium text-red-500 mb-1">Error #{index + 1}</div>
                      <div className="text-sm">{error.error}</div>
                      <div className="text-xs text-muted-foreground mt-1">Occurred {error.count} time(s)</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-[450px] bg-muted/10 rounded-lg flex items-center justify-center">
                  <p className="text-muted-foreground">No errors to report. Great job!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 