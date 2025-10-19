/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable React Strict Mode in development to prevent double rendering and improve performance
  reactStrictMode: process.env.NODE_ENV === 'production',
  
  // Optimize serverless function size for Vercel
  outputFileTracingRoot: __dirname,
  
  // Mark heavy packages as external (don't bundle into each function)
  serverExternalPackages: [
    '@pinecone-database/pinecone',
    'sharp',
    'canvas',
    'firebase-admin',
    '@sendgrid/mail',
    'googleapis',
    'pdfjs-dist',
    '@google-cloud',
    'twilio',
    're2',
    'ngrok',
  ],
  
  // Exclude patterns from file tracing (reduces function size dramatically)
  outputFileTracingExcludes: {
    '*': [
      'node_modules/@swc/core-linux-x64-gnu',
      'node_modules/@swc/core-linux-x64-musl',
      'node_modules/@esbuild/darwin-x64',
      'node_modules/@esbuild/linux-x64',
      'node_modules/typescript',
      'node_modules/@types',
      'node_modules/eslint',
      'node_modules/prettier',
      'node_modules/webpack',
      '.git',
      '.github',
      '.vscode',
      'docs',
      'scripts',
      '*.md',
      // Exclude entire public directory from serverless functions (served via CDN)
      'public/**',
    ],
    '/api/**': [
      // Exclude entire public directory from API routes
      'public/**',
      
      // Exclude client-side only dependencies from API routes
      'node_modules/react-dom/client',
      'node_modules/framer-motion',
      'node_modules/@hello-pangea',
      'node_modules/canvas-confetti',
      'node_modules/react-easy-crop',
      'node_modules/react-datepicker',
      'node_modules/react-big-calendar',
      'node_modules/rc-slider',
      'node_modules/react-range',
      'node_modules/react-window',
      'node_modules/@tanstack/react-table',
      'node_modules/@tanstack/react-virtual',
      'node_modules/fuse.js',
      'node_modules/browser-image-compression',
      'node_modules/react-easy-crop',
      'node_modules/use-places-autocomplete',
      'node_modules/xlsx',
      
      // Exclude large locales and unused files
      'node_modules/date-fns/locale',
      'node_modules/googleapis/build/src/apis/!(calendar|gmail)',
      'node_modules/pdfjs-dist/legacy',
      'node_modules/firebase/!(app|auth|firestore)',
    ],
  },
  
  // Enable experimental features for better performance
  experimental: {
    // Tree-shake large icon libraries
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', 'framer-motion', 'date-fns'],
  },
  
  
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

  // Add cache busting for better deployment reliability
  generateBuildId: async () => {
    return `build-${Date.now()}`;
  },
}

module.exports = nextConfig;