/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },

  // Configure Turbopack for Next.js 16
  turbopack: {
    rules: {
      // Handle better-sqlite3 for server-side
      '*.node': {
        loaders: ['node-loader'],
        as: '*.js',
      },
    },
  },

  webpack: (config, { isServer }) => {
    if (isServer) {
      // Externalize better-sqlite3 for server-side
      config.externals.push({
        'better-sqlite3': 'commonjs better-sqlite3',
      });
    }
    return config;
  },
};

module.exports = nextConfig;
