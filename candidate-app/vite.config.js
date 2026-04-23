import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'production' ? '/candidate/' : '/',
  server: {
    port: 3002,
    proxy: {
      '/api': 'http://localhost:5001',
    },
  },
}));
