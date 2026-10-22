// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({
  role: 'Anfitriona',
  update: vi.fn(),
  status: vi.fn(),
  assign: vi.fn()
}));
vi.mock('next/server', () => ({
  NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) }
}));
vi.mock('@/lib/api/date-response', () => ({
  normalizeJsonResponseDates: (response: Response) => response
}));
vi.mock('@/lib/auth/auth-app', () => ({
  getAuth: async () => ({
    id: 'host-1',
    role: state.role,
    permissions: { private_rooms: { write: true } }
  })
}));
vi.mock('@/modules/auditoria/registro/servicio', () => ({
  AuditService: { log: vi.fn().mockResolvedValue(undefined) }
}));
vi.mock('@/modules/auditoria/errores/servicio', () => ({
  ErrorLogService: { log: vi.fn().mockResolvedValue(undefined) }
}));
vi.mock('@/lib/utils/logger', () => {
  const logger = {
    error: vi.fn(),
    captureException: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  };
  return { default: logger, logger };
});
vi.mock('@/modules/operacion', () => ({
  ServiceService: { updateService: state.update, updateStatus: state.status },
  cambiarAnfitrionasServicio: state.assign
}));
vi.mock('@/lib/api/sseService', () => ({ sendNotificationToAll: vi.fn() }));
import { PUT, PATCH } from '@/app/api/services/[id]/route';
import { PATCH as assign } from '@/app/api/services/[id]/hostesses/route';

beforeEach(() => {
  vi.clearAllMocks();
  state.role = 'Anfitriona';
});
describe('servicios de anfitrionas son de solo lectura', () => {
  it.each([
    ['PUT', PUT, { precio_servicio: 1 }],
    ['PATCH', PATCH, { estado: 3 }],
    ['PATCH', PATCH, { total: 1 }],
    ['PATCH', assign, { usuarios: ['host-2'] }]
  ])(
    'rechaza %s incluso si la sesión tiene permiso de escritura',
    async (method, handler, body) => {
      const response = await handler(
        new Request('http://localhost/api/services/service-1', {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        }),
        { params: Promise.resolve({ id: 'service-1' }) }
      );
      expect(response.status).toBe(403);
      expect(state.update).not.toHaveBeenCalled();
      expect(state.status).not.toHaveBeenCalled();
      expect(state.assign).not.toHaveBeenCalled();
    }
  );
  it('conserva la edición del cajero', async () => {
    state.role = 'Cajero';
    const response = await PUT(
      new Request('http://localhost/api/services/service-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ precio_servicio: 10000 })
      }),
      { params: Promise.resolve({ id: 'service-1' }) }
    );
    expect(response.status).toBe(200);
    expect(state.update).toHaveBeenCalledWith('service-1', { precio_servicio: 10000 });
  });
});
