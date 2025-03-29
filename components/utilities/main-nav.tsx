"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { FileText } from "lucide-react";

export function MainNav() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-2">
      <Link href="/dashboard" className="hidden items-center space-x-2 md:flex">
        <FileText className="h-6 w-6 text-primary" />
        <span className="hidden font-bold sm:inline-block">Ingestio.io</span>
      </Link>
      <nav className="hidden gap-6 md:flex">
        <Link
          href="/dashboard"
          className={cn(
            "flex items-center text-sm font-medium transition-colors hover:text-primary",
            pathname === "/dashboard"
              ? "text-foreground"
              : "text-muted-foreground"
          )}
        >
          Dashboard
        </Link>
        <Link
          href="/dashboard/upload"
          className={cn(
            "flex items-center text-sm font-medium transition-colors hover:text-primary",
            pathname === "/dashboard/upload"
              ? "text-foreground"
              : "text-muted-foreground"
          )}
        >
          Upload
        </Link>
        <Link
          href="/dashboard/history"
          className={cn(
            "flex items-center text-sm font-medium transition-colors hover:text-primary",
            pathname === "/dashboard/history"
              ? "text-foreground"
              : "text-muted-foreground"
          )}
        >
          History
        </Link>
      </nav>
    </div>
  );
} 