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
      thresholds: {
        branches: 62,
        functions: 40,
        lines: 48,
        statements: 48
      },
      // Preserve v3's all:false policy: covered files in these four directories.
      // In v5 an explicit include also adds every untested matching file.
      exclude: [
        '!(lib|hooks|modules|workflows)/**',
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '.next/',
        '**/types/**'
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
