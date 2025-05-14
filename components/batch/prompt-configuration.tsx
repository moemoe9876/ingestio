"use client"

import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { FileIcon, FileTextIcon, ImageIcon } from "lucide-react"
import type { Dispatch, SetStateAction } from "react"

interface FileItem {
  name: string
  size: number
  type: string
  valid: boolean
}

interface PromptConfigurationProps {
  promptStrategy: "global" | "per-document" | "auto"
  setPromptStrategy: Dispatch<SetStateAction<"global" | "per-document" | "auto">>
  globalPrompt: string
  setGlobalPrompt: Dispatch<SetStateAction<string>>
  perDocumentPrompts: Record<string, string>
  setPerDocumentPrompts: Dispatch<SetStateAction<Record<string, string>>>
  files: FileItem[]
}

export function PromptConfiguration({
  promptStrategy,
  setPromptStrategy,
  globalPrompt,
  setGlobalPrompt,
  perDocumentPrompts,
  setPerDocumentPrompts,
  files,
}: PromptConfigurationProps) {
  const getFileIcon = (type: string) => {
    if (type === "application/pdf") return <FileIcon className="h-5 w-5 text-red-500" />
    else if (type.startsWith("image/")) return <ImageIcon className="h-5 w-5 text-blue-500" />
    else return <FileTextIcon className="h-5 w-5 text-gray-500" />
  }

  const handlePerDocumentPromptChange = (fileName: string, value: string) => {
    setPerDocumentPrompts({
      ...perDocumentPrompts,
      [fileName]: value,
    })
  }

  return (
    <div className="space-y-5">
      <div className="bg-white border rounded-lg p-5">
        <h2 className="text-lg font-medium mb-3">Prompt Strategy</h2>

        <RadioGroup
          value={promptStrategy}
          onValueChange={(value) => setPromptStrategy(value as "global" | "per-document" | "auto")}
          className="space-y-3"
        >
          <div className="flex items-start space-x-2">
            <RadioGroupItem value="global" id="global" className="mt-1" />
            <div className="grid gap-1">
              <Label htmlFor="global" className="font-medium">
                Global Prompt
              </Label>
              <p className="text-sm text-gray-500">Apply the same extraction prompt to all documents in this batch.</p>
            </div>
          </div>

          <div className="flex items-start space-x-2">
            <RadioGroupItem value="per-document" id="per-document" className="mt-1" />
            <div className="grid gap-1">
              <Label htmlFor="per-document" className="font-medium">
                Per-Document Prompt
              </Label>
              <p className="text-sm text-gray-500">Configure individual extraction prompts for each document.</p>
            </div>
          </div>

          <div className="flex items-start space-x-2">
            <RadioGroupItem value="auto" id="auto-detect" className="mt-1" />
            <div className="grid gap-1">
              <Label htmlFor="auto-detect" className="font-medium">
                Auto-Detect & Prompt
              </Label>
              <p className="text-sm text-gray-500">
                Let the system automatically detect document types and apply appropriate extraction settings.
              </p>
            </div>
          </div>
        </RadioGroup>
      </div>

      {/* Conditional UI based on selected strategy */}
      <div className="bg-white border rounded-lg p-5">
        {promptStrategy === "global" && (
          <div className="space-y-3">
            <div>
              <Label htmlFor="global-prompt" className="text-base font-medium">
                Enter Global Extraction Prompt
              </Label>
              <p className="text-sm text-gray-500 mt-1 mb-2">
                This prompt will be applied to all documents in the batch.
              </p>
              <Textarea
                id="global-prompt"
                value={globalPrompt}
                onChange={(e) => setGlobalPrompt(e.target.value)}
                placeholder="Extract invoice number, total amount, and due date."
                className="min-h-[50px]"
              />
            </div>
          </div>
        )}

        {promptStrategy === "per-document" && (
          <div className="space-y-3">
            <h3 className="text-base font-medium">Configure Individual Document Prompts</h3>
            <p className="text-sm text-gray-500">Customize extraction prompts for each document in your batch.</p>

            <div className="relative w-full h-[280px] border rounded-md">
              <ScrollArea className="h-full w-full">
                <div className="space-y-4 p-3">
                  {files.map((file) => (
                    <div key={file.name} className="space-y-2 pb-3 border-b last:border-0">
                      <div className="flex items-center gap-2">
                        {getFileIcon(file.type)}
                        <span className="font-medium">{file.name}</span>
                      </div>
                      <Textarea
                        value={perDocumentPrompts[file.name] || ""}
                        onChange={(e) => handlePerDocumentPromptChange(file.name, e.target.value)}
                        placeholder={`Enter extraction prompt for ${file.name}`}
                        className="min-h-8"
                      />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}

        {promptStrategy === "auto" && (
          <div className="space-y-3 p-4 bg-gray-50 rounded-md">
            <h3 className="text-base font-medium">Auto-Detect & Prompt</h3>
            <p className="text-sm text-gray-600">
              Ingestio will automatically detect the document type and apply the best extraction settings. No prompt
              needed here.
            </p>
            <div className="flex items-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-md text-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-info"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
              <p>
                Our system will analyse each document, identify its type, and extract relevant information automatically.
                This is ideal for mixed document batches.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
