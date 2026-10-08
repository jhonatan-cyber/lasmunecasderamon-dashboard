import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyChanges } from '../scripts/ci-changes.mjs';
import { selectUnitTests } from '../scripts/run-affected-unit-tests.mjs';

test('UI del mismo dominio ejecuta unitarias y E2E, no jobs ajenos', () => {
  const result = classifyChanges(['components/caja/CajaDetails.tsx']);
  assert.equal(result.caja, true);
  assert.equal(result.unit, true);
  assert.equal(result.e2e, true);
  assert.equal(result.build, true);
  assert.equal(result.integration, false);
  assert.equal(result.redis, false);
  assert.equal(result.migrations, false);
  assert.equal(result.full, false);
});

test('cambios de pruebas seleccionan únicamente su suite', () => {
  const redis = classifyChanges(['tests/redis/rate-limit.test.ts']);
  assert.equal(redis.redis, true);
  assert.equal(redis.unit, false);
  assert.equal(classifyChanges(['tests/e2e/login.spec.ts']).e2e, true);
  assert.equal(classifyChanges(['tests/integration/order_flow.test.js']).integration, true);
  assert.equal(classifyChanges(['mcp/src/http-app.ts']).mcp, true);
});

test('backend de dominio selecciona unitarias e integración relacionada', () => {
  const result = classifyChanges(['modules/compras/servicio.ts']);
  assert.equal(result.compras, true);
  assert.equal(result.unit, true);
  assert.equal(result.integration, true);
  assert.equal(result.build, true);
  assert.equal(result.full, false);
});

test('migraciones y configuración global activan todas las validaciones', () => {
  for (const path of [
    'migrations/063_example.sql',
    'pnpm-lock.yaml',
    '.github/workflows/ci.yml',
    'scripts/ci-changes.mjs',
    'tests/setup/ci-fixtures.ts',
    'lib/auth/auth-app.ts'
  ]) {
    const result = classifyChanges([path]);
    for (const key of ['full', 'unit', 'build', 'integration', 'e2e', 'redis', 'migrations', 'mcp'])
      assert.equal(result[key], true, `${path}: ${key}`);
  }
});

test('documentación no activa suites', () => {
  const result = classifyChanges(['docs/CI_CD.md']);
  assert.equal(result.full, false);
  assert.equal(result.unit, false);
  assert.equal(result.build, false);
});

test('el selector de unitarias acota por ruta y usa pruebas reales del repositorio', () => {
  const candidates = [
    'tests/unit/components/CajaCard.test.tsx',
    'tests/unit/components/PurchaseCodesPanel.test.tsx',
    'tests/unit/lib/auth/failed-login-store.test.ts',
    'tests/unit/lib/api/whatsapp-test-route.test.ts',
    'tests/unit/lib/services/ProductService.test.ts'
  ];
  assert.deepEqual(selectUnitTests(['components/purchases/PurchaseForm.tsx'], candidates), [
    'tests/unit/components/PurchaseCodesPanel.test.tsx'
  ]);
  assert.deepEqual(selectUnitTests(['app/api/whatsapp/webhook/route.ts'], candidates), [
    'tests/unit/lib/api/whatsapp-test-route.test.ts'
  ]);
});
