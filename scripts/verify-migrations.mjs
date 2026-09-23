#!/usr/bin/env node
/**
 * Drill de migraciones: construye una base de datos recien creada con el mismo
 * camino que usa produccion (`db:setup`: importar el dump base y aplicar todas
 * las migraciones) y verifica que el resultado sea completo y repetible.
 *
 * Falla si alguna migracion nueva no llega al historial de la base recien
 * creada, si el archivo esta vacio o fuera de la convencion de nombre, si el
 * historial no cuadra con los archivos, o si el runner no es idempotente.
 *
 * La base del drill es `<DB_NAME>_migcheck` (o `MIGRATION_CHECK_DB`) y se
 * elimina al terminar, de modo que la base operativa nunca se toca.
 *
 * Uso:
 *   node scripts/verify-migrations.mjs [--keep] [--base-ref origin/main]
 */
import 'dotenv/config';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import pg from 'pg';
import postgres from '../lib/database/postgres.cjs';
import {
  compareLedger,
  findDuplicatePrefixes,
  findMalformedMigrations,
  isEmptySql,
  migrate,
  readMigrations
} from './postgres-migrations.mjs';

const argv = process.argv.slice(2);

function flagValue(name) {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : undefined;
}

const keepDatabase = argv.includes('--keep');
const baseRef =
  flagValue('--base-ref') ??
  process.env.MIGRATION_BASE_REF ??
  (process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : undefined);
let checkDatabase = process.env.MIGRATION_CHECK_DB;

const failures = [];
const warnings = [];

async function withClient(database, run) {
  const client = new pg.Client({ ...postgres.connectionConfig(), database });
  await client.connect();
  try {
    return await run(client);
  } finally {
    await client.end();
  }
}

async function dropCheckDatabase() {
  await withClient('postgres', client =>
    client.query(`DROP DATABASE IF EXISTS ${postgres.quoteIdentifier(checkDatabase)} WITH (FORCE)`)
  );
}

/**
 * Migraciones que este cambio agrega o modifica, segun git. Es informativo: nos
 * deja nombrar en el error las migraciones nuevas que no llegaron a la base
 * recien creada. Devuelve `undefined` si no hay referencia ni historial git.
 */
function migrationsTouchedSince(ref) {
  if (!ref) return undefined;
  try {
    return execFileSync(
      'git',
      ['diff', '--name-only', '--diff-filter=AMR', `${ref}...HEAD`, '--', 'migrations/'],
      { encoding: 'utf8' }
    )
      .split('\n')
      .map(line => path.basename(line.trim()))
      .filter(Boolean);
  } catch {
    return undefined;
  }
}

function summarize(filenames) {
  const shown = filenames.slice(0, 6).join(', ');
  return filenames.length > 6 ? `${shown} y ${filenames.length - 6} mas` : shown;
}

function report(ledger, touched) {
  if (!touched) return;
  if (!touched.length) {
    console.log('   Sin migraciones nuevas respecto a la base de comparacion.\n');
    return;
  }

  console.log('   Migraciones nuevas o modificadas en este cambio:');
  for (const filename of touched) {
    console.log(`     ${ledger.has(filename) ? '✅' : '❌'} ${filename}`);
  }
  console.log('');

  const untested = touched.filter(filename => !ledger.has(filename));
  if (untested.length)
    failures.push(
      `Migracion(es) nueva(s) sin aplicar en una base recien creada: ${untested.join(', ')}. ` +
        'Aplica el drill en local con `pnpm db:verify` antes de subir el cambio.'
    );
}

