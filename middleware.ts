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
  "/api/webhook/clerk",
  "/pricing",
  "/about",
  "/contact",
  "/terms",
  "/privacy"
]);

// Define dashboard routes that require authentication
// Note: Be careful with profile routes to allow Clerk components to work properly
const isDashboardRoute = createRouteMatcher([
  "/dashboard",
  "/dashboard/upload(.*)",
  "/dashboard/review(.*)",
  "/dashboard/history(.*)",
  "/dashboard/metrics(.*)",
  "/dashboard/settings(.*)",
  "/dashboard/billing(.*)",
  // For profile, protect the main route but allow Clerk to handle sub-routes
  "/dashboard/profile",
  // Don't protect profile routes with catch-all paths to allow Clerk components to work
  // "/dashboard/profile/(.*)" - explicitly excluding
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
    // Explicitly exclude Clerk component routes
    "/((?!dashboard/profile/.*|_next|.*\\.(?:jpg|jpeg|gif|png|webp|svg|ico)).*)",
  ],
};


