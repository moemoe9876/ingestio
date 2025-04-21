"use client";

import { format } from "date-fns";
import { motion } from "framer-motion";
import { AlertCircle, AlertTriangle, Calendar, CheckCircle2, Clock, Download, File } from "lucide-react";
import { useState } from "react";
import { DateRange } from "react-day-picker";
import useSWR from "swr";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChartComponent, LineChartComponent, PieChartComponent } from "@/components/ui/charts";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { MetricCard } from "@/components/ui/metric-card";
import { ProgressMetric } from "@/components/ui/progress-metric";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { fetchUserMetricsAction } from "@/actions/db/metrics-actions";

// Animation variants for staggered entry
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

// Refresh interval in milliseconds (5 seconds)
const REFRESH_INTERVAL = 5000;

export default function MetricsPage() {
  // State for date range selection
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const today = new Date();
    return {
      from: new Date(today.getFullYear(), today.getMonth(), 1), // Start of current month
      to: today
    };
  });
  
  // State for error
  const [error, setError] = useState<string | null>(null);
  
  // SWR fetcher function
  const fetcher = async () => {
    if (!dateRange.from || !dateRange.to) {
      throw new Error("Invalid date range");
    }
    
    const result = await fetchUserMetricsAction({
      from: dateRange.from.toISOString(),
      to: dateRange.to.toISOString()
    });
    
    if (!result.isSuccess) {
      throw new Error(result.message || "Failed to fetch metrics data");
    }
    
    return result.data;
  };
  
  // Use SWR to fetch data with real-time updates
  const { data: metrics, isLoading, error: swrError, mutate } = useSWR(
    ['metrics', dateRange.from?.toISOString(), dateRange.to?.toISOString()],
    fetcher,
    { 
      refreshInterval: REFRESH_INTERVAL,
      revalidateOnFocus: true,
      dedupingInterval: 1000, // Only dedupe requests within 1 second to ensure fresh data
      onError: (err) => {
        console.error(err);
        setError(err.message || "An unexpected error occurred while fetching metrics data");
      }
    }
  );
  
  // Handle date range change
  const handleDateRangeChange = (newDateRange: DateRange | undefined) => {
    if (newDateRange) {
      setDateRange(newDateRange);
      // Manually trigger a refresh when date range changes
      mutate();
    }
  };
  
  // Format document types for display
  const formatDocumentTypes = () => {
    if (!metrics?.documentMetrics?.docTypeDistribution) return [];
    
    return metrics.documentMetrics.docTypeDistribution.map(item => ({
      mimeType: formatMimeType(item.mimeType),
      name: formatMimeType(item.mimeType),
      count: item.count
    }));
  };
  
  // Helper function to format MIME types
  const formatMimeType = (mimeType: string) => {
    const mimeMap: Record<string, string> = {
      "application/pdf": "PDF",
      "image/jpeg": "JPEG",
      "image/png": "PNG",
      "image/tiff": "TIFF",
      "application/msword": "DOC",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
      "text/csv": "CSV",
      "application/vnd.ms-excel": "XLS",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX"
    };
    
    return mimeMap[mimeType] || mimeType;
  };
  
  // Helper function to format processing time
  const formatProcessingTime = (seconds: number | null) => {
    if (seconds === null) return "N/A";
    if (seconds < 60) return `${Math.round(seconds)}s`;
    return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  };

  // Helper function to format status for display
  const formatStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      "uploaded": "Uploaded",
      "processing": "Processing",
      "completed": "Completed",
      "failed": "Failed"
    };
    
    return statusMap[status] || status;
  };
  
  // Prepare status distribution data for chart
  const prepareStatusDistribution = () => {
    if (!metrics?.documentMetrics?.statusDistribution) return [];
    
    return metrics.documentMetrics.statusDistribution.map(item => ({
      status: formatStatus(item.status),
      count: item.count
    }));
  };
  
  // Prepare processing volume data for chart
  const prepareProcessingVolume = () => {
    if (!metrics?.documentMetrics?.processingVolume) return [];
    
    return metrics.documentMetrics.processingVolume.map(item => ({
      date: format(new Date(item.date), "MMM dd"),
      count: item.count
    }));
  };
  
  // Download metrics as CSV
  const downloadMetricsCSV = () => {
    if (!metrics?.documentMetrics) return;
    
    // Prepare CSV content
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Metric,Value\n";
    csvContent += `Total Documents,${metrics.documentMetrics.totalDocuments}\n`;
    csvContent += `Success Rate,${metrics.documentMetrics.successRate}%\n`;
    csvContent += `Pages Processed,${metrics.usageMetrics?.pagesProcessed || 0}\n`;
    csvContent += `Pages Limit,${metrics.usageMetrics?.pagesLimit || 0}\n`;
    csvContent += `Usage Percentage,${metrics.usageMetrics?.usagePercentage || 0}%\n`;
    
    // Document types
    csvContent += "\nDocument Types\n";
    csvContent += "Type,Count\n";
    metrics.documentMetrics.docTypeDistribution.forEach(item => {
      csvContent += `${formatMimeType(item.mimeType)},${item.count}\n`;
    });
    
    // Status distribution
    csvContent += "\nStatus Distribution\n";
    csvContent += "Status,Count\n";
    metrics.documentMetrics.statusDistribution.forEach(item => {
      csvContent += `${formatStatus(item.status)},${item.count}\n`;
    });
    
    // Processing volume
    csvContent += "\nProcessing Volume\n";
    csvContent += "Date,Count\n";
    metrics.documentMetrics.processingVolume.forEach(item => {
      csvContent += `${item.date},${item.count}\n`;
    });
    
    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `metrics_${format(new Date(), "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Force refresh data - manual refresh button function
  const refreshData = () => {
    mutate();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Performance Metrics</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <DateRangePicker 
              dateRange={dateRange}
              onDateRangeChange={handleDateRangeChange}
              placeholder="Select date range"
            />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={refreshData}
                    disabled={isLoading}
                  >
                    <Clock className="h-4 w-4" />
                    <span className="sr-only">Refresh data</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Refresh metrics data</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button 
              variant="outline" 
              size="icon"
              onClick={downloadMetricsCSV}
              disabled={isLoading || !!error}
              title="Download metrics as CSV"
            >
              <Download className="h-4 w-4" />
              <span className="sr-only">Download report</span>
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground">
          Track your document processing performance and efficiency metrics
          <span className="ml-2 text-xs font-medium text-primary">
            (Auto-refreshes every {REFRESH_INTERVAL / 1000} seconds)
          </span>
        </p>
      </div>
      
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <motion.div 
        variants={container}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <motion.div variants={fadeInUp}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <MetricCard
                    title="Total Documents Processed"
                    value={metrics?.documentMetrics?.totalDocuments || 0}
                    icon={File}
                    isLoading={isLoading}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Includes all uploaded documents in any status</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </motion.div>
        
        <motion.div variants={fadeInUp}>
          <MetricCard
            title="Average Processing Time"
            value={formatProcessingTime(metrics?.documentMetrics?.averageProcessingTime || null)}
            icon={Clock}
            isLoading={isLoading}
          />
        </motion.div>
        
        <motion.div variants={fadeInUp}>
          <MetricCard
            title="Success Rate"
            value={`${metrics?.documentMetrics?.successRate || 0}%`}
            icon={CheckCircle2}
            isLoading={isLoading}
          />
        </motion.div>
      </motion.div>
      
      <Tabs defaultValue="usage" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="usage">Usage Metrics</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="accuracy">Distribution</TabsTrigger>
          <TabsTrigger value="efficiency">Efficiency</TabsTrigger>
        </TabsList>
        
        <TabsContent value="usage">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <BarChartComponent
              title="Document Volume by Day"
              description="Number of documents processed over time"
              data={prepareProcessingVolume()}
              isLoading={isLoading}
            />
            
            <PieChartComponent
              title="Document Types"
              description="Distribution of document types processed"
              data={formatDocumentTypes()}
              isLoading={isLoading}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="performance">
          <LineChartComponent
            title="Processing Time"
            description="Document processing volume over time"
            data={prepareProcessingVolume()}
            isLoading={isLoading}
          />
        </TabsContent>
        
        <TabsContent value="accuracy">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <BarChartComponent
              title="Document Status"
              description="Status distribution of processed documents"
              data={prepareStatusDistribution()}
              isLoading={isLoading}
              icon={<CheckCircle2 className="h-5 w-5 text-primary" />}
            />
            
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-primary" />
                  Common Errors
                </CardTitle>
                <CardDescription>
                  Most frequent error messages in document processing
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                {isLoading ? (
                  <div className="space-y-4">
                    {Array(5).fill(0).map((_, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    ))}
                  </div>
                ) : metrics?.documentMetrics?.topErrors && metrics.documentMetrics.topErrors.length > 0 ? (
                  <div className="space-y-4">
                    {metrics.documentMetrics.topErrors.map((error, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">{error.error}</p>
                          <p className="text-xs text-muted-foreground">{error.count} occurrences</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    No errors found
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="efficiency">
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Processing Efficiency</CardTitle>
              <CardDescription>
                Detailed breakdown of processing efficiency metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                <ProgressMetric 
                  label="Page Usage"
                  value={`${metrics?.usageMetrics?.pagesProcessed || 0} / ${metrics?.usageMetrics?.pagesLimit || 0} pages`}
                  percentage={metrics?.usageMetrics?.usagePercentage || 0}
                  isLoading={isLoading}
                />
                
                <ProgressMetric 
                  label="Success Rate"
                  value={`${metrics?.documentMetrics?.successRate || 0}%`}
                  percentage={metrics?.documentMetrics?.successRate || 0}
                  color="bg-green-500"
                  isLoading={isLoading}
                />
                
                <ProgressMetric 
                  label="Processing Capacity"
                  value={`${metrics?.documentMetrics?.totalDocuments || 0} documents`}
                  percentage={(metrics?.documentMetrics?.totalDocuments || 0) / 2.5}
                  color="bg-blue-500"
                  isLoading={isLoading}
                />
                
                <div className="pt-6">
                  <div className="rounded-md border p-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div className="text-sm font-medium">Usage Overview</div>
                    </div>
                    {isLoading ? (
                      <div className="mt-2 space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    ) : (
                      <>
                        <p className="mt-2 text-sm text-muted-foreground">
                          You have used <span className="font-medium">{metrics?.usageMetrics?.pagesProcessed || 0}</span> of <span className="font-medium">{metrics?.usageMetrics?.pagesLimit || 0}</span> pages in your current plan.
                        </p>
                        <div className="mt-4 text-xs text-muted-foreground flex items-center justify-between">
                          <span>Pages remaining: {metrics?.usageMetrics?.remainingPages || 0}</span>
                          <span className="text-green-500">{metrics?.usageMetrics?.remainingPages ? Math.round((metrics?.usageMetrics.remainingPages / metrics?.usageMetrics.pagesLimit) * 100) : 0}% remaining</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 