import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Monorepo configuration - transpile packages for the browser
  transpilePackages: ['@recap-ai/shared', '@recap-ai/core'],

  // Output configuration
  output: 'standalone',

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
