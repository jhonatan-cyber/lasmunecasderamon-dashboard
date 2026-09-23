#!/usr/bin/env node
/**
 * Compara el esquema de dos bases de datos y demuestra (o refuta) que son
 * equivalentes. Es la prueba que exige la consolidacion de migraciones: antes de
 * reemplazar la cadena por una linea base hay que ver que las dos rutas de
 * instalacion producen el mismo esquema.
 *
 * Uso:
 *   node scripts/compare-schema.mjs <base> <comparada> [--ignore tabla,tabla]
 *   pnpm db:diff lasmunecasderamon lasmunecasderamon_test
 *
 * Sale con codigo 1 cuando hay diferencias.
 */
import 'dotenv/config';
import pg from 'pg';
import postgres from '../lib/database/postgres.cjs';
import {
  SCHEMA_QUERIES,
  countDiff,
  diffSnapshots,
  isEmptyDiff,
  toSnapshot
} from './schema-diff.mjs';

const argv = process.argv.slice(2);

function flagValue(name) {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : undefined;
}

const databases = argv.filter(argument => !argument.startsWith('--')).slice(0, 2);
const ignore = (flagValue('--ignore') ?? '')
  .split(',')
  .map(entry => entry.trim())
  .filter(Boolean);

if (databases.length < 2) {
  console.error('Uso: node scripts/compare-schema.mjs <base> <comparada> [--ignore tabla,tabla]');
  process.exitCode = 1;
} else {
  const [base, compared] = databases;

  try {
    const [a, b] = await Promise.all([snapshot(base), snapshot(compared)]);
    const diff = diffSnapshots(a, b, { ignore });

    console.log(`\n🔍 Esquema: ${base}  vs  ${compared}\n`);
    for (const [category, { onlyInActual, onlyInExpected }] of Object.entries(diff)) {
      const total = onlyInActual.length + onlyInExpected.length;
      console.log(
        `${total ? '⚠️ ' : '✅'} ${category.padEnd(12)} solo en ${base}: ${onlyInActual.length} | solo en ${compared}: ${onlyInExpected.length}`
      );
      for (const line of onlyInActual) console.log(`     - [${base}] ${line}`);
      for (const line of onlyInExpected) console.log(`     + [${compared}] ${line}`);
    }

    const total = countDiff(diff);
    console.log('');
    if (isEmptyDiff(diff)) {
      console.log(`✅ Los esquemas de ${base} y ${compared} son equivalentes.`);
    } else {
      console.error(`❌ ${total} diferencia(s) de esquema entre ${base} y ${compared}.`);
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(`❌ No se pudo comparar el esquema: ${error.message}`);
    process.exitCode = 1;
  }
}

async function snapshot(database) {
  const client = new pg.Client({ ...postgres.connectionConfig(), database });
  await client.connect();
  try {
    const result = {};
    for (const [category, sql] of Object.entries(SCHEMA_QUERIES)) {
      const { rows } = await client.query(sql);
      result[category] = toSnapshot(rows);
    }
    return result;
  } finally {
    await client.end();
  }
}
