/**
 * Efectos de una migracion sobre el esquema.
 *
 * El ejecutor decide historicamente "¿esta aplicada?" por el NOMBRE del archivo:
 * si no encuentra el nombre, vuelve a ejecutar el SQL. Eso hace peligroso
 * renombrar o reordenar migraciones. Este modulo calcula que objetos declara un
 * archivo y comprueba si ya estan en la base, para que el ejecutor pueda
 * adoptarlo sin reejecutarlo.
 *
 * Criterio de diseno: los efectos se extraen de sentencias que se pueden
 * comprobar contra el catalogo (CREATE TABLE, ADD COLUMN, CREATE INDEX,
 * ADD CONSTRAINT, ...). Si el archivo contiene sentencias cuyo efecto NO se
 * puede comprobar (INSERT, UPDATE, DELETE, SELECT, bloques DO), el archivo no se
 * adopta por esquema: se ejecuta. Preferimos ejecutar de mas antes que saltarnos
 * trabajo real.
 */

/** Nombres de tipo equivalentes, en el SQL del archivo y en el catalogo. */
const TYPE_ALIASES = {
  int: 'integer',
  int4: 'integer',
  serial: 'integer',
  bigserial: 'bigint',
  int8: 'bigint',
  int2: 'smallint',
  varchar: 'varchar',
  'character varying': 'varchar',
  char: 'char',
  bpchar: 'char',
  character: 'char',
  decimal: 'numeric',
  float8: 'double precision',
  'double precision': 'double precision',
  bool: 'boolean',
  timestamptz: 'timestamptz',
  'timestamp with time zone': 'timestamptz',
  timestamp: 'timestamp',
  'timestamp without time zone': 'timestamp',
  'time without time zone': 'time'
};

/** Quita comentarios de linea y de bloque. */
export function stripSqlComments(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ');
}

/**
 * Reemplaza los bloques con comillas de dolar (`$$ ... $$`, `$tag$ ... $tag$`)
 * por un marcador, para poder separar sentencias por `;` sin partir el cuerpo.
 */
export function replaceDollarQuoted(sql) {
  let result = '';
  let index = 0;
  let replaced = 0;

  while (index < sql.length) {
    const opening = /\$[a-zA-Z_][a-zA-Z0-9_]*\$|\$\$/.exec(sql.slice(index));
    if (!opening) break;

    const start = index + opening.index;
    const tag = opening[0];
    const end = sql.indexOf(tag, start + tag.length);
    if (end < 0) break;

    result += sql.slice(index, start) + ' DOLLAR_BLOCK ';
    index = end + tag.length;
    replaced += 1;
  }

  return { sql: result + sql.slice(index), replaced };
}

/** Sentencias del archivo, sin comentarios y con los bloques ya marcados. */
export function splitStatements(sql) {
  return splitTopLevel(replaceDollarQuoted(stripSqlComments(sql)).sql, ';')
    .map(statement => statement.trim().replace(/\s+/g, ' '))
    .filter(Boolean)
    .map(statement => (/^do\s+dollar_block$/i.test(statement) ? 'DOLLAR_BLOCK' : statement));
}

/** Separa por `separator` respetando parentesis, corchetes y comillas. */
export function splitTopLevel(text, separator) {
  const parts = [];
  let current = '';
  let depth = 0;
  let quote = null;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (quote) {
      current += character;
      if (character === quote && text[index - 1] !== '\\') quote = null;
      continue;
    }

    if (character === "'" || character === '"') {
      quote = character;
      current += character;
      continue;
    }

    if (character === '(' || character === '[') depth += 1;
    if (character === ')' || character === ']') depth -= 1;

    if (character === separator && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }

    current += character;
  }

  parts.push(current);
  return parts;
}

/** Nombre de objeto normalizado: sin comillas, sin esquema y en minusculas. */
export function normalizeName(raw) {
  if (!raw) return '';
  return String(raw).trim().replace(/"/g, '').split('.').pop().trim().toLowerCase();
}

/** Tipo normalizado, para comparar SQL escrito a mano con el catalogo. */
export function normalizeType(raw) {
  if (!raw) return '';
  const base = String(raw)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\s*\(\s*\d+(\s*,\s*\d+)?\s*\)\s*$/, '')
    .replace(/\[\s*\]$/, '')
    .trim();
  return TYPE_ALIASES[base] ?? base;
}

/**
 * Convierte el resultado de las consultas de `SCHEMA_INDEX_QUERIES` en un indice
 * consultable de lo que ya existe en la base.
 */
export function buildSchemaIndex({
  tables = [],
  columns = [],
  indexes = [],
  sequences = [],
  constraints = [],
  deferrable = []
}) {
  return {
    tables: new Set(tables.map(row => normalizeName(row.name))),
    columns: new Map(
      columns.map(row => [
        `${normalizeName(row.table_name)}.${normalizeName(row.column_name)}`,
        normalizeType(row.data_type)
      ])
    ),
    indexes: new Set(indexes.map(row => normalizeName(row.name))),
    sequences: new Set(sequences.map(row => normalizeName(row.name))),
    constraints: new Map(
      constraints.map(row => [normalizeName(row.name), normalizeName(row.table_name)])
    ),
    deferrable: new Set(deferrable.map(row => normalizeName(row.name)))
  };
}

