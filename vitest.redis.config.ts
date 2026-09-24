import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/redis/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 15000
  },
  resolve: { alias: { '@': path.resolve(__dirname, './') } }
});
