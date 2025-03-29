/*
<ai_context>
Contains middleware for protecting routes, checking user authentication, and redirecting as needed.
</ai_context>
*/

import { clerkMiddleware } from "@clerk/nextjs/server"

// Export the Clerk middleware
export default clerkMiddleware()

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|.*\\..*|api\\/webhook\\/clerk).*)",
    // Include the specific routes you want to protect or exclude
    "/",
    "/(api|trpc)(.*)"
  ]
}
