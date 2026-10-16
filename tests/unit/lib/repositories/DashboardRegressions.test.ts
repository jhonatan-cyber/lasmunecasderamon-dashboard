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
    if (sql.includes('COUNT(DISTINCT')) return [{ semanas: 1 }];
    if (sql.includes('FROM asistencias')) return [{ estado: 1 }];
    if (sql.includes('FROM propinas P')) {
      // Simulate the DB projection: the shared header remains pending after this user is paid.
      return options.tips ? [{ estado: sql.includes('DP.estado') ? 0 : 1, monto: 5000 }] : [];
    }
    if (sql.includes('FROM detalle_comisiones')) {
      return options.commissions
        ? [
            { comision: 2000, venta_id: 'v1', estado: 1, estado_cabecera: 1 },
            { comision: 3000, servicio_id: 's1', estado: 1, estado_cabecera: 1 },
            { comision: 8000, venta_id: 'v2', estado: 0, estado_cabecera: 1 },
            { comision: 9000, servicio_id: 's2', estado: 1, estado_cabecera: 0 }
          ]
        : [];
    }
    return [];
  });
}

describe('Regresiones del dashboard', () => {
  it('suma comisiones de ventas y servicios pendientes, excluyendo pagadas y anuladas', async () => {
    summaryQueries({ commissions: true });
    const result = await StatsQueries.getUserDashboardSummary('u1', 'anfitriona');
    expect(result.totalACobrar).toBe(14000);
    expect(result.comisionesPendientes).toBe(2);
    expect(
      mocks.query.mock.calls.find(([sql]) => sql.includes('FROM detalle_comisiones'))?.[0]
    ).toContain('INNER JOIN comisiones');
  });

  it('excluye una propina ya pagada aunque otros participantes sigan pendientes', async () => {
    summaryQueries({ tips: true });
    const result = await StatsQueries.getUserDashboardSummary('u1', 'garzon');
    expect(result.totalPropinas).toBe(1);
    expect(result.propinasPendientes).toBe(0);
    expect(result.totalACobrar).toBe(9000);
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
});
