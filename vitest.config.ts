import { defineConfig } from 'vitest/config';
import path from 'path';
import {
  DurationBudgetReporter,
  FILE_BUDGET_COVERAGE_MS,
  FILE_BUDGET_MS
} from './scripts/vitest/duration-budget-reporter';
import { presupuestoDesdeEnv } from './scripts/duration-budget';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup/vitest-setup.ts'],
    include: ['tests/unit/**/*.test.{ts,tsx}', 'tests/unit/**/*.spec.{ts,tsx}'],
    // Presupuesto de RPC: el canal entre worker y runner se corta a los 60 s
    // (`birpc` usa DEFAULT_TIMEOUT) y emite el error intermitente
    // `[vitest-worker]: Timeout calling "onTaskUpdate"` aunque todo pase. Con 8
    // núcleos, el pool por defecto (CPU−1) deja a cada archivo peleando por CPU
    // y los más pesados rozaban ese tope; limitar el pool a 4 mantiene el peor
    // archivo lejos de ese tope y no cambia el orden de ejecución.
    maxWorkers: 4,
    // Falla el run si un archivo se pasa del presupuesto, nombrándolo: el síntoma
    // sin diagnóstico es la suite que se arrastra sin decir quién. El corte de
    // 60 s del canal RPC es por llamada, no por archivo (un archivo de 71 s pasa
    // limpio), así que el presupuesto es una cota de salud, no una barrera de
    // seguridad: 45 s sin cobertura (el más pesado tarda 17 s) y 120 s con ella
    // (misma corrida completa: 71 s con instrumentación v8). Con `--coverage` el
    // modo se detecta por argv; `UNIT_FILE_BUDGET_MS` lo puede sobreescribir.
    // El reporter vive en `scripts/vitest/`, no en `tests/`: la puerta de
    // arquitectura (limites.mjs) castiga cualquier import de un archivo de
    // producción hacia `tests/` con la regla `puente-transaccional-heredado`,
    // y esta configuración es un archivo de producción.
    reporters: [
      'default',
      new DurationBudgetReporter(
        presupuestoDesdeEnv(
          'UNIT_FILE_BUDGET_MS',
          process.argv.includes('--coverage') ? FILE_BUDGET_COVERAGE_MS : FILE_BUDGET_MS
        )
      )
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      all: false,
      include: ['lib/**', 'hooks/**', 'modules/**', 'workflows/**'],
      thresholds: {
        branches: 62,
        functions: 40,
        lines: 48,
        statements: 48
      },
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '.next/',
        '**/types/**',
        // `lib/database/postgres.cjs` es un puente CommonJS: el conversor
        // v8→Istanbul de @vitest/coverage-v8 se rompe con su mapa de fuentes
        // ("Cannot read properties of undefined (reading 'endCol')") y aborta el
        // informe entero. Sus pruebas viven en la suite de PostgreSQL
        // (`tests/postgres/sql-compatibility.test.ts`), así que la lógica sigue
        // cubierta aunque el archivo no entre en el reporte.
        '**/*.cjs'
      ]
    },
    testTimeout: 30000,
    hookTimeout: 30000
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      'server-only': path.resolve(__dirname, './tests/setup/server-only-stub.ts'),
      '@/components': path.resolve(__dirname, './components'),
      '@/lib': path.resolve(__dirname, './lib'),
      '@/app': path.resolve(__dirname, './app'),
      '@/types': path.resolve(__dirname, './types')
    }
  }
});
