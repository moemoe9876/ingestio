// components/dashboard/site-header.tsx
"use client"

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ModeToggle } from "@/components/utilities/mode-toggle"
import { UserNav } from "@/components/utilities/user-nav"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"

interface SiteHeaderProps extends React.HTMLAttributes<HTMLElement> {}

export function SiteHeader({ className, ...props }: SiteHeaderProps) {
  const pathname = usePathname()
  const isDashboard = pathname.includes('/dashboard')

  const getTitle = () => {
    const path = pathname.split("/").filter(Boolean)
    if (path.length === 1 && path[0] === "dashboard") {
      return "Dashboard"
    }
    if (path.length > 1) {
      if (path[1] === 'review' && path.length > 2) {
        return "Review Document";
      }
      return path[1].charAt(0).toUpperCase() + path[1].slice(1).replace(/-/g, " ")
    }
    return ""
  }

  return (
    <header 
      className={cn(
        "sticky top-0 z-30 flex h-[var(--header-height)] shrink-0 items-center border-b bg-background px-4 lg:px-6 rounded-t-lg", 
        className
      )}
      {...props}
    >
      <div className="flex w-full items-center gap-1 lg:gap-2">
        {/* Sidebar Trigger - Only show in dashboard */}
        {isDashboard && (
          <>
            <SidebarTrigger className="-ml-1 text-foreground hover:bg-accent rounded-md" />
            <Separator
              orientation="vertical"
              className="mx-2 data-[orientation=vertical]:h-4"
            />
          </>
        )}
        
        {/* Page Title */}
        <h1 className="text-base font-medium text-foreground">{getTitle()}</h1>

        {/* Right Aligned Items */}
        <div className="ml-auto flex items-center gap-2 md:gap-4">
          <ModeToggle />
          <UserNav />
        </div>
      </div>
    </header>
  )
}