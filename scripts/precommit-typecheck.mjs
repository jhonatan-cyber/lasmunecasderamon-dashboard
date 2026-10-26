#!/usr/bin/env node
/**
 * Typecheck acotado al índice para el pre-commit.
 *
 * `tsc` no puede compilar un subconjunto de archivos: siempre necesita el
 * proyecto entero. Este script lo ejecuta igual, pero separa los errores en dos
 * bandos:
 *
 *   - errores en archivos staged  -> bloquean el commit (son tuyos);
 *   - errores en el resto del árbol -> se informan y no frenan nada, porque
 *     pueden pertenecer a otro frente que todavía no commiteó.
 *
 * Si el typecheck no llega a correr (config rota, tsc ausente) el script falla:
 * un problema de infraestructura no se disfraza de "todo en verde".
 *
 * Sale con 0 cuando no hay errores en archivos staged y con 1 cuando los hay.
 */
import { execFileSync } from 'node:child_process';

const raiz = process.cwd();

/** Archivos del índice que este proyecto compila con tsc. */
const staged = execFileSync(
  'git',
  ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '--', '*.ts', '*.tsx'],
  { encoding: 'utf8', cwd: raiz }
)
  .split('\n')
  .map(linea => linea.trim().replace(/\\/g, '/'))
  .filter(Boolean);

if (staged.length === 0) {
  process.exit(0);
}

let salida = '';
let codigo = 0;
try {
  salida = execFileSync(
    process.execPath,
    [
      'node_modules/typescript/bin/tsc',
      '--noEmit',
      '-p',
      'tsconfig.typecheck.json',
      '--pretty',
      'false'
    ],
    { encoding: 'utf8', cwd: raiz, stdio: ['ignore', 'pipe', 'pipe'] }
  );
} catch (error) {
  salida = `${error.stdout ?? ''}${error.stderr ?? ''}`;
  codigo = typeof error.status === 'number' ? error.status : 1;
}

if (codigo === 0) {
  console.log(`✅ TypeScript sin errores (${staged.length} archivo(s) TS en el índice)`);
  process.exit(0);
}

const lineas = salida.split(/\r?\n/).filter(Boolean);
const errores = [];
for (const linea of lineas) {
  const match = linea.match(/^(.+?)\(\d+,\d+\): error TS\d+:/);
  if (match) errores.push({ archivo: match[1].replace(/\\/g, '/'), linea });
}

if (errores.length === 0) {
  // tsc falló sin errores parseables: es un problema del typecheck, no del código.
  console.error('❌ No se pudo interpretar la salida de tsc:');
  console.error(salida.trim() || '(sin salida)');
  process.exit(1);
}

const normalizar = ruta => ruta.toLowerCase();
const enIndice = new Set(staged.map(normalizar));
const propios = errores.filter(error => enIndice.has(normalizar(error.archivo)));
const ajenos = errores.filter(error => !enIndice.has(normalizar(error.archivo)));

if (ajenos.length > 0) {
  const archivos = [...new Set(ajenos.map(error => error.archivo))];
  console.warn(
    `⚠️  ${ajenos.length} error(es) de TypeScript fuera del índice: no frenan este commit.`
  );
  for (const archivo of archivos.slice(0, 10)) console.warn(`     · ${archivo}`);
  if (archivos.length > 10) console.warn(`     · ...y ${archivos.length - 10} archivo(s) más`);
}

if (propios.length > 0) {
  console.error(`❌ TypeScript: ${propios.length} error(es) en archivos de este commit:`);
  for (const error of propios) console.error(`     ${error.linea}`);
  process.exit(1);
}

console.log(`✅ TypeScript: sin errores en los ${staged.length} archivo(s) TS del índice`);
process.exit(0);
