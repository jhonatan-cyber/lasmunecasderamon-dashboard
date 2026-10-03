import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { clasificar, reconciliar } from '../../../scripts/reconcile-migration-checksum.mjs';
import { checksumOf } from '../../../scripts/postgres-migrations.mjs';

const SQL = 'ALTER TABLE t ADD COLUMN IF NOT EXISTS c timestamptz;\n';

/**
 * Cliente pg falso con el ledger en memoria y registro de lo que se ejecutó. Permite
 * comprobar lo importante: que el SQL del archivo corre **antes** de tocar el ledger y que
 * un fallo deja la base como estaba.
 */
function fakeClient(registrado: string | undefined, options: { fallaElSql?: boolean } = {}) {
  const ledger = new Map<string, string>();
  if (registrado !== undefined) ledger.set('056_x.sql', registrado);
  const ejecutadas: string[] = [];

  const client = {
    ledger,
    ejecutadas,
    async query(sql: string, params?: unknown[]) {
      const arriba = sql.trim().toUpperCase();
      if (arriba.startsWith('BEGIN')) {
        ejecutadas.push('BEGIN');
        ledgerSnapshot = new Map(ledger);
        return { rows: [] };
      }
      if (arriba.startsWith('COMMIT')) {
        ejecutadas.push('COMMIT');
        return { rows: [] };
      }
      if (arriba.startsWith('ROLLBACK')) {
        ejecutadas.push('ROLLBACK');
        ledger.clear();
        for (const [k, v] of ledgerSnapshot) ledger.set(k, v);
        return { rows: [] };
      }
      if (arriba.startsWith('SELECT CHECKSUM')) {
        return { rows: ledger.has('056_x.sql') ? [{ checksum: ledger.get('056_x.sql') }] : [] };
      }
      if (arriba.startsWith('UPDATE')) {
        if (options.fallaElSql) throw new Error('no se pudo actualizar el ledger');
        const [checksum, filename] = params as [string, string];
        ledger.set(filename, checksum);
        return { rows: [{ checksum }] };
      }
      // El SQL de la migración: falla si el test lo pide.
      ejecutadas.push(sql);
      if (options.fallaElSql) throw new Error('el SQL de la migración falló');
      return { rows: [] };
    }
  };

  let ledgerSnapshot = new Map<string, string>();
  return client;
}

const NOMBRE = '056_x.sql';

describe('clasificar', () => {
  it('consistente cuando el ledger tiene el hash del archivo', () => {
    const info = clasificar({ registrado: checksumOf(SQL), sql: SQL });
    expect(info.estado).toBe('consistente');
    expect(info.accion).toBe('ninguna');
  });

  it('legacy-crlf cuando el ledger tiene el hash crudo de un checkout en Windows', () => {
    // El caso real: el archivo en disco tiene CRLF y el ledger viejo guardó el hash de esos
    // bytes. El contenido es el mismo (por eso `normalizeSql` lo tolera) y no hay que escribir.
    const enWindows = SQL.replace(/\n/g, '\r\n');
    expect(enWindows).not.toBe(SQL);
    const info = clasificar({
      registrado: createHash('sha256').update(enWindows).digest('hex'),
      sql: enWindows
    });
    expect(info.estado).toBe('legacy-crlf');
    expect(info.accion).toBe('ninguna');
    expect(info.checksum).toBe(checksumOf(enWindows));
  });

  it('distinto cuando el contenido cambió de verdad', () => {
    const info = clasificar({ registrado: 'a'.repeat(64), sql: SQL });
    expect(info.estado).toBe('distinto');
    expect(info.accion).toBe('reconciliar');
    expect(info.checksum).toBe(checksumOf(SQL));
  });

  it('sin registrar cuando la migración no está en el ledger', () => {
    const info = clasificar({ registrado: undefined, sql: SQL });
    expect(info.estado).toBe('sin-registrar');
    expect(info.accion).toBe('aplicar');
  });
});

describe('reconciliar', () => {
  afterEach(() => vi.restoreAllMocks());

  it('no escribe nada si el checksum ya coincide', async () => {
    const client = fakeClient(checksumOf(SQL));
    const resultado = await reconciliar(client, { filename: NOMBRE, sql: SQL, aplicar: true });

    expect(resultado.escrito).toBe(false);
    expect(resultado.estado).toBe('consistente');
    expect(client.ejecutadas).toEqual([]);
  });

  it('no escribe nada sin --apply aunque el contenido sea distinto', async () => {
    const registrado = 'b'.repeat(64);
    const client = fakeClient(registrado);

    const resultado = await reconciliar(client, { filename: NOMBRE, sql: SQL, aplicar: false });

    expect(resultado.escrito).toBe(false);
    expect(resultado.estado).toBe('distinto');
    expect(client.ledger.get(NOMBRE)).toBe(registrado);
    expect(client.ejecutadas).toEqual([]);
  });

  it('con --apply ejecuta el SQL del archivo y luego actualiza el ledger', async () => {
    const client = fakeClient('c'.repeat(64));

    const resultado = await reconciliar(client, { filename: NOMBRE, sql: SQL, aplicar: true });

    expect(resultado.escrito).toBe(true);
    expect(client.ledger.get(NOMBRE)).toBe(checksumOf(SQL));
    // El orden importa: primero el SQL (que prueba que la base tolera el archivo), después
    // el ledger. Si fuera al revés, un UPDATE exitoso ocultaría un SQL incompatible.
    expect(client.ejecutadas).toEqual(['BEGIN', SQL, 'COMMIT']);
  });

  it('si el SQL de la migración falla, hace rollback y el ledger queda intacto', async () => {
    const registrado = 'd'.repeat(64);
    const client = fakeClient(registrado, { fallaElSql: true });

    await expect(
      reconciliar(client, { filename: NOMBRE, sql: SQL, aplicar: true })
    ).rejects.toThrow('el SQL de la migración falló');

    expect(client.ejecutadas).toEqual(['BEGIN', SQL, 'ROLLBACK']);
    expect(client.ledger.get(NOMBRE)).toBe(registrado);
  });

  it('avisa de que una migración ausente del ledger hay que aplicarla, no reconciliarla', async () => {
    const client = fakeClient(undefined);

    const resultado = await reconciliar(client, { filename: NOMBRE, sql: SQL, aplicar: true });

    expect(resultado.estado).toBe('sin-registrar');
    expect(resultado.escrito).toBe(false);
    expect(resultado.motivo).toMatch(/aplicar la migración/i);
  });
});
