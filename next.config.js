/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Disable React Strict Mode in development to prevent double rendering
  ...(process.env.NODE_ENV === 'development' && {
    reactStrictMode: false,
  }),
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
  },
  // Improve development experience
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Enable faster refresh
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
}

module.exports = nextConfig;