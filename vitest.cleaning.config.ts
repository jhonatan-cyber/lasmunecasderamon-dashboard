import { defineConfig } from 'vitest/config';
import base from './vitest.config';

export default defineConfig({
  ...base,
  test: {
    ...base.test,
    environment: 'node',
    include: ['tests/integration/cleaning-inventory.test.ts'],
    setupFiles: [],
    hookTimeout: 30000,
    testTimeout: 30000
  }
});
