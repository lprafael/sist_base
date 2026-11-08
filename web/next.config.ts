import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  typescript: {
    // El código compila sin errores de tipos: la compilación debe fallar si aparece uno nuevo
    // (con ignoreBuildErrors se ocultaron fallos reales, p. ej. variables inexistentes).
    ignoreBuildErrors: false,
  },

  async redirects() {
    return [
      {
        source: '/login',
        destination: '/torneos/login',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
