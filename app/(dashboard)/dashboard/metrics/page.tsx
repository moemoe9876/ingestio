"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, PieChart, LineChart, Download, Calendar, Clock, File, CheckCircle2, AlertCircle } from "lucide-react";

export default function MetricsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Performance Metrics</h1>
          <div className="flex items-center gap-2">
            <Select defaultValue="30">
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Time period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon">
              <Download className="h-4 w-4" />
              <span className="sr-only">Download report</span>
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground">
          Track your document processing performance and efficiency metrics
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents Processed</CardTitle>
            <File className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">128</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-500">↑ 12%</span> from previous period
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Processing Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">42s</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-500">↓ 8%</span> from previous period
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">98.2%</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-500">↑ 1.2%</span> from previous period
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="usage" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="usage">Usage Metrics</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="accuracy">Accuracy</TabsTrigger>
          <TabsTrigger value="efficiency">Efficiency</TabsTrigger>
        </TabsList>
        
        <TabsContent value="usage">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Document Volume by Day
                </CardTitle>
                <CardDescription>
                  Number of documents processed over time
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  {/* This would be a real chart component in production */}
                  <div className="w-full h-full bg-muted/20 rounded-md flex items-center justify-center">
                    Bar chart visualization
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-primary" />
                  Document Types
                </CardTitle>
                <CardDescription>
                  Distribution of document types processed
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  {/* This would be a real chart component in production */}
                  <div className="w-full h-full bg-muted/20 rounded-md flex items-center justify-center">
                    Pie chart visualization
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="performance">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5 text-primary" />
                Processing Time
              </CardTitle>
              <CardDescription>
                Average processing time per document (in seconds)
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <div className="flex items-center justify-center h-full text-muted-foreground">
                {/* This would be a real chart component in production */}
                <div className="w-full h-full bg-muted/20 rounded-md flex items-center justify-center">
                  Line chart visualization
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="accuracy">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  Extraction Accuracy
                </CardTitle>
                <CardDescription>
                  Accuracy of extracted data fields
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  {/* This would be a real chart component in production */}
                  <div className="w-full h-full bg-muted/20 rounded-md flex items-center justify-center">
                    Accuracy chart visualization
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-primary" />
                  Error Distribution
                </CardTitle>
                <CardDescription>
                  Most common error types in document processing
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  {/* This would be a real chart component in production */}
                  <div className="w-full h-full bg-muted/20 rounded-md flex items-center justify-center">
                    Error distribution chart
                  </div>
                </div>
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
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">CPU Utilization</div>
                    <div className="text-sm text-muted-foreground">68%</div>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div className="bg-primary h-full" style={{ width: '68%' }}></div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">Memory Usage</div>
                    <div className="text-sm text-muted-foreground">42%</div>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div className="bg-primary h-full" style={{ width: '42%' }}></div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">Concurrent Processing</div>
                    <div className="text-sm text-muted-foreground">5 documents</div>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div className="bg-primary h-full" style={{ width: '50%' }}></div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">Queue Wait Time</div>
                    <div className="text-sm text-muted-foreground">3.2s average</div>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div className="bg-primary h-full" style={{ width: '32%' }}></div>
                  </div>
                </div>
                
                <div className="pt-6">
                  <div className="rounded-md border p-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div className="text-sm font-medium">Processing Capacity</div>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Based on current usage patterns, your system can process up to <span className="font-medium">250</span> documents per day.
                    </p>
                    <div className="mt-4 text-xs text-muted-foreground flex items-center justify-between">
                      <span>Current daily average: 42 documents</span>
                      <span className="text-green-500">16.8% of capacity</span>
                    </div>
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