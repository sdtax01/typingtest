/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

const standalone = process.env.STANDALONE === '1';

export default defineConfig({
  plugins: [react(), ...(standalone ? [viteSingleFile()] : [])],
  base: standalone ? './' : '/',
  build: standalone ? { outDir: 'dist-standalone' } : undefined,
  define: { __STANDALONE__: JSON.stringify(standalone) },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
