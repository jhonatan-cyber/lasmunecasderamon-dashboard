// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-validation';
});

const cache = vi.hoisted(() => ({ getOrFetch: vi.fn() }));
const stats = vi.hoisted(() => ({ getCajaGeneralStats: vi.fn(), getSalesByMonth: vi.fn() }));
const ventas = vi.hoisted(() => ({
  getVentasBarras: vi.fn(),
  getVentasChampagne: vi.fn(),
  getVentasTragosChicas: vi.fn()
}));

vi.mock('next/server', () => ({
  NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) }
}));

vi.mock('@/lib/api/date-response', () => ({ normalizeJsonResponseDates: (r: any) => r }));

vi.mock('@/lib/auth/auth-app', () => ({ getAuth: vi.fn() }));

vi.mock('@/lib/services/AuditService', () => ({
  AuditService: { log: vi.fn().mockResolvedValue(undefined) }
}));

vi.mock('@/lib/services/ErrorLogService', () => ({
  ErrorLogService: { log: vi.fn().mockResolvedValue(undefined) }
}));

vi.mock('@/lib/utils/logger', () => {
  const mocks = {
    error: vi.fn(),
    captureException: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  };
  return { logger: mocks, default: mocks };
});

vi.mock('@/lib/services/StatsService', () => ({ StatsService: stats }));
vi.mock('@/lib/services/VentasStatsService', () => ({ VentasStatsService: ventas }));

vi.mock('@/lib/cache/dashboardCache', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/cache/dashboardCache')>();
  return { ...actual, DashboardCache: { getOrFetch: cache.getOrFetch } };
});

import { DASHBOARD_CACHE_KEYS, DASHBOARD_TTL } from '@/lib/cache/dashboardCache';
import { GET as cajaStatsGET } from '@/app/api/caja/stats/route';
import { GET as cashregisterStatusGET } from '@/app/api/cashregister/status/route';
import { GET as salesStatsGET } from '@/app/api/sales/stats/route';
import { GET as ventasBarrasGET } from '@/app/api/caja/ventas-barras/route';
import { GET as ventasChampagneGET } from '@/app/api/caja/ventas-champagne/route';
import { GET as ventasTragosGET } from '@/app/api/caja/ventas-tragos-chicas/route';

const call = (handler: any, url: string) => handler(new Request(url), { params: {} });

const cajaStats = {
  caja_id: 'caja-1',
  fecha_apertura_raw: '2026-09-24 08:00:00',
  tiempo_abierta_horas: 3,
  tiempo_abierta_minutos: 15,
  usuario_id_apertura: 'u-1',
  efectivo_en_caja: 50000
};

beforeEach(() => {
  vi.clearAllMocks();
  cache.getOrFetch.mockImplementation(async (_key: string, fetcher: () => Promise<any>) => ({
    data: await fetcher(),
    fromCache: false
  }));
  stats.getCajaGeneralStats.mockResolvedValue(cajaStats);
  stats.getSalesByMonth.mockResolvedValue([
    { mes: '2026-09', cantidad_ventas: 3, total_ventas: 1000 }
  ]);
  ventas.getVentasBarras.mockResolvedValue({
    total_venta: 1,
    cargo_tarjeta: 0,
    monto_productos: 1,
    propinas: 0
  });
  ventas.getVentasChampagne.mockResolvedValue({
    total_venta: 2,
    cargo_tarjeta: 0,
    monto_champagne: 2,
    comisiones: 0,
    propinas: 0
  });
  ventas.getVentasTragosChicas.mockResolvedValue({
    total_venta: 3,
    cargo_tarjeta: 0,
    monto_productos: 3,
    comisiones: 0,
    propinas: 3
  });
});

