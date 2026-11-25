import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ query: vi.fn(), pending: vi.fn(), requests: vi.fn() }));
vi.mock('@/lib/database/db', () => ({ query: mocks.query }));
vi.mock('@/modules/operacion', () => ({
  TimerService: { getActive: vi.fn().mockResolvedValue([]) },
  RoomService: { getAll: vi.fn().mockResolvedValue([]) },
  ServiceRequestService: {
    getPendingCount: vi.fn().mockResolvedValue(0),
    getPendingServiceRequests: mocks.requests
  },
  OrderService: { getPending: mocks.pending }
}));
import { TimerService, RoomService, ServiceRequestService } from '@/modules/operacion';
import { StatsQueries } from '@/modules/reportes/dashboard/consultas';

beforeEach(() => {
  vi.restoreAllMocks();
  mocks.query.mockReset();
  vi.mocked(TimerService.getActive).mockResolvedValue([]);
  vi.mocked(RoomService.getAll).mockResolvedValue([]);
  vi.mocked(ServiceRequestService.getPendingCount).mockResolvedValue(0);
  mocks.pending.mockReset().mockResolvedValue([]);
  mocks.requests.mockReset().mockResolvedValue([]);
});

function summaryQueries(options: { tips?: boolean; commissions?: boolean } = {}) {
  mocks.query.mockImplementation(async (sql: string) => {
    if (sql.includes('SELECT sueldo')) return [{ sueldo: 10000, aporte: 1000, descuento: 0 }];
    if (sql.includes('FROM asistencias')) return [{ total: 1, weeks: 1 }];
    if (sql.includes('FROM anticipos')) return [{ total: 0, pending_count: 0, pending_amount: 0 }];
    if (sql.includes('FROM propinas P')) {
      // The detail for this user is paid even though another participant is still pending.
      return options.tips
        ? [{ total: 1, pending_count: 0, pending_amount: 0 }]
        : [{ total: 0, pending_count: 0, pending_amount: 0 }];
    }
    if (sql.includes('FROM horas_extras'))
      return [{ total: 0, pending_count: 0, pending_amount: 0 }];
    if (sql.includes('FROM pedidos')) return [{ total: 0 }];
    if (sql.includes('FROM servicios')) return [{ total: 0 }];
    if (sql.includes('FROM detalle_comisiones')) {
      return options.commissions
        ? [{ total: 4, pending_count: 2, sales_amount: 2000, services_amount: 3000 }]
        : [{ total: 0, pending_count: 0, sales_amount: 0, services_amount: 0 }];
    }
    return [];
  });
}

