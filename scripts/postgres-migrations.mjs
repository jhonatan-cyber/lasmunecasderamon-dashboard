import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { SCHEMA_INDEX_QUERIES, adoptionByEffects, buildSchemaIndex } from './migration-effects.mjs';

const ADVISORY_LOCK_ID = 72419001;

/**
 * Directorio de migraciones por defecto. Se resuelve al usarlo y no al
 * importar el modulo: asi el runner se puede cargar desde entornos de prueba
 * que no exponen una URL file:// (jsdom, por ejemplo).
 */
export function defaultDirectory() {
  return fileURLToPath(new URL('../migrations/', import.meta.url));
}

/**
 * Normalizamos los saltos de linea antes de hashear: git entrega LF, pero en
 * Windows la copia de trabajo puede quedar en CRLF. Sin esto, la misma
 * migracion produce hashes distintos segun el sistema operativo y el runner la
 * rechaza como "Applied migration changed".
 */
export function normalizeSql(sql) {
  return sql.replace(/\r\n/g, '\n');
}

export function checksumOf(sql) {
  return createHash('sha256').update(normalizeSql(sql)).digest('hex');
}

/** Migraciones de disco, en el orden en que se aplican (alfabetico). */
export function readMigrations(directory = defaultDirectory()) {
  return fs
    .readdirSync(directory)
    .filter(filename => filename.endsWith('.sql'))
    .sort()
    .map(filename => {
      const sql = fs.readFileSync(path.join(directory, filename), 'utf8');
      return { filename, sql, checksum: checksumOf(sql) };
    });
}

/**
 * Prefijos numericos repetidos (ej. dos archivos 011_*). Dentro del grupo el
 * orden aplicado es alfabetico, no el que sugiere el numero, asi que conviene
 * renumerar el archivo nuevo con el siguiente numero libre.
 */
export function findDuplicatePrefixes(filenames) {
  const byPrefix = new Map();
  for (const filename of filenames) {
    const prefix = /^(\d+)/.exec(filename)?.[1];
    if (!prefix) continue;
    byPrefix.set(prefix, [...(byPrefix.get(prefix) ?? []), filename]);
  }
  return [...byPrefix.entries()]
    .filter(([, files]) => files.length > 1)
    .map(([prefix, files]) => ({ prefix, files: [...files].sort() }));
}

/** Migraciones registradas en la base que ya no tienen archivo en el repo. */
export function findOrphans(appliedFilenames, filenames) {
  const onDisk = new Set(filenames);
  return [...appliedFilenames].filter(filename => !onDisk.has(filename)).sort();
}

/**
 * Migraciones registradas cuyo contenido sigue en el repo bajo otro nombre: son
 * renombres, no archivos perdidos. Se adoptan por contenido, sin reejecutar nada.
 *
 * @param {Map<string, string> | Iterable<[string, string]>} applied
 * @param {{ filename: string, checksum: string }[]} migrations
 * @returns {{ registered: string, current: string }[]}
 */
export function findRenamedMigrations(applied, migrations) {
  const ledger = applied instanceof Map ? applied : new Map(applied);
  const onDisk = new Set(migrations.map(migration => migration.filename));
  return migrations
    .filter(
      migration =>
        !ledger.has(migration.filename) &&
        [...ledger.entries()].some(
          ([filename, checksum]) => !onDisk.has(filename) && checksum === migration.checksum
        )
    )
    .map(migration => ({
      registered: [...ledger.entries()].find(
        ([filename, checksum]) => !onDisk.has(filename) && checksum === migration.checksum
      )[0],
      current: migration.filename
    }))
    .sort((a, b) => a.current.localeCompare(b.current));
}

/** Indice de lo que ya existe en la base, para comprobar efectos. */
async function readSchemaIndex(client) {
  const rows = {};
  for (const [category, sql] of Object.entries(SCHEMA_INDEX_QUERIES)) {
    rows[category] = (await client.query(sql)).rows;
  }
  return buildSchemaIndex(rows);
}

/**
 * Convencion de nombre: prefijo numerico de 3 o mas digitos, minusculas, guion
 * bajo y `.sql`. El runner aplica por orden alfabetico, asi que un nombre fuera
 * de la convencion se cuela en una posicion arbitraria del orden.
 */
