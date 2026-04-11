import { beforeEach, describe, expect, it, vi } from 'vitest';

const repositoryHarness = vi.hoisted(() => {
  const queryMock = vi.fn();
  return { queryMock };
});

vi.mock('@/lib/database/db', () => ({
  generateUUID: () => 'ant-1',
  withTransaction: vi.fn(async (fn: any) => fn(repositoryHarness.queryMock)),
  query: repositoryHarness.queryMock
}));

vi.mock('@/lib/business/timezoneService', () => ({
  getNowInBusinessTimezone: () => '2026-04-11 12:00:00',
  getSystemTimezone: () => 'America/La_Paz'
}));

vi.mock('@/lib/business/anticiposUtils', () => ({
  getAnticipoBalances: vi.fn(async () => ({
    montoAsistencia: 0,
    montoComision: 0,
    montoPropina: 0,
    montoMaximo: 1000
  }))
}));

vi.mock('@/lib/integrations/whatsappService', () => ({
  enviarWhatsApp: vi.fn()
}));

vi.mock('@/lib/api/sseService', () => ({
  sendNotificationToAll: vi.fn()
}));

vi.mock('@/lib/integrations/pushNotifications', () => ({
  sendPushByRole: vi.fn(async () => undefined),
  sendPushNotification: vi.fn(async () => undefined)
}));

vi.mock('@/lib/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));

vi.mock('@/lib/repositories/CashRegisterRepository', () => ({
  CashRegisterRepository: {
    getCurrentCajaId: vi.fn(async () => 'caja-1'),
    getById: vi.fn(async () => ({ monto_apertura: 500, efectivo: 500 })),
    updateBalances: vi.fn()
  }
}));

vi.mock('@/lib/repositories/BaseRepository', () => ({
  BaseRepository: {
    insert: vi.fn(),
    update: vi.fn(),
    findOne: vi.fn(async () => ({ id_anticipo: 'ant-1', estado: 0 }))
  }
}));

import { AnticipoRepository } from '@/lib/repositories/AnticipoRepository';
import { BaseRepository } from '@/lib/repositories/BaseRepository';
import { CashRegisterRepository } from '@/lib/repositories/CashRegisterRepository';

describe('AnticipoRepository.grant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repositoryHarness.queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM usuarios WHERE id_usuario = ?')) {
        return [{ nombre: 'Ana', apellido: 'Perez', nick: 'ana', telefono: null }];
      }
      return [];
    });
  });

  it('guarda anticipo directo como entregado para no descontar caja dos veces', async () => {
    await AnticipoRepository.grant('user-1', 100, 'Directo admin');

    expect(BaseRepository.insert).toHaveBeenCalledWith(
      repositoryHarness.queryMock,
      'anticipos',
      expect.objectContaining({
        id_anticipo: 'ant-1',
        usuario_id: 'user-1',
        monto: 100,
        estado: 0
      })
    );

    expect(CashRegisterRepository.updateBalances).toHaveBeenCalledWith(
      repositoryHarness.queryMock,
      'caja-1',
      expect.objectContaining({
        efectivo: -100,
        anticipo: 100
      })
    );
  });
});
