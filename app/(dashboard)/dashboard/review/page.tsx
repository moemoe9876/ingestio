"use client";

import { fetchDocumentForReviewAction } from "@/actions/db/documents";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { DataVisualizer } from "@/components/utilities/DataVisualizer";
import DocumentViewer from "@/components/utilities/DocumentViewer";
import { ResizablePanels } from "@/components/utilities/ResizablePanels";
import { AlertCircle, Edit, FileText, Loader2, MessageSquare, RotateCcw, Save } from "lucide-react";
import { useEffect, useState } from "react";

interface PageProps {
  params: {
    id: string;
  };
}

interface FieldData {
  value: string | number;
  confidence: number;
  position?: {
    page_number: number;
    bounding_box: [number, number, number, number]; // [x1, y1, x2, y2] as percentages
  };
}

interface HighlightRect {
  pageNumber: number;
  boundingBox: [number, number, number, number];
  color?: string;
  id: string;
}

type ExtractedData = {
  [key: string]: FieldData | FieldData[] | { [key: string]: any };
};

interface ExtractionMetadata {
  timestamp: string;
  model: string;
  prompt: string;
  processingTimeMs: number;
  jobId?: string;
  options?: {
    includePositions?: boolean;
    includeConfidence?: boolean;
  };
}

// Helper function for updating nested data safely
const updateNestedExtractedData = (
  data: ExtractedData | null,
  path: string,
  newValue: string | number
): ExtractedData | null => {
  if (!data) return null;

  try {
    const newData = JSON.parse(JSON.stringify(data)); // Deep copy
    const pathParts = path.split('.');
    let currentLevel: any = newData;

    // Traverse to the parent of the target
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      const arrayIndex = !isNaN(parseInt(part)) ? parseInt(part) : -1;

      if (arrayIndex !== -1 && Array.isArray(currentLevel) && currentLevel[arrayIndex] !== undefined) {
        currentLevel = currentLevel[arrayIndex];
      } else if (typeof currentLevel === 'object' && currentLevel !== null && currentLevel.hasOwnProperty(part)) {
        currentLevel = currentLevel[part];
      } else {
        console.error(`Invalid path segment ${part} during update traversal`);
        return data; // Return original data if path is invalid
      }

      if (currentLevel === null || typeof currentLevel === 'undefined') {
         console.error(`Path segment ${part} leads to null/undefined`);
         return data;
      }
    }

    // Update the target value
    const finalPart = pathParts[pathParts.length - 1];
    const finalArrayIndex = !isNaN(parseInt(finalPart)) ? parseInt(finalPart) : -1;

    let targetToUpdate: any = null;
    if (finalArrayIndex !== -1 && Array.isArray(currentLevel) && currentLevel[finalArrayIndex] !== undefined) {
        targetToUpdate = currentLevel[finalArrayIndex];
    } else if (typeof currentLevel === 'object' && currentLevel !== null && currentLevel.hasOwnProperty(finalPart)) {
        targetToUpdate = currentLevel[finalPart];
    } else {
        console.error(`Cannot find final path segment ${finalPart}`);
        return data;
    }

    // Update the value property if it exists (FieldData structure)
    if (typeof targetToUpdate === 'object' && targetToUpdate !== null && 'value' in targetToUpdate) {
        targetToUpdate.value = newValue;
    } else {
         // If it's not a FieldData structure, maybe update directly? Or log error?
         // Let's assume direct update for now if not FieldData, but log a warning.
         console.warn(`Updating path "${path}" which doesn't seem to be a FieldData object. Setting value directly.`);
          if (finalArrayIndex !== -1 && Array.isArray(currentLevel)) {
             currentLevel[finalArrayIndex] = newValue;
         } else if (typeof currentLevel === 'object' && currentLevel !== null) {
             currentLevel[finalPart] = newValue;
         } else {
             console.error("Cannot update non-object/array parent.");
             return data;
         }
    }

    return newData as ExtractedData; // Assert type on return
  } catch (error) {
    console.error("Error during deep copy or update:", error);
    return data; // Return original data on error
  }
};

