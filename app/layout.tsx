/*
<ai_context>
The root server layout for the app.
</ai_context>
*/

import { Toaster } from "@/components/ui/toaster"
import { PostHogProvider, PostHogUserIdentity } from "@/components/utilities/posthog"
import { TailwindIndicator } from "@/components/utilities/tailwind-indicator"
import { UserInitializer } from "@/components/utilities/user-initializer"
import { cn } from "@/lib/utils"
import { ClerkProvider } from "@clerk/nextjs"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import Script from "next/script"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Ingestio.io | AI-Powered Document Processing",
  description: "Extract data from documents in seconds with our AI-powered platform. Process invoices, receipts, and more with 99% accuracy."
}

export default async function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  // We'll handle user initialization in client components instead
  // to avoid auth() detection issues

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="theme-script" strategy="beforeInteractive">
          {`
            (function() {
              // Get theme preference from localStorage or system
              function getThemePreference() {
                if (typeof localStorage !== 'undefined' && localStorage.getItem('theme')) {
                  return localStorage.getItem('theme');
                }
                return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
              }
              
              // Apply theme class to <html> element
              const theme = getThemePreference();
              document.documentElement.classList.toggle('dark', theme === 'dark');
              
              // Watch for system theme changes
              const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
              mediaQuery.addEventListener('change', (e) => {
                if (!localStorage.getItem('theme')) {
                  document.documentElement.classList.toggle('dark', e.matches);
                }
              });
            })();
          `}
        </Script>
      </head>
      <body
        className={cn(
          "bg-background mx-auto min-h-screen w-full scroll-smooth antialiased",
          inter.className
        )}
      >
        <ClerkProvider>
          <PostHogProvider>
            <UserInitializer />
            <PostHogUserIdentity />

            {children}

            <TailwindIndicator />
          </PostHogProvider>
        </ClerkProvider>
        <Toaster />
      </body>
    </html>
  )
}
