"use client";

import { differenceInDays, format } from "date-fns";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Clock, Download, FileText } from "lucide-react";
import { useState } from "react";
import { DateRange } from "react-day-picker";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  XAxis, YAxis
} from "recharts";
import useSWR from "swr";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { MetricCard } from "@/components/ui/metric-card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { fetchUserMetricsAction } from "@/actions/db/metrics-actions";

// Animation variants for staggered entry
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
};

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      duration: 0.3,
      ease: "easeOut"
    }
  }
};

// Chart animation config
const chartAnimationConfig = {
  initial: false,
  animate: true,
  whileHover: { scale: 1.02 },
  transition: { duration: 0.5, ease: "easeOut" }
};

// Modern vibrant color palette
const CHART_COLORS = [
  "hsl(230, 92%, 65%)", // Vibrant blue
  "hsl(280, 85%, 60%)", // Violet
  "hsl(340, 80%, 65%)", // Raspberry
  "hsl(20, 85%, 60%)",  // Coral
  "hsl(50, 95%, 60%)",  // Sunny yellow
  "hsl(150, 75%, 50%)", // Emerald green
];

// Status color map with more vibrant colors
const STATUS_COLORS: Record<string, string> = {
  "completed": "hsl(160, 84%, 39%)",  // Vibrant green
  "failed": "hsl(350, 89%, 60%)",      // Vibrant red
  "processing": "hsl(43, 96%, 58%)",   // Vibrant yellow
  "uploaded": "hsl(230, 92%, 65%)"     // Vibrant blue
};

// Refresh interval in milliseconds (5 seconds)
const REFRESH_INTERVAL = 5000;

// Custom tooltip for Recharts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-popover/95 p-3 shadow-lg backdrop-blur-sm">
        <div className="flex flex-col gap-1">
          <span className="text-[0.70rem] font-medium uppercase text-muted-foreground">
            {label || payload[0]?.name || payload[0]?.dataKey}
          </span>
          <span className="text-sm font-bold text-foreground">
            {payload[0]?.value}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

// Helper function to calculate days left in billing period
const calculateDaysLeft = (billingPeriodEnd: string | undefined) => {
  if (!billingPeriodEnd) return 0;
  const endDate = new Date(billingPeriodEnd);
  const today = new Date();
  return Math.max(0, differenceInDays(endDate, today));
};

