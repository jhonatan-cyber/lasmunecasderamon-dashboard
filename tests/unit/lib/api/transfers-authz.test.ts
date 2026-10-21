// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-validation';
});

vi.mock('next/server', () => ({
  NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) }
}));

vi.mock('@/lib/api/date-response', () => ({
  normalizeJsonResponseDates: (r: unknown) => r
}));

// `withRoute` envuelve el handler con el registro y la caché de perfil: aquí no
// interesan, solo la guarda de permisos y los handlers de las rutas.
vi.mock('@/lib/api/registration', () => ({
  runRegistration: (
    _request: Request,
    _userId: string,
    invoke: (r: Request) => Promise<Response>
  ) => invoke(_request)
}));

vi.mock('@/lib/api/sseService', () => ({
  sendNotificationToAll: vi.fn(),
  sendNotificationToRole: vi.fn()
}));

vi.mock('@/lib/database/perfilConsultas', () => ({
  perfilActivo: () => false,
  reiniciarPerfil: vi.fn(),
  instantaneaPerfil: vi.fn()
}));

vi.mock('@/modules/auditoria', () => ({
  AuditService: { log: vi.fn().mockResolvedValue(undefined) },
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

const inventario = vi.hoisted(() => ({
  resolverTransferencia: vi.fn(),
  aceptarTransferencia: vi.fn()
}));

vi.mock('@/modules/inventario', () => ({
  ProductService: {
    resolverTransferencia: inventario.resolverTransferencia,
    listBarStock: vi.fn()
  },
  aceptarTransferencia: inventario.aceptarTransferencia,
  listarTransferencias: vi.fn(),
  revisarReposicion: vi.fn()
}));

let usuario: unknown = null;

vi.mock('@/lib/auth/auth-app', () => ({
  getAuth: vi.fn(async () => usuario)
}));

import { PATCH } from '@/app/api/transfers/route';
import { POST as confirmarRecepcion } from '@/app/api/transfers/[id]/accept/route';

/**
 * `withRoute` decide con la matriz que se puebla desde el catálogo: el flag
 * `products.accept_transfer` es la acción homónima de `role_permissions`. El
 * rol solo entra en juego para el bypass del administrador (`isAdministrator`).
 */
function sesion(role: string, acceptTransfer: boolean) {
  return {
    id: 'u-1',
    username: 'prueba',
    name: 'Prueba',
    email: 'prueba@example.com',
    role,
    permissions: {
      products: {
        read: true,
        write: false,
        delete: false,
        accept_transfer: acceptTransfer
      }
    },
    iat: 0,
    exp: 0
  };
}

const llamarPATCH = () =>
  PATCH(
    new Request('http://localhost/api/transfers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 't1', accion: 'aprobar' })
    }),
    { params: {} } as never
  );

const llamarAceptar = (params: { id?: string } = { id: 't1' }) =>
  confirmarRecepcion(
    new Request('http://localhost/api/transfers/t1/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    }),
    { params } as never
  );

beforeEach(() => {
  vi.clearAllMocks();
  usuario = null;
  inventario.resolverTransferencia.mockResolvedValue({ estado: 'aceptada' });
  inventario.aceptarTransferencia.mockResolvedValue(undefined);
});

describe('PATCH /api/transfers autoriza por products/accept_transfer', () => {
  it('un rol personalizado con el permiso resuelve la transferencia', async () => {
    usuario = sesion('encargado_bar', true);
    const response = await llamarPATCH();

    expect(response.status).toBe(200);
    expect(inventario.resolverTransferencia).toHaveBeenCalledWith('t1', 'aprobar', 'u-1');
  });

  it('el mismo rol sin el permiso recibe 403 y el handler no corre', async () => {
    usuario = sesion('encargado_bar', false);
    const response = await llamarPATCH();

    expect(response.status).toBe(403);
    expect(inventario.resolverTransferencia).not.toHaveBeenCalled();
  });

  it('el nombre del rol ya no basta: un barman sin el permiso recibe 403', async () => {
    usuario = sesion('barman', false);
    const response = await llamarPATCH();

    expect(response.status).toBe(403);
    expect(inventario.resolverTransferencia).not.toHaveBeenCalled();
  });

  it('el administrador pasa aunque su rol no tenga el par concedido', async () => {
    usuario = sesion('administrador', false);
    const response = await llamarPATCH();

    expect(response.status).toBe(200);
    expect(inventario.resolverTransferencia).toHaveBeenCalledWith('t1', 'aprobar', 'u-1');
  });

  it('sin sesión responde 401', async () => {
    usuario = null;
    const response = await llamarPATCH();

    expect(response.status).toBe(401);
    expect(inventario.resolverTransferencia).not.toHaveBeenCalled();
  });
});

describe('POST /api/transfers/[id]/accept autoriza por products/accept_transfer', () => {
  it('un rol personalizado con el permiso confirma la recepción', async () => {
    usuario = sesion('encargado_bar', true);
    const response = await llamarAceptar();

    expect(response.status).toBe(200);
    expect(inventario.aceptarTransferencia).toHaveBeenCalledWith('t1', 'u-1');
    await expect(response.json()).resolves.toMatchObject({ success: true });
  });

  it('el mismo rol sin el permiso recibe 403 y no se toca el inventario', async () => {
    usuario = sesion('encargado_bar', false);
    const response = await llamarAceptar();

    expect(response.status).toBe(403);
    expect(inventario.aceptarTransferencia).not.toHaveBeenCalled();
  });

  it('el nombre del rol ya no basta: un barman sin el permiso recibe 403', async () => {
    usuario = sesion('barman', false);
    const response = await llamarAceptar();

    expect(response.status).toBe(403);
    expect(inventario.aceptarTransferencia).not.toHaveBeenCalled();
  });

  it('el administrador pasa aunque su rol no tenga el par concedido', async () => {
    usuario = sesion('administrador', false);
    const response = await llamarAceptar();

    expect(response.status).toBe(200);
    expect(inventario.aceptarTransferencia).toHaveBeenCalledWith('t1', 'u-1');
  });

  it('sin sesión responde 401', async () => {
    usuario = null;
    const response = await llamarAceptar();

    expect(response.status).toBe(401);
    expect(inventario.aceptarTransferencia).not.toHaveBeenCalled();
  });

  it('con sesión y permiso, un id inválido sigue siendo 400 del handler', async () => {
    usuario = sesion('encargado_bar', true);
    const response = await llamarAceptar({ id: '' });

    expect(response.status).toBe(400);
    expect(inventario.aceptarTransferencia).not.toHaveBeenCalled();
  });
});
