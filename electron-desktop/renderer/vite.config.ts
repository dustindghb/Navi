import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: __dirname,
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
    host: '0.0.0.0', // Allow external connections
    cors: true, // Enable CORS for cross-origin requests
    hmr: {
      port: 5174, // Use different port for HMR to avoid conflicts
    },
  },
});


