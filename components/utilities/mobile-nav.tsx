"use client";

import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

interface MobileNavProps {
  onOpenChange: (open: boolean) => void;
}

export function MobileNav({ onOpenChange }: MobileNavProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="md:hidden"
      onClick={() => onOpenChange(true)}
    >
      <Menu className="h-5 w-5" />
      <span className="sr-only">Toggle Menu</span>
    </Button>
  );
} 