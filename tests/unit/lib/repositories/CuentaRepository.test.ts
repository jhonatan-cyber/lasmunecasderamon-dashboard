import { beforeEach, describe, expect, it, vi } from 'vitest';

const repositoryHarness = vi.hoisted(() => {
  const queryMock = vi.fn();
  const trxMock = vi.fn().mockResolvedValue([]);
  const withTransactionMock = vi.fn(async (callback: any) => callback(trxMock));
  const generateUUIDMock = vi.fn();

  return {
    queryMock,
    trxMock,
    withTransactionMock,
    generateUUIDMock
  };
});

vi.mock('@/lib/database/db', () => ({
  query: repositoryHarness.queryMock,
  withTransaction: repositoryHarness.withTransactionMock,
  generateUUID: repositoryHarness.generateUUIDMock
}));

vi.mock('@/lib/business/timezoneService', () => ({
  getNowInBusinessTimezone: () => '2026-05-19 12:00:00',
  parseBusinessDate: (value: string) => new Date(value),
  getSystemTimezone: () => 'America/Santiago'
}));

vi.mock('@/lib/api/sseService', () => ({
  sendNotificationToAll: vi.fn()
}));

vi.mock('@/modules/caja/turnos/repositorio', () => ({
  CashRegisterRepository: {
    getCurrentCajaId: vi.fn(),
    updateBalances: vi.fn()
  }
}));

vi.mock('@/lib/database/base-repository', () => ({
  BaseRepository: {
    insert: vi.fn(),
    delete: vi.fn()
  }
}));

vi.mock('@/tests/setup/room-manager', () => ({
  RoomManager: {
    resumeRoomLogic: vi.fn()
  }
}));

import { BaseRepository } from '@/lib/database/base-repository';
import { CuentaRepository } from '@/modules/operacion/cuentas/registro';

describe('CuentaRepository hostess links', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repositoryHarness.trxMock.mockClear();
    repositoryHarness.queryMock.mockClear();
    repositoryHarness.generateUUIDMock
      .mockReturnValueOnce('cuenta-1')
      .mockReturnValueOnce('detalle-1')
      .mockReturnValueOnce('cuenta-usuario-1')
      .mockReturnValue('uuid-resto');

    vi.spyOn(CuentaRepository, 'getById').mockResolvedValue({ id_cuenta: 'cuenta-1' } as any);
  });

  it('guarda fecha_crea al crear relaciones en cuentas_usuarios', async () => {
    await CuentaRepository.create(
      {
        codigo: 'C-1',
        total_comision: 0,
        sub_total: 10000,
        total: 10000,
        detalles: [
          {
            producto_id: 'producto-1',
            precio: 10000,
            cantidad: 1,
            sub_total: 10000,
            comision: 0
          }
        ],
        usuarios: ['hostess-1']
      },
      'user-1'
    );

    expect(repositoryHarness.trxMock).toHaveBeenCalledWith(
      'INSERT INTO cuentas_usuarios (id_cuenta_usuario, cuenta_id, usuario_id, fecha_crea) VALUES (?, ?, ?, ?)',
      ['cuenta-usuario-1', 'cuenta-1', 'hostess-1', '2026-05-19 12:00:00']
    );
  });

  it('guarda fecha_crea al recrear relaciones en cuentas_usuarios durante updateCuenta', async () => {
    await CuentaRepository.updateCuenta('cuenta-1', { usuarios: ['hostess-1'] }, 'user-1');

    expect(repositoryHarness.trxMock).toHaveBeenCalledWith(
      'DELETE FROM cuentas_usuarios WHERE cuenta_id = ?',
      ['cuenta-1']
    );
    expect(repositoryHarness.trxMock).toHaveBeenCalledWith(
      'INSERT INTO cuentas_usuarios (id_cuenta_usuario, cuenta_id, usuario_id, fecha_crea) VALUES (?, ?, ?, ?)',
      ['cuenta-1', 'cuenta-1', 'hostess-1', '2026-05-19 12:00:00']
    );
  });
});
