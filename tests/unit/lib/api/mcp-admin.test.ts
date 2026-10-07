// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const estado = vi.hoisted(() => ({
  auth: { id: 'admin-1', role: 'Administrador', permissions: {} } as any,
  role: 'Administrador',
  activo: true,
  operaciones: new Map<string, any>(),
  ejecutar: vi.fn(),
  listar: vi.fn(),
  detalle: vi.fn(),
  limite: vi.fn(),
  auditar: vi.fn()
}));
vi.mock('next/server', () => ({
  NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) }
}));
vi.mock('@/lib/api/date-response', () => ({ normalizeJsonResponseDates: (r: any) => r }));
vi.mock('@/lib/auth/auth-app', () => ({ getAuth: async () => estado.auth }));
vi.mock('@/lib/middleware/auth', () => ({
  isAdministrator: (u: any) => u?.role?.toLowerCase() === 'administrador'
}));
vi.mock('@/modules/identidad', () => ({
  UserService: { getById: async (id: string) => ({ id, role: estado.role, name: 'Admin' }) },
  usuarioEstaActivo: async () => estado.activo
}));
vi.mock('@/modules/auditoria', () => ({
  AuditService: { log: estado.auditar },
  ErrorLogService: { log: vi.fn().mockResolvedValue(undefined) }
}));
vi.mock('@/lib/database/perfilConsultas', () => ({ perfilActivo: () => false }));
vi.mock('@/lib/utils/logger', () => {
  const logger = { error: vi.fn(), info: vi.fn(), warn: vi.fn(), captureException: vi.fn() };
  return { logger, default: logger };
});
vi.mock('@/workflows/mcp-solicitudes', () => ({
  consultarSolicitudes: estado.listar,
  detalleSolicitud: estado.detalle,
  limiteAnticipo: estado.limite,
  ejecutarSolicitud: estado.ejecutar
}));
vi.mock('@/lib/database/sync-operations', () => ({
  SyncOperationRepository: {
    claim: async (key: string, input: any) => {
      const existente = estado.operaciones.get(key);
      if (existente) return { claimed: false, operation: existente };
      estado.operaciones.set(key, {
        id_cliente: key,
        endpoint: input.endpoint,
        usuario_id: input.usuarioId,
        estado: 'pendiente'
      });
      return { claimed: true, operation: null };
    },
    resolve: async (key: string, status: string, respuesta: any) =>
      Object.assign(estado.operaciones.get(key), {
        estado: status,
        respuesta: JSON.stringify(respuesta)
      }),
    fail: async (key: string) => Object.assign(estado.operaciones.get(key), { estado: 'fallida' }),
    parseResponse: (operation: any) => JSON.parse(operation.respuesta)
  }
}));

import { GET, POST } from '@/app/api/mcp/admin/solicitudes/route';
import { GET as session } from '@/app/api/mcp/admin/session/route';
const contexto = { params: {} } as any;
const consulta = (query = '') =>
  GET(new Request(`http://localhost/api/mcp/admin/solicitudes${query}`), contexto);
const post = (body: unknown) =>
  POST(
    new Request('http://localhost/api/mcp/admin/solicitudes', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' }
    }),
    contexto
  );
const comando = () => ({
  accion: 'crear_anticipo',
  usuario_id: 'empleado-1',
  monto: 200,
  motivo: 'Emergencia',
  confirmar: true,
  operacion_id: '00000000-0000-4000-8000-000000000001'
});

beforeEach(() => {
  vi.clearAllMocks();
  estado.auth = { id: 'admin-1', role: 'Administrador', permissions: {} };
  estado.role = 'Administrador';
  estado.activo = true;
  estado.operaciones.clear();
  estado.auditar.mockResolvedValue(undefined);
  estado.listar.mockResolvedValue({ grupos: [], total_pendientes: 0 });
  estado.ejecutar.mockResolvedValue({ id: 'a1', estado: 'pendiente' });
});

describe('API MCP exclusiva de administrador', () => {
  it('rechaza acceso sin sesión y cajeros aunque tengan permisos', async () => {
    estado.auth = null;
    expect((await consulta()).status).toBe(401);
    estado.auth = {
      id: 'cajero',
      role: 'Cajero',
      permissions: { advances: { read: true, write: true } }
    };
    expect((await consulta()).status).toBe(403);
    expect((await post(comando())).status).toBe(403);
    expect(estado.listar).not.toHaveBeenCalled();
    expect(estado.ejecutar).not.toHaveBeenCalled();
  });
  it('verifica rol actual e inactividad aunque el token diga Administrador', async () => {
    estado.role = 'Cajero';
    expect((await consulta()).status).toBe(403);
    estado.role = 'Administrador';
    estado.activo = false;
    expect(
      (await session(new Request('http://localhost/api/mcp/admin/session'), contexto)).status
    ).toBe(403);
    expect(estado.listar).not.toHaveBeenCalled();
  });
  it('valida paginación y conserva totales del resultado', async () => {
    expect((await consulta('?tipo=anticipo&limit=20&offset=40')).status).toBe(200);
    expect(estado.listar).toHaveBeenCalledWith('anticipo', 20, 40);
    expect((await consulta('?limit=51')).status).toBe(400);
    expect((await consulta('?tipo=sql')).status).toBe(400);
  });
  it('exige confirmación y rechaza suplantación del actor en el payload', async () => {
    expect((await post({ ...comando(), confirmar: false })).status).toBe(400);
    expect((await post({ ...comando(), adminId: 'otro' })).status).toBe(400);
    expect(estado.ejecutar).not.toHaveBeenCalled();
  });
  it('registra la identidad autenticada y replica reintentos sin crear otra solicitud', async () => {
    const primera = await post(comando());
    const segunda = await post(comando());
    expect(primera.status).toBe(200);
    expect(segunda.status).toBe(200);
    expect(await segunda.json()).toEqual(await primera.json());
    expect(segunda.headers.get('x-idempotent-replay')).toBe('1');
    expect(estado.ejecutar).toHaveBeenCalledTimes(1);
    expect(estado.ejecutar.mock.calls[0][1]).toMatchObject({
      id: 'admin-1',
      role: 'Administrador'
    });
  });
  it('no acepta reutilizar la misma intención con otro monto', async () => {
    await post(comando());
    expect((await post({ ...comando(), monto: 500 })).status).toBe(409);
    expect(estado.ejecutar).toHaveBeenCalledTimes(1);
  });
  it('reintento concurrente no ejecuta dos operaciones', async () => {
    let completar!: (value: unknown) => void;
    estado.ejecutar.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          completar = resolve;
        })
    );
    const primera = post(comando());
    await vi.waitFor(() => expect(estado.ejecutar).toHaveBeenCalledTimes(1));
    expect((await post(comando())).status).toBe(409);
    completar({ id: 'a1' });
    expect((await primera).status).toBe(200);
  });
  it('una operación fallida queda en revisión y no se reejecuta a ciegas', async () => {
    estado.ejecutar.mockRejectedValueOnce(new Error('fallo después del movimiento'));
    expect((await post(comando())).status).toBe(500);
    expect((await post(comando())).status).toBe(409);
    expect(estado.ejecutar).toHaveBeenCalledTimes(1);
  });
});
