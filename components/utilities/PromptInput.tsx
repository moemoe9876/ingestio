"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Settings } from "lucide-react";
import { useEffect, useState } from "react";

interface ExtractionOptions {
  includeConfidence: boolean;
  detectDocumentType: boolean;
  temperature: number;
}

interface PromptInputProps {
  onSubmit: (prompt: string, options: ExtractionOptions) => void;
}

export function PromptInput({ onSubmit }: PromptInputProps) {
  const [prompt, setPrompt] = useState("");
  const [options, setOptions] = useState<ExtractionOptions>({
    includeConfidence: false,

    detectDocumentType: true,
    temperature: 0.1
  });

  useEffect(() => {
    if (prompt.trim()) {
      onSubmit(prompt.trim(), options);
    }
  }, [prompt, options, onSubmit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onSubmit(prompt.trim(), options);
    }
  };

  const updateOption = (key: keyof ExtractionOptions, value: boolean | number) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">
            Specify EXACTLY what information you want to extract from the document. <strong>Only the specified information</strong> will be extracted and displayed in the results.
          </p>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="hover:bg-secondary/50">
                <Settings className="h-4 w-4 mr-2" />
                Extraction Options
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 bg-background/90 backdrop-blur-sm border-secondary">
              <div className="space-y-4">
                <h4 className="font-medium">Extraction Settings</h4>
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="confidence">Include Confidence Scores</Label>
                    <p className="text-xs text-muted-foreground">
                      Add confidence values for each extracted field
                    </p>
                  </div>
                  <Switch 
                    id="confidence" 
                    checked={options.includeConfidence}
                    onCheckedChange={(checked) => updateOption("includeConfidence", checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="doctype">Detect Document Type</Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically identify document type
                    </p>
                  </div>
                  <Switch 
                    id="doctype" 
                    checked={options.detectDocumentType}
                    onCheckedChange={(checked) => updateOption("detectDocumentType", checked)}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="temperature">AI Temperature: {options.temperature}</Label>
                  </div>
                  <Slider
                    id="temperature"
                    min={0}
                    max={1}
                    step={0.1}
                    value={[options.temperature]}
                    onValueChange={(value) => updateOption("temperature", value[0])}
                  />
                  <p className="text-xs text-muted-foreground">
                    Lower values are more precise, higher values more creative
                  </p>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <Textarea
        id="prompt"
        className="min-h-[100px] border-secondary resize-none"
        placeholder="Be SPECIFIC about exactly what information you want to extract. ONLY these fields will be shown in results:
- Example: Extract ONLY the name of the sender and recipient from this email
- Example: Extract ONLY the invoice number, date, and total amount
- Example: Extract ONLY the shipping address and order number from this receipt"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />
    </form>
  );
}
