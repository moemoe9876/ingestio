"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Wand2, Settings } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

interface ExtractionOptions {
  includeConfidence: boolean;
  includePositions: boolean;
  detectDocumentType: boolean;
  temperature: number;
}

interface PromptInputProps {
  onSubmit: (prompt: string, options: ExtractionOptions) => void;
  file: File | null;
}

export function PromptInput({ onSubmit, file }: PromptInputProps) {
  const [prompt, setPrompt] = useState("");
  const [options, setOptions] = useState<ExtractionOptions>({
    includeConfidence: true,
    includePositions: false,
    detectDocumentType: true,
    temperature: 0.0
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
            Specify EXACTLY what information you want to extract from the document. Only this information will be extracted.
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
                    <Label htmlFor="positions">Include Position Data</Label>
                    <p className="text-xs text-muted-foreground">
                      Add location bounding boxes for each field
                    </p>
                  </div>
                  <Switch 
                    id="positions" 
                    checked={options.includePositions}
                    onCheckedChange={(checked) => updateOption("includePositions", checked)}
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
        placeholder="Be specific about exactly what you want to extract, for example:
- Extract only the name of the sender and recipient from this email
- Extract just the invoice number, date, and total amount
- Extract only the shipping address and order number from this receipt"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />
    </form>
  );
}
