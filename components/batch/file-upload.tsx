"use client"

import { useState } from "react"
import { FileIcon, ImageIcon, FileTextIcon, XIcon, AlertCircleIcon } from "lucide-react"

interface FileItem {
  name: string
  size: number
  type: string
  valid: boolean
  errorMessage?: string
}

export function FileUpload() {
  const [files, setFiles] = useState<FileItem[]>([
    { name: "invoice_acme_corp.pdf", size: 1.2 * 1024 * 1024, type: "application/pdf", valid: true },
    { name: "product_shot_01.png", size: 3.5 * 1024 * 1024, type: "image/png", valid: true },
    { name: "contract_draft_v3.pdf", size: 850 * 1024, type: "application/pdf", valid: true },
    {
      name: "meeting_notes.txt",
      size: 5 * 1024,
      type: "text/plain",
      valid: false,
      errorMessage: "Unsupported file type. Only PDF, JPG, PNG are allowed.",
    },
  ])

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B"
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    else return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }

  const getFileIcon = (type: string) => {
    if (type === "application/pdf") return <FileIcon className="h-5 w-5 text-red-500" />
    else if (type.startsWith("image/")) return <ImageIcon className="h-5 w-5 text-blue-500" />
    else return <FileTextIcon className="h-5 w-5 text-gray-500" />
  }

  return (
    <div className="space-y-6">
      {/* File Upload Area */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition-colors cursor-pointer">
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="p-3 bg-gray-100 rounded-full">
            <FileIcon className="h-6 w-6 text-gray-500" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Drag & drop files here or click to browse</p>
            <p className="text-xs text-gray-500">Upload your files to begin processing</p>
          </div>
          <button className="mt-4 px-4 py-2 bg-black text-white rounded-md hover:bg-black/90 transition-colors text-sm">
            Upload Files
          </button>
        </div>
      </div>

      {/* Constraints */}
      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
          <span>
            Max files per batch: <span className="font-medium">10</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
          <span>
            Allowed types: <span className="font-medium">PDF, JPG, PNG</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
          <span>
            Max file size: <span className="font-medium">50MB</span>
          </span>
        </div>
      </div>

      {/* Selected Files List */}
      {files.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b">
            <h3 className="font-medium">Selected Files ({files.filter((f) => f.valid).length} valid)</h3>
          </div>
          <div className="divide-y">
            {files.map((file, index) => (
              <div
                key={index}
                className={`px-4 py-3 flex items-center justify-between ${!file.valid ? "bg-red-50" : ""}`}
              >
                <div className="flex items-center gap-3">
                  {getFileIcon(file.type)}
                  <div>
                    <p className="font-medium text-sm">{file.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                    {!file.valid && file.errorMessage && (
                      <div className="flex items-center gap-1 text-xs text-red-600 mt-1">
                        <AlertCircleIcon className="h-3 w-3" />
                        <span>{file.errorMessage}</span>
                      </div>
                    )}
                  </div>
                </div>
                <button onClick={() => removeFile(index)} className="p-1 rounded-full hover:bg-gray-100">
                  <XIcon className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
