import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';
import path from 'node:path';

config({ quiet: true });
if (
  !['localhost', '127.0.0.1', '::1'].includes(process.env.DB_HOST || '127.0.0.1') ||
  !/^lasmunecasderamon_review_\d+$/.test(process.env.DB_NAME || '')
) {
  throw new Error('La revisión requiere una base local aislada lasmunecasderamon_review_<fecha>.');
}

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
      'server-only': path.resolve(__dirname, './tests/setup/server-only-stub.ts')
    }
  },
  test: {
    globalSetup: ['./tests/setup/review-fixtures.ts'],
    setupFiles: ['./tests/setup/postgres-integraciones.ts'],
    environment: 'node',
    include: ['tests/postgres/**/*.test.ts'],
    exclude: ['tests/postgres/linea-base-flujos.test.ts'],
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 30000,
    hookTimeout: 30000
  }
});
