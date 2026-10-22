import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';
import path from 'node:path';
import { DurationBudgetReporter } from './scripts/vitest/duration-budget-reporter';
import { presupuestoDesdeEnv } from './scripts/duration-budget';
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
    setupFiles: ['./tests/setup/postgres-integraciones.ts'],
    environment: 'node',
    include: ['tests/postgres/**/*.test.ts'],
    fileParallelism: false,
    // Presupuesto por archivo: esta suite corre en serie y golpea la BD real,
    // así que es más lenta que la unitaria. `cierre-caja-autorizado` tarda
    // ~45 s aislado y ~90 s dentro de la corrida completa (el acopio de los 37
    // módulos se come la otra mitad), así que 120 s deja margen sobre el flujo
    // legítimo y sigue cazando un archivo que se desboca. Si vuelve a saltar,
    // lo correcto es partir el archivo, no subir el límite;
    // `POSTGRES_FILE_BUDGET_MS` permite ajustarlo por máquina.
    reporters: [
      'default',
      new DurationBudgetReporter(presupuestoDesdeEnv('POSTGRES_FILE_BUDGET_MS', 120_000))
    ],
    testTimeout: 30000,
    hookTimeout: 30000
  }
});
