"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, FileText, FileUp, History } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
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
                <div className="text-2xl font-bold">42</div>
                <p className="text-xs text-muted-foreground">
                  +18% from last month
                </p>
              </CardContent>
            </Card>
            
            <Card className="rounded-lg overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Processing Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">89%</div>
                <p className="text-xs text-muted-foreground">
                  +2.3% from last month
                </p>
              </CardContent>
            </Card>
            
            <Card className="rounded-lg overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">23</div>
                <p className="text-xs text-muted-foreground">
                  +12 since last month
                </p>
              </CardContent>
            </Card>
            
            <Card className="rounded-lg overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Accuracy Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">95.3%</div>
                <p className="text-xs text-muted-foreground">
                  +1.1% from last month
                </p>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4 rounded-lg overflow-hidden">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Document processing and user activity from the past 30 days.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] bg-muted/30 rounded-lg flex items-center justify-center">
                  Chart Placeholder
                </div>
              </CardContent>
            </Card>
            
            <Card className="col-span-3 rounded-lg overflow-hidden">
              <CardHeader>
                <CardTitle>Recent Documents</CardTitle>
                <CardDescription>
                  Documents processed in the past 7 days.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Array.from({length: 5}).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 rounded-lg border p-3">
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">Document {i+1}</p>
                        <p className="text-xs text-muted-foreground">
                          Processed {i+1} day{i !== 0 ? 's' : ''} ago
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs font-medium text-green-500">
                          {95 + i}% accuracy
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="analytics" className="space-y-4">
          <Card className="rounded-lg overflow-hidden">
            <CardHeader>
              <CardTitle>Analytics Content</CardTitle>
              <CardDescription>
                Detailed analytics would be shown here.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[450px] bg-muted/30 rounded-lg flex items-center justify-center">
                Analytics Charts Placeholder
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="reports" className="space-y-4">
          <Card className="rounded-lg overflow-hidden">
            <CardHeader>
              <CardTitle>Reports Content</CardTitle>
              <CardDescription>
                Generated reports would be shown here.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[450px] bg-muted/30 rounded-lg flex items-center justify-center">
                Reports Charts Placeholder
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 