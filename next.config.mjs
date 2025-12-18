/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Deshabilitar React Strict Mode para evitar warnings de Swagger UI
  reactStrictMode: false,
  // Configuración mínima para Turbopack (compatible con proyectos que además tengan `webpack` custom)
  turbopack: {},
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
