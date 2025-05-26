"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Globe, Sparkles, Target } from "lucide-react"
import type { Dispatch, SetStateAction } from "react"

interface PromptStrategySelectorProps {
  strategy: "global" | "per-document" | "auto"
  onStrategyChange: Dispatch<SetStateAction<"global" | "per-document" | "auto">>
  disabled?: boolean
}

export function PromptStrategySelector({
  strategy,
  onStrategyChange,
  disabled = false,
}: PromptStrategySelectorProps) {
  return (
    <Card className="border shadow-sm">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Prompt Strategy</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Choose how extraction prompts will be applied to your documents.
            </p>
          </div>

          <RadioGroup
            value={strategy}
            onValueChange={(value) => onStrategyChange(value as "global" | "per-document" | "auto")}
            disabled={disabled}
            className="space-y-4"
          >
            {/* Global Strategy */}
            <div className="flex items-start space-x-3 p-4 rounded-lg border transition-colors hover:bg-muted/30">
              <RadioGroupItem value="global" id="global" className="mt-1" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-blue-600" />
                  <Label htmlFor="global" className="font-medium text-foreground">
                    Global Prompt
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Apply the same extraction prompt to all documents in this batch. 
                  Best for documents with similar structure and content.
                </p>
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">Use case:</span> Processing invoices, receipts, or contracts with consistent layouts
                </div>
              </div>
            </div>

            {/* Per-Document Strategy */}
            <div className="flex items-start space-x-3 p-4 rounded-lg border transition-colors hover:bg-muted/30">
              <RadioGroupItem value="per-document" id="per-document" className="mt-1" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-green-600" />
                  <Label htmlFor="per-document" className="font-medium text-foreground">
                    Per-Document Prompt
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Configure individual extraction prompts for each document. 
                  Ideal for mixed document types requiring specific extraction rules.
                </p>
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">Use case:</span> Processing different document types (invoices, contracts, forms) in one batch
                </div>
              </div>
            </div>

            {/* Auto Strategy */}
            <div className="flex items-start space-x-3 p-4 rounded-lg border transition-colors hover:bg-muted/30">
              <RadioGroupItem value="auto" id="auto" className="mt-1" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  <Label htmlFor="auto" className="font-medium text-foreground">
                    Auto Detect
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Let AI automatically detect document types and apply appropriate extraction settings. 
                  No manual prompt configuration required.
                </p>
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">Use case:</span> Mixed documents where you want AI to handle classification and extraction
                </div>
              </div>
            </div>
          </RadioGroup>

          {/* Strategy Summary */}
          <div className="mt-4 p-3 bg-muted/30 rounded-md">
            <div className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Selected:</span>{" "}
              {strategy === "global" && "One prompt for all documents"}
              {strategy === "per-document" && "Individual prompts per document"}
              {strategy === "auto" && "AI-powered automatic detection and extraction"}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}