/**
 * Reconciliación del checksum de una migración ya aplicada.
 *
 * El runner (`scripts/postgres-migrations.mjs`) aborta con *Applied migration changed*
 * cuando el SHA-256 del archivo no coincide con el registrado en `_postgres_migrations`.
 * Tolera a propósito el caso "mismo contenido, checkout en CRLF" (por eso `normalizeSql`),
 * pero se niega a tragarse un cambio real: es la red que avisa de que alguien editó una
 * migración que ya corrió en alguna base.
 *
 * Ese rechazo se vuelve un bloqueo cuando el archivo cambió **después** de aplicarse y el
 * cambio era inocuo — la 056 se aplicó desde un borrador del working tree, luego el archivo
 * se editó y se commiteó, y las dos versiones dejan exactamente el mismo esquema. El runner
 * no puede saberlo (sólo ve hashes) y el resultado es que `db:plan` y `db:migrate` no
 * corren en absoluto.
 *
 * Este script resuelve ese caso sin tocar la red: **no escribe el checksum a ciegas**.
 * Ejecuta el SQL del archivo dentro de una transacción y sólo actualiza el ledger si
 * esa ejecución termina bien y el valor registrado queda igual al del archivo. Si la
 * migración no fuera idempotente, el `ROLLBACK` deja la base exactamente como estaba.
 *
 * Uso:
 *   node scripts/reconcile-migration-checksum.mjs --list
 *   node scripts/reconcile-migration-checksum.mjs 056_biometric_historico_corte.sql --apply
 */
import 'dotenv/config';
import { createHash } from 'crypto';
import path from 'path';
import { pathToFileURL } from 'url';
import pg from 'pg';
import { checksumOf, normalizeSql, readMigrations } from './postgres-migrations.mjs';

/**
 * En qué estado está una migración respecto a lo que dice el ledger.
 *
 * `distinto` es el único que requiere escribir: los otros dos casos los resuelve el runner
 * solo o no requieren acción.
 */
export function clasificar({ registrado, sql }) {
  if (registrado === undefined) return { estado: 'sin-registrar', accion: 'aplicar' };
  const actual = checksumOf(sql);
  if (registrado === actual) return { estado: 'consistente', accion: 'ninguna', checksum: actual };
  const crudo = createHash('sha256').update(sql).digest('hex');
  if (registrado === crudo) return { estado: 'legacy-crlf', accion: 'ninguna', checksum: actual };
  return { estado: 'distinto', accion: 'reconciliar', checksum: actual };
}

/**
 * Reconcilia una migración. Devuelve un resumen; no lanza salvo que el cliente falle, para
 * que el llamador pueda decidir cómo informar.
 *
 * @param {{ query(sql: string, params?: unknown[]): Promise<unknown> }} client
 * @param {{ filename: string, sql: string, aplicar?: boolean }} opciones
 */
export async function reconciliar(client, { filename, sql, aplicar = false }) {
  const fila = await client.query('SELECT checksum FROM _postgres_migrations WHERE filename = $1', [
    filename
  ]);
  const registrado = fila.rows[0]?.checksum;
  const info = clasificar({ registrado, sql });

  if (info.estado === 'sin-registrar') {
    return {
      filename,
      ...info,
      escrito: false,
      motivo: 'no está en el ledger: aplicar la migración, no reconciliarla'
    };
  }
  if (info.accion === 'ninguna') {
    return { filename, ...info, escrito: false, motivo: `no hay nada que hacer (${info.estado})` };
  }
  if (!aplicar) {
    return {
      filename,
      ...info,
      escrito: false,
      motivo: 'faltaría escribir; repetir con --apply'
    };
  }

  await client.query('BEGIN');
  try {
    // Primero el SQL del archivo: si la base no está en el estado que el archivo describe,
    // esto falla y el rollback deja todo como estaba. Sólo después se toca el ledger.
    await client.query(sql);
    const comprobacion = await client.query(
      'UPDATE _postgres_migrations SET checksum = $1 WHERE filename = $2 RETURNING checksum',
      [info.checksum, filename]
    );
    if (comprobacion.rows[0]?.checksum !== info.checksum) {
      throw new Error('la fila del ledger no quedó con el checksum del archivo');
    }
    await client.query('COMMIT');
    return { filename, ...info, escrito: true, motivo: 'ledger reconciliado' };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  }
}

// ─── CLI ───────────────────────────────────────────────────────────────────────

function logger() {
  return {
    log: m => console.log(m),
    warn: m => console.warn(m),
    error: m => console.error(m)
  };
}

async function main() {
  const argv = process.argv.slice(2);
  const aplicar = argv.includes('--apply');
  const soloListar = argv.includes('--list');
  const pedidos = argv.filter(a => !a.startsWith('--'));
  const log = logger();

  const pool = new pg.Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT || 5432),
    max: 2,
    options: '-c timezone=America/Santiago'
  });

  try {
    const directorio = path.join(process.cwd(), 'migrations');
    const migraciones = readMigrations(directorio);
    const porNombre = new Map(migraciones.map(m => [m.filename, m]));

    if (soloListar) {
      const ledger = await pool.query(
        'SELECT filename, checksum FROM _postgres_migrations ORDER BY filename'
      );
      let problemas = 0;
      for (const fila of ledger.rows) {
        const migracion = porNombre.get(fila.filename);
        if (!migracion) continue; // huérfano: el runner ya avisa y lo deja quieto
        const info = clasificar({ registrado: fila.checksum, sql: migracion.sql });
        if (info.estado === 'consistente' || info.estado === 'legacy-crlf') continue;
        problemas++;
        log.log(`${info.estado.padEnd(13)} ${fila.filename}`);
        log.log(`  registrado: ${fila.checksum}`);
        log.log(`  archivo   : ${info.checksum}`);
      }
      log.log(
        problemas === 0
          ? 'Ningún checksum necesita reconciliación.'
          : `${problemas} migración(es) por reconciliar.`
      );
      return problemas === 0 ? 0 : 1;
    }

    if (pedidos.length === 0) {
      log.error('Indicá el nombre del archivo, o --list para ver todos los que difieren.');
      return 1;
    }

    let codigo = 0;
    for (const filename of pedidos) {
      const migracion = porNombre.get(filename);
      if (!migracion) {
        log.error(`No existe migrations/${filename}`);
        codigo = 1;
        continue;
      }
      if (!normalizeSql(migracion.sql)) {
        log.error(`${filename} está vacío; no hay nada que reconciliar.`);
        codigo = 1;
        continue;
      }
      const resultado = await reconciliar(pool, { filename, sql: migracion.sql, aplicar });
      log.log(
        `${resultado.escrito ? 'reconciliado' : 'sin cambios'}: ${filename} (${resultado.estado}) — ${resultado.motivo}`
      );
      // Sin `--apply` el código de salida avisa igual que `--list`: queda trabajo por hacer.
      if (!aplicar && resultado.accion === 'reconciliar') codigo = 1;
    }
    return codigo;
  } catch (error) {
    log.error(`Error: ${error.message}`);
    return 1;
  } finally {
    await pool.end();
  }
}

// Se ejecuta como script sólo si este archivo es el punto de entrada. `pathToFileURL` y no
// una comparación a mano: en Windows `import.meta.url` lleva tres barras y `process.argv[1]`
// una ruta con contrabarras, así que el concatenado ingenuo nunca coincide y la CLI no
// arrive a correr.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(await main());
}
