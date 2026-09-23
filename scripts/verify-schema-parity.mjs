#!/usr/bin/env node
/**
 * Gate de paridad de esquema: todo camino de instalacion debe terminar en el
 * mismo esquema que la base de referencia de integracion.
 *
 * Compara dos rutas contra la referencia:
 *   1. Instalacion desde cero por el camino de produccion (`db:setup`: dump +
 *      migraciones). Es lo que recibe una maquina nueva o un entorno de prueba.
 *   2. Entorno existente: se importa el dump de `--base-ref` (la base que ya
 *      estaba desplegada) y se aplican las migraciones de HEAD. Es lo que recibe
 *      un entorno que ya venia funcionando.
 *
 * Si las dos rutas coinciden con la referencia, esta garantizado que cambiar el
 * dump o agregar una migracion no deja a los entornos existentes con un esquema
 * distinto al de las instalaciones nuevas. Cuando no coinciden, el gate nombra
 * las tablas, columnas, indices o constraints que difieren.
 *
 * Uso:
 *   node scripts/verify-schema-parity.mjs --reference <db> [--base-ref <sha>] [--keep]
 *   pnpm db:parity --reference lasmunecasderamon_test --base-ref origin/main
 *
 * La base de referencia no se toca: el script solo crea y elimina bases
 * temporales (`<referencia>_fresh` y `<referencia>_existing`).
 */
import 'dotenv/config';
import { execFileSync } from 'node:child_process';
import pg from 'pg';
import postgres from '../lib/database/postgres.cjs';
import {
  SCHEMA_QUERIES,
  countDiff,
  diffSnapshots,
  isEmptyDiff,
  toSnapshot
} from './schema-diff.mjs';
import { migrate } from './postgres-migrations.mjs';

const argv = process.argv.slice(2);

function flagValue(name) {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : undefined;
}

const reference = flagValue('--reference');
const baseRef = flagValue('--base-ref');
const keepDatabases = argv.includes('--keep');
const freshDatabase = `${reference}_fresh`;
const existingDatabase = `${reference}_existing`;
const failures = [];

const silentLogger = { log: () => {}, warn: () => {} };

async function withClient(database, run) {
  const client = new pg.Client({ ...postgres.connectionConfig(), database });
  await client.connect();
  try {
    return await run(client);
  } finally {
    await client.end();
  }
}

async function dropDatabase(name) {
  await withClient('postgres', client =>
    client.query(`DROP DATABASE IF EXISTS ${postgres.quoteIdentifier(name)} WITH (FORCE)`)
  );
}

async function createDatabase(name) {
  await withClient('postgres', client =>
    client.query(`CREATE DATABASE ${postgres.quoteIdentifier(name)}`)
  );
}

async function snapshot(database) {
  return withClient(database, async client => {
    const result = {};
    for (const [category, sql] of Object.entries(SCHEMA_QUERIES)) {
      const { rows } = await client.query(sql);
      result[category] = toSnapshot(rows);
    }
    return result;
  });
}

/** Compara una ruta de instalacion contra la base de referencia. */
async function compare(label, database) {
  const [path, expected] = await Promise.all([snapshot(database), snapshot(reference)]);
  const diff = diffSnapshots(path, expected);
  const total = countDiff(diff);

  console.log(`${total ? '❌' : '✅'} ${label} vs ${reference}: ${total} diferencia(s)`);
  if (!total) return;

  for (const { onlyInActual, onlyInExpected } of Object.values(diff)) {
    for (const line of onlyInActual) console.log(`     - [${database}] ${line}`);
    for (const line of onlyInExpected) console.log(`     + [${reference}] ${line}`);
  }
  failures.push(
    `${label}: ${total} diferencia(s) de esquema contra ${reference}. ` +
      'Una instalacion nueva, un entorno ya desplegado y la base de referencia deben coincidir.'
  );
}

/** Dump base del commit indicado, tal como lo recibio un entorno existente. */
function dumpAtRef(ref) {
  try {
    return execFileSync('git', ['show', `${ref}:database/lasmunecasderamon.postgres.sql`], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024
    });
  } catch (error) {
    failures.push(
      `No se pudo leer el dump base de '${ref}' (${error.message.trim().split('\n')[0]}). ` +
        'El checkout necesita historial completo (fetch-depth: 0) o un --base-ref valido.'
    );
    return undefined;
  }
}

async function installFromScratch() {
  await dropDatabase(freshDatabase);
  const previous = process.env.DB_NAME;
  process.env.DB_NAME = freshDatabase;
  try {
    // El camino de produccion, sin copiarlo: si `db:setup` se rompe, este gate lo ve.
    const setupModule = await import('./postgres-setup.cjs');
    const setup = setupModule.setup ?? setupModule.default.setup;
    await setup();
  } finally {
    process.env.DB_NAME = previous;
  }
}

async function installFromExistingEnvironment() {
  const dump = dumpAtRef(baseRef);
  if (!dump) return;

  await dropDatabase(existingDatabase);
  await createDatabase(existingDatabase);
  await withClient(existingDatabase, async client => {
    await client.query(dump);
    await migrate(client, { logger: silentLogger });
  });
}

async function main() {
  if (!reference) {
    console.error(
      'Uso: node scripts/verify-schema-parity.mjs --reference <db> [--base-ref <sha>] [--keep]'
    );
    process.exitCode = 1;
    return;
  }

  console.log(`\n🔗 Paridad de esquema contra ${reference}`);
  console.log(`   Instalacion desde cero: ${freshDatabase}`);
  if (baseRef) console.log(`   Entorno existente     : ${existingDatabase} (dump de ${baseRef})`);
  console.log('');

  try {
    try {
      await installFromScratch();
      await compare('instalacion desde cero', freshDatabase);
    } catch (error) {
      failures.push(`La instalacion desde cero fallo: ${error.message}`);
    }

    if (baseRef) {
      try {
        await installFromExistingEnvironment();
        await compare(`entorno existente (dump de ${baseRef})`, existingDatabase);
      } catch (error) {
        failures.push(`El entorno existente no se pudo reconstruir: ${error.message}`);
      }
    }
  } finally {
    if (!keepDatabases) {
      for (const database of [freshDatabase, existingDatabase]) {
        await dropDatabase(database).catch(() => {});
      }
    }
  }

  console.log('');
  if (failures.length) {
    console.error(`❌ Paridad de esquema fallida (${failures.length} problema(s))`);
    for (const failure of failures) console.error(`   • ${failure}`);
    process.exitCode = 1;
    return;
  }

  console.log('✅ Todas las rutas de instalacion coinciden con el esquema de referencia.');
}

main().catch(error => {
  console.error(`❌ Paridad de esquema fallida: ${error.message}`);
  process.exitCode = 1;
});
