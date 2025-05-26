"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertTriangle,
  CheckCircle,
  Copy,
  Info,
  RotateCcw,
  Sparkles
} from "lucide-react"
import { useState, type Dispatch, type SetStateAction } from "react"
import { toast } from "sonner"

interface GlobalPromptInputProps {
  prompt: string
  onPromptChange: Dispatch<SetStateAction<string>>
  disabled?: boolean
  placeholder?: string
  minLength?: number
  maxLength?: number
}

export function GlobalPromptInput({
  prompt,
  onPromptChange,
  disabled = false,
  placeholder = "Enter your extraction prompt...",
  minLength = 10,
  maxLength = 1000,
}: GlobalPromptInputProps) {
  const [lastSavedPrompt, setLastSavedPrompt] = useState("")

  const getPromptStatus = () => {
    if (!prompt.trim()) return "empty"
    if (prompt.length < minLength) return "short"
    if (prompt.length > maxLength) return "long"
    return "valid"
  }

  const getStatusInfo = () => {
    const status = getPromptStatus()
    switch (status) {
      case "empty":
        return {
          icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
          text: "Prompt is required",
          color: "text-amber-600"
        }
      case "short":
        return {
          icon: <Info className="h-4 w-4 text-blue-500" />,
          text: `Prompt should be at least ${minLength} characters`,
          color: "text-blue-600"
        }
      case "long":
        return {
          icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
          text: `Prompt exceeds maximum length of ${maxLength} characters`,
          color: "text-red-600"
        }
      case "valid":
        return {
          icon: <CheckCircle className="h-4 w-4 text-green-500" />,
          text: "Prompt looks good",
          color: "text-green-600"
        }
      default:
        return {
          icon: null,
          text: "",
          color: ""
        }
    }
  }

  const getSamplePrompts = () => [
    {
      name: "Invoice Data",
      prompt: "Extract the following information from this invoice: invoice number, invoice date, due date, vendor name, vendor address, total amount, tax amount, line items with descriptions and amounts, and payment terms."
    },
    {
      name: "Contract Information",
      prompt: "Extract key contract details including: parties involved, contract type, effective date, expiration date, contract value, key terms and conditions, renewal clauses, and signature information."
    },
    {
      name: "Receipt Data",
      prompt: "Extract transaction details from this receipt: merchant name, transaction date, transaction time, total amount, payment method, items purchased with individual prices, and any applicable taxes or discounts."
    },
    {
      name: "Financial Statement",
      prompt: "Extract financial information including: company name, reporting period, revenue figures, expense categories, net income, cash flow statements, and any notable financial metrics or ratios."
    },
    {
      name: "Employee Document",
      prompt: "Extract employee information such as: full name, employee ID, position title, department, start date, salary information, contact details, and any relevant employment terms."
    },
    {
      name: "Product Catalog",
      prompt: "Extract product information including: product name, description, price, SKU, category, and any relevant product details."
    }
  ]

  const generateSamplePrompt = (sample: { name: string; prompt: string }) => {
    onPromptChange(sample.prompt)
    toast.success(`Applied "${sample.name}" template`)
  }
const copyToClipboard = async () => {
  if (!prompt.trim()) {
    toast.error("No prompt to copy")
    return
  }

  if (!navigator.clipboard) {
    toast.error("Clipboard not available in this browser")
    return
  }

  try {
    await navigator.clipboard.writeText(prompt)
    toast.success("Prompt copied to clipboard")
  } catch (error) {
    console.error("Clipboard error:", error)
    toast.error("Failed to copy prompt. Please try selecting and copying manually.")
  }
}

  const clearPrompt = () => {
    setLastSavedPrompt(prompt)
    onPromptChange("")
    toast.info("Prompt cleared")
  }

  const restorePrompt = () => {
    if (lastSavedPrompt) {
      onPromptChange(lastSavedPrompt)
      toast.success("Prompt restored")
    }
  }

  const status = getPromptStatus()
  const statusInfo = getStatusInfo()
  const characterCount = prompt.length
  const progressPercentage = Math.min((characterCount / maxLength) * 100, 100)

  return (
    <Card className="border shadow-sm">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Global Extraction Prompt</h3>
              <p className="text-sm text-muted-foreground mt-1">
                This prompt will be applied to all documents in your batch.
              </p>
            </div>
            <Badge 
              variant={status === "valid" ? "default" : status === "empty" ? "destructive" : "secondary"}
            >
              {status === "valid" ? "Ready" : status === "empty" ? "Required" : "Needs Review"}
            </Badge>
          </div>

          {/* Sample Prompts */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              <Label className="text-sm font-medium">Quick Start Templates</Label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {getSamplePrompts().slice(0, 6).map((sample) => (
                <Button
                  key={sample.name}
                  variant="outline"
                  size="sm"
                  onClick={() => generateSamplePrompt(sample)}
                  disabled={disabled}
                  className="h-auto p-2 text-left justify-start"
                >
                  <div className="truncate">
                    <div className="font-medium text-xs">{sample.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {sample.prompt.substring(0, 40)}...
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Main Input */}
          <div className="space-y-3">
            <Label htmlFor="global-prompt" className="text-sm font-medium">
              Extraction Instructions
            </Label>
            <Textarea
              id="global-prompt"
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value)}
              placeholder={placeholder}
              disabled={disabled}
              className="min-h-[120px] resize-none"
            />

            {/* Character Progress */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  {statusInfo.icon}
                  <span className={statusInfo.color}>{statusInfo.text}</span>
                </div>
                <span className="text-muted-foreground">
                  {characterCount.toLocaleString()} / {maxLength.toLocaleString()} characters
                </span>
              </div>
              
              <div className="w-full bg-muted rounded-full h-1.5">
                <div 
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    status === "valid" 
                      ? "bg-green-500" 
                      : status === "long" 
                      ? "bg-red-500" 
                      : "bg-blue-500"
                  }`}
                  data-progress={Math.min(progressPercentage, 100)}
                  style={{
                    width: `${Math.min(progressPercentage, 100)}%`
                  }}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={copyToClipboard}
                disabled={disabled || !prompt.trim()}
                className="text-xs"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={clearPrompt}
                disabled={disabled || !prompt.trim()}
                className="text-xs"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Clear
              </Button>

              {lastSavedPrompt && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={restorePrompt}
                  disabled={disabled}
                  className="text-xs"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Restore
                </Button>
              )}
            </div>

            {/* Validation Summary */}
            <div className="text-xs text-muted-foreground">
              {prompt.trim() && (
                <>
                  {status === "valid" && "✓ Ready for processing"}
                  {status === "short" && `Need ${minLength - characterCount} more characters`}
                  {status === "long" && `Remove ${characterCount - maxLength} characters`}
                </>
              )}
            </div>
          </div>

          {/* Tips */}
          <div className="p-3 bg-muted/30 rounded-lg text-sm">
            <h4 className="font-medium text-foreground mb-2">💡 Writing Effective Prompts</h4>
            <ul className="space-y-1 text-muted-foreground text-xs">
              <li>• Be specific about what data fields you want extracted</li>
              <li>• Include format preferences (e.g., "dates in MM/DD/YYYY format")</li>
              <li>• Mention how to handle missing or unclear information</li>
              <li>• Use clear, actionable language (e.g., "Extract..." rather than "Find...")</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}