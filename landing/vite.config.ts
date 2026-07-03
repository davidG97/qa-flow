import { defineConfig } from 'vite';

export default defineConfig({
  // Para GitHub Pages: usa VITE_BASE_URL en CI, './' para desarrollo local
  base: process.env.VITE_BASE_URL || './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: 'index.html',
      },
    },
  },
  server: {
    port: 3002,
    strictPort: true,
  },
});