describe('Regresiones del dashboard', () => {
  it('construye el resumen de personal a partir de agregados de la base de datos', async () => {
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT sueldo')) return [{ sueldo: 10000, aporte: 1000, descuento: 200 }];
      if (sql.includes('FROM asistencias')) return [{ total: 4, weeks: 2 }];
      if (sql.includes('FROM anticipos'))
        return [{ total: 3, pending_count: 1, pending_amount: 1500 }];
      if (sql.includes('FROM propinas P'))
        return [{ total: 3, pending_count: 1, pending_amount: 500 }];
      if (sql.includes('FROM horas_extras'))
        return [{ total: 2, pending_count: 1, pending_amount: 800 }];
      if (sql.includes('FROM pedidos')) return [{ total: 5 }];
      if (sql.includes('FROM servicios')) return [{ total: 6 }];
      if (sql.includes('FROM detalle_comisiones'))
        return [{ total: 4, pending_count: 2, sales_amount: 2000, services_amount: 3000 }];
      return [];
    });

    const result = await StatsQueries.getUserDashboardSummary('u1', 'anfitriona');

    expect(result).toEqual({
      totalAsistencias: 4,
      totalAnticipos: 3,
      totalPropinas: 3,
      totalHorasExtras: 2,
      totalPedidos: 5,
      totalComisiones: 4,
      totalServicios: 6,
      totalACobrar: 39100,
      anticiposPendientes: 1,
      propinasPendientes: 1,
      horasExtrasPendientes: 1,
      comisionesPendientes: 2
    });
    expect(mocks.query.mock.calls).toHaveLength(8);
    expect(mocks.query.mock.calls.slice(1).every(([sql]) => sql.includes('COUNT(*)'))).toBe(true);
  });

  it('suma comisiones de ventas y servicios pendientes, excluyendo pagadas y anuladas', async () => {
    summaryQueries({ commissions: true });
    const result = await StatsQueries.getUserDashboardSummary('u1', 'anfitriona');
    expect(result.totalACobrar).toBe(14000);
    expect(result.comisionesPendientes).toBe(2);
    expect(
      mocks.query.mock.calls.find(([sql]) => sql.includes('FROM detalle_comisiones'))?.[0]
    ).toContain('INNER JOIN comisiones');
    const commissionsSql = mocks.query.mock.calls.find(([sql]) =>
      sql.includes('FROM detalle_comisiones')
    )?.[0];
    expect(commissionsSql).toContain('DC.estado = 1 AND C.estado = 1');
    expect(commissionsSql).toContain('C.venta_id IS NOT NULL');
    expect(commissionsSql).toContain('C.servicio_id IS NOT NULL');
  });

  it('excluye una propina ya pagada aunque otros participantes sigan pendientes', async () => {
    summaryQueries({ tips: true });
    const result = await StatsQueries.getUserDashboardSummary('u1', 'garzon');
    expect(result.totalPropinas).toBe(1);
    expect(result.propinasPendientes).toBe(0);
    expect(result.totalACobrar).toBe(9000);
    const tipsSql = mocks.query.mock.calls.find(([sql]) => sql.includes('FROM propinas P'))?.[0];
    expect(tipsSql).toContain('INNER JOIN detalle_propinas');
    expect(tipsSql).toContain('FILTER (WHERE DP.estado = 1)');
  });

  it('descuenta el aporte del garzón como la nómina', async () => {
    summaryQueries();
    expect((await StatsQueries.getUserDashboardSummary('u1', 'garzon')).totalACobrar).toBe(9000);
  });

  it('solicita pendientes filtrados antes de aplicar el límite', async () => {
    mocks.pending.mockResolvedValue([{ id: 'old', estado: 1, total: 1200 }]);
    expect(await StatsQueries.getPendingOrders(5)).toMatchObject([{ id: 'old', amount: 1200 }]);
    expect(mocks.pending).toHaveBeenCalledWith(5);
  });

  it.each([0, 2])(
    'usa las propinas de caja y cuenta las filas devueltas (%i pendientes)',
    async count => {
      mocks.query.mockImplementation(async (sql: string) => {
        if (sql.includes('SELECT id_caja, fecha_apertura')) {
          return [{ id_caja: 'c1', propina: sql.includes('iva, propina') ? 700 : undefined }];
        }
        return [{ total: 0 }];
      });
      const group = { logueadas: 0, total: 0, porcentaje: 0, usuarios: [] };
      vi.spyOn(StatsQueries, 'getLoggedUsers').mockResolvedValue({
        anfitrionas: group,
        garzones: group,
        cajeros: group,
        barman: group
      });
      vi.spyOn(StatsQueries, 'getRecentActivity').mockResolvedValue([]);
      vi.spyOn(StatsQueries, 'getShiftForecast').mockResolvedValue({ anomalies: [] } as any);
      mocks.pending.mockResolvedValue(
        Array.from({ length: count }, (_, id) => ({ id, estado: 1 }))
      );
      mocks.requests.mockResolvedValue(count ? [{ id: 'request' }] : []);
      const result = await StatsQueries.getDashboardComposite();
      expect(result.insights.financialSummary.tips).toBe(700);
      expect(result.cajaStats.total_propina).toBe(700);
      expect(result.pendingItems.summary.totalVisibleItems).toBe(count ? 3 : 0);
    }
  );

  it('reporta la misma cantidad de cajas abiertas en alerts, composite e insights', async () => {
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM cajas') && sql.includes('COUNT(*)')) return [{ total: 2 }];
      if (sql.includes('SELECT id_caja, fecha_apertura')) {
        return [
          { id_caja: 'c2', propina: 0, monto_apertura: 0 },
          { id_caja: 'c1', propina: 0, monto_apertura: 0 }
        ];
      }
      return [{ total: 0 }];
    });
    const group = { logueadas: 0, total: 0, porcentaje: 0, usuarios: [] };
    vi.spyOn(StatsQueries, 'getLoggedUsers').mockResolvedValue({
      anfitrionas: group,
      garzones: group,
      cajeros: group,
      barman: group
    });
    vi.spyOn(StatsQueries, 'getRecentActivity').mockResolvedValue([]);
    vi.spyOn(StatsQueries, 'getShiftForecast').mockResolvedValue({ anomalies: [] } as any);
    mocks.pending.mockResolvedValue([]);
    mocks.requests.mockResolvedValue([]);

    const alerts = await StatsQueries.getDashboardAlerts();
    const composite = await StatsQueries.getDashboardComposite();
    const insights = await StatsQueries.getDashboardInsights();

    expect(alerts.summary.openRegisters).toBe(2);
    expect(composite.insights.localStatus.cash.openRegisters).toBe(2);
    expect(insights.localStatus.cash.openRegisters).toBe(2);
    expect(composite.insights.localStatus.cash.openRegisters).toBe(alerts.summary.openRegisters);
    expect(insights.localStatus.cash.openRegisters).toBe(alerts.summary.openRegisters);
    expect(
      mocks.query.mock.calls.find(([sql]) => sql.includes('SELECT id_caja, fecha_apertura'))?.[0]
    ).not.toContain('LIMIT 1');
  });
});
