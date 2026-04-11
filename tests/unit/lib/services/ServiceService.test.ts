import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ValidationError } from '@/lib/errors/errors';

vi.mock('@/lib/database/db', () => ({
  generateUUID: () => 'mock-uuid',
  withTransaction: vi.fn(async (fn: any) => fn(vi.fn())),
  query: vi.fn().mockResolvedValue([{ comision_anfitriona: 0 }])
}));

vi.mock('@/lib/repositories/ServiceRepository', () => ({
  ServiceRepository: { rawInsert: vi.fn() }
}));

vi.mock('@/lib/repositories/CashRegisterRepository', () => ({
  CashRegisterRepository: { getCurrentCajaId: vi.fn(), updateBalances: vi.fn() }
}));

vi.mock('@/lib/services/RoomManager', () => ({
  RoomManager: { pauseConflictingServices: vi.fn() }
}));

vi.mock('@/lib/api/sseService', () => ({
  sendNotificationToAll: vi.fn()
}));

vi.mock('@/lib/business/timezoneService', () => ({
  getNowInBusinessTimezone: () => '2026-04-10 10:00:00'
}));

import { ServiceService } from '@/lib/services/ServiceService';
import { CashRegisterRepository } from '@/lib/repositories/CashRegisterRepository';

beforeEach(() => {
  vi.clearAllMocks();
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

  it('lanza ZodError si usuarios está vacío', async () => {
    await expect(
      ServiceService.createService({ ...validServiceBody, usuarios: [] }, 'cajero-1')
    ).rejects.toThrow();
  });

  it('lanza ValidationError si pago mixto tiene menos de 2 métodos', async () => {
    vi.mocked(CashRegisterRepository.getCurrentCajaId).mockResolvedValue('caja-1');

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
    vi.mocked(CashRegisterRepository.getCurrentCajaId).mockResolvedValue('caja-1');

    await expect(
      ServiceService.createService(
        {
          ...validServiceBody,
          total: 60000,
          metodo_pago: 'mixto' as any,
          pagos_mixtos: [
            { metodo: 'efectivo', monto: 20000 },
            { metodo: 'tarjeta', monto: 20000 } // suma 40000 ≠ 60000
          ]
        },
        'cajero-1'
      )
    ).rejects.toThrow(ValidationError);
  });

  it('retorna id, codigo y tiempo si la creación es exitosa', async () => {
    vi.mocked(CashRegisterRepository.getCurrentCajaId).mockResolvedValue('caja-1');

    const result = await ServiceService.createService(validServiceBody, 'cajero-1');

    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('codigo');
    expect(result).toHaveProperty('tiempo', 60);
    expect(result).toHaveProperty('total', 60000);
  });
});
