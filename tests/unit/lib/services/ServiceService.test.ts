import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ValidationError } from '@/lib/errors/errors';

const serviceHarness = vi.hoisted(() => {
  const queryMock = vi.fn();
  const transactionMock = vi.fn();
  return { queryMock, transactionMock };
});

vi.mock('@/lib/database/db', () => ({
  generateUUID: () => 'mock-uuid',
  withTransaction: vi.fn(async (fn: any) => fn(serviceHarness.transactionMock)),
  query: serviceHarness.queryMock
}));

vi.mock('@/lib/repositories/ServiceRepository', () => ({
  ServiceRepository: { rawInsert: vi.fn() }
}));

vi.mock('@/lib/services/RoomManager', () => ({
  RoomManager: { pauseConflictingServices: vi.fn() }
}));

vi.mock('@/lib/api/sseService', () => ({
  sendNotificationToAll: vi.fn()
}));

vi.mock('@/lib/business/timezoneService', () => ({
  getNowInBusinessTimezone: () => '2026-04-10 10:00:00',
  getSystemTimezone: () => 'America/Santiago'
}));

import { ServiceService } from '@/lib/services/ServiceService';
import { RoomManager } from '@/lib/services/RoomManager';

beforeEach(() => {
  vi.clearAllMocks();
  serviceHarness.queryMock.mockResolvedValue([{ comision_anfitriona: 0 }]);
  serviceHarness.transactionMock.mockImplementation(async (sql: string) => {
    if (sql.includes('SELECT DISTINCT u.id_usuario')) {
      return [{ id_usuario: 'user-1' }];
    }
    return [];
  });
});

const validServiceBody = {
  habitacion_id: 'hab-1',
  precio_habitacion: 50000,
  precio_servicio: 10000,
  iva: 0,
  sub_total: 60000,
  total: 60000,
  tiempo: 60,
  metodo_pago: 'efectivo' as const,
  usuarios: ['user-1'],
  clientes: []
};

describe('ServiceService.createService', () => {
  it('lanza ZodError si faltan campos requeridos', async () => {
    await expect(ServiceService.createService({ total: 0 } as any, 'cajero-1')).rejects.toThrow();
  });

  it('lanza ZodError si usuarios esta vacio', async () => {
    await expect(
      ServiceService.createService({ ...validServiceBody, usuarios: [] }, 'cajero-1')
    ).rejects.toThrow();
  });

  it('lanza ValidationError si pago mixto tiene menos de 2 metodos', async () => {
    await expect(
      ServiceService.createService(
        {
          ...validServiceBody,
          metodo_pago: 'mixto' as any,
          pagos_mixtos: [{ metodo: 'efectivo', monto: 60000 }]
        },
        'cajero-1'
      )
    ).rejects.toThrow(ValidationError);
  });

  it('lanza ValidationError si suma de pagos mixtos no coincide con total', async () => {
    await expect(
      ServiceService.createService(
        {
          ...validServiceBody,
          total: 60000,
          metodo_pago: 'mixto' as any,
          pagos_mixtos: [
            { metodo: 'efectivo', monto: 20000 },
            { metodo: 'tarjeta', monto: 20000 }
          ]
        },
        'cajero-1'
      )
    ).rejects.toThrow(ValidationError);
  });

  it('retorna id, codigo y tiempo si la creacion es exitosa', async () => {
    const result = await ServiceService.createService(validServiceBody, 'cajero-1');

    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('codigo');
    expect(result).toHaveProperty('tiempo', 60);
    expect(result).toHaveProperty('total', 60000);
  });

  it('rechaza anfitrionas que no estan logueadas en el local', async () => {
    serviceHarness.transactionMock.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT DISTINCT u.id_usuario')) {
        return [{ id_usuario: 'user-1' }];
      }
      return [];
    });

    await expect(
      ServiceService.createService(
        { ...validServiceBody, usuarios: ['user-1', 'user-2'] },
        'cajero-1'
      )
    ).rejects.toThrow('Hay anfitrionas seleccionadas que no estan logueadas en el local');
  });

  it('reparte resto de comision de habitacion sin perder monto total', async () => {
    serviceHarness.queryMock.mockResolvedValue([{ comision_anfitriona: 101 }]);
    serviceHarness.transactionMock.mockImplementation(async (sql: string, params?: unknown[]) => {
      if (sql.includes('SELECT DISTINCT u.id_usuario')) {
        return (params || []).map((id: unknown) => ({ id_usuario: String(id) }));
      }
      if (sql.includes('FROM habitaciones')) {
        return [{ comision_anfitriona: 101, precio: 50000 }];
      }
      return [];
    });

    await ServiceService.createService(
      { ...validServiceBody, usuarios: ['user-1', 'user-2'] },
      'cajero-1'
    );

    const commissionCalls = serviceHarness.transactionMock.mock.calls.filter(
      ([sql]) => typeof sql === 'string' && sql.includes('INSERT INTO detalle_comisiones')
    );
    const insertedAmounts = commissionCalls.flatMap(call => {
      const params = (call[1] || []) as unknown[];
      const amounts = [];
      for (let i = 3; i < params.length; i += 6) {
        amounts.push(Number(params[i] || 0));
      }
      return amounts;
    });

    expect(insertedAmounts).toEqual([51, 50]);
    expect(insertedAmounts.reduce((sum, value) => sum + value, 0)).toBe(101);
    expect(RoomManager.pauseConflictingServices).toHaveBeenCalledWith(
      expect.any(Function),
      ['user-1', 'user-2'],
      'mock-uuid'
    );
  });
});
