import { defineConfig } from 'vitest/config';
import path from 'node:path';
import 'dotenv/config';
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
      'server-only': path.resolve(__dirname, 'tests/setup/server-only-stub.ts')
    }
  },
  test: {
    environment: 'node',
    include: ['tests/integration/module-review.test.ts'],
    testTimeout: 30000,
    hookTimeout: 60000,
    fileParallelism: false
  }
});
