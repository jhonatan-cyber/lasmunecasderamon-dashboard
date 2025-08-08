/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
  // Configuración para producción con proxy
  ...(process.env.NODE_ENV === 'production' && {
    // Confiar en el proxy para headers de seguridad
    trustHostHeader: true,
    // Configurar para manejar HTTPS detrás de proxy
    serverRuntimeConfig: {
      // Permitir que Next.js confíe en headers del proxy
      trustProxy: true,
    },
  }),
  // Configuración de imágenes
  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Configuración de webpack
  webpack: (config) => {
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });
    return config;
  },
};

export default nextConfig;
