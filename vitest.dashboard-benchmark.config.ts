import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/benchmarks/dashboard.test.ts'],
    testTimeout: 60000
  },
  resolve: { alias: { '@': path.resolve(__dirname, './') } }
});
