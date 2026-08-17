import path from 'node:path';
import { defineConfig } from 'vitest/config';

const alias = {
  '@': path.resolve(__dirname, './src'),
};

export default defineConfig({
  resolve: { alias },
  test: {
    typecheck: {
      enabled: true,
      include: ['**/*.{test,spec}-d.{ts,tsx}'],
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
    projects: [
      {
        resolve: { alias },
        test: {
          name: 'sqlite',
          globals: true,
          environment: 'node',
          include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
          exclude: ['tests/driver/**'],
        },
      },
      {
        resolve: { alias },
        test: {
          name: { label: 'postgres', color: 'green' },
          globals: true,
          environment: 'node',
          include: ['tests/driver/postgres*.test.ts'],
          fileParallelism: false,
        },
      },
      {
        resolve: { alias },
        test: {
          name: { label: 'mysql', color: 'yellow' },
          globals: true,
          environment: 'node',
          include: ['tests/driver/mysql*.test.ts'],
          fileParallelism: false,
        },
      },
      {
        resolve: { alias },
        test: {
          name: { label: 'oracle', color: 'red' },
          globals: true,
          environment: 'node',
          include: ['tests/driver/oracle*.test.ts'],
          fileParallelism: false,
        },
      },
      {
        resolve: { alias },
        test: {
          name: { label: 'sqlserver', color: 'black' },
          globals: true,
          environment: 'node',
          include: ['tests/driver/sqlserver*.test.ts'],
          fileParallelism: false,
        },
      },
    ],
  },
});