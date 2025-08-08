/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Configuración para producción con proxy
  ...(process.env.NODE_ENV === 'production' && {
    // Configurar para manejar HTTPS detrás de proxy
    serverRuntimeConfig: {
      // Permitir que Next.js confíe en headers del proxy
      trustProxy: true,
    },
  }),
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
