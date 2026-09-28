// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ query: vi.fn(), withTransaction: vi.fn() }));
const uuid = vi.hoisted(() => {
  let count = 0;
  return { next: () => `uuid-${++count}` };
});

vi.mock('@/lib/database/db', () => ({
  query: db.query,
  withTransaction: db.withTransaction,
  generateUUID: uuid.next
}));

vi.mock('@/lib/business/timezoneService', () => ({
  getNowInBusinessTimezone: () => '2026-09-27 05:00:00'
}));

import { RoleRepository } from '@/lib/repositories/RoleRepository';

const trx = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  trx.mockReset().mockResolvedValue([]);
  db.withTransaction.mockImplementation(async (callback: any) => callback(trx));
});

describe('RoleRepository.create', () => {
  it('crea el rol y siembra su matriz inicial en la misma transacción', async () => {
    const id = await RoleRepository.create({ nombre: 'Prueba', descripcion: 'Rol de prueba' });

    expect(db.withTransaction).toHaveBeenCalledTimes(1);
    // Nada fuera de la transacción: o queda el rol con su siembra, o no queda nada.
    expect(db.query).not.toHaveBeenCalled();

    const rolInsert = trx.mock.calls.find(([sql]) => /INSERT INTO roles/.test(sql));
    expect(rolInsert).toBeTruthy();
    expect(rolInsert![1]).toEqual([id, 'Prueba', 'Rol de prueba', '2026-09-27 05:00:00']);

    const siembra = trx.mock.calls.filter(([sql]) => /INSERT INTO role_permissions/.test(sql));
    expect(siembra).toHaveLength(1);
    const [sql, params] = siembra[0];
    expect(params[0]).toMatch(/^uuid-\d+$/);
    expect(params.slice(1)).toEqual([id, '2026-09-27 05:00:00', 'dashboard', 'view']);
    // El permiso se resuelve contra el catálogo: si no existe, no se inserta fila.
    expect(sql).toContain('SELECT ?, ?, p.id, ?');
    expect(sql).toContain('FROM permissions p');
  });

  it('sin descripción guarda cadena vacía', async () => {
    await RoleRepository.create({ nombre: 'Solo nombre' });

    const rolInsert = trx.mock.calls.find(([sql]) => /INSERT INTO roles/.test(sql));
    expect(rolInsert![1][2]).toBe('');
  });

  it('si la siembra falla, la transacción propaga el error', async () => {
    trx.mockImplementation(async (sql: string) => {
      if (/INSERT INTO role_permissions/.test(sql)) throw new Error('permiso inexistente');
      return [];
    });

    await expect(RoleRepository.create({ nombre: 'Prueba' })).rejects.toThrow(
      'permiso inexistente'
    );
  });
});
