/** @type {import('next').NextConfig} */
import CompressionPlugin from 'compression-webpack-plugin';

const nextConfig = {
  serverExternalPackages: ['pg', 'koffi', 'ffmpeg-static', 'onnxruntime-node'],
  allowedDevOrigins: ['127.0.0.1', '192.168.0.7', 'dashboard.xn--lasmuecasderamon-bub.com'],
  images: {
    formats: ['image/avif', 'image/webp'],
    localPatterns: [
      {
        pathname: '/img/**'
      },
      {
        pathname: '/api/images/**'
      }
    ],
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

  async rewrites() {
    return [
      {
        // Serve sw.js directly from public/ — prevents any redirect or
        // compression negotiation that blocks ServiceWorker registration
        source: '/sw.js',
        destination: '/sw.js'
      }
    ];
  },

  async headers() {
    return [
      {
        // Service worker must be served without redirects, no-cache,
        // and with the correct MIME type
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' }
        ]
      },
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
        // CSP is handled by proxy.ts middleware with per-request nonces.
        // Removing static CSP here to avoid conflicting with proxy.ts nonce-based policy.
        source: '/((?!api).*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ]
      }
    ];
  },

  experimental: {
    // Política de upgrades del proyecto: seguimos los parches de seguridad de
    // Next. Sin esta declaración el aviso de advisories no se evalúa; con
    // `false` se apagaría del todo. Con `security`, una versión afectada se
    // reporta al agente para que actualice en lugar de pasar desapercibida.
    agentUpgrade: 'security',
    // Separate compiler workers release memory between the server and client builds.
    webpackBuildWorker: true,
    webpackMemoryOptimizations: true,
    optimizePackageImports: [
      'recharts',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs'
    ]
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
    // Production compilation can exceed the local heap while retaining the
    // filesystem cache alongside the module graph. Development keeps its cache.
    if (!dev) config.cache = false;

    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack']
    });

    // EXTERNALS: Exclude node modules that should NOT be bundled in client
    if (!isServer) {
      config.externals = [...(config.externals || []), { pg: 'pg' }];
    }

    if (!isServer && !dev) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          maxSize: 250_000,
          minSize: 20_000,
          cacheGroups: {
            default: false,
            vendors: false,

            // Framework core (React, ReactDOM, Next.js)
            framework: {
              name: 'framework',
              test: /[\\/]node_modules[\\/](react|react-dom|react-is|scheduler|next)[\\/]/,
              chunks: 'all',
              priority: 40,
              enforce: true
            },

            // UI Library — Radix primitives
            radix: {
              name: 'radix',
              test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
              chunks: 'all',
              priority: 35
            },

            // Charts: recharts + d3
            charts: {
              name: 'charts',
              test: /[\\/]node_modules[\\/](recharts|d3-|victory)[\\/]/,
              chunks: 'async',
              priority: 30
            },

            // PDF generation
            pdf: {
              name: 'pdf',
              test: /[\\/]node_modules[\\/](jspdf|jspdf-autotable|pdf-lib)[\\/]/,
              chunks: 'async',
              priority: 30
            },

            // All other vendor modules
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
              minSize: 30_000
            },

            // Feature-based chunk groups — route-specific components
            dashboard: {
              name: 'dashboard',
              test: /[\\/]components[\\/]dashboard[\\/]/,
              chunks: 'async',
              priority: 25
            },
            'cash-register': {
              name: 'cash-register',
              test: /[\\/]components[\\/]cash-register[\\/]/,
              chunks: 'async',
              priority: 25
            },
            users: {
              name: 'users',
              test: /[\\/]components[\\/]users[\\/]/,
              chunks: 'async',
              priority: 25
            },
            orders: {
              name: 'orders',
              test: /[\\/]components[\\/]orders[\\/]/,
              chunks: 'async',
              priority: 25
            },
            reports: {
              name: 'reports',
              test: /[\\/]components[\\/]reports[\\/]/,
              chunks: 'async',
              priority: 25
            },
            accounts: {
              name: 'accounts',
              test: /[\\/]components[\\/]accounts[\\/]/,
              chunks: 'async',
              priority: 25
            },
            sales: {
              name: 'sales',
              test: /[\\/]components[\\/]sales[\\/]/,
              chunks: 'async',
              priority: 25
            },
            attendance: {
              name: 'attendance',
              test: /[\\/]components[\\/]attendance[\\/]/,
              chunks: 'async',
              priority: 25
            },

            // Shared layout & header components
            layout: {
              name: 'layout',
              test: /[\\/]components[\\/](sidebar|header|layout|providers)[\\/]/,
              chunks: 'all',
              priority: 15
            },

            // Shared UI primitives (button, card, dialog, input, etc.)
            sharedUi: {
              name: 'shared-ui',
              test: /[\\/]components[\\/]ui[\\/]/,
              chunks: 'all',
              priority: 12,
              minChunks: 2
            },

            // Components shared across 2+ routes
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

// Bundle analyzer (ANALYZE=true pnpm build:analyze)
const withBundleAnalyzer =
  process.env.ANALYZE === 'true'
    ? (await import('@next/bundle-analyzer')).default({ enabled: true })
    : config => config;

export default withBundleAnalyzer(nextConfig);