export default function ReviewPage({ params }: PageProps) {
  const { id } = params;
  const documentId = id;
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [extractionMetadata, setExtractionMetadata] = useState<ExtractionMetadata | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [currentHighlight, setCurrentHighlight] = useState<HighlightRect | null>(null);
  const [selectedFieldPath, setSelectedFieldPath] = useState<string | null>(null);

  const toggleEditMode = () => {
    setIsEditing(!isEditing);
    if (isEditing) {
       // Reset logic could go here if originalData state was kept
       // fetchDocumentData(); // Or refetch original data
    }
  };

  const saveChanges = () => {
    console.log("Save changes clicked. Data to save:", extractedData);
    setIsEditing(false);
    toast({ title: "Placeholder Save", description: "Changes would be saved here." });
  };

  const handlePdfPositionClick = (pageNumber: number, position: [number, number]) => {
    console.log(`PDF Clicked at page ${pageNumber}, position: [${position[0]}, ${position[1]}]`);
    // Placeholder: Add logic later if needed (e.g., findFieldByPosition and select)
  };

  const handleFieldEdit = (path: string, newValue: string | number) => {
    setExtractedData(prevData => updateNestedExtractedData(prevData, path, newValue));
  };

  const handleHighlightUpdate = (highlight: HighlightRect | null) => {
    setCurrentHighlight(highlight);
  };

  const handleFieldSelect = (path: string, value: any) => {
    console.log("[UI DEBUG] Field Selected:", path, value);
    setSelectedFieldPath(path);
  };

  useEffect(() => {
    const fetchDocumentData = async () => {
      try {
        setIsLoading(true);
        setHasError(false);
        setErrorMessage(null);
        
        if (!documentId) {
          throw new Error("Invalid document ID");
        }
        
        console.log("[UI DEBUG] Fetching document data for ID:", documentId);
        
        const result = await fetchDocumentForReviewAction(documentId);
        
        if (result.isSuccess && result.data) { // Check for success and data
          const { document, signedUrl, extractedData: docData } = result.data;
          
          // Assuming docData might be nested or plain based on backend
          const actualExtractedData = docData?.data || docData || null;
          const actualMetadata = docData?.metadata || {
             timestamp: document.updatedAt?.toISOString() || document.createdAt.toISOString(),
             model: "Unknown", // Provide default if needed
             prompt: "",
             processingTimeMs: 0,
             // Add other default fields from ExtractionMetadata if necessary
           };

          console.log("[UI DEBUG] Fetched document:", document.originalFilename);
          console.log("[UI DEBUG] Fetched signed URL:", signedUrl ? 'Yes' : 'No');
          console.log("[UI DEBUG] Extracted data keys:", actualExtractedData ? Object.keys(actualExtractedData) : 'None');
          console.log("[UI DEBUG] Extraction metadata:", actualMetadata);

          if (!actualExtractedData) {
            console.warn("[UI DEBUG] No actual extracted data found in the response.");
            // Decide how to handle - show message? Set empty state?
            // For now, setting to null which will show "No extracted data available."
            setExtractedData(null);
          } else {
             setExtractedData(actualExtractedData as ExtractedData);
          }
          
          setExtractionMetadata(actualMetadata as ExtractionMetadata);
          setFileName(document.originalFilename);
          setPdfUrl(signedUrl);

        } else {
          // Handle failure case from the action
          throw new Error(result.message || "Failed to fetch document data");
        }

      } catch (error) {
        console.error("Error fetching document data:", error);
        setHasError(true);
        setErrorMessage(error instanceof Error ? error.message : "Failed to fetch document data");
        setExtractedData(null); // Clear data on error
        setPdfUrl(null);
        setFileName(null);
        toast({
          title: "Error Loading Document",
          description: error instanceof Error ? error.message : "Could not load document details. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDocumentData();
  }, [documentId, toast]);

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
          Review and verify extracted information from {fileName || "the document"}
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
                {pdfUrl ? (
                  <DocumentViewer 
                    url={pdfUrl} 
                    highlights={currentHighlight ? [currentHighlight] : []}
                    onPositionClick={handlePdfPositionClick}
                  />
                ) : isLoading ? (
                  <div className="flex justify-center items-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mb-2" />
                    <p>Document preview unavailable.</p>
                    {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
                  </div>
                )}
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
                    {isLoading ? (
                      <div className="flex justify-center items-center h-40">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : hasError ? (
                       <div className="flex flex-col items-center justify-center h-40 text-destructive">
                         <AlertCircle className="h-8 w-8 mb-2" />
                         <p>Error loading data:</p>
                         <p className="text-sm">{errorMessage}</p>
                       </div>
                    ) : extractedData ? (
                      <DataVisualizer
                        data={extractedData}
                        onEdit={handleFieldEdit}
                        onHighlight={handleHighlightUpdate}
                        onSelect={handleFieldSelect}
                        selectedFieldPath={selectedFieldPath}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-40">
                        <p className="text-muted-foreground">No extracted data available.</p>
                      </div>
                    )}
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