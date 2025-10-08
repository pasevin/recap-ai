import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Monorepo configuration - transpile packages for the browser
  transpilePackages: ['@recap-ai/shared', '@recap-ai/core'],

  // Output configuration
  output: 'standalone',

  // TypeScript configuration for builds
  typescript: {
    ignoreBuildErrors: false,
  },

  // ESLint configuration
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: false,
  },

  // Build optimization
  webpack: (config: { resolve?: { fallback?: Record<string, unknown> } }) => {
    config.resolve ??= {};
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      child_process: false,
    };
    return config;
  },
};

export default nextConfig;
