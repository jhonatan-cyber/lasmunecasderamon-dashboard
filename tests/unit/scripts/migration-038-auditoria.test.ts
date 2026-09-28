import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checksumOf, readMigrations } from '../../../scripts/postgres-migrations.mjs';

const migrationsDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../migrations'
);
const migrationFile = path.join(migrationsDir, '038_gratificaciones_auditoria_backfill.sql');
const sql = fs.readFileSync(migrationFile, 'utf8');

/**
 * La 038 deja constancia en la base de la decisión sobre el backfill de
 * solicitante_id (037): no se fabrican atribuciones. Estos tests impiden que
 * alguien la transforme en un backfill mutante o la reordene.
 */
describe('migración 038 · auditoría del backfill de solicitante_id', () => {
  it('existe y ordena después de la 037 (bases nuevas las ejecutan en orden)', () => {
    const migrations = readMigrations(migrationsDir).map(m => m.filename);
    const i37 = migrations.findIndex(f => f.startsWith('037_'));
    const i38 = migrations.findIndex(f => f.startsWith('038_'));

    expect(i37).toBeGreaterThanOrEqual(0);
    expect(i38).toBeGreaterThan(i37);
  });

  it('es de solo lectura: ningún UPDATE/INSERT/DELETE/TRUNCATE/ALTER/DROP/CREATE sobre datos', () => {
    const body = sql.replace(/^--[^\n]*$/gm, '');
    expect(body).not.toMatch(/\bUPDATE\b/i);
    expect(body).not.toMatch(/\bINSERT\b/i);
    expect(body).not.toMatch(/\bDELETE\b/i);
    expect(body).not.toMatch(/\bTRUNCATE\b/i);
    expect(body).not.toMatch(/\bALTER\s+TABLE\b/i);
    expect(body).not.toMatch(/\bDROP\s+(TABLE|COLUMN|INDEX)\b/i);
    expect(body).not.toMatch(/\bCREATE\s+(TABLE|INDEX|COLUMN)\b/i);
  });

  it('documenta la decisión: no fabricar atribuciones y por qué la ausencia es informativa', () => {
    expect(sql).toContain('NO fabricamos atribuciones');
    expect(sql).toContain('creación directa fuera del flujo de solicitudes provino de ese admin');
    expect(sql).toContain('la ausencia es informativa');
  });

  it('detecta filas históricas por la huella del flujo en anticipo_historial', () => {
    expect(sql).toContain("h.accion = 'solicitud'");
    expect(sql).toContain('solicitante_id IS NULL');
    expect(sql).toContain("LOWER(r.nombre) = 'administrador'");
  });

  it('clasifica y emite NOTICE con el resultado (constancia en el log de migración)', () => {
    expect(sql).toContain('RAISE NOTICE');
    expect(sql).toContain('creacion directa');
    expect(sql).toContain('pasaron por el flujo');
  });

  it('queda registrada en el ledger: la segunda corrida no re-ejecuta el inventario', () => {
    const migrations = readMigrations(migrationsDir);
    const m038 = migrations.find(m => m.filename.startsWith('038_'));

    expect(m038).toBeDefined();
    expect(m038!.checksum).toBe(checksumOf(sql));
  });
});
