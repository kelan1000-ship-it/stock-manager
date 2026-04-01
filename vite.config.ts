import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@google/generative-ai') || id.includes('@anthropic-ai')) {
            return 'ai-sdk';
          }
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    }
  }
} as any);