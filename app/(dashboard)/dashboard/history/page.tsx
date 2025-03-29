"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, Download, Eye, Trash2, Search, Calendar } from "lucide-react";
import Link from "next/link";

// Sample data for document history
const sampleDocuments = [
  {
    id: "doc-123",
    name: "Invoice-2023.pdf",
    type: "Invoice",
    status: "Completed",
    date: "2023-03-15T12:00:00Z",
    extractedData: true
  },
  {
    id: "doc-124",
    name: "Receipt-Feb2023.pdf",
    type: "Receipt",
    status: "Completed",
    date: "2023-02-28T09:30:00Z",
    extractedData: true
  },
  {
    id: "doc-125",
    name: "Contract-2023-Q1.pdf",
    type: "Contract",
    status: "In Progress",
    date: "2023-03-10T14:45:00Z",
    extractedData: false
  }
];

export default function HistoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  const filteredDocuments = sampleDocuments.filter(doc => {
    // Filter by search term
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by document type
    const matchesType = filterType === "all" || doc.type.toLowerCase() === filterType.toLowerCase();
    
    // Filter by status
    const matchesStatus = filterStatus === "all" || doc.status.toLowerCase() === filterStatus.toLowerCase();
    
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Document History</h1>
        <p className="text-muted-foreground">
          View and manage your previously processed documents
        </p>
      </div>
      
      <Card className="border-border">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Filter documents by type, status, or search by name
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Document Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="invoice">Invoice</SelectItem>
                <SelectItem value="receipt">Receipt</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="in progress">In Progress</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      <Card className="border-border">
        <CardHeader>
          <CardTitle>Document List</CardTitle>
          <CardDescription>
            {filteredDocuments.length} {filteredDocuments.length === 1 ? "document" : "documents"} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="grid grid-cols-6 p-4 bg-muted/50 font-medium text-sm">
              <div className="col-span-2">Document</div>
              <div>Type</div>
              <div>Status</div>
              <div>Date</div>
              <div className="text-right">Actions</div>
            </div>
            
            {filteredDocuments.length > 0 ? (
              filteredDocuments.map((doc) => (
                <div key={doc.id} className="grid grid-cols-6 p-4 border-t items-center">
                  <div className="col-span-2 font-medium">{doc.name}</div>
                  <div>{doc.type}</div>
                  <div>
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs ${
                      doc.status === "Completed" 
                        ? "bg-green-100 text-green-700"
                        : doc.status === "In Progress"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-red-100 text-red-700"
                    }`}>
                      {doc.status}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                    {formatDate(doc.date)}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/dashboard/review?id=${doc.id}`}>
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">View</span>
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Download className="h-4 w-4" />
                      <span className="sr-only">Download</span>
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                No documents found matching your criteria.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 