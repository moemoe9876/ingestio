"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatFileSize } from "@/lib/utils/format-file-size"
import { ChevronDown, ChevronUp, FileIcon, FileTextIcon, ImageIcon, InfoIcon } from "lucide-react"
import { useState } from "react"

interface FileItem {
  name: string
  size: number
  type: string
  valid: boolean
}

interface BatchReviewProps {
  batchName?: string
  files: FileItem[]
  promptStrategy: "global" | "per-document" | "auto-detect"
  globalPrompt: string
  perDocumentPrompts: Record<string, string>
}

export function BatchReview({ batchName, files, promptStrategy, globalPrompt, perDocumentPrompts }: BatchReviewProps) {
  const [showPromptDetails, setShowPromptDetails] = useState(false)
  const [showFileList, setShowFileList] = useState(false)

  const getFileIcon = (type: string) => {
    if (type === "application/pdf") return <FileIcon className="h-5 w-5 text-red-500/80" />
    else if (type.startsWith("image/")) return <ImageIcon className="h-5 w-5 text-blue-500/80" />
    else return <FileTextIcon className="h-5 w-5 text-muted-foreground" />
  }

  const getPromptStrategyLabel = () => {
    switch (promptStrategy) {
      case "global":
        return "Global Prompt"
      case "per-document":
        return "Per-Document Prompt"
      case "auto-detect":
        return "Auto-Detect & Prompt"
    }
  }

  const getTotalSize = () => {
    const totalBytes = files.reduce((acc, file) => acc + file.size, 0)
    return formatFileSize(totalBytes)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Batch Summary</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {batchName && (
              <div className="bg-muted/50 p-4 rounded-md">
                <div className="text-sm text-muted-foreground">Batch Name</div>
                <div className="text-xl font-semibold mt-1 truncate" title={batchName}>{batchName}</div>
              </div>
            )}
            <div className="bg-muted/50 p-4 rounded-md">
              <div className="text-sm text-muted-foreground">Files</div>
              <div className="text-2xl font-semibold mt-1">{files.length}</div>
              <div className="text-sm text-muted-foreground mt-1">Total size: {getTotalSize()}</div>
            </div>

            <div className="bg-muted/50 p-4 rounded-md">
              <div className="text-sm text-muted-foreground">Strategy</div>
              <div className="text-xl font-semibold mt-1">{getPromptStrategyLabel()}</div>
            </div>

            <div className="bg-muted/50 p-4 rounded-md">
              <div className="text-sm text-muted-foreground">Processing</div>
              <div className="text-xl font-semibold mt-1">Standard</div>
              <div className="text-sm text-muted-foreground mt-1">Est. time: 2-3 minutes</div>
            </div>
          </div>

          {/* Prompt Details */}
          {promptStrategy !== "auto-detect" && (
            <div className="border rounded-md overflow-hidden">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setShowPromptDetails(!showPromptDetails)}
              >
                <h3 className="font-medium">Prompt Details</h3>
                {showPromptDetails ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>

              {showPromptDetails && (
                <div className="border-t bg-muted/30">
                  {promptStrategy === "global" ? (
                    <div className="p-4">
                      <div className="text-sm font-medium mb-2">Global Prompt:</div>
                      <div className="p-3 bg-background border rounded-md text-sm">{globalPrompt}</div>
                    </div>
                  ) : (
                    <div className="max-h-60 overflow-y-auto divide-y">
                      <div className="p-4">
                        <div className="text-sm font-medium mb-2">Per-Document Prompts:</div>
                        {files.map((file) => (
                          <div key={file.name} className="p-3 mb-3 last:mb-0 bg-background border rounded-md">
                            <div className="flex items-center gap-2 mb-2">
                              {getFileIcon(file.type)}
                              <span className="font-medium text-sm">{file.name}</span>
                            </div>
                            <div className="text-sm pl-2 border-l-2 border-muted">
                              {perDocumentPrompts[file.name] || "No prompt specified"}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* File List */}
          <div className="border rounded-md overflow-hidden">
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => setShowFileList(!showFileList)}
            >
              <h3 className="font-medium">Files ({files.length})</h3>
              {showFileList ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </div>

            {showFileList && (
              <div className="border-t divide-y max-h-60 overflow-y-auto">
                {files.map((file) => (
                  <div key={file.name} className="p-4 flex items-center">
                    {getFileIcon(file.type)}
                    <div className="ml-3">
                      <div className="font-medium text-sm">{file.name}</div>
                      <div className="text-xs text-muted-foreground">{formatFileSize(file.size)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="bg-muted/50 border rounded-lg p-4 flex items-center gap-3">
        <InfoIcon className="h-5 w-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Once submitted, this batch will be processed according to your plan settings. You'll receive a notification
          when processing is complete.
        </p>
      </div>
    </div>
  )
}
