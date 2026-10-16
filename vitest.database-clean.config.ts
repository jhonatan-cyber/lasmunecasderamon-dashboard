import { defineConfig } from 'vitest/config';
import path from 'node:path';
import 'dotenv/config';

if (
  !/^qa_browser_\d+$/.test(process.env.DB_NAME || '') ||
  !['localhost', '127.0.0.1', '::1'].includes(process.env.DB_HOST || '127.0.0.1')
) {
  throw new Error('Esta prueba requiere una base local exclusiva qa_browser_*');
}

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname) } },
  test: {
    environment: 'node',
    include: ['tests/integration/database-clean-scope.test.ts'],
    fileParallelism: false,
    testTimeout: 30000
  }
});
