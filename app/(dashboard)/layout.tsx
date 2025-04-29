// app/(dashboard)/layout.tsx
"use server";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/utilities/app-sidebar";
import { SiteHeader } from "@/components/utilities/site-header";
import { ThemeProvider } from "@/components/utilities/theme-provider";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode
}) {
  // Get the auth state - check if user is authenticated
  const authState = await auth();
  const { userId } = authState;
  
  console.log("Dashboard Layout - Auth Check:", { userId });
  
  // Redirect to login if not authenticated
  if (!userId) {
    console.log("Dashboard Layout - Redirecting to login");
    redirect("/login");
  }
  
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <SidebarProvider
        defaultOpen={true}
        style={
          {
            "--sidebar-width": "20rem", // Your desired expanded width
            "--header-height": "60px", // Your header height
            "--spacing": "0.25rem",
          } as React.CSSProperties
        }
        className="min-h-screen"
      >
        {/* Use AppSidebar with variant="inset" to match shadcn dashboard-01 */}
        <AppSidebar variant="inset" collapsible="offcanvas" />
        
        {/* Use SidebarInset for the main content area */}
        <SidebarInset className="rounded-lg overflow-hidden border border-border">
          {/* SiteHeader */}
          <SiteHeader />
          
          {/* Main content area */}
          <div className="flex flex-1 flex-col">
            <div className="flex flex-1 flex-col gap-2">
              <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6 lg:p-8">
                {children}
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ThemeProvider>
  );
}