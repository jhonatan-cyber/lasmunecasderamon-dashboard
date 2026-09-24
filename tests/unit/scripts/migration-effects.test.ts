import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  adoptionByEffects,
  buildSchemaIndex,
  extractEffects,
  normalizeName,
  normalizeType,
  SCHEMA_INDEX_QUERIES,
  splitStatements
} from '../../../scripts/migration-effects.mjs';

const migrationsDir = path.resolve(process.cwd(), 'migrations');
const readMigration = (filename: string) =>
  fs.readFileSync(path.join(migrationsDir, filename), 'utf8');
const filenames = fs.readdirSync(migrationsDir).filter(name => name.endsWith('.sql'));

// ── Tipos y nombres ─────────────────────────────────────────────────────

describe('normalizeType', () => {
  it('igual el tipo escrito en SQL con el nombre del catalogo', () => {
    expect(normalizeType('varchar(36)')).toBe('varchar');
    expect(normalizeType('character varying')).toBe('varchar');
    expect(normalizeType('character varying(255)')).toBe('varchar');
    expect(normalizeType('int')).toBe('integer');
    expect(normalizeType('DECIMAL(12,2)')).toBe('numeric');
    expect(normalizeType('timestamp with time zone')).toBe('timestamptz');
    expect(normalizeType('jsonb')).toBe('jsonb');
  });
});

describe('normalizeName', () => {
  it('quita comillas, esquema y mayusculas', () => {
    expect(normalizeName('public."Inventario_Unidades"')).toBe('inventario_unidades');
    expect(normalizeName('inventario_unidades')).toBe('inventario_unidades');
  });
});

// ── Lectura de sentencias ───────────────────────────────────────────────

describe('splitStatements', () => {
  it('no parte los bloques con comillas de dolar', () => {
    const statements = splitStatements('DO $$ BEGIN SELECT 1; SELECT 2; END $$;\nSELECT 3;');

    expect(statements).toHaveLength(2);
    expect(statements[0]).toBe('DOLLAR_BLOCK');
    expect(statements[1]).toBe('SELECT 3');
  });

  it('no parte los literales que contienen punto y coma', () => {
    expect(splitStatements("INSERT INTO x VALUES ('a;b');")).toEqual([
      "INSERT INTO x VALUES ('a;b')"
    ]);
  });

  it('ignora el contenido de los comentarios', () => {
    const statements = splitStatements(
      '-- CREATE TABLE ruido (x int);\nCREATE TABLE real (y int);'
    );

    expect(statements).toEqual(['CREATE TABLE real (y int)']);
  });
});

// ── Efectos de las migraciones reales ───────────────────────────────────

describe('extractEffects sobre las migraciones del repo', () => {
  it('lee las columnas de un ALTER TABLE', () => {
    expect(extractEffects(readMigration('004_producto_stock_almacen.sql'))).toEqual({
      effects: ['column:productos.stock_almacen:integer'],
      unverifiable: []
    });
  });

  it('registra la ausencia de una columna que la migracion elimina', () => {
    expect(extractEffects(readMigration('007_stock_por_presentacion.sql'))).toEqual({
      effects: ['absent:column:productos.precio_compra'],
      unverifiable: []
    });
  });

  it('lee las restricciones con nombre declaradas dentro de un CREATE TABLE', () => {
    const { effects } = extractEffects(`CREATE TABLE ejemplo (
      id varchar(36) PRIMARY KEY,
      otro_id varchar(36) NOT NULL,
      CONSTRAINT fk_ejemplo_otro FOREIGN KEY (otro_id) REFERENCES otra (id) ON DELETE CASCADE,
      UNIQUE (otro_id)
    );`);

    expect(effects).toEqual([
      'table:ejemplo',
      'column:ejemplo.id:varchar',
      'column:ejemplo.otro_id:varchar',
      'constraint:fk_ejemplo_otro:ejemplo'
    ]);
  });

  it('lee columnas, indices y secuencias de una migracion mixta', () => {
    const { effects } = extractEffects(readMigration('005_producto_presentaciones_unidades.sql'));

    expect(effects).toContain('column:productos.precio_compra:integer');
    expect(effects).toContain('table:inventario_presentaciones');
    expect(effects).toContain('column:inventario_unidades.codigo:varchar');
    expect(effects).toContain('index:uq_inventario_presentaciones_codigo_barras');
    expect(effects).toContain('sequence:inventario_sku_seq');
  });

  it('lee varias columnas del mismo ALTER TABLE', () => {
    const { effects } = extractEffects(readMigration('012_recepcion_transferencias.sql'));

    expect(effects).toContain('column:inventario_movimientos.estado:varchar');
    expect(effects).toContain('column:inventario_movimientos.aceptado_por:varchar');
    expect(effects).toContain('index:idx_transferencias_pendientes');
  });

  it('lee tipos con precision y claves primarias en CREATE TABLE', () => {
    const { effects } = extractEffects(readMigration('016_champagne_tiers.sql'));

    expect(effects).toContain('table:producto_champagne_tiers');
    expect(effects).toContain('column:producto_champagne_tiers.anfitrionas:integer');
    expect(effects).toContain('index:idx_champagne_tiers_producto');
  });

  it('marca como no verificable el trabajo de datos', () => {
    const soloInserts = extractEffects(readMigration('013_permisos_barman.sql'));
    expect(soloInserts.effects).toEqual([]);
    expect(soloInserts.unverifiable.length).toBeGreaterThan(0);

    const update = extractEffects(readMigration('028_transferencias_historicas.sql'));
    expect(update.unverifiable.join(' ')).toContain('update');

    const bloque = extractEffects(readMigration('022_alineacion_esquema.sql'));
    expect(bloque.unverifiable.join(' ')).toContain('bloque');
  });

  it('nunca deja una migracion sin efectos ni motivo', () => {
    const ciegas = filenames.filter(filename => {
      const { effects, unverifiable } = extractEffects(readMigration(filename));
      return effects.length === 0 && unverifiable.length === 0;
    });

    expect(ciegas).toEqual([]);
  });
});

