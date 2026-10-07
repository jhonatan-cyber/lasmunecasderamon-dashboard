// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  user: { id: 'user-1', role: 'garzon' },
  canReadEvent: vi.fn(),
  getEventDetail: vi.fn()
}));
vi.mock('@/modules/agenda', () => ({ EventService: mocks }));
vi.mock('@/lib/api/withRoute', () => ({
  withRoute: (_config: unknown, handler: any) => (request: Request, context: any) =>
    handler(request, { ...context, user: mocks.user })
}));
vi.mock('next/server', () => ({
  NextResponse: { json: (data: unknown, init?: ResponseInit) => Response.json(data, init) }
}));
import { GET } from '@/app/api/events/detail/[id]/route';

const request = () =>
  GET(new Request('http://localhost/api/events/detail/g1?type=gratificacion'), {
    params: Promise.resolve({ id: 'g1' })
  });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = { id: 'user-1', role: 'garzon' };
  mocks.canReadEvent.mockResolvedValue(false);
  mocks.getEventDetail.mockResolvedValue({ monto: 1000 });
});
describe('detalle de eventos personales', () => {
  it('no devuelve información de otro empleado', async () => {
    expect((await request()).status).toBe(404);
    expect(mocks.canReadEvent).toHaveBeenCalledWith('g1', 'gratificacion', 'user-1');
    expect(mocks.getEventDetail).not.toHaveBeenCalled();
  });
  it('permite consultar eventos propios', async () => {
    mocks.canReadEvent.mockResolvedValue(true);
    expect((await request()).status).toBe(200);
    expect(mocks.getEventDetail).toHaveBeenCalledWith('g1', 'gratificacion');
  });
  it('conserva el acceso del administrador', async () => {
    mocks.user.role = 'administrador';
    expect((await request()).status).toBe(200);
    expect(mocks.canReadEvent).not.toHaveBeenCalled();
  });
});
