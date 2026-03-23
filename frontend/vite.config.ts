import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/** Used by `vite dev` and `vite preview` so `/api` hits the backend in local E2E. */
const apiProxy = {
  '/api': {
    target: 'http://localhost:3001',
    changeOrigin: true,
  },
  '/socket.io': {
    target: 'http://localhost:3001',
    changeOrigin: true,
    ws: true,
  },
  '/uploads': {
    target: 'http://localhost:3001',
    changeOrigin: true,
  },
} as const;

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: apiProxy,
  },
  preview: {
    proxy: apiProxy,
  },
});
