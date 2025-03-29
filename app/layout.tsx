/*
<ai_context>
The root server layout for the app.
</ai_context>
*/

import { PostHogProvider } from "@/components/providers/PostHogProvider"
import { Toaster } from "@/components/ui/toaster"
import { PostHogPageview } from "@/components/utilities/posthog/posthog-pageview"
import { PostHogUserIdentify } from "@/components/utilities/posthog/posthog-user-identity"
import { Providers } from "@/components/utilities/providers"
import { TailwindIndicator } from "@/components/utilities/tailwind-indicator"
import { UserInitializer } from "@/components/utilities/user-initializer"
import { cn } from "@/lib/utils"
import { ClerkProvider } from "@clerk/nextjs"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Mckay's App Template",
  description: "A full-stack web app template."
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
          <UserInitializer />
          <PostHogProvider>
            <Providers
              attribute="class"
              defaultTheme="dark"
              enableSystem={false}
              disableTransitionOnChange
            >
              <PostHogUserIdentify />
              <PostHogPageview />

              {children}

              <TailwindIndicator />

              <Toaster />
            </Providers>
          </PostHogProvider>
        </ClerkProvider>
      </body>
    </html>
  )
}
