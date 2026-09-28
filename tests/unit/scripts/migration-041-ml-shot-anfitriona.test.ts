import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readMigrations } from '../../../scripts/postgres-migrations.mjs';

const migrationsDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../migrations'
);
const migrationFile = path.join(migrationsDir, '041_producto_ml_shot_anfitriona.sql');
const sql = fs.readFileSync(migrationFile, 'utf8');
const body = sql.replace(/^--[^\n]*$/gm, '');

/**
 * La 041 agrega el volumen del shot de anfitriona por producto: el precio del shot
 * es único para ambas audiencias, pero el ml servido puede diferir. NULL = igual
 * que el shot de cliente.
 */
describe('migración 041 · ml del shot de anfitriona por producto', () => {
  it('existe y ordena después de la 040 (bases nuevas las ejecutan en orden)', () => {
    const migrations = readMigrations(migrationsDir).map(m => m.filename);
    const i40 = migrations.findIndex(f => f.startsWith('040_'));
    const i41 = migrations.findIndex(f => f.startsWith('041_'));

    expect(i40).toBeGreaterThanOrEqual(0);
    expect(i41).toBeGreaterThan(i40);
  });

  it('agrega la columna de forma idempotente y anulable', () => {
    expect(body).toMatch(/ADD COLUMN IF NOT EXISTS ml_shot_anfitriona/i);
    expect(body).toMatch(/ml_shot_anfitriona integer DEFAULT NULL/i);
  });

  it('no inventa datos: no rellena filas anteriores (sin UPDATE ni backfill)', () => {
    expect(body).not.toMatch(/\bUPDATE\b/i);
    expect(body).not.toMatch(/\bINSERT\b/i);
  });

  it('no toca nada más que productos', () => {
    const tablas = [...body.matchAll(/ALTER TABLE\s+(\w+)/gi)].map(match => match[1]);
    expect(tablas.length).toBeGreaterThan(0);
    expect(new Set(tablas)).toEqual(new Set(['productos']));
  });
});
