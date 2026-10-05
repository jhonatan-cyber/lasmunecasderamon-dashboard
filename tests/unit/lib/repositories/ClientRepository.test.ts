import { beforeEach, describe, expect, it, vi } from 'vitest';

const repositoryHarness = vi.hoisted(() => {
  const queryMock = vi.fn();
  return { queryMock };
});

vi.mock('@/lib/database/db', () => ({
  generateUUID: () => 'mov-1',
  query: repositoryHarness.queryMock,
  withTransaction: vi.fn(async (fn: any) => fn(repositoryHarness.queryMock))
}));

vi.mock('@/lib/business/timezoneService', () => ({
  getNowInBusinessTimezone: () => '2026-04-11 12:00:00',
  getSystemTimezone: () => 'America/Santiago'
}));

vi.mock('@/lib/business/schemas', () => ({
  ClientSchema: {
    parse: (value: any) => value
  }
}));

vi.mock('@/lib/database/base-repository', () => ({
  BaseRepository: {
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findOne: vi.fn()
  }
}));

import { BusinessError } from '@/lib/errors/errors';
import { ClientService as ClientRepository } from '@/workflows/clientes';
import { BaseRepository } from '@/lib/database/base-repository';

describe('ClientRepository.addPrepago', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repositoryHarness.queryMock.mockImplementation(async (sql: string) => {
      if (typeof sql === 'string' && sql.includes('FROM cajas WHERE estado = 1')) {
        return [{ id_caja: 'caja-1' }];
      }
      return [];
    });
  });

  it('registra la recarga en caja con el metodo de pago', async () => {
    await ClientRepository.addPrepago({
      cliente_id: 'client-1',
      monto: 100,
      tipo: 'CARGA',
      metodo_pago: 'tarjeta',
      usuario_id: 'user-1'
    });

    expect(BaseRepository.insert).toHaveBeenCalledWith(
      repositoryHarness.queryMock,
      'clientes_prepago_movimientos',
      expect.objectContaining({
        cliente_id: 'client-1',
        monto: 100,
        metodo_pago: 'tarjeta',
        tipo: 'CARGA'
      })
    );
    const cajaCalls = repositoryHarness.queryMock.mock.calls.filter(
      ([sql]) => typeof sql === 'string' && sql.includes('UPDATE cajas SET')
    );
    expect(cajaCalls).toHaveLength(1);
    expect(cajaCalls[0][0]).toContain('tarjeta = tarjeta + ?');
    expect(cajaCalls[0][1]).toEqual(expect.arrayContaining([100, 'caja-1']));
  });

  it('falla si no hay caja abierta', async () => {
    repositoryHarness.queryMock.mockImplementation(async () => []);

    await expect(
      ClientRepository.addPrepago({
        cliente_id: 'client-1',
        monto: 100,
        tipo: 'CARGA',
        metodo_pago: 'efectivo',
        usuario_id: 'user-1'
      })
    ).rejects.toMatchObject({
      name: 'BusinessError',
      message: 'No hay una caja abierta para registrar la recarga prepago',
      code: 'NO_CAJA_ABIERTA'
    } satisfies Partial<BusinessError>);

    const cajaCalls = repositoryHarness.queryMock.mock.calls.filter(
      ([sql]) => typeof sql === 'string' && sql.includes('UPDATE cajas SET')
    );
    expect(cajaCalls).toHaveLength(0);
  });
});
