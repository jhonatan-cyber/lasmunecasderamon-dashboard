import { beforeEach, describe, expect, it, vi } from 'vitest';

const repositoryHarness = vi.hoisted(() => {
  const queryMock = vi.fn();
  return { queryMock };
});

vi.mock('@/lib/database/db', () => ({
  query: repositoryHarness.queryMock,
  withTransaction: vi.fn()
}));

vi.mock('@/lib/business/timezoneService', () => ({
  getSystemTimezone: () => 'America/Santiago',
  getNowInBusinessTimezone: () => '2026-04-11 12:00:00'
}));

vi.mock('@/lib/business/schemas', () => ({
  StatsGeneralType: { parse: (value: any) => value }
}));

vi.mock('@/lib/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));

vi.mock('@/modules/operacion/temporizadores/consultas', () => ({
  TimerRepository: {
    getActive: vi.fn().mockResolvedValue([])
  }
}));

vi.mock('@/modules/operacion/solicitudes/repositorio', () => ({
  ServiceRequestRepository: {
    getPendingCount: vi.fn().mockResolvedValue(0),
    getPendingServiceRequests: vi.fn().mockResolvedValue([])
  }
}));

vi.mock('@/modules/operacion/habitaciones/repositorio', () => ({
  RoomRepository: {
    getAll: vi.fn().mockResolvedValue([])
  }
}));

vi.mock('@/modules/operacion/pedidos/repositorio', () => ({
  OrderRepository: {
    getAll: vi.fn().mockResolvedValue([])
  }
}));

vi.mock('@/modules/reportes/dashboard/infraestructura', () => ({
  buildDashboardInsights: (args: any) => ({ args }),
  buildCajaStatsResult: (args: any) => ({ args })
}));

import { StatsQueries } from '@/modules/reportes/dashboard/consultas';
import { DatabaseError } from '@/lib/errors/errors';

describe('StatsQueries.getCajaGeneralStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devuelve hasOpenCaja=true (shape plano) cuando hay caja abierta', async () => {
    repositoryHarness.queryMock
      .mockResolvedValueOnce([
        {
          id_caja: 'caja-1',
          fecha_apertura: '2026-04-11 10:00:00',
          usuario_id_apertura: 'user-1',
          monto_apertura: 50000,
          efectivo: 120000,
          tarjeta: 30000,
          transferencia: 10000,
          comision: 0,
          anticipo: 0,
          devolucion: 0,
          iva: 0,
          horas_abierta: 2,
          minutos_abierta: 0
        }
      ])
      .mockResolvedValueOnce([
        {
          total_ventas: 150000,
          cantidad_ventas: 10,
          promedio_venta: 15000,
          total_efectivo: 120000,
          total_tarjeta: 30000,
          total_transferencia: 0,
          total_propina: 5000
        }
      ])
      .mockResolvedValueOnce([{ total: 10000 }])
      .mockResolvedValueOnce([{ cantidad_servicios: 5, total_servicios: 40000 }])
      .mockResolvedValueOnce([{ balance_total: 200000 }]);

    const result = await StatsQueries.getCajaGeneralStats();

    expect(result.caja_id).toBe('caja-1');
    expect(result.cajaActiva).not.toBeNull();
    expect(result.cajaActiva.id).toBe('caja-1');
    expect(result.balance_total).toBe(190000);
    expect(result.total_ventas).toBe(150000);
    expect(result.cantidad_servicios).toBe(5);
    expect(result.retiros).toBe(10000);
    expect(result.cajasAbiertas).toBe(1);
    expect(result.totalCajas).toBe(1);

    // Contrato para la app móvil: hasOpenCaja debe derivarse del shape plano
    const hasOpenCaja = Boolean(result.caja_id);
    expect(hasOpenCaja).toBe(true);
  });

  it('devuelve cajaActiva=null y caja_id ausente cuando no hay caja abierta', async () => {
    repositoryHarness.queryMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ cajas_abiertas: 0, cajas_cerradas: 2, total_cajas: 2 }]);

    const result = await StatsQueries.getCajaGeneralStats();

    expect(result.cajaActiva).toBeNull();
    expect(result.caja_id).toBeUndefined();
    expect(result.cajasAbiertas).toBe(0);
    expect(result.cajasCerradas).toBe(2);
    expect(result.totalCajas).toBe(2);

    const hasOpenCaja = Boolean(result.caja_id);
    expect(hasOpenCaja).toBe(false);
  });

  it('convierte valores numéricos de forma segura (null -> 0)', async () => {
    repositoryHarness.queryMock
      .mockResolvedValueOnce([
        {
          id_caja: 'caja-9',
          fecha_apertura: '2026-04-11 10:00:00',
          usuario_id_apertura: 'user-1',
          monto_apertura: null,
          efectivo: null,
          tarjeta: null,
          transferencia: null,
          comision: null,
          anticipo: null,
          devolucion: null,
          iva: null,
          horas_abierta: null,
          minutos_abierta: null
        }
      ])
      .mockResolvedValueOnce([{ total_ventas: null, cantidad_ventas: null }])
      .mockResolvedValueOnce([{ total: null }])
      .mockResolvedValueOnce([{ cantidad_servicios: null, total_servicios: null }])
      .mockResolvedValueOnce([{ balance_total: null }]);

    const result = await StatsQueries.getCajaGeneralStats();

    expect(result.monto_apertura).toBe(0);
    expect(result.total_ventas).toBe(0);
    expect(result.cantidad_servicios).toBe(0);
    expect(result.balance_total).toBe(0);
    expect(result.tiempo_abierta_horas).toBe(0);
    expect(result.retiros).toBe(0);
  });

  it('lanza DatabaseError cuando la consulta falla', async () => {
    repositoryHarness.queryMock.mockRejectedValueOnce(new Error('connection lost'));

    await expect(StatsQueries.getCajaGeneralStats()).rejects.toThrow(DatabaseError);
  });
});

