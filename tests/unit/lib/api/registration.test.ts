// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({
  rows: new Map<string, any>(),
  user: { id: 'u1', role: 'administrador', permissions: {} } as any
}));
vi.mock('@/lib/database/sync-operations', () => ({
  SyncOperationRepository: {
    claim: vi.fn(async (key: string, input: any) => {
      const row = state.rows.get(key);
      if (row) return { claimed: false, operation: row };
      state.rows.set(key, {
        id_cliente: key,
        usuario_id: input.usuarioId,
        endpoint: input.endpoint,
        estado: 'pendiente'
      });
      return { claimed: true, operation: null };
    }),
    resolve: vi.fn(async (key: string, estado: string, response: any) =>
      Object.assign(state.rows.get(key), { estado, respuesta: JSON.stringify(response) })
    ),
    fail: vi.fn(async (key: string) => {
      state.rows.get(key).estado = 'fallida';
    }),
    parseResponse: (row: any) => (row.respuesta ? JSON.parse(row.respuesta) : null)
  }
}));
vi.mock('@/lib/auth/auth-app', () => ({ getAuth: vi.fn(async () => state.user) }));
vi.mock('@/modules/auditoria', () => ({
  AuditService: { log: vi.fn() },
  ErrorLogService: { log: vi.fn(async () => {}) }
}));
vi.mock('@/lib/api/date-response', () => ({
  normalizeJsonResponseDates: (response: Response) => response
}));
vi.mock('@/lib/utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), captureException: vi.fn() }
}));
import { withRoute } from '@/lib/api/withRoute';
import { runIdempotent } from '@/lib/api/idempotency';
const request = (path = '/api/purchases', key = 'registration-key-one', method = 'POST') =>
  new Request(`http://localhost${path}`, {
    method,
    headers: { 'content-type': 'application/json', 'x-registration-key': key },
    body: JSON.stringify({ cantidad: 3 })
  });
const context = { params: {} };
beforeEach(() => {
  state.rows.clear();
  state.user = { id: 'u1', role: 'administrador', permissions: {} };
});
describe('idempotencia general despues de permisos', () => {
  it('conserva cuerpo y cabeceras cuando Request pertenece a otro runtime', async () => {
    const incoming = request();
    const NativeRequest = globalThis.Request;
    class OtherRuntimeRequest extends NativeRequest {
      constructor(input: RequestInfo | URL, init?: RequestInit) {
        if (typeof input !== 'string' && !(input instanceof URL)) {
          throw new TypeError('Request de otra implementación');
        }
        super(input, init);
      }
    }
    vi.stubGlobal('Request', OtherRuntimeRequest);
    try {
      const handler = vi.fn(async (req: Request) => {
        expect(req.headers.get('content-type')).toBe('application/json');
        expect(req.headers.get('x-registration-key')).toBeNull();
        expect(req.headers.get('x-idempotency-key')).toBeNull();
        return Response.json(await req.json());
      });
      const route = withRoute({ auth: true, access: 'authenticated' }, handler);
      const response = await route(incoming, context);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ cantidad: 3 });
      expect(handler).toHaveBeenCalledTimes(1);
      expect(incoming.headers.get('x-registration-key')).toBe('registration-key-one');
    } finally {
      vi.stubGlobal('Request', NativeRequest);
    }
  });
  it.each([
    '/api/purchases',
    '/api/sales',
    '/api/services',
    '/api/services/temporary',
    '/api/orders',
    '/api/bar',
    '/api/accounts',
    '/api/clients'
  ])('ejecuta y responde una sola vez en %s', async path => {
    const handler = vi.fn(async (req: Request) =>
      Response.json({ success: true, data: await req.json() }, { status: 201 })
    );
    const route = withRoute({ auth: true, access: 'authenticated' }, handler);
    const a = await route(request(path), context);
    const b = await route(request(path), context);
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(await a.json()).toEqual(await b.json());
    expect(b.headers.get('x-idempotent-replay')).toBe('1');
  });
  it('bloquea una repeticion simultanea antes de que confirme el primer registro', async () => {
    let release!: () => void;
    let entered!: () => void;
    const started = new Promise<void>(resolve => {
      entered = resolve;
    });
    const wait = new Promise<void>(resolve => {
      release = resolve;
    });
    const handler = vi.fn(async () => {
      entered();
      await wait;
      return Response.json({ success: true });
    });
    const route = withRoute({ auth: true, access: 'authenticated' }, handler);
    const a = route(request(), context);
    await started;
    const b = await route(request(), context);
    expect(b.status).toBe(409);
    expect(handler).toHaveBeenCalledTimes(1);
    release();
    await a;
    expect((await route(request(), context)).status).toBe(200);
    expect(handler).toHaveBeenCalledTimes(1);
  });
  it('no reclama dos veces cuando la ruta ya tiene idempotencia offline', async () => {
    const business = vi.fn(async () => Response.json({ success: true }));
    const route = withRoute({ auth: true, access: 'authenticated' }, req =>
      runIdempotent(req, { endpoint: 'sales.create', usuarioId: 'u1' }, business)
    );
    expect((await route(request('/api/sales'), context)).status).toBe(200);
    expect((await route(request('/api/sales'), context)).status).toBe(200);
    expect(business).toHaveBeenCalledTimes(1);
    expect(state.rows.size).toBe(1);
  });
  it('no revela la respuesta guardada sin sesion ni al cambiar de usuario', async () => {
    const handler = vi.fn(async () => Response.json({ success: true }));
    const route = withRoute({ auth: true, access: 'authenticated' }, handler);
    await route(request(), context);
    state.user = null;
    expect((await route(request(), context)).status).toBe(401);
    state.user = { id: 'u2', role: 'administrador', permissions: {} };
    expect((await route(request(), context)).status).toBe(409);
    expect(handler).toHaveBeenCalledTimes(1);
  });
  it('no permite reutilizar una clave para otro endpoint', async () => {
    const handler = vi.fn(async () => Response.json({ success: true }));
    const route = withRoute({ auth: true, access: 'authenticated' }, handler);
    await route(request(), context);
    expect((await route(request('/api/sales'), context)).status).toBe(409);
    expect(handler).toHaveBeenCalledTimes(1);
  });
  it('rechaza una clave invalida antes de escribir', async () => {
    const handler = vi.fn();
    const route = withRoute({ auth: true, access: 'authenticated' }, handler);
    expect((await route(request('/api/purchases', 'bad'), context)).status).toBe(400);
    expect(handler).not.toHaveBeenCalled();
  });
});
