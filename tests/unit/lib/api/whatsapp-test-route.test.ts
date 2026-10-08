// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ user: null as any, send: vi.fn(), limit: vi.fn() }));
vi.mock('@/lib/auth/auth-app', () => ({ getAuth: async () => mocks.user }));
vi.mock('@/modules/comunicaciones', () => ({
  enviarPruebaWhatsApp: mocks.send,
  historialWhatsApp: vi.fn().mockResolvedValue([])
}));
vi.mock('@/modules/auditoria', () => ({
  AuditService: { log: vi.fn().mockResolvedValue(undefined) },
  ErrorLogService: { log: vi.fn().mockResolvedValue(undefined) }
}));
vi.mock('@/lib/database/db', () => ({ query: vi.fn() }));
vi.mock('@/lib/middleware/redisRateLimit', () => ({ checkRateLimit: mocks.limit }));
import { POST } from '@/app/api/whatsapp/test/route';
const request = () => new Request('http://localhost/api/whatsapp/test', { method: 'POST' });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = null;
  mocks.limit.mockResolvedValue({ allowed: true });
  mocks.send.mockResolvedValue({ sid: 'SM-test', seguimientoGuardado: true });
});
it('no envía una prueba sin sesión o sin permiso de escritura en settings', async () => {
  expect((await POST(request(), { params: {} })).status).toBe(401);
  mocks.user = {
    id: 'user',
    role: 'Barman',
    permissions: { settings: { read: true, write: false } }
  };
  expect((await POST(request(), { params: {} })).status).toBe(403);
  expect(mocks.send).not.toHaveBeenCalled();
});
it('rechaza una segunda prueba cuando el limitador indica esperar', async () => {
  mocks.user = { id: 'admin', role: 'Administrador', permissions: {} };
  mocks.limit.mockResolvedValue({ allowed: false, retryAfter: 30 });
  expect((await POST(request(), { params: {} })).status).toBe(429);
  expect(mocks.send).not.toHaveBeenCalled();
});
it('explica el error de Sandbox sin revelar la respuesta original del proveedor', async () => {
  mocks.user = { id: 'admin', role: 'Administrador', permissions: {} };
  mocks.send.mockRejectedValue(
    Object.assign(new Error('secret-token-not-for-clients'), { code: 63015 })
  );
  const response = await POST(request(), { params: {} });
  expect(response.status).toBe(502);
  const body = await response.json();
  expect(body.message).toContain('unirse al Sandbox');
  expect(JSON.stringify(body)).not.toContain('secret-token');
});
it('envía la prueba sin reconstruir una solicitud cuyo cuerpo ya se consumió', async () => {
  mocks.user = { id: 'admin', role: 'Administrador', permissions: {} };
  const consumed = new Request('http://localhost/api/whatsapp/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}'
  });
  await consumed.json();
  const response = await POST(consumed, { params: {} });
  expect(response.status).toBe(200);
  expect(mocks.send).toHaveBeenCalledOnce();
  expect(mocks.limit).toHaveBeenCalledWith(consumed, expect.objectContaining({ max: 1 }));
});
it('informa un fallo preparando la prueba sin enviar ni revelar detalles internos', async () => {
  mocks.user = { id: 'admin', role: 'Administrador', permissions: {} };
  mocks.limit.mockRejectedValueOnce(new Error('secret-redis-url'));
  const response = await POST(request(), { params: {} });
  expect(response.status).toBe(503);
  const body = await response.json();
  expect(body.message).toContain('preparar la prueba');
  expect(JSON.stringify(body)).not.toContain('secret-redis-url');
  expect(mocks.send).not.toHaveBeenCalled();
});
