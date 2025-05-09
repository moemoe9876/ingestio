/*
<ai_context>
Contains middleware for protecting routes, checking user authentication, and redirecting as needed.
</ai_context>
*/

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  "/",
  "/login(.*)",
  "/signup(.*)",
  "/api/webhooks/clerk",
  "/api/webhooks/stripe(.*)",
  "/api/stripe/webhooks(.*)",
  "/pricing",
  "/about",
  "/contact",
  "/terms",
  "/privacy"
]);

// Define dashboard routes that require authentication
const isDashboardRoute = createRouteMatcher([
  "/dashboard",
  "/dashboard/upload(.*)",
  "/dashboard/review(.*)",
  "/dashboard/history(.*)",
  "/dashboard/metrics(.*)",
  "/dashboard/settings(.*)",
  "/dashboard/batch-upload(.*)",
  "/dashboard/billing(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // Protect dashboard routes - this will automatically redirect to login if not authenticated
  if (isDashboardRoute(req)) {
    await auth.protect();
  }
}, { debug: process.env.NODE_ENV === 'development' });

export const config = {
  matcher: [
    // Match specific routes
    "/",
    "/dashboard/:path*",
    "/api/:path*",
    "/login/:path*",
    "/signup/:path*",
    "/pricing",
    "/about",
    "/contact",
    "/terms",
    "/privacy",
    // Explicitly exclude Clerk webhook routes and static assets
    "/((?!api/webhooks/clerk|api/webhooks/stripe|api/stripe/webhooks|_next|.*\\.(?:jpg|jpeg|gif|png|webp|svg|ico)).*)",
  ],
};


