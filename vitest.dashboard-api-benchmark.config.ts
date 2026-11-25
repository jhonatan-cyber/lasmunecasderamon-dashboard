import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/benchmarks/dashboard-api.test.ts'],
    testTimeout: 300000
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      'server-only': path.resolve(__dirname, './tests/setup/server-only-stub.ts')
    }
  }
});
