import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2020',
    lib: {
      entry: resolve(__dirname, 'src/tracker.js'),
      name: 'AlohaIndustriesTelemetry',
      fileName: (format) => (format === 'es' ? 'tracker.esm.js' : 'tracker.umd.js'),
      formats: ['es', 'umd'],
    },
    minify: 'esbuild',
    sourcemap: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
