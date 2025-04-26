// components/utilities/app-sidebar.tsx
"use client"

import {
  BarChart3,
  CreditCard,
  FileText,
  FileUp,
  History,
  Home,
  LogOut,
  Moon,
  MoreVertical,
  PlusCircle,
  Settings,
  Sun,
  User,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { useAuth, useUser } from "@clerk/nextjs";
import { useTheme } from "next-themes";

const navMain = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Upload Document",
    url: "/dashboard/upload",
    icon: FileUp,
  },
  {
    title: "History",
    url: "/dashboard/history",
    icon: History,
  },
  {
    title: "Performance Metrics",
    url: "/dashboard/metrics",
    icon: BarChart3,
  },
  {
    title: "Batch Upload",
    url: "/dashboard/batch-upload",
    icon: FileUp,
  },
];

const navSecondary = [
  {
    title: "Settings",
    url: "/dashboard/settings",
    icon: Settings,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const router = useRouter();
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const { user, isLoaded } = useUser();
  const { signOut } = useAuth();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <Sidebar
      className="bg-sidebar dark:bg-sidebar overflow-hidden"
      {...props}
    >
      <SidebarHeader className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              className="data-[slot=sidebar-menu-button]:!p-2"
            >
              <Link href="/dashboard" className="flex items-center gap-2">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                   <FileText className="h-4 w-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight group-data-[state=collapsed]:hidden">
                  <span className="truncate font-large text-[1.5em] font-bold">Ingestio.io</span>
                  <span className="truncate text-xs text-sidebar-muted-foreground">

                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="p-2">
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-3">
              {/* Quick Upload Button */}
              <SidebarMenuItem>
                 <SidebarMenuButton
                    tooltip="Quick Upload"
                    className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground font-semibold min-w-8 duration-200 ease-linear w-full justify-center group-data-[state=expanded]:justify-start rounded-md py-3"
                    asChild
                  >
                    <Link href="/dashboard/upload">
                      <PlusCircle className="h-5 w-5" aria-hidden="true" />
                      <span className="group-data-[state=collapsed]:hidden">Quick Upload</span>
                    </Link>
                  </SidebarMenuButton>
              </SidebarMenuItem>
              {/* Main Nav Items */}
              {navMain.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    className="w-full justify-center group-data-[state=expanded]:justify-start rounded-md py-3 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                  >
                    <Link href={item.url}>
                      <item.icon className="h-5 w-5" />
                      <span className="group-data-[state=collapsed]:hidden">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Secondary Navigation (at the bottom) */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-3">
              {navSecondary.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    className="w-full justify-center group-data-[state=expanded]:justify-start rounded-md py-3 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                  >
                    <Link href={item.url}>
                      <item.icon className="h-5 w-5" />
                      <span className="group-data-[state=collapsed]:hidden">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {/* Theme Toggle */}
              <SidebarMenuItem className="group-data-[state=collapsed]:hidden">
                <SidebarMenuButton asChild className="w-full justify-start rounded-md py-3 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors">
                  <label className="flex w-full cursor-pointer items-center justify-between">
                    <div className="flex items-center gap-2">
                      {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                      <span>Dark Mode</span>
                    </div>
                    {mounted ? (
                      <Switch
                        className="ml-auto"
                        checked={theme === "dark"}
                        onCheckedChange={() =>
                          setTheme(theme === "dark" ? "light" : "dark")
                        }
                        aria-label="Toggle dark mode"
                      />
                    ) : (
                       <div className="ml-auto h-5 w-9 rounded-full bg-muted animate-pulse" />
                    )}
                  </label>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild className="w-full">
                <button className="flex items-center justify-between w-full p-3 rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sidebar-muted transition-colors duration-200">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-9 w-9 rounded-full">
                      <AvatarImage src={user?.imageUrl || undefined} alt={user?.fullName || "User"} />
                      <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground">{getInitials(user?.fullName)}</AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight group-data-[state=collapsed]:hidden">
                      <span className="truncate font-medium">{user?.fullName || "User"}</span>
                      <span className="truncate text-xs text-sidebar-muted-foreground">
                        {user?.primaryEmailAddress?.emailAddress || "No email"}
                      </span>
                    </div>
                  </div>
                  <MoreVertical className="h-4 w-4 shrink-0 text-sidebar-foreground opacity-75" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56 rounded-lg border border-border bg-black text-white shadow-lg"
                align="end"
                sideOffset={8}
              >
                <DropdownMenuLabel className="font-normal px-2 py-1.5">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.fullName || "User"}</p>
                    <p className="text-xs leading-none text-gray-400">
                      {user?.primaryEmailAddress?.emailAddress || "No email"}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-800"/>
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/profile" className="flex cursor-pointer items-center px-2 py-1.5 text-sm text-white hover:bg-gray-800">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/settings" className="flex cursor-pointer items-center px-2 py-1.5 text-sm text-white hover:bg-gray-800">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/billing" className="flex cursor-pointer items-center px-2 py-1.5 text-sm text-white hover:bg-gray-800">
                      <CreditCard className="mr-2 h-4 w-4" />
                      <span>Billing</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="bg-gray-800"/>
                <DropdownMenuItem 
                  onClick={handleSignOut}
                  className="flex cursor-pointer items-center px-2 py-1.5 text-sm text-white hover:bg-gray-800"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
