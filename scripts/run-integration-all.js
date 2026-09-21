require('dotenv').config({ quiet: true });
/* eslint-disable no-console */
/**
 * Ejecuta toda la suite de integración contra una BD local:
 *   1. Los 33 tests legacy-db (tests/integration/legacy-db/*.test.js)
 *   2. Los 9 tests de flujo (tests/integration/*_flow.test.js + settings_clean.test.js)
 *
 * Uso:  node scripts/run-integration-all.js     (o: npm run test:integration:all)
 *
 * Requiere una BD PostgreSQL alcanzable (por defecto 127.0.0.1:5432).
 * Si no hay BD corriendo, corre `npm run db:dev` para levantarla.
 */
const path = require('path');
const { spawnSync } = require('child_process');
const postgres = require('./postgres-test-client.cjs');

const ROOT = path.resolve(__dirname, '..');

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = process.env.DB_PORT || '5432';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'lasmunecasderamon_test';
if (!DB_NAME.endsWith('_test')) throw new Error('Tests require DB_NAME ending in _test');

// Guarda de seguridad: aborta si DB_HOST no es loopback (nunca producción por
// accidente). loadDotenv:false — el orquestador resuelve sus propios defaults
// y NO debe consultar el .env (que apunta a la BD remota).
require('./guard-local-db')({ env: { ...process.env, DB_HOST }, loadDotenv: false });

const legacyRunner = path.join(__dirname, 'run-legacy-db-tests.js');

// Orden de ejecución: los flujos comparten tablas, así que se corren en serie
const flowTests = [
  'order_flow.test.js',
  'sales_flow.test.js',
  'cuentas_flow.test.js',
  'finance_cash_flow.test.js',
  'orders_full_flow.test.js',
  'hr_payroll_flow.test.js',
  'payroll_flow.test.js',
  'refund_flow.test.js',
  'settings_clean.test.js'
];

async function checkDatabase() {
  const connection = await postgres.createConnection({
    host: DB_HOST,
    port: parseInt(DB_PORT, 10),
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    connectTimeout: 3000
  });
  await connection.query('SELECT 1');
  await connection.end();
}

// Env para los tests hijos: inyecta los valores por defecto de BD para que
// dotenv NO cargue el .env (que apunta a la BD remota) cuando el usuario no
// definió DB_* explícitamente. Sin esto, los tests tocarían producción.
const testEnv = {
  ...process.env,
  DB_HOST,
  DB_PORT,
  DB_USER,
  DB_PASSWORD,
  DB_NAME
};

function runNode(script, args = []) {
  return spawnSync(process.execPath, [script, ...args], {
    stdio: 'inherit',
    env: testEnv
  });
}

async function main() {
  console.log('══════════════════════════════════════════════════════');
  console.log('  SUITE DE INTEGRACIÓN COMPLETA');
  console.log(`  BD: ${DB_HOST}:${DB_PORT}/${DB_NAME} (user: ${DB_USER})`);
  console.log('══════════════════════════════════════════════════════');

  // Preflight: verificar que la BD responde antes de correr 42 tests
  try {
    await checkDatabase();
    console.log('✅ Conexión a la BD establecida.\n');
  } catch {
    console.error('⚠️  No se pudo conectar a la BD. Levantándola con db:dev...\n');
    const setup = runNode(path.join(__dirname, 'db-dev.js'));
    if (setup.status !== 0) {
      console.error('❌ No se pudo levantar la BD. Revisa scripts/db-dev.js o el .env.');
      process.exit(1);
    }
    console.log('');
  }

  const results = [];

  // 1) Tests legacy-db (33)
  console.log('━━━ PARTE 1/2: Tests legacy-db (33) ━━━');
  const legacy = runNode(legacyRunner);
  results.push({
    name: 'legacy-db (33 tests)',
    passed: legacy.status === 0,
    status: legacy.status
  });
  console.log('');

  // 2) Tests de flujo (9)
  console.log('━━━ PARTE 2/2: Tests de flujo (9) ━━━');
  const flowDir = path.join(ROOT, 'tests', 'integration');
  for (const file of flowTests) {
    console.log(`\n▶ ${file}`);
    const res = spawnSync(process.execPath, [path.join(flowDir, file)], {
      stdio: 'inherit',
      env: testEnv
    });
    const passed = res.status === 0;
    results.push({ name: file, passed, status: res.status });
    console.log(passed ? `✔ ${file}: OK` : `✘ ${file}: FALLÓ (exit ${res.status ?? 'signal'})`);
  }

  const failed = results.filter(r => !r.passed);

  console.log('\n================ RESULTADOS ================');
  for (const { name, passed } of results) {
    console.log(`  ${passed ? '✔' : '✘'} ${name}`);
  }
  console.log('============================================');
  console.log(
    `Total: ${results.length} | OK: ${results.length - failed.length} | Fallos: ${failed.length}`
  );

  if (failed.length > 0) {
    process.exit(1);
  }
  console.log('\n🎉 Suite de integración completa en verde.');
}

main().catch(error => {
  console.error('❌ Error inesperado:', error.message);
  process.exit(1);
});
