import { beforeEach, describe, expect, it, vi } from 'vitest';

const repositoryHarness = vi.hoisted(() => {
  const queryMock = vi.fn();
  return { queryMock };
});

vi.mock('@/lib/database/db', () => ({
  generateUUID: () => 'caja-1',
  withTransaction: vi.fn(),
  query: repositoryHarness.queryMock
}));

vi.mock('@/lib/business/timezoneService', () => ({
  getNowInBusinessTimezone: () => '2026-04-11 12:00:00'
}));

vi.mock('@/lib/business/schemas', () => ({
  CajaSchema: {
    parse: (value: any) => value
  }
}));

vi.mock('@/lib/repositories/BaseRepository', () => ({
  BaseRepository: {
    insert: vi.fn(),
    update: vi.fn(),
    findOne: vi.fn()
  }
}));

import { ConflictError } from '@/lib/errors/errors';
import { CashRegisterRepository } from '@/lib/repositories/CashRegisterRepository';
import { BaseRepository } from '@/lib/repositories/BaseRepository';

describe('CashRegisterRepository.open', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('bloquea segunda caja abierta aunque sea de otro usuario', async () => {
    repositoryHarness.queryMock.mockResolvedValueOnce([
      { id_caja: 'caja-abierta', usuario_id_apertura: 'user-1' }
    ]);

    await expect(CashRegisterRepository.open('user-2', 100)).rejects.toThrow(
      new ConflictError('Ya existe una caja abierta')
    );

    expect(BaseRepository.insert).not.toHaveBeenCalled();
  });

  it('abre caja cuando no existe ninguna abierta', async () => {
    repositoryHarness.queryMock.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        id_caja: 'caja-1',
        fecha_apertura: '2026-04-11 12:00:00',
        usuario_id_apertura: 'user-1',
        monto_apertura: 100,
        estado: 1,
        fecha_cierre: null,
        usuario_id_cierre: null,
        monto_cierre: null,
        venta: 0,
        servicio: 0,
        efectivo: 0,
        tarjeta: 0,
        transferencia: 0,
        devolucion: 0,
        prepago: 0,
        propina: 0,
        cuenta: 0,
        anticipo: 0,
        iva: 0,
        comision: 0,
        usuario_apertura: 'Usuario Uno',
        cajero_nombre: 'Usuario Uno'
      }
    ]);

    const result = await CashRegisterRepository.open('user-1', 100);

    expect(BaseRepository.insert).toHaveBeenCalledWith(
      repositoryHarness.queryMock,
      'cajas',
      expect.objectContaining({
        id_caja: 'caja-1',
        usuario_id_apertura: 'user-1',
        monto_apertura: 100,
        estado: 1
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        id_caja: 'caja-1',
        usuario_id_apertura: 'user-1',
        monto_apertura: 100,
        estado: 1
      })
    );
  });
});
