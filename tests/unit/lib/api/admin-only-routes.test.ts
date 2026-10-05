import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-validation';
});

let mockAuthUser: any = null;
vi.mock('@/lib/auth/auth-app', () => ({
  getAuth: vi.fn().mockImplementation(() => mockAuthUser)
}));

vi.mock('next/server', () => ({
  NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) }
}));

vi.mock('@/lib/api/date-response', () => ({
  normalizeJsonResponseDates: (r: any) => r
}));

vi.mock('@/modules/auditoria/registro/servicio', () => ({
  AuditService: { log: vi.fn().mockResolvedValue(undefined) }
}));

vi.mock('@/modules/auditoria/errores/servicio', () => ({
  ErrorLogService: { getAll: vi.fn().mockResolvedValue([]), log: vi.fn() }
}));

vi.mock('@/lib/database/query-log', () => ({
  QueryLogRepository: {
    getRecent: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    getStats: vi.fn().mockResolvedValue([])
  }
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

import { GET as errorLogsGET } from '@/app/api/error-logs/route';
import { GET as monitoringSlowQueriesGET } from '@/app/api/monitoring/slow-queries/route';
import { ErrorLogService } from '@/modules/auditoria/errores/servicio';
import { QueryLogRepository } from '@/lib/database/query-log';

const call = (handler: any, url: string) => handler(new Request(url), { params: {} });

const cajero = {
  id: 'user-1',
  role: 'cajero',
  permissions: { settings: { read: true, write: true } }
};
const administrador = { id: 'admin-1', role: 'administrador', permissions: {} };

describe('endpoints de diagnostico reservados al administrador', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser = null;
  });

  it('error-logs exige sesion (ya no es ruta publica)', async () => {
    const res = await call(errorLogsGET, 'http://localhost/api/error-logs');
    expect(res.status).toBe(401);
    expect(ErrorLogService.getAll).not.toHaveBeenCalled();
  });

  it('error-logs rechaza a un usuario no administrador', async () => {
    mockAuthUser = cajero;
    const res = await call(errorLogsGET, 'http://localhost/api/error-logs');
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'FORBIDDEN' }
    });
    expect(ErrorLogService.getAll).not.toHaveBeenCalled();
  });

  it('error-logs responde al administrador', async () => {
    mockAuthUser = administrador;
    const res = await call(errorLogsGET, 'http://localhost/api/error-logs');
    expect(res.status).toBe(200);
    expect(ErrorLogService.getAll).toHaveBeenCalled();
  });

  it('monitoring/slow-queries rechaza a un usuario no administrador', async () => {
    mockAuthUser = cajero;
    const res = await call(
      monitoringSlowQueriesGET,
      'http://localhost/api/monitoring/slow-queries'
    );
    expect(res.status).toBe(403);
    expect(QueryLogRepository.getRecent).not.toHaveBeenCalled();
  });

  it('monitoring/slow-queries responde al administrador', async () => {
    mockAuthUser = administrador;
    const res = await call(
      monitoringSlowQueriesGET,
      'http://localhost/api/monitoring/slow-queries?stats=true'
    );
    expect(res.status).toBe(200);
    expect(QueryLogRepository.getStats).toHaveBeenCalled();
  });
});
