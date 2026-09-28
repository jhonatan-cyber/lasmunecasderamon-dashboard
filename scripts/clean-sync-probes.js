#!/usr/bin/env node
/**
 * clean-sync-probes.js — Borra de `sync_operations` las claves que deja la
 * prueba de integración del modo offline del app (`pnpm test:integration`).
 *
 * Esas sondas son operaciones de verdad contra el servidor de desarrollo: se
 * registran con un prefijo identificable para poder limpiarlas sin tocar nada
 * del negocio. Por defecto **solo lista** lo que borraría; para borrar hay que
 * decirlo explícitamente con `--yes`.
 *
 * Uso:
 *     node scripts/clean-sync-probes.js                 # lista (no borra)
 *     node scripts/clean-sync-probes.js --yes           # borra
 *     node scripts/clean-sync-probes.js --prefix=otro-  # otro prefijo
 *
 * Solo contra una BD local: reutiliza la guarda de los tests de integración.
 */

require('./guard-local-db')();

const { Client } = require('pg');
const { connectionConfig } = require('../lib/database/postgres.cjs');

const DEFAULT_PREFIX = 'probe-integracion-';

const args = process.argv.slice(2);
const yes = args.includes('--yes');
const prefix =
  args.find(arg => arg.startsWith('--prefix='))?.slice('--prefix='.length) || DEFAULT_PREFIX;

if (!prefix) {
  console.error('El prefijo no puede estar vacío.');
  process.exit(1);
}

async function main() {
  const client = new Client(connectionConfig());
  await client.connect();

  try {
    // El patrón va como parámetro: el prefijo nunca se interpola en el SQL.
    const pattern = `${prefix}%`;
    const { rows } = await client.query(
      `SELECT id_cliente, endpoint, estado, intentos, creado_en
         FROM sync_operations
        WHERE id_cliente LIKE $1
        ORDER BY creado_en ASC`,
      [pattern]
    );

    if (rows.length === 0) {
      console.log(`Sin sondas que empiecen con «${prefix}».`);
      return;
    }

    console.log(`${rows.length} sonda(s) con prefijo «${prefix}»:`);
    for (const row of rows) {
      console.log(
        `  · ${row.id_cliente}  ${row.endpoint}  ${row.estado}  intentos=${row.intentos}`
      );
    }

    if (!yes) {
      console.log('\nNada borrado. Repetí con --yes para borrar estas filas.');
      return;
    }

    const deleted = await client.query('DELETE FROM sync_operations WHERE id_cliente LIKE $1', [
      pattern
    ]);
    console.log(`\n${deleted.rowCount} fila(s) borradas.`);
  } finally {
    await client.end();
  }
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
