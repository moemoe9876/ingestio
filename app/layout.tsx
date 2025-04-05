/*
<ai_context>
The root server layout for the app.
</ai_context>
*/

import { PostHogProvider } from "@/components/providers/PostHogProvider"
import { Toaster } from "@/components/ui/toaster"
import { PostHogPageview } from "@/components/utilities/posthog/posthog-pageview"
import { PostHogUserIdentify } from "@/components/utilities/posthog/posthog-user-identity"
import { TailwindIndicator } from "@/components/utilities/tailwind-indicator"
import { ThemeProvider } from "@/components/utilities/theme-provider"
import { UserInitializer } from "@/components/utilities/user-initializer"
import { cn } from "@/lib/utils"
import { ClerkProvider } from "@clerk/nextjs"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
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
      <body
        className={cn(
          "bg-background mx-auto min-h-screen w-full scroll-smooth antialiased",
          inter.className
        )}
      >
        <ClerkProvider>
          <PostHogProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="dark"
              enableSystem={false}
              disableTransitionOnChange
            >
              <UserInitializer />
              <PostHogUserIdentify />
              <PostHogPageview />

              {children}

              <TailwindIndicator />
            </ThemeProvider>
          </PostHogProvider>
        </ClerkProvider>
        <Toaster />
      </body>
    </html>
  )
}