describe('caché de stats en caja, cashregister, sales y ventas por categoría', () => {
  it('caja/stats y cashregister/status comparten la entrada STATS', async () => {
    const cajaRes = await call(cajaStatsGET, 'http://localhost/api/caja/stats');
    expect(cache.getOrFetch).toHaveBeenLastCalledWith(
      DASHBOARD_CACHE_KEYS.STATS,
      expect.any(Function),
      DASHBOARD_TTL.STATS
    );
    expect(cajaRes.status).toBe(200);
    expect(cajaRes.headers.get('X-Cache')).toBe('MISS');
    const cajaBody = await cajaRes.json();
    expect(cajaBody.data).toMatchObject({ tiempo_abierta: '3h 15m', caja_id: 'caja-1' });
    expect(cajaBody.data.fecha_apertura).toBeTruthy();

    const statusRes = await call(cashregisterStatusGET, 'http://localhost/api/cashregister/status');
    expect(cache.getOrFetch).toHaveBeenLastCalledWith(
      DASHBOARD_CACHE_KEYS.STATS,
      expect.any(Function),
      DASHBOARD_TTL.STATS
    );
    const statusBody = await statusRes.json();
    expect(statusBody.data).toMatchObject({ hasOpenCaja: true });
    expect(statusBody.data.cajaInfo).toMatchObject({ id_caja: 'caja-1', efectivo_en_caja: 50000 });
  });

  it('sales/stats usa SALES_CHART sin alterar la respuesta', async () => {
    const res = await call(salesStatsGET, 'http://localhost/api/sales/stats');
    expect(cache.getOrFetch).toHaveBeenLastCalledWith(
      DASHBOARD_CACHE_KEYS.SALES_CHART,
      expect.any(Function),
      DASHBOARD_TTL.SALES_CHART
    );
    await expect(res.json()).resolves.toEqual({
      success: true,
      data: [{ mes: '2026-09', cantidad_ventas: 3, total_ventas: 1000 }]
    });
  });

  it('marca los aciertos de caché con X-Cache: HIT', async () => {
    cache.getOrFetch.mockResolvedValue({ data: cajaStats, fromCache: true });
    const res = await call(cajaStatsGET, 'http://localhost/api/caja/stats');
    expect(res.headers.get('X-Cache')).toBe('HIT');
  });

  it('ventas por categoría usa una clave por caja y tipo', async () => {
    await call(ventasBarrasGET, 'http://localhost/api/caja/ventas-barras?caja_id=caja-7');
    expect(cache.getOrFetch).toHaveBeenLastCalledWith(
      DASHBOARD_CACHE_KEYS.SALES_CHART_BY_CAJA('caja-7', 'barras'),
      expect.any(Function),
      DASHBOARD_TTL.SALES_CHART_BY_CAJA
    );

    await call(ventasChampagneGET, 'http://localhost/api/caja/ventas-champagne?caja_id=caja-7');
    expect(cache.getOrFetch).toHaveBeenLastCalledWith(
      DASHBOARD_CACHE_KEYS.SALES_CHART_BY_CAJA('caja-7', 'champagne'),
      expect.any(Function),
      DASHBOARD_TTL.SALES_CHART_BY_CAJA
    );

    const res = await call(
      ventasTragosGET,
      'http://localhost/api/caja/ventas-tragos-chicas?caja_id=caja-7'
    );
    expect(cache.getOrFetch).toHaveBeenLastCalledWith(
      DASHBOARD_CACHE_KEYS.SALES_CHART_BY_CAJA('caja-7', 'tragos-chicas'),
      expect.any(Function),
      DASHBOARD_TTL.SALES_CHART_BY_CAJA
    );
    await expect(res.json()).resolves.toMatchObject({ success: true, total_venta: 3 });
  });

  it('ventas-champagne sin caja_id responde 400 sin consultar la caché', async () => {
    const res = await call(ventasChampagneGET, 'http://localhost/api/caja/ventas-champagne');
    expect(res.status).toBe(400);
    expect(cache.getOrFetch).not.toHaveBeenCalled();
  });
});