export const MIGRATION_FILENAME_PATTERN = /^\d{3,}_[a-z0-9]+(?:_[a-z0-9]+)*\.sql$/;

/** Nombres que no siguen la convencion (se aplicarian en un orden impredecible). */
export function findMalformedMigrations(filenames) {
  return [...filenames].filter(filename => !MIGRATION_FILENAME_PATTERN.test(filename)).sort();
}

/**
 * true si el archivo no aporta ninguna sentencia ejecutable (solo comentarios o
 * espacios). Es un fallo silencioso clasico: la migracion "se aplica" sin error,
 * queda registrada en el historial y no cambia nada.
 */
export function isEmptySql(sql) {
  return (
    sql
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/--[^\n]*/g, ' ')
      .trim().length === 0
  );
}

/**
 * Diferencias entre el historial de una base de datos y los archivos del repo.
 *
 * @param {Map<string, string> | Iterable<[string, string]>} applied
 *   Historial de la base: nombre de archivo -> checksum registrado.
 * @param {{ filename: string, checksum: string }[]} migrations
 *   Migraciones en disco, tal como las entrega `readMigrations`.
 * @returns {{ missing: string[], orphaned: string[], mismatched: string[] }}
 *   `missing`: en disco pero nunca aplicadas. `orphaned`: aplicadas pero sin
 *   archivo (renombre o borrado). `mismatched`: aplicadas con otro contenido.
 */
export function compareLedger(applied, migrations) {
  const ledger = applied instanceof Map ? applied : new Map(applied);
  const onDisk = new Map(migrations.map(migration => [migration.filename, migration.checksum]));
  const filenames = [...onDisk.keys()].sort();
  return {
    missing: filenames.filter(filename => !ledger.has(filename)),
    orphaned: [...ledger.keys()].filter(filename => !onDisk.has(filename)).sort(),
    mismatched: filenames.filter(
      filename => ledger.has(filename) && ledger.get(filename) !== onDisk.get(filename)
    )
  };
}

function describeDuplicates(duplicates) {
  return duplicates.map(({ prefix, files }) => `${prefix} -> ${files.join(' + ')}`).join(' | ');
}

/**
 * Decide si una migracion ya esta aplicada aunque su nombre no figure en el
 * historial. Dos reglas, de la mas exacta a la mas inferida:
 *
 *  1. Mismo contenido que una registrada: es un renombre, no se ejecuta nada.
 *  2. Todos sus efectos de esquema ya estan presentes y el archivo no tiene
 *     trabajo que el esquema no pueda confirmar: su trabajo esta hecho.
 */
async function decideAdoption({ checksum, sql, applied, schemaIndex }) {
  const sameContent = [...applied.entries()].find(([, value]) => value === checksum);
  if (sameContent) return { adopt: true, reason: `mismo contenido que ${sameContent[0]}` };
  return adoptionByEffects(sql, await schemaIndex());
}

/**
 * Aplica las migraciones pendientes de `directory` sobre `client`.
 *
 * Antes de ejecutar, intenta adoptar la migracion: con el mismo contenido ya
 * registrado bajo otro nombre, o porque todos sus efectos ya estan en la base.
 * Asi renombrar o reordenar archivos deja de implicar reejecutar SQL.
 *
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<{ rows: any[] }> }} client
 *   Cliente pg (o equivalente) ya conectado.
 * @param {{ directory?: string, logger?: { log: (...args: any[]) => void, warn: (...args: any[]) => void }, plan?: boolean }} [options]
 *   Directorio de migraciones, salida de mensajes (inyectable para pruebas) y
 *   `plan` para decidir sin escribir nada en la base.
 * @returns {Promise<void>}
 */
