/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone', // Required for Azure deployment
  images: {
    domains: ['avatars.githubusercontent.com', 'ui-avatars.com'],
    // Enable modern image formats
    formats: ['image/avif', 'image/webp'],
  },

  // Bundle optimization
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Experimental optimizations
  experimental: {
    // Enable optimized package imports
    optimizePackageImports: [
      '@heroicons/react',
      'framer-motion',
      'react-hot-toast',
      'zustand',
      '@tanstack/react-query',
    ],
  },

  // Webpack optimizations
  webpack: (config, { isServer, dev }) => {
    // Production optimizations only
    if (!dev && !isServer) {
      // Split chunks for better caching
      config.optimization.splitChunks = {
        chunks: 'all',
        minSize: 20000,
        maxSize: 244000,
        cacheGroups: {
          // Vendor chunk for node_modules
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
          },
          // Separate chunk for AI-related code
          ai: {
            test: /[\\/]src[\\/](lib[\\/]ai|hooks[\\/]useAI|stores[\\/]behavior)/,
            name: 'ai',
            chunks: 'all',
            priority: 20,
          },
          // Separate chunk for UI components
          components: {
            test: /[\\/]src[\\/]components[\\/]NG2/,
            name: 'ng2-components',
            chunks: 'all',
            priority: 15,
          },
          // Common shared code
          common: {
            minChunks: 2,
            priority: -10,
            reuseExistingChunk: true,
          },
        },
      }
    }

    return config
  },

  // Headers for caching
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },

  // Modular imports (tree-shaking)
  modularizeImports: {
    '@heroicons/react/24/outline': {
      transform: '@heroicons/react/24/outline/{{member}}',
    },
    '@heroicons/react/24/solid': {
      transform: '@heroicons/react/24/solid/{{member}}',
    },
  },
}

module.exports = nextConfig