import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup/vitest-setup.ts'],
    include: ['tests/unit/**/*.test.{ts,tsx}', 'tests/unit/**/*.spec.{ts,tsx}'],
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
