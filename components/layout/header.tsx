"use client";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { UserNav } from "@/components/utilities/user-nav";
import { useAuth as useClerkAuth, useUser } from "@clerk/nextjs";
import { AnimatePresence, motion } from "framer-motion";
import { FileText, Loader2, Menu, Moon, Sun, X } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useEffect, useState } from "react";

interface NavItem {
  href: string;
  label: string;
  id: string;
}

const navItems: NavItem[] = [
  { href: "#features", label: "Features", id: "features" },
  { href: "#how-it-works", label: "How It Works", id: "how-it-works" },
  { href: "#testimonials", label: "Testimonials", id: "testimonials" },
  { href: "#pricing", label: "Pricing", id: "pricing" },
];

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");
  const { theme, setTheme } = useTheme();
  const { user, isLoaded } = useUser();
  const { signOut } = useClerkAuth();
  const loading = !isLoaded;

  // Handle scroll events
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);

      // Determine active section
      const scrollPosition = window.scrollY + 100;

      // This would need to be connected to your actual section refs
      // For simplicity we're handling just the navigation state
      const sectionIds = ["hero", "features", "how-it-works", "testimonials", "pricing"];
      const sections = document.querySelectorAll<HTMLElement>('[id^="' + sectionIds.join('"], [id^="') + '"]');

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        if (section && section.offsetTop <= scrollPosition) {
          setActiveSection(section.id);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b transition-all duration-300 ${
        scrolled 
          ? "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-border/40" 
          : "bg-transparent border-transparent"
      }`}
    >
      <div className="container flex h-16 items-center justify-between py-4">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-2"
        >
          <div className="bg-primary p-1.5 rounded-lg relative overflow-hidden group">
            <div className="absolute inset-0 bg-white/20 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
            <FileText className="h-5 w-5 text-primary-foreground relative z-10" />
          </div>
          <span className="font-bold text-xl">
            Ingestio<span className="text-primary">.io</span>
          </span>
        </motion.div>

        {/* Desktop navigation */}
        <nav className="hidden md:flex items-center justify-center gap-8">
          {navItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`text-sm font-medium transition-colors hover:text-primary relative ${
                activeSection === item.id 
                  ? "text-primary" 
                  : "text-muted-foreground"
              }`}
            >
              {item.label}
              {activeSection === item.id && (
                <motion.div
                  layoutId="activeSection"
                  className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary rounded-full"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </Link>
          ))}
        </nav>

        {/* Mobile menu button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="md:hidden"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          whileTap={{ scale: 0.95 }}
        >
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </motion.button>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  <span className="sr-only">Toggle theme</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Toggle {theme === "dark" ? "light" : "dark"} mode</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : user ? (
            <>
              <Button variant="ghost" asChild>
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              <UserNav />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                Log in
              </Link>
              <Button asChild className="relative overflow-hidden group">
                <Link href="/signup">
                  <span className="relative z-10">Get Started</span>
                  <span className="absolute inset-0 bg-white/20 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden border-t bg-background overflow-hidden"
          >
            <div className="container py-4 flex flex-col gap-4">
              {/* Mobile navigation */}
              {navItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link
                    href={item.href}
                    className="text-sm font-medium py-2 hover:text-primary block"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                </motion.div>
              ))}
              
              {/* Mobile theme toggle */}
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  >
                    {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    <span className="sr-only">Toggle theme</span>
                  </Button>
                  <span className="text-sm">Theme</span>
                </div>
              </div>
              
              {/* Mobile auth actions */}
              <div className="flex flex-col gap-2 pt-2 border-t">
                {loading ? (
                  <div className="flex justify-center py-2"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : user ? (
                  <>
                    <Link href="/dashboard" className="text-sm font-medium py-2 hover:text-primary" onClick={() => setIsMenuOpen(false)}>Dashboard</Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="text-sm font-medium py-2 hover:text-primary"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Log in
                    </Link>
                    <Button asChild className="w-full">
                      <Link href="/signup" onClick={() => setIsMenuOpen(false)}>Get Started</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
} 