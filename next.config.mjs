/*
<ai_context>
Configures Next.js for the app.
</ai_context>
*/

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { hostname: "localhost" },
      { hostname: "img.clerk.com" },
      { hostname: "images.clerk.dev" }
    ]
  },
  experimental: {
    allowedDevOrigins: ["premium-slug-quietly.ngrok-free.app"],
  },
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://eu-assets.i.posthog.com/static/:path*"
      },
      {
        source: "/ingest/:path*",
        destination: "https://eu.i.posthog.com/:path*"
      },
      {
        source: "/ingest/decide",
        destination: "https://eu.i.posthog.com/decide"
      }
    ];
  },
  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
  
  turbopack: {
    // Default extensions to resolve with Turbopack
    resolveExtensions: ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.json', '.css'],
    
    // Custom loader rules for specific file types
    rules: {
      // Example: Add SVG support if needed
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
    
    // Optional: Add resolve aliases for cleaner imports
    resolveAlias: {
      // Example: '@/*': './src/*'
      canvas: './empty-module.ts',
    }
  }
};

export default nextConfig
