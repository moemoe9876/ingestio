"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Info } from "lucide-react"
import type { Dispatch, SetStateAction } from "react"
import { GlobalPromptInput } from "./GlobalPromptInput"
import { PerDocumentPromptEditor } from "./PerDocumentPromptEditor"
import { PromptStrategySelector } from "./PromptStrategySelector"

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
  return (
    <div className="space-y-6">
      {/* Strategy Selection */}
      <PromptStrategySelector
        strategy={promptStrategy}
        onStrategyChange={setPromptStrategy}
      />

      {/* Strategy-specific Content */}
      {promptStrategy === "global" && (
        <GlobalPromptInput
          prompt={globalPrompt}
          onPromptChange={setGlobalPrompt}
          placeholder="Extract invoice number, total amount, due date, and vendor information from this document."
        />
      )}

      {promptStrategy === "per-document" && (
        <PerDocumentPromptEditor
          files={files}
          prompts={perDocumentPrompts}
          onPromptsChange={setPerDocumentPrompts}
        />
      )}

      {promptStrategy === "auto" && (
        <Card className="border shadow-sm">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-foreground">Auto-Detection Enabled</h3>
              </div>
              
              <p className="text-muted-foreground leading-relaxed">
                Ingestio will automatically analyze each document, detect its type, and apply the most 
                appropriate extraction strategy. No manual prompt configuration is required.
              </p>

              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="space-y-2">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100">
                      How Auto-Detection Works
                    </h4>
                    <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                      <li>• AI analyzes document layout and content structure</li>
                      <li>• Identifies document type (invoice, contract, receipt, etc.)</li>
                      <li>• Applies optimized extraction templates automatically</li>
                      <li>• Ideal for mixed document batches with varying formats</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="pt-2 text-sm text-muted-foreground text-center">
                <span className="font-medium text-foreground">Ready to process:</span> {files.length} document{files.length !== 1 ? 's' : ''} with auto-detection
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
