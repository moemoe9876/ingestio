"use client";

import { useState } from "react";
import { ResizablePanels } from "@/components/ResizablePanels";
import DocumentViewer from "@/components/DocumentViewer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, FileText, MessageSquare, RotateCcw, Edit, Save } from "lucide-react";

// Mock data for the current document
const mockDocument = {
  id: "doc-123",
  name: "Invoice-2023.pdf",
  url: "https://arxiv.org/pdf/2303.08774.pdf", // Sample PDF URL
  status: "reviewing",
  createdAt: "2023-03-15T12:00:00Z",
  extractedData: {
    invoiceNumber: "INV-2023-001",
    date: "2023-03-01",
    totalAmount: "$1,250.00",
    vendor: "Acme Corp",
    items: [
      { description: "Service A", quantity: 1, unitPrice: "$800.00", total: "$800.00" },
      { description: "Service B", quantity: 2, unitPrice: "$225.00", total: "$450.00" }
    ]
  }
};

// Sample highlight areas
const sampleHighlights = [
  {
    id: "highlight-1",
    pageNumber: 1,
    boundingBox: [10, 20, 30, 30] as [number, number, number, number], // [x1, y1, x2, y2] as percentages
    color: "#3b82f6"
  },
  {
    id: "highlight-2",
    pageNumber: 1,
    boundingBox: [40, 50, 70, 60] as [number, number, number, number],
    color: "#10b981"
  }
];

export default function ReviewPage() {
  const [activeField, setActiveField] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState(mockDocument.extractedData);
  const [isEditing, setIsEditing] = useState(false);

  const handleFieldClick = (fieldName: string) => {
    setActiveField(fieldName);
  };

  const handlePositionClick = (pageNumber: number, position: [number, number]) => {
    console.log(`Clicked at page ${pageNumber}, position: [${position[0]}, ${position[1]}]`);
    // Logic to add a new highlight or link position to a field
  };

  const handleValueChange = (field: string, value: string) => {
    setExtractedData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const toggleEditMode = () => {
    setIsEditing(!isEditing);
  };

  const saveChanges = () => {
    // Save logic would go here
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full overflow-hidden box-border">
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Document Review</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={toggleEditMode}>
              {isEditing ? (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Cancel
                </>
              ) : (
                <>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </>
              )}
            </Button>
            {isEditing && (
              <Button size="sm" onClick={saveChanges}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            )}
          </div>
        </div>
        <p className="text-muted-foreground">
          Review and verify extracted information from {mockDocument.name}
        </p>
      </div>

      <ResizablePanels 
        defaultLeftWidth={40}
        minLeftWidth={25}
        maxLeftWidth={60}
        storageKey="reviewPagePanels"
        className="flex-1 h-[calc(100%-4rem)] rounded-lg box-border"
        leftPanel={
          <div className="h-full flex flex-col p-2 box-border">
            <Card className="flex-1 border-border rounded-lg overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Document</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="h-[calc(100%-60px)] p-2">
                <DocumentViewer 
                  url={mockDocument.url} 
                  highlights={sampleHighlights}
                  onPositionClick={handlePositionClick}
                />
              </CardContent>
            </Card>
          </div>
        }
        rightPanel={
          <div className="h-full flex flex-col p-2 box-border">
            <Tabs defaultValue="data" className="flex-1 flex flex-col h-full">
              <TabsList className="mb-4">
                <TabsTrigger value="data">Extracted Data</TabsTrigger>
                <TabsTrigger value="validation">Validation</TabsTrigger>
                <TabsTrigger value="comments">Comments</TabsTrigger>
              </TabsList>
              
              <TabsContent value="data" className="flex-1 h-[calc(100%-40px)]">
                <Card className="border-border h-full rounded-lg">
                  <CardHeader>
                    <CardTitle>Extracted Information</CardTitle>
                    <CardDescription>
                      Review and validate the extracted data
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 overflow-y-auto h-[calc(100%-120px)]">
                    <div className="space-y-4">
                      {Object.entries(extractedData).map(([key, value]) => {
                        if (key === 'items') return null; // Handle items separately
                        
                        return (
                          <div 
                            key={key}
                            className={`p-3 rounded-md border ${activeField === key ? 'border-primary bg-primary/5' : 'border-border'}`}
                            onClick={() => handleFieldClick(key)}
                          >
                            <div className="text-sm font-medium text-muted-foreground mb-1">
                              {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                            </div>
                            <div className="flex items-center justify-between">
                              {isEditing ? (
                                <input 
                                  type="text" 
                                  value={value as string} 
                                  onChange={(e) => handleValueChange(key, e.target.value)}
                                  className="p-1 bg-background border border-input rounded-md w-full"
                                  aria-label={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                />
                              ) : (
                                <div className="font-medium">{value as string}</div>
                              )}
                              <Check className="h-4 w-4 text-green-500 ml-2" />
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Line items section */}
                      <div className="mt-6">
                        <h3 className="text-sm font-medium text-muted-foreground mb-3">Line Items</h3>
                        <div className="space-y-3">
                          {extractedData.items.map((item, index) => (
                            <div 
                              key={`item-${index}`}
                              className="p-3 rounded-md border border-border"
                            >
                              <div className="grid grid-cols-2 gap-2">
                                <div className="text-sm">
                                  <span className="text-muted-foreground">Description:</span>{' '}
                                  <span className="font-medium">{item.description}</span>
                                </div>
                                <div className="text-sm">
                                  <span className="text-muted-foreground">Quantity:</span>{' '}
                                  <span className="font-medium">{item.quantity}</span>
                                </div>
                                <div className="text-sm">
                                  <span className="text-muted-foreground">Unit Price:</span>{' '}
                                  <span className="font-medium">{item.unitPrice}</span>
                                </div>
                                <div className="text-sm">
                                  <span className="text-muted-foreground">Total:</span>{' '}
                                  <span className="font-medium">{item.total}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="validation" className="flex-1 h-[calc(100%-40px)]">
                <Card className="border-border h-full rounded-lg">
                  <CardHeader>
                    <CardTitle>Validation Rules</CardTitle>
                    <CardDescription>
                      Check for validation issues in the extracted data
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="overflow-y-auto h-[calc(100%-120px)]">
                    <div className="flex items-center justify-center h-60 border border-dashed rounded-md">
                      <p className="text-muted-foreground">No validation issues found</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="comments" className="flex-1 h-[calc(100%-40px)]">
                <Card className="border-border h-full rounded-lg">
                  <CardHeader>
                    <CardTitle>Comments & Notes</CardTitle>
                    <CardDescription>
                      Add comments or notes about this document
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="overflow-y-auto h-[calc(100%-120px)]">
                    <div className="flex flex-col h-60">
                      <div className="flex-1 border rounded-md p-3 mb-3 overflow-y-auto">
                        <div className="text-muted-foreground text-center py-10">
                          No comments yet
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="Add a comment..."
                          className="flex-1 p-2 border border-input rounded-md"
                        />
                        <Button size="sm">
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Add
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        }
      />
    </div>
  );
} 