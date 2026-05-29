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
  getNowInBusinessTimezone: () => '2026-04-11 12:00:00'
}));

vi.mock('@/lib/business/schemas', () => ({
  ClientSchema: {
    parse: (value: any) => value
  }
}));

vi.mock('@/lib/repositories/BaseRepository', () => ({
  BaseRepository: {
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findOne: vi.fn()
  }
}));

vi.mock('@/lib/repositories/CashRegisterRepository', () => ({
  CashRegisterRepository: {
    getCurrentCajaId: vi.fn(),
    updateBalances: vi.fn()
  }
}));

import { BusinessError } from '@/lib/errors/errors';
import { ClientRepository } from '@/lib/repositories/ClientRepository';
import { BaseRepository } from '@/lib/repositories/BaseRepository';
import { CashRegisterRepository } from '@/lib/repositories/CashRegisterRepository';

describe('ClientRepository.addPrepago', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registra la recarga en caja con el metodo de pago', async () => {
    vi.mocked(CashRegisterRepository.getCurrentCajaId).mockResolvedValue('caja-1');

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
    expect(CashRegisterRepository.updateBalances).toHaveBeenCalledWith(
      repositoryHarness.queryMock,
      'caja-1',
      {
        efectivo: 0,
        tarjeta: 100,
        transferencia: 0,
        prepago: 0
      }
    );
  });

  it('falla si no hay caja abierta', async () => {
    vi.mocked(CashRegisterRepository.getCurrentCajaId).mockResolvedValue(null);

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

    expect(CashRegisterRepository.updateBalances).not.toHaveBeenCalled();
  });
});