describe('StatsQueries.getDashboardAlerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repositoryHarness.queryMock.mockReset();
  });

  it('agrega contadores y calcula resumen correctamente', async () => {
    repositoryHarness.queryMock
      .mockResolvedValueOnce([{ total: 1 }])
      .mockResolvedValueOnce([{ total: 3 }]);

    const result = await StatsQueries.getDashboardAlerts({
      timers: [
        { tipoTransaccion: 'servicio', remainingTime: 600 },
        { tipoTransaccion: 'pedido', remainingTime: 1200 },
        { tipoTransaccion: 'servicio', remainingTime: 5 }
      ]
    });

    expect(result.alerts.activeCaja).toBe(true);
    expect(result.alerts.pendingOrders).toBe(true);
    expect(result.alerts.occupiedRooms).toBe(false);
    expect(result.alerts.expiringServices).toBe(true);
    expect(result.summary.totalRooms).toBe(0);
    expect(result.summary.activeServices).toBe(2);
    expect(result.summary.expiringServices).toBe(2);
  });

  it('convierte estados y timers correctamente con datos de habitaciones pre-cargados', async () => {
    repositoryHarness.queryMock
      .mockResolvedValueOnce([{ total: 0 }])
      .mockResolvedValueOnce([{ total: 0 }]);

    const result = await StatsQueries.getDashboardAlerts({
      rooms: [{ status: 2 }, { status: 1 }, { status: 0 }],
      timers: [{ tipoTransaccion: 'pedido', remainingTime: 100 }]
    });

    expect(result.summary.occupiedRooms).toBe(1);
    expect(result.summary.freeRooms).toBe(1);
    expect(result.summary.totalRooms).toBe(3);
    expect(result.alerts.occupiedRooms).toBe(true);
    expect(result.summary.activeServices).toBe(0);
    expect(result.summary.expiringServices).toBe(1);
  });
});

describe('StatsQueries.getLoggedUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repositoryHarness.queryMock.mockReset();
  });

  it('cuenta usuarios por rol y estado', async () => {
    repositoryHarness.queryMock
      .mockResolvedValueOnce([
        { id_rol: 1, nombre: 'anfitriona' },
        { id_rol: 2, nombre: 'garzon' },
        { id_rol: 3, nombre: 'cajero' }
      ])
      .mockResolvedValueOnce([
        { id_usuario: 'a1', estado: 1, rol_id: 1 },
        { id_usuario: 'a2', estado: 0, rol_id: 1 },
        { id_usuario: 'g1', estado: 1, rol_id: 2 },
        { id_usuario: 'c1', estado: 1, rol_id: 3 },
        { id_usuario: 'x1', estado: 1, rol_id: 99 }
      ]);

    const result = await StatsQueries.getLoggedUsers();

    expect(result.anfitrionas).toEqual({ total: 2, logueadas: 1 });
    expect(result.garzones).toEqual({ total: 1, logueadas: 1 });
    expect(result.cajeros).toEqual({ total: 1, logueadas: 1 });
  });

  it('devuelve ceros cuando no existe el rol', async () => {
    repositoryHarness.queryMock.mockResolvedValueOnce([{ id_rol: 5, nombre: 'otro' }]);
    repositoryHarness.queryMock.mockResolvedValueOnce([]);

    const result = await StatsQueries.getLoggedUsers();
    expect(result.anfitrionas).toEqual({ total: 0, logueadas: 0 });
  });
});

describe('StatsQueries.getSalesByMonth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repositoryHarness.queryMock.mockReset();
  });

  it('pasa el offset correcto a la query', async () => {
    repositoryHarness.queryMock.mockResolvedValueOnce([
      { mes: '2026-04', cantidad_ventas: 5, total_ventas: 1000 }
    ]);

    const result = await StatsQueries.getSalesByMonth(2);
    expect(result).toHaveLength(1);
    expect(result[0].mes).toBe('2026-04');
    expect(repositoryHarness.queryMock).toHaveBeenCalledWith(expect.any(String), [24]);
  });
});

describe('StatsQueries.getRecentActivity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repositoryHarness.queryMock.mockReset();
  });

  it('normaliza actividad y une usuarios', async () => {
    repositoryHarness.queryMock
      .mockResolvedValueOnce([
        {
          type: 'venta',
          id: 1,
          codigo: 'V-1',
          amount: 100,
          date: '2026-04-11',
          user_id: 'u1',
          estado: 1
        },
        {
          type: 'anticipo',
          id: 2,
          codigo: null,
          amount: 50,
          date: '2026-04-11',
          user_id: null,
          estado: 1
        }
      ])
      .mockResolvedValueOnce([
        { id_usuario: 'u1', nick: 'pepe', nombre: 'Pepe', apellido: 'G', foto: 'f.jpg' }
      ]);

    const result = await StatsQueries.getRecentActivity(2);

    expect(result[0].user.nick).toBe('pepe');
    expect(result[0].user.name).toBe('Pepe');
    expect(result[1].user.nick).toBe('sistema');
    expect(result[1].user.name).toBe('Sistema');
    expect(result[0].amount).toBe(100);
  });

  it('devuelve array vacío cuando no hay actividad', async () => {
    repositoryHarness.queryMock.mockResolvedValueOnce([]);

    const result = await StatsQueries.getRecentActivity(8);
    expect(result).toEqual([]);
  });
});
