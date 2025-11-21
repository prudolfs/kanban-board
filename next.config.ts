import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* config options here */
  // Allow self-signed certificates in development
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
}

export default nextConfig
