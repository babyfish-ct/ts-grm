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
      include: ['tests/**/*.{test,spec}-d.{ts,tsx}'],
      exclude: ['**/node_modules/**', '**/dist/**'],
    },
    coverage: {
      thresholds: {
        lines: 60,
        functions: 55,
        branches: 55,
        statements: 60,
      },
      exclude: [
        'src/driver/*_driver.ts'
      ],
    },
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
  },
});
