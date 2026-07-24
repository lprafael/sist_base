import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  typescript: {
    // Pre-existing pages may have type errors - skip during Docker build
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async redirects() {
    return [
      {
        source: '/login',
        destination: '/torneos/login',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
