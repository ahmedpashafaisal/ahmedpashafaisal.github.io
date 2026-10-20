import { defineConfig } from 'vite';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, 'site');

export default defineConfig({
  root,
  base: '/',
  build: {
    outDir: resolve(import.meta.dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      // Add one entry per page as pages are built.
      input: {
        index: resolve(root, 'index.html'),
      },
    },
  },
});
