import { nextJsHandler } from '@convex-dev/better-auth/nextjs'

// The nextJsHandler proxies auth requests to Convex
// It uses NEXT_PUBLIC_CONVEX_SITE_URL from environment variables
export const { GET, POST } = nextJsHandler()
