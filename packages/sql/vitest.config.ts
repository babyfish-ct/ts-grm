import path from 'node:path';
import { defineConfig } from 'vitest/config';

const alias = {
  '@': path.resolve(__dirname, './src'),
};

export default defineConfig({
  resolve: { alias },
  test: {
    // 全局性配置(跨 project 生效),留在根级别
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