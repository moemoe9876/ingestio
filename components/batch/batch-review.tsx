"use client"

import { FileIcon, ImageIcon, FileTextIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react"
import { useState } from "react"

interface FileItem {
  name: string
  size: number
  type: string
  valid: boolean
}

interface BatchReviewProps {
  files: FileItem[]
  promptStrategy: "global" | "per-document" | "auto-detect"
  globalPrompt: string
  perDocumentPrompts: Record<string, string>
}

export function BatchReview({ files, promptStrategy, globalPrompt, perDocumentPrompts }: BatchReviewProps) {
  const [showPromptDetails, setShowPromptDetails] = useState(false)
  const [showFileList, setShowFileList] = useState(false)

  const getFileIcon = (type: string) => {
    if (type === "application/pdf") return <FileIcon className="h-5 w-5 text-red-500" />
    else if (type.startsWith("image/")) return <ImageIcon className="h-5 w-5 text-blue-500" />
    else return <FileTextIcon className="h-5 w-5 text-gray-500" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B"
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    else return (bytes / (1024 * 1024)).toFixed(1) + " MB"
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
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b">
          <h2 className="text-lg font-medium">Batch Summary</h2>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="text-sm text-gray-500">Files</div>
              <div className="text-2xl font-semibold mt-1">{files.length}</div>
              <div className="text-sm text-gray-500 mt-1">Total size: {getTotalSize()}</div>
            </div>

            <div className="bg-gray-50 p-4 rounded-md">
              <div className="text-sm text-gray-500">Strategy</div>
              <div className="text-xl font-semibold mt-1">{getPromptStrategyLabel()}</div>
            </div>

            <div className="bg-gray-50 p-4 rounded-md">
              <div className="text-sm text-gray-500">Processing</div>
              <div className="text-xl font-semibold mt-1">Standard</div>
              <div className="text-sm text-gray-500 mt-1">Est. time: 2-3 minutes</div>
            </div>
          </div>

          {/* Prompt Details */}
          {promptStrategy !== "auto-detect" && (
            <div className="border rounded-md overflow-hidden">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setShowPromptDetails(!showPromptDetails)}
              >
                <h3 className="font-medium">Prompt Details</h3>
                {showPromptDetails ? (
                  <ChevronUpIcon className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                )}
              </div>

              {showPromptDetails && (
                <div className="p-4 border-t bg-gray-50">
                  {promptStrategy === "global" ? (
                    <div>
                      <div className="text-sm font-medium mb-2">Global Prompt:</div>
                      <div className="p-3 bg-white border rounded-md text-sm">{globalPrompt}</div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="text-sm font-medium">Per-Document Prompts:</div>
                      {files.map((file) => (
                        <div key={file.name} className="p-3 bg-white border rounded-md">
                          <div className="flex items-center gap-2 mb-2">
                            {getFileIcon(file.type)}
                            <span className="font-medium text-sm">{file.name}</span>
                          </div>
                          <div className="text-sm pl-2 border-l-2 border-gray-200">
                            {perDocumentPrompts[file.name] || "No prompt specified"}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* File List */}
          <div className="border rounded-md overflow-hidden">
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
              onClick={() => setShowFileList(!showFileList)}
            >
              <h3 className="font-medium">Files ({files.length})</h3>
              {showFileList ? (
                <ChevronUpIcon className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronDownIcon className="h-5 w-5 text-gray-500" />
              )}
            </div>

            {showFileList && (
              <div className="border-t divide-y">
                {files.map((file) => (
                  <div key={file.name} className="p-4 flex items-center">
                    {getFileIcon(file.type)}
                    <div className="ml-3">
                      <div className="font-medium text-sm">{file.name}</div>
                      <div className="text-xs text-gray-500">{formatFileSize(file.size)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-gray-50 border rounded-lg p-4 flex items-center gap-3">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-gray-500"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
        <p className="text-sm text-gray-600">
          Once submitted, this batch will be processed according to your plan settings. You'll receive a notification
          when processing is complete.
        </p>
      </div>
    </div>
  )
}
