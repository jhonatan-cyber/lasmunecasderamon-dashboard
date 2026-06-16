/** @type {import('next').NextConfig} */
import CompressionPlugin from 'compression-webpack-plugin';

const nextConfig = {
  allowedDevOrigins: ['dashboard.xn--lasmuecasderamon-bub.com'],
  images: {
    unoptimized: true,
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**'
      }
    ]
  },
  reactStrictMode: true,

  compress: true,

  async headers() {
    return [
      {
        source: '/api/notifications/sse',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-transform, no-store, must-revalidate'
          },
          {
            key: 'Pragma',
            value: 'no-cache'
          },
          {
            key: 'Expires',
            value: '0'
          },
          {
            key: 'Connection',
            value: 'keep-alive'
          }
        ]
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET,POST,PUT,PATCH,DELETE,OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With'
          },
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          }
        ]
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          }
        ]
      }
    ];
  },

  modularizeImports: {
    '@radix-ui/react-icons': {
      transform: '@radix-ui/react-icons/dist/{{member}}'
    }
  },

  // Optimización experimental de paquetes
  experimental: {
    optimizePackageImports: [
      'recharts',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast'
    ],

    optimisticClientCache: true
  },

  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js'
      }
    }
  },

  webpack: (config, { isServer, dev }) => {
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack']
    });

    // EXTERNALS: Exclude node modules that should NOT be bundled in client
    if (!isServer) {
      config.externals = [
        ...(config.externals || []),
        // Prevent mysql2 from being bundled in client - only server-side
        { mysql2: 'mysql2' }
      ];
    }

    if (!isServer && !dev) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,

            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20
            },
            radix: {
              name: 'radix',
              test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
              chunks: 'all',
              priority: 30
            },
            charts: {
              name: 'charts',
              test: /[\\/]node_modules[\\/](recharts|d3-)[\\/]/,
              chunks: 'async',
              priority: 25
            },
            pdf: {
              name: 'pdf',
              test: /[\\/]node_modules[\\/](jspdf|jspdf-autotable)[\\/]/,
              chunks: 'async',
              priority: 25
            },
            reports: {
              name: 'reports',
              test: /[\\/]components[\\/]reports[\\/]/,
              chunks: 'async',
              priority: 25
            },
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true
            }
          }
        }
      };

      if (!dev) {
        config.plugins.push(
          new CompressionPlugin({
            filename: '[path][base].gz',
            algorithm: 'gzip',
            test: /\.(js|css|html|svg)$/,
            threshold: 10240,
            minRatio: 0.8,
            deleteOriginalAssets: false
          })
        );

        config.plugins.push(
          new CompressionPlugin({
            filename: '[path][base].br',
            algorithm: 'brotliCompress',
            test: /\.(js|css|html|svg)$/,
            compressionOptions: {
              level: 11
            },
            threshold: 10240,
            minRatio: 0.8,
            deleteOriginalAssets: false
          })
        );
      }
    }

    return config;
  }
};

export default nextConfig;
