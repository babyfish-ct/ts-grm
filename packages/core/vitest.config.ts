import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true, 
    environment: 'node',
    typecheck: {
      enabled: true,
      include: ['**/*.{test,spec}-d.{ts,tsx}'],
      exclude: ['**/node_modules/**', '**/dist/**'],
    },
    coverage: {
      enabled: true, 
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'], 
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
  },
});
