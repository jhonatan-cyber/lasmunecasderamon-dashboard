import { describe, expect, it } from 'vitest';
import {
  countDiff,
  diffSnapshots,
  isEmptyDiff,
  normalizeLine,
  SCHEMA_CATEGORIES,
  toSnapshot
} from '../../../scripts/schema-diff.mjs';

describe('normalizeLine', () => {
  it('iguala el default NULL del dump con la ausencia de default de una migracion', () => {
    expect(
      normalizeLine(
        'inventario_unidades.transferencia_id varchar(36) null=yes default=NULL::character varying'
      )
    ).toBe('inventario_unidades.transferencia_id varchar(36) null=yes default=-');
    expect(
      normalizeLine('inventario_unidades.transferencia_id varchar(36) null=yes default=-')
    ).toBe('inventario_unidades.transferencia_id varchar(36) null=yes default=-');
  });

  it('quita el cast del tipo en valores por defecto y en columnas', () => {
    expect(
      normalizeLine(
        "categorias.descripcion varchar(255) default='Sin descripcion'::character varying"
      )
    ).toBe("categorias.descripcion varchar(255) default='sin descripcion'");
    expect(normalizeLine('CREATE INDEX x ON t USING btree (a) WHERE b IS NOT NULL')).toBe(
      'create index x on t using btree (a) where b is not null'
    );
  });

  it('no confunde un default real con la ausencia de default', () => {
    expect(normalizeLine("x.y int default='0'")).not.toBe(normalizeLine('x.y int default=-'));
  });
});

describe('toSnapshot', () => {
  it('toma la primera columna de cada fila y la normaliza', () => {
    const snapshot = toSnapshot([
      { line: 'productos.id_producto varchar(36) null=no default=NULL::character varying' }
    ]);

    expect([...snapshot]).toEqual(['productos.id_producto varchar(36) null=no default=-']);
  });
});

describe('diffSnapshots', () => {
  const columns = (lines: string[]) => ({ columns: lines });

  it('no reporta diferencias cuando el esquema es el mismo', () => {
    const diff = diffSnapshots(
      columns(['productos.stock_almacen integer null=no default=0']),
      columns(['productos.stock_almacen integer null=no default=0'])
    );

    expect(isEmptyDiff(diff)).toBe(true);
    expect(countDiff(diff)).toBe(0);
  });

  it('reporta el tipo divergente de una columna en las dos direcciones', () => {
    const diff = diffSnapshots(
      columns(['inventario_presentaciones.opciones_venta jsonb null=yes default=-']),
      columns(['inventario_presentaciones.opciones_venta text null=yes default=-'])
    );

    expect(diff.columns.onlyInActual).toEqual([
      'inventario_presentaciones.opciones_venta jsonb null=yes default=-'
    ]);
    expect(diff.columns.onlyInExpected).toEqual([
      'inventario_presentaciones.opciones_venta text null=yes default=-'
    ]);
    expect(countDiff(diff)).toBe(2);
  });

  it('cubre todas las categorias aunque una de las partes no las traiga', () => {
    const diff = diffSnapshots(columns(['a.b int']), {});

    expect(Object.keys(diff)).toEqual(SCHEMA_CATEGORIES);
    expect(diff.columns.onlyInActual).toEqual(['a.b int']);
    expect(diff.indexes).toEqual({ onlyInActual: [], onlyInExpected: [] });
  });

  it('excluye del informe las tablas indicadas en ignore', () => {
    const diff = diffSnapshots(
      columns(['legacy_inventario.sku varchar(20)', 'productos.nombre varchar(50)']),
      columns(['productos.nombre varchar(50)']),
      { ignore: ['legacy_inventario'] }
    );

    expect(isEmptyDiff(diff)).toBe(true);
  });
});
