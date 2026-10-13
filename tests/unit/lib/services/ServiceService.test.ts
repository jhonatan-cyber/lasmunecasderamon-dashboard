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

vi.mock('@/modules/operacion/facturacion/servicio', async importOriginal => ({
  ...(await importOriginal<typeof import('@/modules/operacion/facturacion/servicio')>()),
  pausarConflictosServicio: vi.fn()
}));

vi.mock('@/modules/inventario', () => ({ consumirStockBar: vi.fn().mockResolvedValue([]) }));

vi.mock('@/lib/api/sseService', () => ({
  sendNotificationToAll: vi.fn()
}));

vi.mock('@/lib/business/timezoneService', () => ({
  getNowInBusinessTimezone: () => '2026-04-10 10:00:00',
  getSystemTimezone: () => 'America/Santiago'
}));

import { ServiceService } from '@/modules/operacion/servicios/fachada';
import { pausarConflictosServicio } from '@/modules/operacion/facturacion/servicio';

beforeEach(() => {
  vi.clearAllMocks();
  serviceHarness.queryMock.mockResolvedValue([{ comision_anfitriona: 0 }]);
  serviceHarness.transactionMock.mockImplementation(async (sql: string) => {
    if (sql.includes('FROM cajas')) return [{ id_caja: 'caja-1' }];
    if (sql.includes('FROM habitaciones')) return [{ precio: 50000, comision_anfitriona: 0 }];
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
  it('actualiza las anfitrionas originales al crear un servicio adicional y conserva su historial', async () => {
    const fallback = serviceHarness.transactionMock.getMockImplementation()!;
    serviceHarness.transactionMock.mockImplementation(async (sql: string, params: unknown[]) => {
      if (sql.includes('FROM servicios WHERE id_servicio = ? FOR UPDATE'))
        return [{ estado: 3, habitacion_id: 'hab-1', cliente_id: null }];
      if (sql.includes('SELECT usuario_id FROM detalle_servicios'))
        return [{ usuario_id: 'hostess-saliente' }];
      return fallback(sql, params);
    });
    await ServiceService.createService(
      {
        ...validServiceBody,
        es_temporal: true,
        servicio_original_id: 'original-1'
      },
      'cajero-1'
    );
    expect(serviceHarness.transactionMock).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE detalle_servicios SET liberado_en'),
      ['2026-04-10 10:00:00', 'original-1', 'hostess-saliente']
    );
    expect(serviceHarness.transactionMock).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO detalle_servicios'),
      ['mock-uuid', 'original-1', 'user-1', '2026-04-10 10:00:00']
    );
    expect(
      serviceHarness.transactionMock.mock.calls.some(([sql]) =>
        String(sql).includes('DELETE FROM detalle_servicios')
      )
    ).toBe(false);
  });

  it('rechaza un adicional en otra habitación antes de modificar las asignaciones', async () => {
    serviceHarness.transactionMock.mockResolvedValue([
      { estado: 3, habitacion_id: 'otra-habitacion', cliente_id: null }
    ]);
    await expect(
      ServiceService.createService(
        {
          ...validServiceBody,
          es_temporal: true,
          servicio_original_id: 'original-1'
        },
        'cajero-1'
      )
    ).rejects.toThrow('habitación del servicio original');
    expect(
      serviceHarness.transactionMock.mock.calls.some(([sql]) =>
        String(sql).includes('UPDATE detalle_servicios')
      )
    ).toBe(false);
  });

  it('no crea un servicio ni cobra sin una caja abierta', async () => {
    const fallback = serviceHarness.transactionMock.getMockImplementation()!;
    serviceHarness.transactionMock.mockImplementation(async (sql: string, params: unknown[]) =>
      sql.includes('FROM cajas') ? [] : fallback(sql, params)
    );
    await expect(ServiceService.createService(validServiceBody, 'cajero-1')).rejects.toThrow(
      'Abre una caja'
    );
    expect(
      serviceHarness.transactionMock.mock.calls.some(([sql]) =>
        String(sql).includes('INSERT INTO servicios')
      )
    ).toBe(false);
  });

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
      if (sql.includes('FROM cajas')) return [{ id_caja: 'caja-1' }];
      if (sql.includes('FROM habitaciones')) return [{ precio: 50000, comision_anfitriona: 0 }];
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

  it('el adicional paga el importe de servicio por anfitriona y no repite la comisión VIP', async () => {
    serviceHarness.transactionMock.mockImplementation(async (sql: string, params?: unknown[]) => {
      if (sql.includes('FROM servicios WHERE id_servicio = ? FOR UPDATE'))
        return [{ estado: 3, habitacion_id: 'hab-1', es_temporal: 0 }];
      if (sql.includes('SELECT DISTINCT u.id_usuario'))
        return (params || []).map(id => ({ id_usuario: String(id) }));
      if (sql.includes('FROM cajas')) return [{ id_caja: 'caja-1' }];
      if (sql.includes('FROM habitaciones'))
        return [{ comision_anfitriona: 100000, precio: 50000 }];
      return [];
    });
    await ServiceService.createService(
      {
        ...validServiceBody,
        es_temporal: true,
        servicio_original_id: 'original',
        precio_servicio: 20000,
        usuarios: ['user-1', 'user-2']
      },
      'cajero-1'
    );
    const amounts = serviceHarness.transactionMock.mock.calls
      .filter(([sql]) => String(sql).includes('INSERT INTO detalle_comisiones'))
      .flatMap(([, params]) => {
        const values = [];
        for (let i = 3; i < params.length; i += 6) values.push(Number(params[i]));
        return values;
      });
    expect(amounts).toEqual([10000, 10000]);
  });

  it('reparte resto de comision de habitacion sin perder monto total', async () => {
    serviceHarness.queryMock.mockResolvedValue([{ comision_anfitriona: 101 }]);
    serviceHarness.transactionMock.mockImplementation(async (sql: string, params?: unknown[]) => {
      if (sql.includes('SELECT DISTINCT u.id_usuario')) {
        return (params || []).map((id: unknown) => ({ id_usuario: String(id) }));
      }
      if (sql.includes('FROM cajas')) return [{ id_caja: 'caja-1' }];
      if (sql.includes('FROM habitaciones')) {
        return [{ comision_anfitriona: 101, precio: 50000 }];
      }
      return [];
    });

    await ServiceService.createService(
      {
        ...validServiceBody,
        producto_incluido_presentacion_id: 'pres-1',
        usuarios: ['user-1', 'user-2']
      },
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
    expect(pausarConflictosServicio).toHaveBeenCalledWith(
      ['user-1', 'user-2'],
      'mock-uuid',
      expect.objectContaining({ id: expect.any(String) })
    );
  });
});

it('editar el tiempo conserva cliente, precio e IVA cuando no están en el payload', async () => {
  serviceHarness.transactionMock.mockImplementation(async (sql: string) =>
    sql.includes('SELECT iva') ? [{ iva: 2000 }] : []
  );
  await ServiceService.updateService('servicio-1', { tiempo: 90 });
  const update = serviceHarness.transactionMock.mock.calls.find(
    ([sql]) => typeof sql === 'string' && sql.startsWith('UPDATE servicios')
  );
  expect(update).toBeTruthy();
  expect(update?.[0]).not.toContain('cliente_id');
  expect(update?.[0]).not.toContain('precio_habitacion');
  expect(update?.[0]).not.toContain('iva');
  expect(
    serviceHarness.transactionMock.mock.calls.some(([sql]) =>
      String(sql).startsWith('UPDATE cajas')
    )
  ).toBe(false);
});

it('anular exige el flujo de solicitud y aprobación, evitando marcar anulado sin devolver caja y stock', async () => {
  await expect(ServiceService.updateStatus('service-1', 0)).rejects.toThrow(
    'solicitud de anulación'
  );
  expect(serviceHarness.transactionMock).not.toHaveBeenCalled();
});

it('un servicio finalizado no se reactiva ni vuelve a ocupar habitación o anfitrionas', async () => {
  serviceHarness.transactionMock.mockResolvedValue([
    { estado: 1, habitacion_id: 'vip', paused_at: null }
  ]);
  await expect(ServiceService.updateStatus('service-1', 2)).rejects.toThrow(
    'no se puede reactivar'
  );
  expect(
    serviceHarness.transactionMock.mock.calls.some(([sql]) => String(sql).startsWith('UPDATE'))
  ).toBe(false);
});
