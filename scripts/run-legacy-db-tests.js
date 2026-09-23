require('dotenv').config({ quiet: true });

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const testsDir = path.resolve(__dirname, '../tests/integration/legacy-db');

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = process.env.DB_PORT || '5432';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'lasmunecasderamon_test';
if (!DB_NAME.endsWith('_test')) throw new Error('Tests require DB_NAME ending in _test');

// Guarda de seguridad: aborta si DB_HOST no es loopback (nunca producción por
// accidente). loadDotenv:false — el runner resuelve sus propios defaults.
require('./guard-local-db')({ env: { ...process.env, DB_HOST }, loadDotenv: false });

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

// Filtro opcional por nombre de test, ej: node run-legacy-db-tests.js tip_repository
// (pnpm puede pasar un literal "--" antes de los argumentos; se ignora)
const filter = process.argv
  .slice(2)
  .filter(arg => arg !== '--')
  .join(' ')
  .trim()
  .toLowerCase();

let testFiles = fs
  .readdirSync(testsDir)
  .filter(file => file.endsWith('.test.js'))
  .sort();

if (filter) {
  testFiles = testFiles.filter(file => file.toLowerCase().includes(filter));
}

if (testFiles.length === 0) {
  if (filter) {
    console.log(`No hay tests legacy-db que coincidan con "${filter}".`);
    process.exit(1);
  }
  console.log('No hay tests legacy-db para ejecutar.');
  process.exit(0);
}

console.log(
  filter
    ? `Ejecutando ${testFiles.length} test(s) de integración legacy-db que coinciden con "${filter}"...`
    : `Ejecutando ${testFiles.length} tests de integración legacy-db...`
);
console.log(`BD: ${DB_HOST}:${DB_PORT}/${DB_NAME}`);

const results = [];

for (const file of testFiles) {
  console.log(`\n▶ ${file}`);
  const result = spawnSync(process.execPath, [path.join(testsDir, file)], {
    stdio: 'inherit',
    env: testEnv
  });
  const passed = result.status === 0;
  results.push({ file, passed, status: result.status });
  console.log(passed ? `✔ ${file}: OK` : `✘ ${file}: FALLÓ (exit ${result.status ?? 'signal'})`);
}

const failed = results.filter(r => !r.passed);

console.log('\n================ RESULTADOS ================');
for (const { file, passed } of results) {
  console.log(`  ${passed ? '✔' : '✘'} ${file}`);
}
console.log('============================================');
console.log(
  `Total: ${results.length} | OK: ${results.length - failed.length} | Fallos: ${failed.length}`
);

if (failed.length > 0) {
  process.exit(1);
}
