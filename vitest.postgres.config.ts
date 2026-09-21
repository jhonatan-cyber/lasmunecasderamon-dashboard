import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';
import path from 'node:path';
config({ quiet: true });
if (
  !['localhost', '127.0.0.1', '::1'].includes(process.env.DB_HOST || '127.0.0.1') ||
  !process.env.DB_NAME?.endsWith('_test')
)
  throw new Error('PostgreSQL tests require a local DB_NAME ending in _test');
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname) } },
  test: {
    environment: 'node',
    include: ['tests/postgres/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000
  }
});
