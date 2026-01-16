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
<<<<<<< HEAD
  // Configuración mínima para Turbopack (compatible con proyectos que además tengan `webpack` custom)
  turbopack: {},
=======
>>>>>>> 1e378ec (oficina)
  // Configuración de webpack
  webpack: (config) => {
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });
    return config;
  },
  // Configuración de Turbopack (equivalente a webpack)
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
};

export default nextConfig;
