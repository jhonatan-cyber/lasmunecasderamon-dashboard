import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';
import path from 'node:path';
import { DurationBudgetReporter } from './scripts/vitest/duration-budget-reporter';
import { presupuestoDesdeEnv } from './scripts/duration-budget';

config({ quiet: true });
if (
  !['localhost', '127.0.0.1', '::1'].includes(process.env.DB_HOST || '127.0.0.1') ||
  process.env.CI !== 'true' ||
  process.env.DB_NAME !== 'lasmunecasderamon_test'
) {
  throw new Error('CI PostgreSQL requiere CI=true y la base local aislada lasmunecasderamon_test.');
}

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
      'server-only': path.resolve(__dirname, './tests/setup/server-only-stub.ts')
    }
  },
  test: {
    globalSetup: ['./tests/setup/ci-fixtures.ts'],
    setupFiles: ['./tests/setup/postgres-integraciones.ts'],
    environment: 'node',
    include: ['tests/postgres/**/*.test.ts'],
    exclude: ['tests/postgres/linea-base-flujos.test.ts'],
    // Mismo presupuesto por archivo que la corrida local (ver
    // vitest.postgres.config.ts); sin esto el gate no existiría en CI.
    reporters: [
      'default',
      new DurationBudgetReporter(presupuestoDesdeEnv('POSTGRES_FILE_BUDGET_MS', 120_000))
    ],
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 30000,
    hookTimeout: 30000
  }
});
