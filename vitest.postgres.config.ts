import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';
import path from 'node:path';
config({ quiet: true });
const hostLocal = ['localhost', '127.0.0.1', '::1'].includes(process.env.DB_HOST || '127.0.0.1');
if (!hostLocal || process.env.DB_NAME !== 'lasmunecasderamon')
  throw new Error('PostgreSQL tests require local DB_NAME=lasmunecasderamon');
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
      'server-only': path.resolve(__dirname, './tests/setup/server-only-stub.ts')
    }
  },
  test: {
    environment: 'node',
    include: ['tests/postgres/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000
  }
});
