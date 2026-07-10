import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'workers/shared'),
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist', '.output'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['workers/api/src/**', 'workers/shared/**', 'src/lib/**'],
    },
  },
});
