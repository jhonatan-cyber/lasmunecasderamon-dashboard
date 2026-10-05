// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-validation';
});

vi.mock('next/server', () => ({
  NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) }
}));

vi.mock('@/lib/api/date-response', () => ({ normalizeJsonResponseDates: (r: any) => r }));

let mockAuthUser: any = null;

vi.mock('@/lib/auth/auth-app', () => ({
  getAuth: vi.fn().mockImplementation(async () => mockAuthUser)
}));

vi.mock('@/modules/auditoria/registro/servicio', () => ({
  AuditService: { log: vi.fn().mockResolvedValue(undefined) }
}));

vi.mock('@/modules/auditoria/errores/servicio', () => ({
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

const gratificacionService = vi.hoisted(() => ({
  getAll: vi.fn(),
  request: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn()
}));
vi.mock('@/modules/personal/gratificaciones/servicio', () => ({
  GratificacionService: gratificacionService
}));

import { GET, POST } from '@/app/api/gratificaciones/route';
import { GET as GET_ME } from '@/app/api/gratificaciones/me/route';
import { DELETE, PUT } from '@/app/api/gratificaciones/[id]/route';

const callGet = (search = '') =>
  GET(new Request(`http://localhost/api/gratificaciones${search}`), {
    params: {}
  } as any);

const callMe = (search = '') =>
  GET_ME(new Request(`http://localhost/api/gratificaciones/me${search}`), {
    params: {}
  } as any);

const callPost = (body: unknown) =>
  POST(
    new Request('http://localhost/api/gratificaciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }),
    { params: {} } as any
  );

const callPut = (id: string, body: unknown) =>
  PUT(
    new Request(`http://localhost/api/gratificaciones/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }),
    { params: Promise.resolve({ id }) } as any
  );

const callDelete = (id: string) =>
  DELETE(new Request(`http://localhost/api/gratificaciones/${id}`, { method: 'DELETE' }), {
    params: Promise.resolve({ id })
  } as any);

beforeEach(() => {
  vi.clearAllMocks();
  gratificacionService.getAll.mockResolvedValue([{ id: 'g1' }]);
  gratificacionService.request.mockResolvedValue({ id: 's1' });
  gratificacionService.create.mockResolvedValue({ id: 'g1' });
  gratificacionService.update.mockResolvedValue(undefined);
  gratificacionService.delete.mockResolvedValue(undefined);
  mockAuthUser = { id: 'user-comun-1', role: 'Garzon', permissions: {} };
});

/**
 * GET /api/gratificaciones es "solo sesión" en el middleware
 * (AUTHENTICATED_ONLY_APIS): no hay gate de permiso en la capa de rutas. La
 * autorización real vive DENTRO del handler: solo el administrador consulta
 * listados ajenos; el resto —cajero incluido— ve lo suyo y lo que él mismo
 * solicitó (solicitante_id, migración 037). Estos tests blindan ese filtrado:
 * si alguien vuelve a abrir el listado del cajero a todos los trabajadores, el
 * suite falla.
 */
describe('GET /api/gratificaciones · el filtrado por rol vive en el handler', () => {
  it('usuario común: solo los suyos, aunque pida otro userId en la query', async () => {
    const res = await callGet('?userId=otro-usuario');
    const body = await res.json();

    expect(res.status).toBe(200);
    // El parámetro se ignora por completo: el filtro se fuerza con el id de sesión
    // (beneficiario y solicitante, que para este rol es la misma persona).
    expect(gratificacionService.getAll).toHaveBeenCalledTimes(1);
    expect(gratificacionService.getAll).toHaveBeenCalledWith('user-comun-1', 'user-comun-1');
    expect(body).toEqual([{ id: 'g1' }]);
  });

  it('usuario común sin query: también pide solo los suyos', async () => {
    await callGet();

    expect(gratificacionService.getAll).toHaveBeenCalledWith('user-comun-1', 'user-comun-1');
  });

  it('administrador: consulta las de cualquiera o el listado completo', async () => {
    mockAuthUser = { id: 'admin-1', role: 'Administrador', permissions: {} };

    await callGet('?userId=otro-usuario');
    expect(gratificacionService.getAll).toHaveBeenLastCalledWith('otro-usuario');

    await callGet();
    expect(gratificacionService.getAll).toHaveBeenLastCalledWith(undefined);

    // userId vacío equivale a no pedirlo: listado completo.
    await callGet('?userId=');
    expect(gratificacionService.getAll).toHaveBeenLastCalledWith(undefined);
  });

  it('cajero: ya no consulta ajenas; ve lo suyo y lo que él solicitó', async () => {
    mockAuthUser = { id: 'pepe-1', role: 'Cajero', permissions: {} };

    // El userId de otro trabajador se ignora: la unión es contra su propio id.
    await callGet('?userId=garzon-2');
    expect(gratificacionService.getAll).toHaveBeenLastCalledWith('pepe-1', 'pepe-1');

    await callGet();
    expect(gratificacionService.getAll).toHaveBeenLastCalledWith('pepe-1', 'pepe-1');
  });

  it('el administrador se reconoce sin importar mayúsculas; el cajero tampoco escapa', async () => {
    mockAuthUser = { id: 'ana-1', role: 'ADMINISTRADOR', permissions: {} };

    await callGet('?userId=garzon-3');
    expect(gratificacionService.getAll).toHaveBeenLastCalledWith('garzon-3');

    mockAuthUser = { id: 'pepe-2', role: 'CAJERO', permissions: {} };
    await callGet('?userId=garzon-3');
    expect(gratificacionService.getAll).toHaveBeenLastCalledWith('pepe-2', 'pepe-2');
  });

  it('el guard es solo sesión: un rol sin permisos de gratificaciones entra igual', async () => {
    // `access: 'authenticated'` sin module/action no exige ningún flag; la barrera es
    // el filtrado de datos de arriba. Sacarlo de aquí sin poner un gate en el
    // middleware abriría el listado completo a cualquier sesión.
    mockAuthUser = { id: 'garzon-sin-permiso', role: 'Garzon', permissions: {} };

    const res = await callGet();

    expect(res.status).toBe(200);
    expect(gratificacionService.getAll).toHaveBeenCalledWith(
      'garzon-sin-permiso',
      'garzon-sin-permiso'
    );
  });
});

/**
 * POST /api/gratificaciones: el prefijo vive en AUTHENTICATED_ONLY_APIS (solo sesión
 * en el middleware) y la autorización de escritura recae en
 * `withRoute({ module: 'gratificaciones', action: 'write' })`. La bifurcación de
 * negocio está en el handler: el cajero NO crea — solicita (pendingApproval, espera
 * aprobación del administrador) — y el administrador crea directo.
 */
describe('POST /api/gratificaciones · la bifurcación cajero/admin vive en el handler', () => {
  it('cajero: pide solicitud (pendingApproval) y nunca crea directo', async () => {
    // Es la asignación real del rol: gratificaciones.view + gratificaciones.create
    // (create se traduce a write en la matriz que verifica withRoute).
    mockAuthUser = {
      id: 'pepe-1',
      role: 'Cajero',
      permissions: { gratificaciones: { read: true, write: true, delete: false } }
    };

    const res = await callPost({
      usuario_id: 'garzon-9',
      monto: '7500',
      descripcion: 'bono de cierre'
    });
    const body = await res.json();

    expect(res.status).toBe(201);
    // El monto llega como string del formulario y el handler lo numera; el cuarto
    // argumento es el id de sesión del solicitante, que el servicio ahora persiste
    // como solicitante_id (migración 037).
    expect(gratificacionService.request).toHaveBeenCalledWith(
      'garzon-9',
      7500,
      'bono de cierre',
      'pepe-1'
    );
    expect(gratificacionService.create).not.toHaveBeenCalled();
    expect(body).toMatchObject({ success: true, pendingApproval: true, id: 's1' });
    expect(body.message).toMatch(/solicitud/i);
  });

  it('administrador: crea directo, sin pasar por solicitud', async () => {
    mockAuthUser = { id: 'admin-1', role: 'Administrador', permissions: {} };

    const res = await callPost({ usuario_id: 'garzon-9', monto: 5000, descripcion: 'premio' });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(gratificacionService.create).toHaveBeenCalledWith({
      usuario_id: 'garzon-9',
      monto: 5000,
      descripcion: 'premio',
      // La creación directa también registra a quién la creó.
      solicitante_id: 'admin-1'
    });
    expect(gratificacionService.request).not.toHaveBeenCalled();
    expect(body).toMatchObject({ success: true, id: 'g1' });
    // La respuesta de creación no promete aprobación pendiente.
    expect(body.pendingApproval).toBeUndefined();
  });

  it('sin usuario_id o sin monto responde 400 y no toca el servicio', async () => {
    mockAuthUser = { id: 'admin-1', role: 'Administrador', permissions: {} };

    const sinUsuario = await callPost({ monto: 100 });
    expect(sinUsuario.status).toBe(400);
    expect((await sinUsuario.json()).success).toBe(false);

    const sinMonto = await callPost({ usuario_id: 'garzon-9' });
    expect(sinMonto.status).toBe(400);

    expect(gratificacionService.request).not.toHaveBeenCalled();
    expect(gratificacionService.create).not.toHaveBeenCalled();
  });

  it('el guard de escritura sigue puesto: sin gratificaciones.write recibe 403', async () => {
    mockAuthUser = { id: 'sebas-1', role: 'Garzon', permissions: {} };

    const res = await callPost({ usuario_id: 'garzon-9', monto: 100 });

    expect(res.status).toBe(403);
    expect(gratificacionService.request).not.toHaveBeenCalled();
    expect(gratificacionService.create).not.toHaveBeenCalled();
  });
});

/**
 * GET /api/gratificaciones/me es el endpoint del flujo móvil (app Expo): la lista
 * "mis gratificaciones" del trabajador. A diferencia del GET del dashboard, NO
 * adopta la unión beneficiario/solicitante (migración 037): llama al servicio con
 * UN solo argumento, así que devuelve únicamente lo que el usuario RECIBE. Lo que
 * él solicitó para otros vive en el dashboard (sección "Mis solicitudes"); si el
 * móvil llegara a necesitarlo, merece su propio endpoint y no un cambio silencioso
 * de este contrato. Estos tests cortan si alguien propaga la unión a /me.
 */
describe('GET /api/gratificaciones/me · el flujo móvil no adopta la unión del solicitante', () => {
  it('pasa SOLO el id de sesión al servicio: un argumento, sin solicitante', async () => {
    mockAuthUser = { id: 'movil-1', role: 'Garzon', permissions: {} };

    const res = await callMe();
    const body = await res.json();

    expect(res.status).toBe(200);
    // El blindaje exacto: si alguien llama con (id, id) —la unión del cajero—
    // esta igualdad falla porque cambia la aridad.
    expect(gratificacionService.getAll.mock.calls[0]).toEqual(['movil-1']);
    expect(body).toEqual({ success: true, data: [{ id: 'g1' }] });
  });

  it('ignora por completo los query params: el id viene de la sesión, no de la URL', async () => {
    mockAuthUser = { id: 'movil-1', role: 'Garzon', permissions: {} };

    await callMe('?userId=otro-trabajador');

    expect(gratificacionService.getAll.mock.calls[0]).toEqual(['movil-1']);
  });

  it('el cajero también recibe solo lo suyo: sus solicitudes a otros viven en el dashboard', async () => {
    mockAuthUser = { id: 'pepe-1', role: 'Cajero', permissions: {} };

    await callMe();

    expect(gratificacionService.getAll.mock.calls[0]).toEqual(['pepe-1']);
  });

  it('el admin no obtiene el listado completo por /me: es su vista personal', async () => {
    mockAuthUser = { id: 'admin-1', role: 'Administrador', permissions: {} };

    await callMe();

    expect(gratificacionService.getAll.mock.calls[0]).toEqual(['admin-1']);
    expect(gratificacionService.getAll).not.toHaveBeenCalledWith(undefined);
  });

  it('guard solo sesión: un rol sin permisos de gratificaciones entra igual', async () => {
    mockAuthUser = { id: 'movil-sin-permiso', role: 'Garzon', permissions: {} };

    const res = await callMe();

    expect(res.status).toBe(200);
    expect(gratificacionService.getAll.mock.calls[0]).toEqual(['movil-sin-permiso']);
  });
});

/**
 * PUT/DELETE /api/gratificaciones/[id]: el prefijo solo exige sesión en el
 * middleware (AUTHENTICATED_ONLY_APIS), así que el guard del handler ES la barrera.
 * `write` no sirve para el PUT porque la matriz colapsa `create` y `edit` en ese
 * flag: el cajero, que solo tiene `create` para solicitar, podría editar montos
 * ajenos. El PUT pide `edit` — el mismo par que la UI usa para mostrar el botón.
 */
describe('PUT/DELETE /api/gratificaciones/[id] · editar exige el par edit', () => {
  it('cajero con solo create: PUT 403 y no toca el servicio (el blindaje)', async () => {
    // La matriz real del cajero: create colapsa a write y edit queda en false.
    mockAuthUser = {
      id: 'pepe-1',
      role: 'Cajero',
      permissions: { gratificaciones: { read: true, write: true, edit: false, delete: false } }
    };

    const res = await callPut('grat-1', { monto: 999, descripcion: 'edición ajena' });

    expect(res.status).toBe(403);
    expect(gratificacionService.update).not.toHaveBeenCalled();
  });

  it('administrador: actualiza con el id de la URL', async () => {
    mockAuthUser = { id: 'admin-1', role: 'Administrador', permissions: {} };

    const res = await callPut('grat-1', { monto: 7000, descripcion: 'corrección' });

    expect(res.status).toBe(200);
    expect(gratificacionService.update).toHaveBeenCalledWith('grat-1', {
      monto: 7000,
      descripcion: 'corrección'
    });
  });

  it('rol con gratificaciones.edit del catálogo: el flag homónimo lo habilita', async () => {
    mockAuthUser = {
      id: 'gerente-1',
      role: 'Gerente',
      permissions: { gratificaciones: { read: true, write: true, edit: true, delete: false } }
    };

    const res = await callPut('grat-1', { monto: 500 });

    expect(res.status).toBe(200);
    expect(gratificacionService.update).toHaveBeenCalledWith('grat-1', {
      monto: 500,
      descripcion: undefined
    });
  });

  it('sin monto: 400 antes de tocar el servicio', async () => {
    mockAuthUser = { id: 'admin-1', role: 'Administrador', permissions: {} };

    const res = await callPut('grat-1', { descripcion: 'sin monto' });

    expect(res.status).toBe(400);
    expect(gratificacionService.update).not.toHaveBeenCalled();
  });

  it('DELETE: el cajero sin el par delete sigue bloqueado', async () => {
    mockAuthUser = {
      id: 'pepe-1',
      role: 'Cajero',
      permissions: { gratificaciones: { read: true, write: true, edit: false, delete: false } }
    };

    const res = await callDelete('grat-1');

    expect(res.status).toBe(403);
    expect(gratificacionService.delete).not.toHaveBeenCalled();
  });
});
