import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readMigrations } from '../../../scripts/postgres-migrations.mjs';

const migrationsDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../migrations'
);
const migrationFile = path.join(migrationsDir, '039_detalle_ventas_tipo_y_audiencia.sql');
const sql = fs.readFileSync(migrationFile, 'utf8');
const body = sql.replace(/^--[^\n]*$/gm, '');

/**
 * La 039 guarda en el detalle cómo se vendió cada ítem: botella o shot, y si el shot se
 * cobró a un cliente o a una anfitriona. Estos tests fijan las dos columnas, el default y
 * la coherencia entre ellas, para que nadie las relaje sin querer.
 */
describe('migración 039 · tipo de venta y audiencia del shot', () => {
  it('existe y ordena después de la 038 (bases nuevas las ejecutan en orden)', () => {
    const migrations = readMigrations(migrationsDir).map(m => m.filename);
    const i38 = migrations.findIndex(f => f.startsWith('038_'));
    const i39 = migrations.findIndex(f => f.startsWith('039_'));

    expect(i38).toBeGreaterThanOrEqual(0);
    expect(i39).toBeGreaterThan(i38);
  });

  it('agrega las dos columnas de forma idempotente y no nula', () => {
    expect(body).toMatch(/ADD COLUMN IF NOT EXISTS tipo_venta[\s\S]*?NOT NULL DEFAULT 'botella'/i);
    expect(body).toMatch(/ADD COLUMN IF NOT EXISTS shot_anfitriona[\s\S]*?NOT NULL DEFAULT false/i);
  });

  it('cierra el vocabulario de tipo_venta a botella y shot', () => {
    expect(body).toContain("tipo_venta IN ('botella', 'shot')");
    expect(body).toContain('detalle_ventas_tipo_venta_check');
  });

  it('impide marcar como anfitriona una venta que no es shot', () => {
    expect(body).toContain('NOT shot_anfitriona OR tipo_venta');
    expect(body).toContain('detalle_ventas_shot_anfitriona_check');
  });

  it('no inventa datos: no rellena filas anteriores (sin UPDATE ni backfill)', () => {
    expect(body).not.toMatch(/\bUPDATE\b/i);
    expect(body).not.toMatch(/\bINSERT\b/i);
    expect(sql).toContain('no se intenta un backfill');
  });

  it('no toca nada más que detalle_ventas', () => {
    const tablas = [...body.matchAll(/ALTER TABLE\s+(\w+)/gi)].map(match => match[1]);
    expect(tablas.length).toBeGreaterThan(0);
    expect(new Set(tablas)).toEqual(new Set(['detalle_ventas']));
  });
});
