// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-validation';
});

vi.mock('next/server', () => ({
  NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) }
}));

vi.mock('@/lib/api/date-response', () => ({ normalizeJsonResponseDates: (r: any) => r }));

vi.mock('@/lib/auth/auth-app', () => ({
  getAuth: vi.fn().mockResolvedValue({ id: 'user-42', role: 'anfitriona', permissions: {} })
}));

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

const commissionService = vi.hoisted(() => ({
  list: vi.fn(),
  getDetails: vi.fn()
}));
vi.mock('@/lib/services/CommissionService', () => ({
  CommissionService: commissionService
}));

import { GET } from '@/app/api/commissions/user/route';

const callGET = (url: string) => GET(new Request(url), { params: {} } as any);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /commissions/user', () => {
  it('por defecto devuelve la fila agregada por usuario (pantallas de comisiones)', async () => {
    const agregado = [
      {
        id: 'user-42',
        venta: 5000,
        servicio: 3000,
        total: 8000,
        estado_int: 1,
        status: 'por_pagar'
      }
    ];
    commissionService.list.mockResolvedValue(agregado);

    const res = await callGET('http://localhost/api/commissions/user');
    const json = await res.json();

    expect(commissionService.list).toHaveBeenCalledWith({
      employeeId: 'user-42',
      status: undefined
    });
    expect(commissionService.getDetails).not.toHaveBeenCalled();
    expect(json.success).toBe(true);
    expect(json.data).toEqual(agregado);
  });

  it('con ?tipo=detalle devuelve filas por comisión con estado numérico (Eventos Financieros)', async () => {
    commissionService.getDetails.mockResolvedValue([
      {
        id: 'c-1',
        fecha_hora: '2026-09-20T22:00:00.000Z',
        codigo_venta: 'VENTA01',
        codigo_servicio: null,
        tipo: 'venta',
        monto: 12000,
        estado: 'Por pagar',
        producto: 'Botella',
        fecha_pago: null
      },
      {
        id: 'c-2',
        fecha_hora: '2026-09-18T21:00:00.000Z',
        codigo_venta: null,
        codigo_servicio: 'SRV9',
        tipo: 'servicio',
        monto: 5000,
        estado: 'Pagado',
        producto: 'Servicio de Acompañante',
        fecha_pago: '2026-09-19'
      },
      {
        id: 'c-3',
        fecha_hora: '2026-09-01T20:00:00.000Z',
        codigo_venta: 'VENTA00',
        codigo_servicio: null,
        tipo: 'venta',
        monto: 900,
        estado: 'Anulado',
        producto: null,
        fecha_pago: null
      }
    ]);

    const res = await callGET('http://localhost/api/commissions/user?tipo=detalle');
    const json = await res.json();

    expect(commissionService.getDetails).toHaveBeenCalledWith('user-42');
    expect(commissionService.list).not.toHaveBeenCalled();

    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(3);

    // Shapes que parsean Expo (FinancialEvent) y Flutter (FinancialEvent.fromJson):
    expect(json.data[0]).toMatchObject({
      id: 'c-1',
      fecha_crea: '2026-09-20T22:00:00.000Z',
      codigo: 'VENTA01',
      codigo_venta: 'VENTA01',
      tipo: 'venta',
      monto: 12000,
      estado: 1 // 'Por pagar' → 1 (los clientes filtran estado numérico)
    });
    expect(json.data[1]).toMatchObject({
      codigo: 'SRV9', // fallback a codigo_servicio
      tipo: 'servicio',
      estado: 2 // 'Pagado' → 2
    });
    expect(json.data[2]).toMatchObject({ estado: 0 }); // 'Anulado' → 0
  });
});
