// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';

const repo = vi.hoisted(() => ({ get: vi.fn(), parseResponse: vi.fn() }));
vi.mock('@/lib/database/sync-operations', () => ({ SyncOperationRepository: repo }));
vi.mock('next/server', () => ({
  NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) }
}));
vi.mock('@/lib/api/withRoute', () => ({
  withRoute:
    (
      _config: unknown,
      handler: (request: Request, context: { user: { id: string } }) => Promise<Response>
    ) =>
    (request: Request) =>
      handler(request, { user: { id: 'a' } })
}));
vi.mock('@/lib/utils/logger', () => ({ default: { warn: vi.fn(), info: vi.fn() } }));
import { GET } from '@/app/api/sync-operations/route';

const request = (id = 'offline-test-123') =>
  GET(new Request(`https://example.com/api/sync-operations?id=${id}`), { params: {} });
beforeEach(() => {
  vi.clearAllMocks();
  repo.get.mockResolvedValue(null);
  repo.parseResponse.mockReturnValue(null);
});

it('valida el identificador antes de consultar', async () => {
  expect((await request('abc')).status).toBe(400);
  expect(repo.get).not.toHaveBeenCalled();
});
it('no revela operaciones ni respuestas de otra persona', async () => {
  repo.get.mockResolvedValue({ usuario_id: 'b', estado: 'aplicada' });
  expect(await (await request()).json()).toEqual({ success: true, data: { state: 'not_found' } });
  expect(repo.parseResponse).not.toHaveBeenCalled();
});
it('devuelve la respuesta original solo al propietario y evita caché', async () => {
  repo.get.mockResolvedValue({ usuario_id: 'a', estado: 'aplicada' });
  repo.parseResponse.mockReturnValue({ status: 201, body: { success: true, data: { id: 12 } } });
  const response = await request();
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  expect(await response.json()).toEqual({
    success: true,
    data: { state: 'aplicada', response: { success: true, data: { id: 12 } } }
  });
});
it('mantiene una operación dudosa en revisión sin exponer su respuesta', async () => {
  repo.get.mockResolvedValue({ usuario_id: 'a', estado: 'fallida' });
  repo.parseResponse.mockReturnValue({ body: { private: 'datos' } });
  const result = await (await request()).json();
  expect(result.data.state).toBe('fallida');
  expect(result.data.response).toBeUndefined();
  expect(result.data.message).toMatch(/revisión/);
});
