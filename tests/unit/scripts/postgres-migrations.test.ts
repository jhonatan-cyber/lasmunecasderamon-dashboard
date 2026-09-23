import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  checksumOf,
  compareLedger,
  findDuplicatePrefixes,
  findMalformedMigrations,
  findOrphans,
  findRenamedMigrations,
  isEmptySql,
  migrate,
  normalizeSql,
  readMigrations
} from '../../../scripts/postgres-migrations.mjs';
import { SCHEMA_INDEX_QUERIES } from '../../../scripts/migration-effects.mjs';

/** Primera linea de cada consulta del indice de esquema, para el cliente falso. */
const schemaQueryByFirstLine = new Map(
  Object.entries(SCHEMA_INDEX_QUERIES).map(([category, sql]) => [
    sql.trim().split('\n')[0].trim(),
    category as string
  ])
);

// ── Utilidades ──────────────────────────────────────────────────────────

const tempDirs: string[] = [];

function fixtureDir(files: Record<string, string>): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'migraciones-'));
  tempDirs.push(directory);
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(directory, name), content, 'utf8');
  }
  return directory;
}

function silentLogger() {
  return { log: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

/**
 * Cliente pg falso: emula el historial en memoria y las sentencias que usa el
 * runner. Los archivos de migracion se identifican por su primera linea.
 */
function fakeClient(
  initialLedger: Record<string, string> = {},
  options: { failOn?: string; schema?: Record<string, unknown[]> } = {}
) {
  const ledger = new Map(Object.entries(initialLedger));
  const executed: string[] = [];
  const calls: string[] = [];

  const client = {
    ledger,
    executed,
    calls,
    async query(sql: string, params?: unknown[]) {
      const statement = sql.trim().split('\n')[0].trim();
      calls.push(statement);

      const schemaCategory = schemaQueryByFirstLine.get(statement);
      if (schemaCategory) return { rows: options.schema?.[schemaCategory] ?? [] };

      if (/^SELECT pg_advisory_(lock|unlock)/.test(statement)) return { rows: [] };
      if (/^CREATE TABLE IF NOT EXISTS _postgres_migrations/.test(statement)) return { rows: [] };
      if (/^SELECT filename, checksum FROM _postgres_migrations/.test(statement))
        return { rows: [...ledger].map(([filename, checksum]) => ({ filename, checksum })) };
      if (/^INSERT INTO _postgres_migrations/.test(statement)) {
        ledger.set(String(params?.[0]), String(params?.[1]));
        return { rows: [] };
      }
      if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(statement)) return { rows: [] };

      executed.push(statement);
      if (options.failOn && statement === options.failOn) throw new Error('boom');
      return { rows: [] };
    }
  };

  return client;
}

afterEach(() => {
  while (tempDirs.length) fs.rmSync(tempDirs.pop()!, { recursive: true, force: true });
});

// ── Checksums ───────────────────────────────────────────────────────────

describe('verificacion de checksums', () => {
  it('produce el mismo checksum para el mismo contenido en CRLF y en LF', () => {
    const lf = 'ALTER TABLE productos\r\n'.replace(/\r\n/g, '\n') + 'SELECT 1;\n';
    const crlf = lf.replace(/\n/g, '\r\n');

    expect(normalizeSql(crlf)).toBe(lf);
    expect(checksumOf(crlf)).toBe(checksumOf(lf));
  });

  it('cambia el checksum cuando cambia el contenido', () => {
    expect(checksumOf('SELECT 1;')).not.toBe(checksumOf('SELECT 2;'));
  });

  it('no rechaza una migracion aplicada si el archivo quedo en CRLF y el ledger en LF', async () => {
    const sql = 'SELECT 1;\nSELECT 2;\n';
    const directory = fixtureDir({ '001_consolidada.sql': sql.replace(/\n/g, '\r\n') });
    const client = fakeClient({ '001_consolidada.sql': checksumOf(sql) });

    await expect(migrate(client, { directory, logger: silentLogger() })).resolves.toBeUndefined();
    expect(client.executed).toEqual([]);
  });

  it('aborta si cambio el contenido de una migracion ya aplicada', async () => {
    const directory = fixtureDir({ '001_consolidada.sql': 'SELECT 1;' });
    const client = fakeClient({ '001_consolidada.sql': checksumOf('SELECT distinto;') });

    await expect(migrate(client, { directory, logger: silentLogger() })).rejects.toThrow(
      'Applied migration changed: 001_consolidada.sql'
    );
    expect(client.executed).toEqual([]);
  });
});

// ── Lectura de disco ────────────────────────────────────────────────────

describe('readMigrations', () => {
  it('ordena alfabeticamente, ignora archivos que no son .sql y calcula su checksum', () => {
    const directory = fixtureDir({
      '010_b.sql': 'SELECT 10;',
      '002_a.sql': 'SELECT 2;',
      'notas.md': 'no es una migracion'
    });

    const migrations = readMigrations(directory);

    expect(migrations.map(migration => migration.filename)).toEqual(['002_a.sql', '010_b.sql']);
    expect(migrations[0].checksum).toBe(checksumOf('SELECT 2;'));
    expect(migrations[0].sql).toBe('SELECT 2;');
  });
});

// ── Prefijos y huerfanos ────────────────────────────────────────────────

describe('findDuplicatePrefixes', () => {
  it('agrupa los archivos que comparten prefijo numerico', () => {
    const duplicates = findDuplicatePrefixes([
      '011_tipos_venta.sql',
      '011_transferencias.sql',
      '012_recepcion.sql',
      'sin_prefijo.sql'
    ]);

    expect(duplicates).toEqual([
      { prefix: '011', files: ['011_tipos_venta.sql', '011_transferencias.sql'] }
    ]);
  });

  it('no reporta nada cuando los prefijos son unicos', () => {
    expect(findDuplicatePrefixes(['001_a.sql', '002_b.sql'])).toEqual([]);
  });
});

describe('findOrphans', () => {
  it('reporta las migraciones registradas que ya no tienen archivo', () => {
    expect(findOrphans(['003_inventory.sql', '001_a.sql'], ['001_a.sql', '002_b.sql'])).toEqual([
      '003_inventory.sql'
    ]);
  });

  it('no reporta nada cuando todo el historial tiene archivo', () => {
    expect(findOrphans(['001_a.sql'], ['001_a.sql'])).toEqual([]);
  });
});

describe('findRenamedMigrations', () => {
  it('empareja la registrada que ya no tiene archivo con la que tiene su contenido', () => {
    expect(
      findRenamedMigrations(new Map([['016_champagne.sql', 'hash-a']]), [
        { filename: '016b_champagne.sql', checksum: 'hash-a' }
      ])
    ).toEqual([{ registered: '016_champagne.sql', current: '016b_champagne.sql' }]);
  });

  it('no reporta nada si la registrada sigue en disco', () => {
    expect(
      findRenamedMigrations(new Map([['001_a.sql', 'hash-a']]), [
        { filename: '001_a.sql', checksum: 'hash-a' }
      ])
    ).toEqual([]);
  });

  it('no reporta nada si el contenido huerfano no esta en ningun archivo', () => {
    expect(
      findRenamedMigrations(new Map([['003_inventory.sql', 'hash-viejo']]), [
        { filename: '001_a.sql', checksum: 'hash-a' }
      ])
    ).toEqual([]);
  });
});

// ── Revision del historial contra el disco ─────────────────────────────

describe('compareLedger', () => {
  const migraciones = [
    { filename: '001_a.sql', checksum: 'hash-a' },
    { filename: '002_b.sql', checksum: 'hash-b' }
  ];

  it('no reporta diferencias cuando el historial cuadra con el disco', () => {
    const ledger = new Map([
      ['001_a.sql', 'hash-a'],
      ['002_b.sql', 'hash-b']
    ]);

    expect(compareLedger(ledger, migraciones)).toEqual({
      missing: [],
      orphaned: [],
      mismatched: []
    });
  });

  it('separa las no aplicadas, las huerfanas y las que cambiaron de checksum', () => {
    const ledger = new Map([
      ['002_b.sql', 'hash-viejo'],
      ['003_inventory.sql', 'hash-huerfano']
    ]);

    expect(compareLedger(ledger, migraciones)).toEqual({
      missing: ['001_a.sql'],
      orphaned: ['003_inventory.sql'],
      mismatched: ['002_b.sql']
    });
  });

  it('acepta el historial como pares [archivo, checksum]', () => {
    expect(
      compareLedger(
        [
          ['001_a.sql', 'hash-a'],
          ['002_b.sql', 'hash-b']
        ],
        migraciones
      ).missing
    ).toEqual([]);
  });
});

// ── Convencion de nombre y contenido ────────────────────────────────────

describe('findMalformedMigrations', () => {
  it('reporta los nombres que se aplicarian en un orden impredecible', () => {
    expect(
      findMalformedMigrations([
        '001_consolidated.sql',
        '01_corta.sql',
        'Marca final.sql',
        'migracion_sin_numero.sql',
        '005_MAYUSCULAS.sql'
      ])
    ).toEqual([
      '005_MAYUSCULAS.sql',
      '01_corta.sql',
      'Marca final.sql',
      'migracion_sin_numero.sql'
    ]);
  });

  it('acepta la convencion del repo', () => {
    expect(
      findMalformedMigrations([
        '001_consolidated.sql',
        '011_transferencias_aprobacion.sql',
        '021_unidades_impresion.sql'
      ])
    ).toEqual([]);
  });
});

describe('isEmptySql', () => {
  it('detecta migraciones que solo tienen comentarios', () => {
    expect(isEmptySql('-- pendiente de completar\n')).toBe(true);
    expect(isEmptySql('/* nada por ahora */\n\n   ')).toBe(true);
    expect(isEmptySql('')).toBe(true);
  });

  it('deja pasar cualquier sentencia ejecutable', () => {
    expect(isEmptySql('-- comentario\nALTER TABLE productos ADD COLUMN x int;')).toBe(false);
    expect(isEmptySql('/* bloque */ SELECT 1;')).toBe(false);
  });
});

// ── Ejecucion ───────────────────────────────────────────────────────────

describe('migrate', () => {
  it('aplica las pendientes en orden, cada una en su transaccion, y registra su checksum', async () => {
    const directory = fixtureDir({ '001_a.sql': 'SELECT 1;', '002_b.sql': 'SELECT 2;' });
    const client = fakeClient();
    const logger = silentLogger();

    await migrate(client, { directory, logger });

    expect(client.executed).toEqual(['SELECT 1;', 'SELECT 2;']);
    expect(client.calls.filter(call => call === 'BEGIN')).toHaveLength(2);
    expect(client.calls.filter(call => call === 'COMMIT')).toHaveLength(2);
    expect(client.calls).toContain('CREATE TABLE IF NOT EXISTS _postgres_migrations (');
    expect([...client.ledger]).toEqual([
      ['001_a.sql', checksumOf('SELECT 1;')],
      ['002_b.sql', checksumOf('SELECT 2;')]
    ]);
    expect(logger.log).toHaveBeenCalledWith('Applied: 001_a.sql');
  });

  it('no reejecuta las migraciones ya aplicadas', async () => {
    const directory = fixtureDir({ '001_a.sql': 'SELECT 1;', '002_b.sql': 'SELECT 2;' });
    const client = fakeClient({ '001_a.sql': checksumOf('SELECT 1;') });

    await migrate(client, { directory, logger: silentLogger() });

    expect(client.executed).toEqual(['SELECT 2;']);
  });

  it('revierte, no registra y aborta cuando una migracion falla', async () => {
    const directory = fixtureDir({ '001_a.sql': 'SELECT 1;', '002_b.sql': 'SELECT 2;' });
    const client = fakeClient({}, { failOn: 'SELECT 1;' });

    await expect(migrate(client, { directory, logger: silentLogger() })).rejects.toThrow(
      'Migration failed: 001_a.sql'
    );
    expect(client.calls).toContain('ROLLBACK');
    expect(client.ledger.size).toBe(0);
    expect(client.executed).toEqual(['SELECT 1;']);
  });

  it('libera el lock aunque una migracion falle', async () => {
    const directory = fixtureDir({ '001_a.sql': 'SELECT 1;' });
    const client = fakeClient({}, { failOn: 'SELECT 1;' });

    await expect(migrate(client, { directory, logger: silentLogger() })).rejects.toThrow();
    expect(client.calls).toContain('SELECT pg_advisory_unlock(72419001)');
  });

  it('avisa de registros huerfanos pero sigue aplicando el resto', async () => {
    const directory = fixtureDir({ '001_a.sql': 'SELECT 1;' });
    const client = fakeClient({ '003_inventory.sql': 'hash viejo' });
    const logger = silentLogger();

    await migrate(client, { directory, logger });

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('003_inventory.sql'));
    expect(client.executed).toEqual(['SELECT 1;']);
    expect(client.ledger.has('003_inventory.sql')).toBe(true);
  });

  it('avisa de prefijos numericos repetidos por aplicar y los aplica en orden alfabetico', async () => {
    const directory = fixtureDir({
      '011_tipos_venta.sql': 'SELECT tipos;',
      '011_transferencias.sql': 'SELECT traspasos;'
    });
    const client = fakeClient();
    const logger = silentLogger();

    await migrate(client, { directory, logger });

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('011_tipos_venta.sql'));
    expect(client.executed).toEqual(['SELECT tipos;', 'SELECT traspasos;']);
  });

  it('no avisa de prefijos repetidos que ya estan aplicados', async () => {
    const directory = fixtureDir({
      '011_tipos_venta.sql': 'SELECT tipos;',
      '011_transferencias.sql': 'SELECT traspasos;'
    });
    const client = fakeClient({
      '011_tipos_venta.sql': checksumOf('SELECT tipos;'),
      '011_transferencias.sql': checksumOf('SELECT traspasos;')
    });
    const logger = silentLogger();

    await migrate(client, { directory, logger });

    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('no avisa de huerfanos ni de duplicados cuando el historial esta limpio', async () => {
    const directory = fixtureDir({ '001_a.sql': 'SELECT 1;' });
    const logger = silentLogger();

    await migrate(fakeClient(), { directory, logger });

    expect(logger.warn).not.toHaveBeenCalled();
  });
});

// ── Adopcion sin depender del nombre del archivo ───────────────────────

function schemaFixture(overrides: Record<string, unknown[]> = {}) {
  return {
    tables: [],
    columns: [],
    indexes: [],
    sequences: [],
    constraints: [],
    deferrable: [],
    ...overrides
  };
}

describe('adopcion', () => {
  it('adopta por contenido un archivo renombrado y no ejecuta su SQL', async () => {
    const sql = 'ALTER TABLE productos ADD COLUMN max_anfitrionas integer;';
    const directory = fixtureDir({ '016b_champagne.sql': sql });
    const client = fakeClient({ '016_champagne.sql': checksumOf(sql) });
    const logger = silentLogger();

    await migrate(client, { directory, logger });

    expect(client.executed).toEqual([]);
    expect([...client.ledger.keys()].sort()).toEqual(['016_champagne.sql', '016b_champagne.sql']);
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Adopted: 016b_champagne.sql'));
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('mismo contenido que'));
  });

  it('explica el renombre en vez de reportarlo como archivo perdido', async () => {
    const sql = 'SELECT 1;';
    const directory = fixtureDir({ '016b_champagne.sql': sql });
    const client = fakeClient({ '016_champagne.sql': checksumOf(sql) });
    const logger = silentLogger();

    await migrate(client, { directory, logger });

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('con otro nombre'));
    expect(logger.warn).not.toHaveBeenCalledWith(expect.stringContaining('ya no tienen archivo'));
  });

  it('adopta por efectos un archivo nuevo cuyos objetos ya existen', async () => {
    const directory = fixtureDir({
      '001_linea_base.sql':
        'CREATE TABLE inventario_unidades (id varchar(36) PRIMARY KEY, fecha_impresion timestamptz);'
    });
    const client = fakeClient(
      {},
      {
        schema: schemaFixture({
          tables: [{ name: 'inventario_unidades' }],
          columns: [
            {
              table_name: 'inventario_unidades',
              column_name: 'id',
              data_type: 'character varying'
            },
            {
              table_name: 'inventario_unidades',
              column_name: 'fecha_impresion',
              data_type: 'timestamp with time zone'
            }
          ]
        })
      }
    );
    const logger = silentLogger();

    await migrate(client, { directory, logger });

    expect(client.executed).toEqual([]);
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Adopted: 001_linea_base.sql'));
    expect(client.ledger.has('001_linea_base.sql')).toBe(true);
  });

  it('aplica cuando falta algun efecto', async () => {
    const sql = 'CREATE TABLE inventario_unidades (id varchar(36) PRIMARY KEY, fecha int);';
    const directory = fixtureDir({ '001_linea_base.sql': sql });
    const client = fakeClient(
      {},
      { schema: schemaFixture({ tables: [{ name: 'inventario_unidades' }] }) }
    );
    const logger = silentLogger();

    await migrate(client, { directory, logger });

    // El cliente falso registra la primera linea de cada sentencia ejecutada.
    expect(client.executed).toEqual([
      'CREATE TABLE inventario_unidades (id varchar(36) PRIMARY KEY, fecha int);'
    ]);
    expect(logger.log).toHaveBeenCalledWith('Applied: 001_linea_base.sql');
  });

  it('aplica un archivo con trabajo de datos aunque su DDL ya exista', async () => {
    const sql = `CREATE TABLE inventario_unidades (id varchar(36) PRIMARY KEY);
INSERT INTO roles (id_rol, nombre) SELECT 'x', 'y' WHERE NOT EXISTS (SELECT 1 FROM roles);`;
    const directory = fixtureDir({ '001_linea_base.sql': sql });
    const client = fakeClient(
      {},
      {
        schema: schemaFixture({
          tables: [{ name: 'inventario_unidades' }],
          columns: [
            { table_name: 'inventario_unidades', column_name: 'id', data_type: 'character varying' }
          ]
        })
      }
    );
    const logger = silentLogger();

    await migrate(client, { directory, logger });

    expect(client.executed).toEqual([
      'CREATE TABLE inventario_unidades (id varchar(36) PRIMARY KEY);'
    ]);
    expect(logger.log).toHaveBeenCalledWith('Applied: 001_linea_base.sql');
  });

  it('en modo plan informa lo que haria y no escribe nada', async () => {
    const directory = fixtureDir({
      '001_linea_base.sql': 'CREATE TABLE inventario_unidades (id varchar(36));',
      '002_nueva.sql': 'CREATE TABLE tabla_nueva (id integer);'
    });
    const client = fakeClient(
      {},
      {
        schema: schemaFixture({
          tables: [{ name: 'inventario_unidades' }],
          columns: [
            { table_name: 'inventario_unidades', column_name: 'id', data_type: 'character varying' }
          ]
        })
      }
    );
    const logger = silentLogger();

    await migrate(client, { directory, logger, plan: true });

    expect(client.executed).toEqual([]);
    expect(client.calls).not.toContain('BEGIN');
    expect(client.calls).not.toContain('SELECT pg_advisory_lock(72419001)');
    expect(client.calls.some(call => call.startsWith('INSERT INTO _postgres_migrations'))).toBe(
      false
    );
    expect(client.ledger.size).toBe(0);
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Adopted: 001_linea_base.sql'));
    expect(logger.log).toHaveBeenCalledWith(
      expect.stringContaining('Pending: 002_nueva.sql (faltan')
    );
  });

  it('no adopta un DROP si una migracion pendiente del mismo lote crea el objeto (el indice de esquema se invalida al aplicar)', async () => {
    // Regresion del bug que hizo visible el dump de semilla: el indice de
    // esquema se memoizaba para TODA la corrida, asi que 007 (DROP COLUMN) se
    // evaluaba contra la foto previa a 005 (ADD COLUMN): veia la columna
    // ausente, consideraba su trabajo hecho y lo adoptaba sin ejecutarlo. La
    // columna resucitaba en toda instalacion desde cero.
    const directory = fixtureDir({
      '005_agrega.sql':
        'ALTER TABLE productos ADD COLUMN precio_compra integer NOT NULL DEFAULT 0;',
      '007_elimina.sql': 'ALTER TABLE productos DROP COLUMN IF EXISTS precio_compra;'
    });
    // Cliente con estado: el schema que responde refleja los DDL ya ejecutados.
    const statefulClient = (() => {
      const base = fakeClient({}, { schema: schemaFixture({ tables: [{ name: 'productos' }] }) });
      let hasColumn = false;
      const realQuery = base.query.bind(base);
      base.query = async (sql: string, params?: unknown[]) => {
        const statement = sql.trim().split('\n')[0].trim();
        // Muta el estado antes de delegar: el registro del ALTER lo hace el
        // cliente base (executed, failOn).
        if (/^ALTER TABLE productos ADD COLUMN precio_compra/.test(statement)) hasColumn = true;
        if (/^ALTER TABLE productos DROP COLUMN/.test(statement)) hasColumn = false;
        // La consulta de columnas del indice refleja el estado actual.
        if (statement === 'SELECT table_name, column_name, data_type') {
          return {
            rows: hasColumn
              ? [{ table_name: 'productos', column_name: 'precio_compra', data_type: 'integer' }]
              : []
          };
        }
        return realQuery(sql, params);
      };
      return base;
    })();
    const logger = silentLogger();

    await migrate(statefulClient, { directory, logger });

    // 005 se aplica; 007 se EJECUTA (no se adopta) porque al llegar su turno la
    // columna existe: la decision vio el esquema que 005 dejo.
    expect(statefulClient.executed).toEqual([
      'ALTER TABLE productos ADD COLUMN precio_compra integer NOT NULL DEFAULT 0;',
      'ALTER TABLE productos DROP COLUMN IF EXISTS precio_compra;'
    ]);
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Applied: 007_elimina.sql'));
  });
});