/** Consultas que describen lo que existe, sin traer el esquema completo. */
export const SCHEMA_INDEX_QUERIES = {
  tables: `SELECT table_name AS name
             FROM information_schema.tables
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
  columns: `SELECT table_name, column_name, data_type
              FROM information_schema.columns
             WHERE table_schema = 'public'`,
  indexes: `SELECT indexname AS name FROM pg_indexes WHERE schemaname = 'public'`,
  sequences: `SELECT sequencename AS name FROM pg_sequences WHERE schemaname = 'public'`,
  constraints: `SELECT conname AS name, conrelid::regclass::text AS table_name
                  FROM pg_constraint WHERE connamespace = 'public'::regnamespace`,
  deferrable: `SELECT conname AS name
                 FROM pg_constraint
                WHERE connamespace = 'public'::regnamespace AND contype = 'f' AND condeferrable`
};

const CREATE_TABLE = /^create\s+(?:unlogged\s+)?table\s+(?:if\s+not\s+exists\s+)?([^\s(]+)\s*\(?/i;
const CREATE_INDEX =
  /^create\s+(?:unique\s+)?index\s+(?:concurrently\s+)?(?:if\s+not\s+exists\s+)?([^\s(]+)/i;
const CREATE_SEQUENCE = /^create\s+sequence\s+(?:if\s+not\s+exists\s+)?([^\s(]+)/i;
const ALTER_TABLE = /^alter\s+table\s+(?:only\s+)?(?:if\s+exists\s+)?([^\s]+)\s+([\s\S]+)$/i;
const ADD_COLUMN =
  /^add\s+column\s+(?:if\s+not\s+exists\s+)?([^\s]+)\s+([^\s,]+(?:\s*\([^)]*\))?)/i;
const ALTER_COLUMN_TYPE = /^alter\s+column\s+([^\s]+)\s+type\s+([^\s,]+(?:\s*\([^)]*\))?)/i;
const DROP_COLUMN = /^drop\s+column\s+(?:if\s+exists\s+)?([^\s,]+)/i;
const ADD_CONSTRAINT = /^add\s+constraint\s+([^\s]+)/i;
const DROP_CONSTRAINT = /^drop\s+constraint\s+(?:if\s+exists\s+)?([^\s,]+)/i;
const RENAME_CONSTRAINT = /^rename\s+constraint\s+([^\s]+)\s+to\s+([^\s,]+)/i;
const ALTER_CONSTRAINT = /^alter\s+constraint\s+([^\s]+)\s+(not\s+)?deferrable/i;
const NAMED_CONSTRAINT =
  /^constraint\s+([^\s]+)\s+(primary\s+key|unique|foreign\s+key|check|exclude)/i;

function addColumnEffects({ push, table, body, unverifiable }) {
  const clauses = splitTopLevel(body, ',');

  for (const clause of clauses) {
    const text = clause.trim();
    if (!text) continue;

    const column = ADD_COLUMN.exec(text);
    if (column) {
      push(`column:${table}.${normalizeName(column[1])}:${normalizeType(column[2])}`);
      continue;
    }

    const type = ALTER_COLUMN_TYPE.exec(text);
    if (type) {
      push(`column:${table}.${normalizeName(type[1])}:${normalizeType(type[2])}`);
      continue;
    }

    const dropped = DROP_COLUMN.exec(text);
    if (dropped) {
      push(`absent:column:${table}.${normalizeName(dropped[1])}`);
      continue;
    }

    const constraint = ADD_CONSTRAINT.exec(text);
    if (constraint) {
      push(`constraint:${normalizeName(constraint[1])}:${table}`);
      continue;
    }

    const droppedConstraint = DROP_CONSTRAINT.exec(text);
    if (droppedConstraint) {
      push(`absent:constraint:${normalizeName(droppedConstraint[1])}`);
      continue;
    }

    const renamed = RENAME_CONSTRAINT.exec(text);
    if (renamed) {
      push(`constraint:${normalizeName(renamed[2])}:${table}`);
      continue;
    }

    const altered = ALTER_CONSTRAINT.exec(text);
    if (altered) {
      const name = normalizeName(altered[1]);
      push(altered[2] ? `not-deferrable:${name}` : `deferrable:${name}`);
      continue;
    }

    unverifiable.push(`alter table ${table}: ${text.slice(0, 60)}`);
  }
}

/**
 * Objetos que el archivo declara sobre el esquema, mas las sentencias cuyo
 * efecto no se puede comprobar contra el catalogo.
 *
 * @returns {{ effects: string[], unverifiable: string[] }}
 */
export function extractEffects(sql) {
  const effects = [];
  const unverifiable = [];
  const seen = new Set();

  const push = effect => {
    if (!seen.has(effect)) {
      seen.add(effect);
      effects.push(effect);
    }
  };

  for (const statement of splitStatements(sql)) {
    if (statement === 'DOLLAR_BLOCK') {
      unverifiable.push('bloque con comillas de dolar (DO)');
      continue;
    }

    if (/^do\b/i.test(statement)) {
      unverifiable.push('bloque DO');
      continue;
    }

    const table = CREATE_TABLE.exec(statement);
    if (table) {
      const name = normalizeName(table[1]);
      push(`table:${name}`);

      const body = /\(([\s\S]*)\)/.exec(statement)?.[1] ?? '';
      for (const part of splitTopLevel(body, ',')) {
        const text = part.trim();
        if (!text) continue;

        const named = NAMED_CONSTRAINT.exec(text);
        if (named) {
          push(`constraint:${normalizeName(named[1])}:${name}`);
          continue;
        }

        if (/^(primary\s+key|foreign\s+key|unique|check|exclude)\b/i.test(text)) continue;
        const column = /^([^\s]+)\s+([^\s,]+(?:\s*\([^)]*\))?)/.exec(text);
        if (column) push(`column:${name}.${normalizeName(column[1])}:${normalizeType(column[2])}`);
      }
      continue;
    }

    const index = CREATE_INDEX.exec(statement);
    if (index) {
      push(`index:${normalizeName(index[1])}`);
      continue;
    }

    const sequence = CREATE_SEQUENCE.exec(statement);
    if (sequence) {
      push(`sequence:${normalizeName(sequence[1])}`);
      continue;
    }

    const alteredTable = ALTER_TABLE.exec(statement);
    if (alteredTable) {
      addColumnEffects({
        push,
        table: normalizeName(alteredTable[1]),
        body: alteredTable[2],
        unverifiable
      });
      continue;
    }

    if (/^(insert|update|delete)\b/i.test(statement)) {
      unverifiable.push(`${statement.split(/\s+/).slice(0, 3).join(' ').toLowerCase()}`);
      continue;
    }

    unverifiable.push(`sentencia no reconocida: ${statement.slice(0, 60)}`);
  }

  return { effects, unverifiable };
}

function isSatisfied(effect, schemaIndex) {
  if (effect.startsWith('absent:column:')) return !schemaIndex.columns.has(effect.slice(14));
  if (effect.startsWith('absent:constraint:'))
    return !schemaIndex.constraints.has(effect.slice(18));
  if (effect.startsWith('column:')) {
    const [target, type] = effect.slice(7).split(':');
    return schemaIndex.columns.get(target) === type;
  }
  if (effect.startsWith('table:')) return schemaIndex.tables.has(effect.slice(6));
  if (effect.startsWith('index:')) return schemaIndex.indexes.has(effect.slice(6));
  if (effect.startsWith('sequence:')) return schemaIndex.sequences.has(effect.slice(9));
  if (effect.startsWith('deferrable:')) return schemaIndex.deferrable.has(effect.slice(11));
  if (effect.startsWith('not-deferrable:')) return !schemaIndex.deferrable.has(effect.slice(15));
  if (effect.startsWith('constraint:')) {
    const [name, table] = effect.slice(11).split(':');
    return schemaIndex.constraints.get(name) === table;
  }
  return false;
}

/** Separa los efectos que ya estan presentes de los que faltan. */
export function evaluateEffects(effects, schemaIndex) {
  return {
    satisfied: effects.filter(effect => isSatisfied(effect, schemaIndex)),
    violated: effects.filter(effect => !isSatisfied(effect, schemaIndex))
  };
}

/**
 * Decide si un archivo puede adoptarse porque su trabajo ya esta hecho.
 *
 * @returns {{ adopt: boolean, reason: string, satisfied: string[], violated: string[] }}
 */
export function adoptionByEffects(sql, schemaIndex) {
  const { effects, unverifiable } = extractEffects(sql);

  if (!effects.length)
    return {
      adopt: false,
      reason: unverifiable.length
        ? `sin efectos de esquema verificables (${unverifiable[0]})`
        : 'no declara ningun objeto',
      satisfied: [],
      violated: []
    };

  if (unverifiable.length)
    return {
      adopt: false,
      reason: `tiene trabajo que el esquema no puede confirmar (${unverifiable[0]})`,
      satisfied: [],
      violated: []
    };

  const { satisfied, violated } = evaluateEffects(effects, schemaIndex);
  if (violated.length)
    return {
      adopt: false,
      reason: `faltan ${violated.length} de ${effects.length} efecto(s) (${violated[0]})`,
      satisfied,
      violated
    };

  return {
    adopt: true,
    reason: `sus ${effects.length} efecto(s) ya estan en la base`,
    satisfied,
    violated
  };
}
