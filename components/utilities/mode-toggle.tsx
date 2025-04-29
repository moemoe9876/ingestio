"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

export function ModeToggle() {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark"
    // Save to localStorage for persistence
    localStorage.setItem("theme", newTheme)
    setTheme(newTheme)
  }

  return (
    <Button
      variant="outline"
      size="icon"
      className="size-8 hover:bg-primary/10 hover:text-primary border-border rounded-full"
      onClick={toggleTheme}
    >
      <span className="relative">
        <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute top-0 left-0 h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      </span>
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
} 