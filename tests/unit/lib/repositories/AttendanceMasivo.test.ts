import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerMasivoHoy } from '@/lib/repositories/attendance/AttendanceQueries';

vi.mock('@/lib/database/db', () => ({
  query: vi.fn(),
  generateUUID: () => 'uuid-test',
  withTransaction: async (cb: any) => {
    const trx = vi.fn(async (sql: string) => {
      if (typeof sql === 'string' && sql.includes('NOT EXISTS')) {
        return (globalThis as any).__candidatos ?? [];
      }
      if (typeof sql === 'string' && sql.includes('INNER JOIN asistencias')) {
        return (globalThis as any).__yaRegistrados ?? [];
      }
      return [];
    });
    const value = await cb(trx);
    (globalThis as any).__lastTrx = trx;
    return value;
  }
}));

vi.mock('@/lib/business/timezoneService', () => ({
  getNowInBusinessTimezone: () => '2026-09-22 12:00:00'
}));

import { query } from '@/lib/database/db';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('registerMasivoHoy', () => {
  it('registra a quienes no tienen asistencia y omite al resto', async () => {
    (globalThis as any).__candidatos = [
      { id_usuario: 'u-1', nick: 'Lizi' },
      { id_usuario: 'u-2', nick: 'Sebas' }
    ];
    (globalThis as any).__yaRegistrados = [{ nick: 'Lola' }];

    const result = await registerMasivoHoy('1.2.3.4');

    expect(result.success).toBe(true);
    expect(result.registrados).toEqual(['Lizi', 'Sebas']);
    expect(result.omitidos).toEqual(['Lola']);
    const trx = (globalThis as any).__lastTrx;
    const inserts = trx.mock.calls.filter(([sql]: string[]) =>
      sql.includes('INSERT INTO asistencias')
    );
    expect(inserts).toHaveLength(2);
  });

  it('no hace nada si todos ya registraron', async () => {
    (globalThis as any).__candidatos = [];
    (globalThis as any).__yaRegistrados = [{ nick: 'Lola' }];

    const result = await registerMasivoHoy();

    expect(result.registrados).toEqual([]);
    expect(result.omitidos).toEqual(['Lola']);
  });
});
