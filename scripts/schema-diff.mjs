/**
 * Comparacion de esquemas entre dos bases de datos PostgreSQL.
 *
 * Existe por una razon concreta: el esquema de este proyecto se define hoy en dos
 * lugares (el dump de `database/` y la cadena de `migrations/`) y ya se
 * desviaron entre si. Antes de consolidar la cadena en una linea base hay que
 * poder *probar* que las dos rutas de instalacion producen el mismo esquema, y
 * este modulo es esa prueba.
 *
 * El modulo es puro a proposito (recibe listas de lineas, no clientes) para que
 * las reglas de normalizacion se puedan probar sin una base de datos.
 */

/**
 * Sentencias que describen el esquema. Cada fila se resume en una linea de texto
 * autosuficiente, de modo que comparar sea comparar conjuntos de lineas.
 */
export const SCHEMA_QUERIES = {
  tables: `SELECT table_name
             FROM information_schema.tables
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
  columns: `SELECT table_name || '.' || column_name || ' ' || data_type ||
                  COALESCE('(' || character_maximum_length || ')', '') ||
                  ' null=' || is_nullable || ' default=' || COALESCE(column_default, '-')
             FROM information_schema.columns
            WHERE table_schema = 'public'`,
  indexes: `SELECT indexname || ' :: ' || indexdef
              FROM pg_indexes
             WHERE schemaname = 'public'`,
  constraints: `SELECT conrelid::regclass || ' ' || conname || ' ' || pg_get_constraintdef(oid)
                  FROM pg_constraint
                 WHERE connamespace = 'public'::regnamespace`
};

export const SCHEMA_CATEGORIES = Object.keys(SCHEMA_QUERIES);

/**
 * Normaliza una linea para que las diferencias de forma no ahoguen a las de
 * fondo. PostgreSQL escribe la misma definicion de varias maneras segun el
 * origen: un dump usa `NULL::character varying`, una migracion simplemente no
 * escribe default; `'x'::character varying` y `'x'` son el mismo default.
 */
export function normalizeLine(line) {
  return line
    .trim()
    .replace(/\bdefault[= ]+null::[\w\s[\]"]+/gi, 'default=-')
    .replace(/\bdefault[= ]+null\b/gi, 'default=-')
    .replace(/::character varying\b/gi, '')
    .replace(/::text\b/gi, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/** Convierte las filas de una consulta en un conjunto de lineas normalizadas. */
export function toSnapshot(rows) {
  return new Set(rows.map(row => normalizeLine(Object.values(row)[0])));
}

/**
 * Compara dos snapshots (categoria -> lineas normalizadas).
 *
 * @param {Record<string, Iterable<string>>} actual
 * @param {Record<string, Iterable<string>>} expected
 * @param {{ ignore?: string[] }} [options] Prefijos de tabla a excluir del informe.
 * @returns {Record<string, { onlyInActual: string[], onlyInExpected: string[] }>}
 */
export function diffSnapshots(actual, expected, { ignore = [] } = {}) {
  const result = {};
  const ignored = line => ignore.some(prefix => line.startsWith(normalizeLine(prefix)));

  for (const category of SCHEMA_CATEGORIES) {
    const a = new Set(
      [...(actual[category] ?? [])].map(normalizeLine).filter(line => !ignored(line))
    );
    const b = new Set(
      [...(expected[category] ?? [])].map(normalizeLine).filter(line => !ignored(line))
    );
    result[category] = {
      onlyInActual: [...a].filter(line => !b.has(line)).sort(),
      onlyInExpected: [...b].filter(line => !a.has(line)).sort()
    };
  }
  return result;
}

/** true si no hay ninguna diferencia en ninguna categoria. */
export function isEmptyDiff(diff) {
  return Object.values(diff).every(
    category => !category.onlyInActual.length && !category.onlyInExpected.length
  );
}

/** Total de lineas divergentes, para mensajes de error. */
export function countDiff(diff) {
  return Object.values(diff).reduce(
    (total, category) => total + category.onlyInActual.length + category.onlyInExpected.length,
    0
  );
}