export async function migrate(
  client,
  { directory = defaultDirectory(), logger = console, plan = false } = {}
) {
  const migrations = readMigrations(directory);

  if (!plan) await client.query(`SELECT pg_advisory_lock(${ADVISORY_LOCK_ID})`);
  try {
    if (!plan)
      await client.query(`CREATE TABLE IF NOT EXISTS _postgres_migrations (
      filename text PRIMARY KEY, checksum text NOT NULL, executed_at timestamptz NOT NULL DEFAULT now()
    )`);

    // Una sola lectura del historial: sirve para el control de checksums, para
    // detectar renombres y para detectar registros huerfanos.
    let applied = new Map();
    try {
      const ledger = await client.query('SELECT filename, checksum FROM _postgres_migrations');
      applied = new Map(ledger.rows.map(row => [row.filename, row.checksum]));
    } catch (error) {
      if (!plan) throw error;
    }

    const renamed = findRenamedMigrations(applied, migrations);
    const explained = new Set(renamed.map(({ registered }) => registered));
    const orphans = findOrphans(
      applied.keys(),
      migrations.map(migration => migration.filename)
    ).filter(filename => !explained.has(filename));
    if (orphans.length) {
      logger.warn(
        `⚠️  ${orphans.length} migracion(es) registradas en _postgres_migrations ya no tienen archivo en migrations/: ` +
          `${orphans.join(', ')}. Se ignoran; no borres esas filas, son parte del historial aplicado.`
      );
    }
    for (const { registered, current } of renamed) {
      logger.warn(
        `ℹ️  ${registered} es el contenido de ${current} con otro nombre: se adopta por contenido, sin reejecutar el SQL.`
      );
    }

    // Solo avisamos de los prefijos repetidos que todavia importan: si el grupo
    // ya esta aplicado, el orden quedo registrado y un aviso permanente solo
    // ensena a ignorar los avisos.
    const pending = new Set(
      migrations.filter(migration => !applied.has(migration.filename)).map(m => m.filename)
    );
    const duplicates = findDuplicatePrefixes(
      migrations.map(migration => migration.filename)
    ).filter(({ files }) => files.some(filename => pending.has(filename)));
    if (duplicates.length) {
      logger.warn(
        `⚠️  Prefijos numericos repetidos entre migraciones por aplicar: ${describeDuplicates(duplicates)}. ` +
          'Se aplican en orden alfabetico dentro del grupo; renumera el archivo nuevo con el siguiente numero libre.'
      );
    }

    // El indice del esquema se lee solo cuando hace falta y se invalida cada
    // vez que una migracion aplicada cambia el esquema. Memoizarlo para toda
    // la corrida es un error: la decision de adopcion de una migracion debe
    // ver el esquema DEJADO POR las migraciones anteriores del mismo lote, no
    // la foto inicial. Sin esto, si 005 agrega una columna y 007 la elimina,
    // 007 se evaluaba contra la foto previa a 005: veia la columna ausente,
    // consideraba su DROP "satisfecho" y lo adoptaba sin ejecutarlo.
    let schemaIndex = null;
    let schemaIndexStale = true;
    const readIndex = async () => {
      if (schemaIndexStale) {
        schemaIndex = await readSchemaIndex(client);
        schemaIndexStale = false;
      }
      return schemaIndex;
    };

    for (const { filename, sql, checksum } of migrations) {
      const previousChecksum = applied.get(filename);
      if (previousChecksum !== undefined) {
        if (previousChecksum !== checksum)
          throw new Error(`Applied migration changed: ${filename}`);
        continue;
      }

      const adoption = await decideAdoption({ checksum, sql, applied, schemaIndex: readIndex });
      if (adoption.adopt) {
        if (!plan)
          await client.query(
            'INSERT INTO _postgres_migrations (filename, checksum) VALUES ($1, $2)',
            [filename, checksum]
          );
        logger.log(`Adopted: ${filename} (${adoption.reason})`);
        continue;
      }

      if (plan) {
        logger.log(`Pending: ${filename} (${adoption.reason})`);
        continue;
      }

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO _postgres_migrations (filename, checksum) VALUES ($1, $2)',
          [filename, checksum]
        );
        await client.query('COMMIT');
        // La migracion aplicada puede haber cambiado el esquema: la proxima
        // decision de adopcion debe partir de una lectura fresca.
        schemaIndexStale = true;
        logger.log(`Applied: ${filename}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`Migration failed: ${filename}`, { cause: error });
      }
    }
  } finally {
    if (!plan) await client.query(`SELECT pg_advisory_unlock(${ADVISORY_LOCK_ID})`);
  }
}
