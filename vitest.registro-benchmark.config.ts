import { defineConfig, mergeConfig } from 'vitest/config';
import postgres from './vitest.postgres.config';
export default mergeConfig(
  postgres,
  defineConfig({
    test: {
      include: ['tests/benchmarks/registro.test.ts'],
      exclude: ['tests/postgres/**'],
      testTimeout: 600000,
      hookTimeout: 30000,
      maxWorkers: 1
    }
  })
);