// Helper function to determine status color
const getStatusColor = (status: string) => {
  return STATUS_COLORS[status.toLowerCase()] || "hsl(var(--primary))";
};

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
    if (seconds === null || seconds === undefined) return "N/A";
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
  
  // Prepare data for charts
  const prepareVolumeData = () => {
    if (!metrics?.documentMetrics?.processingVolume) return [];
    
    return metrics.documentMetrics.processingVolume.map(item => ({
      date: format(new Date(item.date), "MMM d"),
      count: item.count
    }));
  };
  
  const prepareTypeData = () => {
    if (!metrics?.documentMetrics?.docTypeDistribution) return [];
    
    return metrics.documentMetrics.docTypeDistribution.map(item => ({
      name: formatMimeType(item.mimeType),
      value: item.count
    }));
  };
  
  const prepareStatusData = () => {
    if (!metrics?.documentMetrics?.statusDistribution) return [];
    
    return metrics.documentMetrics.statusDistribution.map(item => ({
      status: formatStatus(item.status),
      count: item.count,
      fill: getStatusColor(item.status)
    }));
  };

  // Calculate total for status data
  const statusTotal = prepareStatusData().reduce((acc, item) => acc + item.count, 0);
  
  // Download metrics as CSV
  const downloadMetricsCSV = () => {
    if (!metrics?.documentMetrics) return;
    
    // Prepare CSV content
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Add header information
    csvContent += `IngestIO Metrics - ${format(dateRange.from || new Date(), "MMM d")} to ${format(dateRange.to || new Date(), "MMM d, yyyy")}\n\n`;
    
    // Key metrics
    csvContent += "Key Performance Indicators\n";
    csvContent += "Metric,Value\n";
    csvContent += `Total Documents,${metrics.documentMetrics.totalDocuments}\n`;
    csvContent += `Success Rate,${metrics.documentMetrics.successRate}%\n`;
    csvContent += `Average Processing Time,${formatProcessingTime(metrics.documentMetrics.averageProcessingTime)}\n`;
    csvContent += `Pages Processed,${metrics.usageMetrics?.pagesProcessed || 0}\n`;
    csvContent += `Pages Limit,${metrics.usageMetrics?.pagesLimit || 0}\n`;
    csvContent += `Usage Percentage,${metrics.usageMetrics?.usagePercentage || 0}%\n`;
    csvContent += `Remaining Pages,${metrics.usageMetrics?.remainingPages || 0}\n\n`;
    
    // Document types
    csvContent += "Document Types\n";
    csvContent += "Type,Count\n";
    metrics.documentMetrics.docTypeDistribution.forEach(item => {
      csvContent += `${formatMimeType(item.mimeType)},${item.count}\n`;
    });
    csvContent += "\n";
    
    // Status distribution
    csvContent += "Status Distribution\n";
    csvContent += "Status,Count\n";
    metrics.documentMetrics.statusDistribution.forEach(item => {
      csvContent += `${formatStatus(item.status)},${item.count}\n`;
    });
    csvContent += "\n";
    
    // Processing volume
    csvContent += "Processing Volume\n";
    csvContent += "Date,Count\n";
    metrics.documentMetrics.processingVolume.forEach(item => {
      csvContent += `${item.date},${item.count}\n`;
    });
    
    // Top errors
    csvContent += "Top Errors\n";
    csvContent += "Error,Count\n";
    metrics.documentMetrics.topErrors.forEach(item => {
      csvContent += `"${item.error.replace(/"/g, '""')}",${item.count}\n`;
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

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <motion.div 
        className="flex flex-col gap-3"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Metrics Hub</h1>
          <div className="flex items-center gap-3 flex-wrap">
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <DateRangePicker 
                    dateRange={dateRange}
                    onDateRangeChange={handleDateRangeChange}
                    placeholder="Select date range"
                    align="end"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="p-3">
                <p className="text-sm">Filter metrics by date range</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={downloadMetricsCSV}
                  disabled={isLoading || !!error}
                  className="gap-2 px-4 h-10 hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="p-3">
                <p className="text-sm">Download metrics data as CSV</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        
        {error && (
          <Alert variant="destructive" className="mt-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </motion.div>
      
      {/* KPIs */}
      <motion.div 
        variants={container}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8"
      >
        <motion.div variants={fadeInUp}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="h-full">
                <MetricCard
                  title="Total Documents"
                  value={metrics?.documentMetrics?.totalDocuments ?? '--'}
                  description="Processed in selected period"
                  icon={FileText}
                  isLoading={isLoading}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="p-3">
              <p className="text-sm">Total number of documents processed in the selected time period</p>
            </TooltipContent>
          </Tooltip>
        </motion.div>
        
        <motion.div variants={fadeInUp}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="h-full">
                <MetricCard
                  title="Average Processing Time"
                  value={formatProcessingTime(metrics?.documentMetrics?.averageProcessingTime ?? null)}
                  description="Avg. time upload to completion"
                  icon={Clock}
                  isLoading={isLoading}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="p-3">
              <p className="text-sm">Average time taken to process documents from upload to completion</p>
            </TooltipContent>
          </Tooltip>
        </motion.div>
        
        <motion.div variants={fadeInUp}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="h-full">
                <MetricCard
                  title="Success Rate"
                  value={`${metrics?.documentMetrics?.successRate ?? '--'}%`}
                  description="Successful processing rate"
                  icon={CheckCircle2}
                  isLoading={isLoading}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="p-3">
              <p className="text-sm">Percentage of documents that were successfully processed</p>
            </TooltipContent>
          </Tooltip>
        </motion.div>
      </motion.div>
      
      {/* Usage Snapshot Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card className="mb-8 shadow-md border-muted overflow-hidden bg-gradient-to-br from-background to-muted/30">
          <CardHeader className="pb-3">
            <CardTitle>Current Billing Cycle Usage</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-full max-w-md" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-5 w-full max-w-md" />
              </div>
            ) : metrics?.usageMetrics ? (
              <div className="space-y-5">
                <motion.p 
                  className="text-3xl font-bold"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.7, delay: 0.3 }}
                >
                  {metrics.usageMetrics.pagesProcessed} / {metrics.usageMetrics.pagesLimit} Pages Used
                </motion.p>
                <div className="relative">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${metrics.usageMetrics.usagePercentage}%` }}
                    transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
                  >
                    <Progress 
                      value={100} 
                      className="h-3 my-2 bg-gradient-to-r from-primary/80 to-primary"
                      aria-label={`${metrics.usageMetrics.usagePercentage}% of monthly page quota used`}
                    />
                  </motion.div>
                </div>
                <div className="flex flex-wrap items-center text-sm text-muted-foreground gap-3 pt-1">
                  <span className="font-medium">{metrics.usageMetrics.usagePercentage}% Used</span>
                  <span className="text-muted">|</span>
                  <span>{metrics.usageMetrics.remainingPages} Pages Remaining</span>
                  <span className="text-muted">|</span>
                  <span>{calculateDaysLeft(undefined)} Days Left</span>
                  <Button variant="outline" size="sm" asChild className="ml-auto shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors">
                    <a href="/dashboard/settings?tab=billing">Manage Subscription</a>
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No usage data available.</p>
            )}
          </CardContent>
        </Card>
      </motion.div>
      
      {/* Tabs */}
      <Tabs defaultValue="usage" className="mt-3">
        <TabsList className="mb-5 bg-muted/40 p-1 shadow-sm">
          <TabsTrigger value="usage" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200">
            Usage Trends
          </TabsTrigger>
          <TabsTrigger value="quality" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200">
            Processing Quality
          </TabsTrigger>
        </TabsList>
        
        {/* Usage Trends Tab */}
        <TabsContent value="usage">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Processing Volume Chart */}
            <motion.div {...chartAnimationConfig}>
              <Card className="shadow-md border-muted overflow-hidden bg-gradient-to-b from-background to-muted/20">
                <CardHeader className="bg-background/50 pb-3">
                  <CardTitle>Daily Processing Volume</CardTitle>
                  <CardDescription>Documents processed per day</CardDescription>
                </CardHeader>
                <CardContent className="h-[350px] pt-5">
                  {isLoading ? (
                    <Skeleton className="w-full h-full rounded-md" />
                  ) : prepareVolumeData().length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={prepareVolumeData()} margin={{ top: 5, right: 20, left: -5, bottom: 5 }}>
                        <defs>
                          <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={CHART_COLORS[0]} stopOpacity={0.8}/>
                            <stop offset="95%" stopColor={CHART_COLORS[0]} stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                        <XAxis 
                          dataKey="date" 
                          fontSize={12} 
                          tickLine={false} 
                          axisLine={false} 
                          stroke="hsl(var(--muted-foreground))" 
                          dy={10}
                        />
                        <YAxis 
                          fontSize={12} 
                          tickLine={false} 
                          axisLine={false} 
                          allowDecimals={false} 
                          stroke="hsl(var(--muted-foreground))" 
                          dx={-5}
                        />
                        <RechartsTooltip 
                          content={<CustomTooltip />} 
                          cursor={{ fill: 'hsl(var(--accent))', opacity: 0.1, radius: 4 }} 
                        />
                        <Area 
                          type="monotone" 
                          dataKey="count" 
                          stroke={CHART_COLORS[0]} 
                          fillOpacity={1}
                          fill="url(#colorCount)"
                          strokeWidth={2.5} 
                          activeDot={{ r: 8, strokeWidth: 0 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground text-center">No processing volume data available for the selected period.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
            
            {/* Document Types Chart */}
            <motion.div {...chartAnimationConfig}>
              <Card className="shadow-md border-muted overflow-hidden bg-gradient-to-b from-background to-muted/20">
                <CardHeader className="bg-background/50 pb-3">
                  <CardTitle>Processed Document Types</CardTitle>
                  <CardDescription>Distribution by file type</CardDescription>
                </CardHeader>
                <CardContent className="h-[350px] pt-5">
                  {isLoading ? (
                    <Skeleton className="w-full h-full rounded-md" />
                  ) : prepareTypeData().length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      {prepareTypeData().length <= 5 ? (
                        <PieChart>
                          <defs>
                            {CHART_COLORS.map((color, index) => (
                              <linearGradient key={`gradient-${index}`} id={`colorGradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={color} stopOpacity={1}/>
                                <stop offset="100%" stopColor={color} stopOpacity={0.8}/>
                              </linearGradient>
                            ))}
                          </defs>
                          <Pie
                            data={prepareTypeData()}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            innerRadius={60}
                            paddingAngle={2}
                            fill="url(#colorGradient-0)"
                            stroke="#00000010"
                            strokeWidth={2}
                            labelLine={false}
                            label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                            animationBegin={200}
                            animationDuration={1200}
                            animationEasing="ease-out"
                          >
                            {prepareTypeData().map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={`url(#colorGradient-${index % CHART_COLORS.length})`} 
                              />
                            ))}
                          </Pie>
                          <RechartsTooltip content={<CustomTooltip />} />
                          <Legend 
                            iconType="circle" 
                            verticalAlign="bottom"
                            wrapperStyle={{ paddingTop: "20px" }}
                            formatter={(value) => (
                              <span style={{ color: 'hsl(var(--foreground))', fontSize: '12px', fontWeight: 500 }}>
                                {value}
                              </span>
                            )}
                          />
                        </PieChart>
                      ) : (
                        <BarChart 
                          data={prepareTypeData()} 
                          layout="vertical" 
                          margin={{ top: 5, right: 20, left: 60, bottom: 5 }}
                        >
                          <defs>
                            {CHART_COLORS.map((color, index) => (
                              <linearGradient key={`gradient-${index}`} id={`barGradient-${index}`} x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor={color} stopOpacity={0.8}/>
                                <stop offset="100%" stopColor={color} stopOpacity={1}/>
                              </linearGradient>
                            ))}
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                          <XAxis 
                            type="number" 
                            fontSize={12} 
                            tickLine={false} 
                            axisLine={false} 
                            allowDecimals={false} 
                            stroke="hsl(var(--muted-foreground))" 
                            dy={10}
                          />
                          <YAxis 
                            type="category" 
                            dataKey="name" 
                            fontSize={12} 
                            tickLine={false} 
                            axisLine={false} 
                            width={80} 
                            stroke="hsl(var(--muted-foreground))" 
                            dx={-5}
                          />
                          <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--accent))', opacity: 0.1, radius: 4 }} />
                          <Bar 
                            dataKey="value" 
                            radius={[0, 4, 4, 0]} 
                            barSize={20}
                            animationBegin={200}
                            animationDuration={1200}
                            animationEasing="ease-out"
                          >
                            {prepareTypeData().map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={`url(#barGradient-${index % CHART_COLORS.length})`} 
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground text-center">No document type data available for the selected period.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </TabsContent>
        
        {/* Processing Quality Tab */}
        <TabsContent value="quality">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Document Status Distribution */}
            <motion.div {...chartAnimationConfig}>
              <Card className="shadow-md border-muted overflow-hidden bg-gradient-to-b from-background to-muted/20">
                <CardHeader className="bg-background/50 pb-3">
                  <CardTitle>Document Status Breakdown</CardTitle>
                  <CardDescription>Status distribution of processed documents</CardDescription>
                </CardHeader>
                <CardContent className="h-[350px] pt-5 pb-10">
                  {isLoading ? (
                    <Skeleton className="w-full h-full rounded-md" />
                  ) : prepareStatusData().length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart 
                        cx="50%" 
                        cy="50%" 
                        innerRadius="20%" 
                        outerRadius="80%" 
                        barSize={20} 
                        data={prepareStatusData().map(item => ({
                          ...item,
                          value: Math.round((item.count / statusTotal) * 100)
                        }))}
                        startAngle={90}
                        endAngle={-270}
                      >
                        <RadialBar
                          label={{ 
                            position: 'insideStart', 
                            fill: '#fff', 
                            fontWeight: 600,
                            fontSize: 12
                          }}
                          background={{ fill: 'hsl(var(--muted))' }}
                          dataKey="value"
                          animationBegin={200}
                          animationDuration={1200}
                          animationEasing="ease-out"
                        />
                        <Legend 
                          iconType="circle"
                          verticalAlign="bottom"
                          layout="horizontal"
                          formatter={(value) => (
                            <span style={{ color: 'hsl(var(--foreground))', fontSize: '12px', fontWeight: 500 }}>
                              {value}
                            </span>
                          )}
                        />
                        <RechartsTooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="rounded-lg border bg-popover/95 p-3 shadow-lg backdrop-blur-sm">
                                  <div className="flex flex-col gap-1">
                                    <span className="text-[0.70rem] font-medium uppercase text-muted-foreground">
                                      {data.status}
                                    </span>
                                    <span className="text-sm font-bold text-foreground">
                                      {data.count} ({data.value}%)
                                    </span>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }} 
                        />
                      </RadialBarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground text-center">No status data available for the selected period.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
            
            {/* Common Errors */}
            <motion.div {...chartAnimationConfig}>
              <Card className="shadow-md border-muted overflow-hidden bg-gradient-to-b from-background to-muted/20">
                <CardHeader className="bg-background/50 pb-3">
                  <CardTitle>Recent Processing Errors</CardTitle>
                  <CardDescription>Top errors encountered</CardDescription>
                </CardHeader>
                <CardContent className="h-[350px] p-0">
                  <ScrollArea className="h-full p-5">
                    {isLoading ? (
                      <div className="space-y-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div key={i} className="flex items-center space-x-3">
                            <Skeleton className="h-5 w-5 rounded-full" />
                            <Skeleton className="h-5 w-full" />
                          </div>
                        ))}
                      </div>
                    ) : (metrics?.documentMetrics?.topErrors && metrics.documentMetrics.topErrors.length > 0) ? (
                      <div className="space-y-3">
                        {metrics.documentMetrics.topErrors.map((error, index) => (
                          <motion.div 
                            key={index} 
                            className="flex items-start space-x-3 p-3 rounded-lg border bg-background/50 hover:bg-muted/30 transition-colors"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.1 }}
                            whileHover={{ scale: 1.02, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
                          >
                            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <p className="text-sm font-medium leading-tight text-foreground break-all">{error.error}</p>
                              <p className="text-xs text-muted-foreground">Occurrences: {error.count}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full gap-3">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ 
                            type: "spring", 
                            stiffness: 260, 
                            damping: 20, 
                            delay: 0.3 
                          }}
                        >
                          <CheckCircle2 className="h-16 w-16 text-success" />
                        </motion.div>
                        <motion.p 
                          className="text-muted-foreground text-center"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.5 }}
                        >
                          No errors found in the selected period.
                        </motion.p>
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 