/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  serverExternalPackages: ['swisseph', 'puppeteer'],
  // Target modern browsers to eliminate unnecessary polyfills
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
}

module.exports = nextConfig