async function main() {
  const migrations = readMigrations();
  const filenames = migrations.map(migration => migration.filename);
  checkDatabase = checkDatabase || `${process.env.DB_NAME || 'lasmunecasderamon'}_migcheck`;

  console.log('\n📦 Drill de migraciones sobre una base recien creada');
  console.log(`   Base del drill : ${checkDatabase} (se elimina al terminar)`);
  console.log(`   Migraciones    : ${migrations.length} archivos\n`);

  // ── Verificaciones estaticas, antes de tocar la base ────────────────────
  const malformed = findMalformedMigrations(filenames);
  if (malformed.length)
    failures.push(
      `Nombre fuera de la convencion (\\d{3,}_minusculas.sql): ${malformed.join(', ')}. ` +
        'El runner aplica por orden alfabetico, asi que un nombre suelto se aplica en cualquier parte.'
    );

  const empty = migrations.filter(migration => isEmptySql(migration.sql)).map(m => m.filename);
  if (empty.length)
    failures.push(
      `Migracion(es) sin ninguna sentencia ejecutable: ${empty.join(', ')}. ` +
        'Se registrarian en el historial sin cambiar el esquema.'
    );

  // Aviso, no error: renumerar una migracion ya aplicada rompe el historial.
  const duplicates = findDuplicatePrefixes(filenames);
  if (duplicates.length)
    warnings.push(
      `Prefijos numericos repetidos: ${duplicates
        .map(({ prefix, files }) => `${prefix} -> ${files.join(' + ')}`)
        .join(' | ')}. Se aplican en orden alfabetico dentro del grupo.`
    );

  const touched = migrationsTouchedSince(baseRef);
  const previousDatabase = process.env.DB_NAME;

  let ledger = new Map();
  let appliedOnSecondRun = null;
  let setupError;

  try {
    // ── Drill: mismo camino que `db:setup`, sobre una base que no existe ──
    await dropCheckDatabase();
    process.env.DB_NAME = checkDatabase;
    const setupModule = await import('./postgres-setup.cjs');
    const setup = setupModule.setup ?? setupModule.default.setup;

    try {
      await setup();
      console.log('');
    } catch (error) {
      setupError = error;
      failures.push(`La instalacion desde cero no termino: ${error.message}`);
    }

    // Aunque la instalacion falle leemos el historial: asi el error puede nombrar
    // la migracion que no llego en vez de solo el archivo que fallo.
    try {
      const result = await withClient(checkDatabase, async client => {
        const { rows } = await client.query('SELECT filename, checksum FROM _postgres_migrations');
        const applied = new Map(rows.map(row => [row.filename, row.checksum]));
        if (setupError) return { ledger: applied, appliedOnSecondRun: null };

        // Segunda pasada: una base ya migrada no debe recibir nada mas.
        await migrate(client, {
          logger: { log: () => {}, warn: warning => warnings.push(warning) }
        });
        const { rows: after } = await client.query(
          'SELECT count(*)::int AS count FROM _postgres_migrations'
        );
        return { ledger: applied, appliedOnSecondRun: after[0].count - applied.size };
      });
      ledger = result.ledger;
      appliedOnSecondRun = result.appliedOnSecondRun;
    } catch (error) {
      failures.push(`No se pudo revisar el historial de ${checkDatabase}: ${error.message}`);
    }

    const { missing, orphaned, mismatched } = compareLedger(ledger, migrations);
    if (missing.length)
      failures.push(
        `${missing.length} migracion(es) no llegaron al historial de la base recien creada: ${summarize(missing)}`
      );
    if (orphaned.length)
      failures.push(
        `El historial de la base recien creada tiene migraciones sin archivo en el repo: ${summarize(orphaned)}`
      );
    if (mismatched.length)
      failures.push(
        `Checksum distinto entre disco e historial en una base recien creada: ${summarize(mismatched)}`
      );
    if (appliedOnSecondRun)
      failures.push(
        `El runner no es idempotente: la segunda pasada aplico ${appliedOnSecondRun} migracion(es) sobre una base ya al dia.`
      );

    report(ledger, touched);
  } finally {
    process.env.DB_NAME = previousDatabase;
    if (!keepDatabase) await dropCheckDatabase().catch(() => {});
  }

  if (warnings.length) {
    console.log('⚠️  Avisos');
    for (const warning of warnings) console.log(`   • ${warning}`);
    console.log('');
  }

  if (failures.length) {
    console.error(`❌ Drill de migraciones fallido (${failures.length} problema(s))`);
    for (const failure of failures) console.error(`   • ${failure}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `✅ ${migrations.length} migraciones quedaron registradas en una base de datos recien creada ` +
      '(aplicadas o adoptadas).'
  );
}

main().catch(error => {
  console.error(`❌ Drill de migraciones fallido: ${error.message}`);
  process.exitCode = 1;
});
