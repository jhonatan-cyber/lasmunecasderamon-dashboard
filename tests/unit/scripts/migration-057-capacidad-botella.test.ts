import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readMigrations } from '../../../scripts/postgres-migrations.mjs';

const migrationsDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../migrations'
);
const migrationFile = path.join(migrationsDir, '057_presentaciones_capacidad_desde_nombre.sql');
const sql = fs.readFileSync(migrationFile, 'utf8');
const body = sql.replace(/^--[^\n]*$/gm, '');

/**
 * La 057 corrige la capacidad de las botellas: `ml_botella` quedó en NULL en todas las
 * presentaciones, así que el bar abría una botella de "1000 ml" como si fuera de 750 y
 * mostraba ml que nunca se sirvieron. Estos tests fijan las dos reglas del arreglo: la
 * capacidad sale del nombre, y lo ya abierto sólo se corrige cuando se puede demostrar.
 */
describe('migración 057 · capacidad de la botella desde el nombre', () => {
  it('existe y ordena después de la 056 (bases nuevas las ejecutan en orden)', () => {
    const migrations = readMigrations(migrationsDir).map(m => m.filename);
    const i56 = migrations.findIndex(f => f.startsWith('056_'));
    const i57 = migrations.findIndex(f => f.startsWith('057_'));

    expect(i56).toBeGreaterThanOrEqual(0);
    expect(i57).toBeGreaterThan(i56);
  });

  it('rellena ml_botella sólo desde el volumen que declara el nombre', () => {
    // NULL = "no lo sé todavía": la escritura se limita a las que lo ignoraban.
    expect(body).toMatch(/UPDATE inventario_presentaciones p\s+SET ml_botella = d\.ml/i);
    expect(body).toMatch(/WHERE ml_botella IS NULL/i);
    expect(body).toMatch(/regexp_match\(nombre, '\(\[0-9\]\+\(\?:\[\.,\]\[0-9\]\+\)\?\)/);
    // "1 litro" y "1,5 litros" son 1000 y 1500 ml.
    expect(body).toMatch(/CASE WHEN m\[2\] ~\* '\^l' THEN 1000 ELSE 1 END/i);
  });

  it('devuelve a las botellas abiertas lo que se perdió por usar la capacidad por defecto', () => {
    expect(body).toMatch(/SET ml_restante = r\.ml_restante/i);
    // La diferencia entre la capacidad real y la asumida, nunca más que la capacidad real.
    expect(body).toMatch(/LEAST\(u\.ml_restante \+ \(p\.ml_botella - a\.ml\), p\.ml_botella\)/i);
    // Sólo cuando la botella abierta + lo servido da exactamente la capacidad asumida:
    // con varias botellas abiertas el saldo no se puede repartir y no se toca nada.
    expect(body).toMatch(/u\.ml_restante \+ COALESCE\(s\.ml_servidos, 0\) = a\.ml/i);
    expect(body).toMatch(/u\.estado = 'almacen'\s+AND u\.ubicacion = 'bar'/i);
  });

  it('la capacidad asumida sale de Configuraciones y no de un número fijo', () => {
    expect(body).toMatch(/SELECT valor FROM configuraciones WHERE clave = 'botella_ml'/i);
    expect(sql).toContain('default documentado de 750 ml');
  });

  it('marca como abierta por shots toda botella con contenido restante', () => {
    expect(body).toMatch(/SET abierta_por_shots = true\s+WHERE ml_restante > 0/i);
  });

  it('no cambia el esquema: es una reparación de datos', () => {
    expect(body).not.toMatch(/ALTER TABLE/i);
    expect(body).not.toMatch(/CREATE (?:TABLE|INDEX)/i);
    expect(body).not.toMatch(/\bDROP\b/i);
    // Sólo toca inventario de presentación, unidades y el histórico de ventas.
    const tablas = [...body.matchAll(/(?:FROM|UPDATE|INTO)\s+(\w+)/gi)]
      .map(match => match[1])
      .filter(t => t.startsWith('inventario_') || t === 'configuraciones');
    expect(new Set(tablas)).toEqual(
      new Set([
        'inventario_presentaciones',
        'inventario_unidades',
        'inventario_movimientos',
        'configuraciones'
      ])
    );
  });
});
