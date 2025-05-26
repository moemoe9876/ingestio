"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { formatFileSize } from "@/lib/utils/format-file-size"
import {
  AlertCircle,
  CheckCircle,
  Copy,
  FileIcon,
  FileTextIcon,
  ImageIcon,
  Wand2
} from "lucide-react"
import { useState, type Dispatch, type SetStateAction } from "react"
import { toast } from "sonner"

interface FileItem {
  name: string
  size: number
  type: string
  valid: boolean
}

interface PerDocumentPromptEditorProps {
  files: FileItem[]
  prompts: Record<string, string>
  onPromptsChange: Dispatch<SetStateAction<Record<string, string>>>
  disabled?: boolean
}

export function PerDocumentPromptEditor({
  files,
  prompts,
  onPromptsChange,
  disabled = false,
}: PerDocumentPromptEditorProps) {
  const [selectedFileForCopy, setSelectedFileForCopy] = useState<string | null>(null)

  const getFileIcon = (type: string) => {
    // Handle undefined or missing file type
    if (!type) return <FileTextIcon className="h-5 w-5 text-gray-500" />
    
    if (type === "application/pdf") return <FileIcon className="h-5 w-5 text-red-500" />
    else if (type.startsWith("image/")) return <ImageIcon className="h-5 w-5 text-blue-500" />
    else return <FileTextIcon className="h-5 w-5 text-gray-500" />
  }

  const handlePromptChange = (fileName: string, value: string) => {
    onPromptsChange(prev => ({
      ...prev,
      [fileName]: value,
    }))
  }

  const copyPromptToAll = (sourceFileName: string) => {
    const sourcePrompt = prompts[sourceFileName]
    if (!sourcePrompt?.trim()) {
      toast.error("Cannot copy empty prompt")
      return
    }

    const updates: Record<string, string> = {}
    files.forEach(file => {
      if (file.name !== sourceFileName) {
        updates[file.name] = sourcePrompt
      }
    })

    onPromptsChange(prev => ({ ...prev, ...updates }))
    toast.success(`Copied prompt to ${files.length - 1} other documents`)
    setSelectedFileForCopy(null)
  }

  const generateSamplePrompt = (fileName: string, fileType: string) => {
    let samplePrompt = ""
    
    if (fileType === "application/pdf") {
      if (fileName.toLowerCase().includes("invoice")) {
        samplePrompt = "Extract invoice number, total amount, due date, vendor name, and line items from this invoice document."
      } else if (fileName.toLowerCase().includes("contract")) {
        samplePrompt = "Extract contract parties, effective date, expiration date, key terms, and signature information from this contract."
      } else if (fileName.toLowerCase().includes("receipt")) {
        samplePrompt = "Extract merchant name, transaction date, total amount, payment method, and purchased items from this receipt."
      } else {
        samplePrompt = "Extract all relevant structured data including dates, amounts, names, and key information from this document."
      }
    } else if (fileType.startsWith("image/")) {
      samplePrompt = "Extract all visible text and structured information from this image, including any forms, tables, or data fields."
    } else {
      samplePrompt = "Extract structured data and key information from this document."
    }

    handlePromptChange(fileName, samplePrompt)
    toast.success("Sample prompt generated")
  }

  const getPromptStatus = (fileName: string) => {
    const prompt = prompts[fileName]
    if (!prompt?.trim()) return "empty"
    if (prompt.length < 10) return "short"
    return "valid"
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "valid":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "short":
        return <AlertCircle className="h-4 w-4 text-amber-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-red-500" />
    }
  }

  const completedPrompts = files.filter(f => getPromptStatus(f.name) === "valid").length
  const totalFiles = files.length

  return (
    <Card className="border shadow-sm">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Per-Document Prompts</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Customize extraction prompts for each document in your batch.
              </p>
            </div>
            <Badge variant={completedPrompts === totalFiles ? "default" : "secondary"}>
              {completedPrompts}/{totalFiles} completed
            </Badge>
          </div>

          {/* Progress Indicator */}
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300" 
              data-progress={(completedPrompts / totalFiles) * 100}
              style={{ width: `${(completedPrompts / totalFiles) * 100}%` }}
            />
          </div>

          {/* Bulk Actions */}
          {completedPrompts > 0 && (
            <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground flex-1">
                Copy a prompt to all other documents:
              </p>
              <div className="flex gap-1">
                {files
                  .filter(f => getPromptStatus(f.name) === "valid")
                  .slice(0, 3)
                  .map(file => (
                    <Button
                      key={file.name}
                      variant="outline"
                      size="sm"
                      onClick={() => copyPromptToAll(file.name)}
                      className="text-xs"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      {file.name.length > 15 ? `${file.name.substring(0, 15)}...` : file.name}
                    </Button>
                  ))}
              </div>
            </div>
          )}

          {/* Document List */}
          <div className="space-y-4">
            <ScrollArea className="h-[400px] w-full">
              <div className="space-y-4 pr-4">
                {files.map((file, index) => {
                  const status = getPromptStatus(file.name)
                  return (
                    <div key={file.name} className="space-y-3">
                      {/* File Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getFileIcon(file.type)}
                          <div className="min-w-0 flex-1">
                            <h4 className="font-medium text-sm text-foreground truncate">
                              {file.name}
                            </h4>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{formatFileSize(file.size)}</span>
                              <span>•</span>
                              <span className="capitalize">
                                {file.type.replace('application/', '').replace('image/', '')}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {getStatusIcon(status)}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => generateSamplePrompt(file.name, file.type)}
                            disabled={disabled}
                            className="text-xs"
                          >
                            <Wand2 className="h-3 w-3 mr-1" />
                            Generate
                          </Button>
                        </div>
                      </div>

                      {/* Prompt Input */}
                      <div className="space-y-2">
                        <Label htmlFor={`prompt-${index}`} className="text-sm font-medium">
                          Extraction Prompt
                        </Label>
                        <Textarea
                          id={`prompt-${index}`}
                          value={prompts[file.name] || ""}
                          onChange={(e) => handlePromptChange(file.name, e.target.value)}
                          placeholder={`Enter specific extraction instructions for ${file.name}...`}
                          className="min-h-[80px] resize-none"
                          disabled={disabled}
                        />
                        
                        {/* Character Count */}
                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                          <div>
                            {status === "empty" && (
                              <span className="text-red-500">Prompt required</span>
                            )}
                            {status === "short" && (
                              <span className="text-amber-500">Prompt may be too short</span>
                            )}
                            {status === "valid" && (
                              <span className="text-green-500">Prompt looks good</span>
                            )}
                          </div>
                          <span>
                            {(prompts[file.name] || "").length} characters
                          </span>
                        </div>
                      </div>

                      {index < files.length - 1 && <Separator />}
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Summary */}
          <div className="p-3 bg-muted/30 rounded-lg text-sm">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="font-medium text-foreground">{completedPrompts}</div>
                <div className="text-muted-foreground">Prompts Configured</div>
              </div>
              <div>
                <div className="font-medium text-foreground">{totalFiles - completedPrompts}</div>
                <div className="text-muted-foreground">Remaining</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}