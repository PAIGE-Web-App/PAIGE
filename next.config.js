/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable React Strict Mode in development to prevent double rendering and improve performance
  reactStrictMode: process.env.NODE_ENV === 'production',
  
  // Optimize images
  images: {
    domains: ['lh3.googleusercontent.com', 'maps.googleapis.com', 'storage.googleapis.com'],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Implement proper caching headers
  async headers() {
    return [
      // Static assets - long cache
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Images - medium cache
      {
        source: '/_next/image(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
      // Authentication routes - no cache
      {
        source: '/(login|signup)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
      // API routes - short cache for dynamic data
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=300, stale-while-revalidate=600',
          },
        ],
      },
      // Vendor catalog pages - medium cache
      {
        source: '/vendors/catalog/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=1800, stale-while-revalidate=3600',
          },
        ],
      },
      // Authenticated pages - no cache to prevent white screen issues
      {
        source: '/(dashboard|budget|todo|moodboards|messages|files|vendors|seating-charts|settings)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
      // Default for other pages - short cache
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=60, stale-while-revalidate=300',
          },
        ],
      },
    ];
  },

  // Optimize webpack configuration for better performance
  webpack: (config, { dev, isServer }) => {
    // Fix Konva canvas issue in Next.js
    config.resolve.fallback = {
      ...config.resolve.fallback,
      canvas: false,
    };
    
    if (dev && !isServer) {
      // Enable faster refresh and reduce development overhead
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
      
      // Reduce development bundle size
      config.optimization = {
        ...config.optimization,
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false,
      };
    }
    
    // Production bundle optimization
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
            },
            firebase: {
              test: /[\\/]node_modules[\\/]firebase[\\/]/,
              name: 'firebase',
              chunks: 'all',
              priority: 20,
            },
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              name: 'react',
              chunks: 'all',
              priority: 30,
            },
            ui: {
              test: /[\\/]node_modules[\\/](framer-motion|lucide-react)[\\/]/,
              name: 'ui',
              chunks: 'all',
              priority: 15,
            },
          },
        },
      };
    }
    
    return config;
  },

  // Enable experimental features for better performance
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },

  // Add cache busting for better deployment reliability
  generateBuildId: async () => {
    return `build-${Date.now()}`;
  },
}

module.exports = nextConfig;