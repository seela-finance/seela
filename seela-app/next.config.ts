import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PostHog (lib/track.ts) : les envois passent par le domaine du site, puis vers l'hébergement UE de PostHog
  async rewrites() {
    return [
      { source: '/ingest/static/:path*', destination: 'https://eu-assets.i.posthog.com/static/:path*' },
      { source: '/ingest/:path*', destination: 'https://eu.i.posthog.com/:path*' },
    ]
  },
  // Requis par l'API PostHog (chemins avec barre finale)
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