// ── Adopcion por efectos ────────────────────────────────────────────────

const schema = (overrides: Record<string, unknown[]> = {}) =>
  buildSchemaIndex({
    tables: [],
    columns: [],
    indexes: [],
    sequences: [],
    constraints: [],
    deferrable: [],
    ...overrides
  });

describe('adoptionByEffects', () => {
  it('adopta cuando todos los efectos ya estan en la base', () => {
    const decision = adoptionByEffects(
      readMigration('021_unidades_impresion.sql'),
      schema({
        columns: [
          {
            table_name: 'inventario_unidades',
            column_name: 'fecha_impresion',
            data_type: 'timestamp with time zone'
          }
        ]
      })
    );

    expect(decision.adopt).toBe(true);
    expect(decision.reason).toContain('efecto(s) ya estan');
  });

  it('no adopta cuando falta un efecto', () => {
    const decision = adoptionByEffects(readMigration('016_champagne_tiers.sql'), schema());

    expect(decision.adopt).toBe(false);
    expect(decision.violated.length).toBeGreaterThan(0);
  });

  it('no adopta cuando el tipo no coincide', () => {
    const decision = adoptionByEffects(
      readMigration('021_unidades_impresion.sql'),
      schema({
        columns: [
          { table_name: 'inventario_unidades', column_name: 'fecha_impresion', data_type: 'text' }
        ]
      })
    );

    expect(decision.adopt).toBe(false);
    expect(decision.violated).toEqual(['column:inventario_unidades.fecha_impresion:timestamptz']);
  });

  it('no adopta un archivo con trabajo que el esquema no puede confirmar', () => {
    const conInserts = `${readMigration('021_unidades_impresion.sql')}
INSERT INTO roles (id_rol, nombre) SELECT 'x', 'y' WHERE NOT EXISTS (SELECT 1 FROM roles);`;

    const decision = adoptionByEffects(
      conInserts,
      schema({
        columns: [
          {
            table_name: 'inventario_unidades',
            column_name: 'fecha_impresion',
            data_type: 'timestamp with time zone'
          }
        ]
      })
    );

    expect(decision.adopt).toBe(false);
    expect(decision.reason).toContain('no puede confirmar');
  });

  it('no adopta un archivo que no declara ningun objeto', () => {
    const decision = adoptionByEffects('-- nada\nSELECT 1;', schema());

    expect(decision.adopt).toBe(false);
  });

  it('las migraciones de permisos no se adoptan por esquema', () => {
    for (const filename of ['013_permisos_barman.sql', '015_barman_ver_caja.sql']) {
      expect(adoptionByEffects(readMigration(filename), schema()).adopt).toBe(false);
    }
  });
});

describe('SCHEMA_INDEX_QUERIES', () => {
  it('tiene una consulta por categoria y todas son distinguibles por su primera linea', () => {
    const firstLines = Object.values(SCHEMA_INDEX_QUERIES).map(sql =>
      sql.trim().split('\n')[0].trim()
    );

    expect(new Set(firstLines).size).toBe(firstLines.length);
  });
});
