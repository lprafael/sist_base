import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@capacitor-community/background-geolocation': path.resolve(__dirname, './src/mocks/backgroundGeolocationMock.js'),
    },
  },
  server: {
    port: 3001,
    open: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8002',
        // target: 'http://172.16.222.222:8002',
        changeOrigin: true,
      },
    },
  },
});
