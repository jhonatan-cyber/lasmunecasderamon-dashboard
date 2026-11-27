import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyChanges } from '../scripts/ci-changes.mjs';
import { collectWorkingTreeChanges, selectUnitTests } from '../scripts/run-affected-unit-tests.mjs';

test('UI del mismo dominio ejecuta unitarias y E2E, no jobs ajenos', () => {
  const result = classifyChanges(['components/cash-register/CajaDetails.tsx']);
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
    const checks = ['full', 'unit', 'build', 'integration', 'e2e', 'redis', 'migrations', 'mcp'];
    for (const key of checks) {
      assert.equal(result[key], true, `${path}: ${key}`);
    }
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

test('el selector incluye toda la suite para cambios de configuración global', () => {
  const candidates = ['tests/unit/z.test.ts', 'tests/unit/a.test.ts'];
  assert.deepEqual(selectUnitTests(['package.json'], candidates), [
    'tests/unit/a.test.ts',
    'tests/unit/z.test.ts'
  ]);
});

test('cambios en helpers de tests ejecutan las pruebas de su carpeta', () => {
  const candidates = ['tests/unit/components/a.test.tsx', 'tests/unit/hooks/b.test.tsx'];
  assert.deepEqual(selectUnitTests(['tests/unit/components/test-harness.tsx'], candidates), [
    'tests/unit/components/a.test.tsx'
  ]);
});

test('el diff local incluye cambios rastreados y archivos nuevos sin duplicados', () => {
  const tracked = 'components/Form.tsx\0tests/Form.test.tsx';
  const untracked = 'tests/Form.test.tsx\0components/NewCard.tsx';
  const runGit = args => {
    if (args[0] === 'diff') return tracked;
    return untracked;
  };
  const changed = collectWorkingTreeChanges(runGit);

  assert.deepEqual(changed, [
    'components/Form.tsx',
    'tests/Form.test.tsx',
    'components/NewCard.tsx'
  ]);
});
