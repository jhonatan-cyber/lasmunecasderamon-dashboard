// Exercise the real PostgreSQL maintenance implementation.
require('../../scripts/guard-local-db')();
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const config =
  process.env.CI === 'true' && process.env.DB_NAME === 'lasmunecasderamon_test'
    ? 'vitest.ci-postgres.config.ts'
    : 'vitest.postgres.config.ts';
const result = spawnSync(
  process.execPath,
  [
    path.resolve('node_modules/vitest/vitest.mjs'),
    'run',
    '--config',
    config,
    'tests/postgres/maintenance.test.ts'
  ],
  { stdio: 'inherit', env: process.env }
);
process.exitCode = result.status ?? 1;
