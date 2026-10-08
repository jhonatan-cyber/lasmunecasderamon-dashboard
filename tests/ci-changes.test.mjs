import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyChanges } from '../scripts/ci-changes.mjs';

test('UI y documentación no requieren suites de subsistemas', () => {
  assert.deepEqual(
    classifyChanges(['components/settings/SettingsWhatsAppTab.tsx', 'docs/CI_CD.md']),
    { redis: false, migrations: false, mcp: false }
  );
});
test('cada subsistema activa su suite', () => {
  assert.deepEqual(classifyChanges(['mcp/src/http-app.ts']), {
    redis: false,
    migrations: false,
    mcp: true
  });
  assert.equal(classifyChanges(['migrations/061_whatsapp_entregas.sql']).migrations, true);
  assert.equal(classifyChanges(['tests/redis/rate-limit.test.ts']).redis, true);
});
test('cambios compartidos, dependencias y CI activan todas las suites', () => {
  for (const path of [
    'app/api/whatsapp/test/route.ts',
    'lib/auth/auth-app.ts',
    'modules/comunicaciones/index.ts',
    'pnpm-lock.yaml',
    '.github/workflows/ci.yml',
    'scripts/ci-changes.mjs',
    'tests/setup/ci-fixtures.ts'
  ]) {
    assert.deepEqual(classifyChanges([path]), { redis: true, migrations: true, mcp: true });
  }
});
