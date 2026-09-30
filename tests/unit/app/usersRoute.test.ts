// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Alta automática en el lector al crear un usuario desde el sistema.
 *
 * Se mockea `withRoute` (auth/auditoría) y los módulos pesados: acá se prueba la
 * orquestación de la ruta — generar el código, convertir la foto y pedir el alta —
 * y sobre todo que un fallo del equipo NUNCA rompa la creación del usuario.
 */

const userService = vi.hoisted(() => ({
  createUser: vi.fn(),
  asignarCodigoBiometrico: vi.fn(),
  updateBiometric: vi.fn(),
  getAll: vi.fn(),
  toggleUserStatus: vi.fn(),
  updateUser: vi.fn(),
  delete: vi.fn(),
  getById: vi.fn()
}));

const imagenes = vi.hoisted(() => ({
  processAndSaveImage: vi.fn(),
  imagenGuardadaABase64Jpeg: vi.fn()
}));

const lector = vi.hoisted(() => ({ darDeAltaConFoto: vi.fn() }));

vi.mock('@/lib/api/withRoute', () => ({
  withRoute:
    (configOrHandler: unknown, maybeHandler?: unknown) =>
    (request: Request, _context?: unknown) => {
      const handler = (typeof configOrHandler === 'function' ? configOrHandler : maybeHandler) as (
        req: Request,
        ctx: unknown
      ) => Promise<Response>;
      return handler(request, {
        params: {},
        user: { id: 'admin-1', permissions: { users: { write: true } } }
      });
    }
}));

vi.mock('@/lib/services/UserService', () => ({ UserService: userService }));

vi.mock('@/lib/utils/image-utils', () => ({
  processAndSaveImage: imagenes.processAndSaveImage,
  imagenGuardadaABase64Jpeg: imagenes.imagenGuardadaABase64Jpeg
}));

vi.mock('@/lib/biometric/enrollmentService', () => ({
  darDeAltaConFoto: lector.darDeAltaConFoto
}));

vi.mock('@/lib/utils/logger', () => {
  const mocks = {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    captureException: vi.fn()
  };
  return { logger: mocks, default: mocks };
});

import { POST } from '@/app/api/users/route';

const FOTO_B64 = Buffer.from('foto-jpeg-de-prueba').toString('base64');

const RESULTADO_OK = {
  ok: true,
  mensaje: 'Alta completada en «Puerta principal»: persona creada, cara cargada.',
  detalles: { cara: 'sincronizada' as const, huella: 'sin_datos' as const },
  capturas: { cara: null, huella: null },
  carasEnEquipo: 1
};

const CAMPOS_BASE = {
  run: '12345678-5',
  nick: 'ana',
  name: 'Ana',
  lastName: 'Pérez',
  address: 'Av. Siempreviva 742',
  phone: '912345678',
  maritalStatus: 'Soltero/a',
  afp: 'AFP Capital',
  rol_id: '1'
};

function crearRequest(campos: Record<string, string>, { conFoto = true } = {}) {
  const form = new FormData();
  for (const [clave, valor] of Object.entries(campos)) form.append(clave, valor);
  if (conFoto) {
    form.append(
      'foto',
      new File([new Uint8Array([137, 80, 78, 71])], 'foto.png', { type: 'image/png' })
    );
  }
  return new Request('http://localhost/api/users', { method: 'POST', body: form });
}

/** La ruta real exige contexto (params); con `withRoute` mockeado se ignora. */
const llamarPost = (request: Request) => POST(request, { params: {} });

beforeEach(() => {
  userService.createUser.mockReset().mockResolvedValue({
    user: { id: 'u-1', name: 'Ana', lastName: 'Pérez', biometrico_codigo: null },
    tempPassword: '12345678-5'
  });
  userService.asignarCodigoBiometrico
    .mockReset()
    .mockResolvedValue({ codigo: '1001', generado: true, huella: 0, facial: 1 });
  userService.updateBiometric.mockReset().mockResolvedValue(undefined);
  imagenes.processAndSaveImage.mockReset().mockResolvedValue('user_123.webp');
  imagenes.imagenGuardadaABase64Jpeg.mockReset().mockResolvedValue(FOTO_B64);
  lector.darDeAltaConFoto.mockReset().mockResolvedValue(RESULTADO_OK);
});

describe('POST /api/users — creación sin alta en el lector', () => {
  it('no toca el lector si el formulario no lo pidió', async () => {
    const res = await llamarPost(crearRequest(CAMPOS_BASE));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.id).toBe('u-1');
    expect(body.altaEquipo).toBeUndefined();
    expect(userService.asignarCodigoBiometrico).not.toHaveBeenCalled();
    expect(lector.darDeAltaConFoto).not.toHaveBeenCalled();
    expect(res.headers.get('X-Temp-Password')).toBe('12345678-5');
  });

  it('alta pedida sin equipo elegido: se ignora (no hay a dónde darla)', async () => {
    const res = await llamarPost(
      crearRequest({ ...CAMPOS_BASE, alta_equipo: '1', dispositivo_alta: '   ' })
    );
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.altaEquipo).toBeUndefined();
    expect(lector.darDeAltaConFoto).not.toHaveBeenCalled();
  });
});

describe('POST /api/users — alta automática en el lector', () => {
  const camposAlta = { ...CAMPOS_BASE, alta_equipo: '1', dispositivo_alta: 'dev-1' };

  it('genera el código, usa la foto subida y da de alta en el equipo', async () => {
    const res = await llamarPost(crearRequest(camposAlta));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(userService.asignarCodigoBiometrico).toHaveBeenCalledWith('u-1');
    // La foto recién guardada se convierte a JPEG y se usa como plantilla maestra.
    expect(imagenes.imagenGuardadaABase64Jpeg).toHaveBeenCalledWith('user_123.webp');
    expect(lector.darDeAltaConFoto).toHaveBeenCalledWith(
      'dev-1',
      { usuarioId: 'u-1', nombre: 'Ana Pérez', codigo: '1001' },
      FOTO_B64
    );
    expect(body.altaEquipo).toMatchObject({ ok: true, codigo: '1001', carasEnEquipo: 1 });
    // La cara quedó en el equipo: la ficha queda marcada como facial lista.
    expect(userService.updateBiometric).toHaveBeenCalledWith('u-1', { facial: 1 });
  });

  it('si el equipo está apagado, el usuario se crea igual y se informa el fallo', async () => {
    lector.darDeAltaConFoto.mockRejectedValue(new Error('equipo apagado'));

    const res = await llamarPost(crearRequest(camposAlta));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.altaEquipo.ok).toBe(false);
    expect(body.altaEquipo.mensaje).toContain('equipo apagado');
    expect(userService.updateBiometric).not.toHaveBeenCalled();
  });

  it('sin foto propia: no intenta el alta y explica cómo seguir', async () => {
    imagenes.imagenGuardadaABase64Jpeg.mockResolvedValue(null);

    const res = await llamarPost(crearRequest(camposAlta));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.altaEquipo.ok).toBe(false);
    expect(body.altaEquipo.motivo).toBe('sin_foto');
    expect(body.altaEquipo.mensaje).toContain('foto');
    expect(lector.darDeAltaConFoto).not.toHaveBeenCalled();
    expect(userService.updateBiometric).not.toHaveBeenCalled();
  });

  it('un error generando el código tampoco rompe la creación', async () => {
    userService.asignarCodigoBiometrico.mockRejectedValue(new Error('sin códigos libres'));

    const res = await llamarPost(crearRequest(camposAlta));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.altaEquipo).toMatchObject({ ok: false, mensaje: 'sin códigos libres' });
    expect(lector.darDeAltaConFoto).not.toHaveBeenCalled();
  });

  it('alta con resultado negativo del equipo: se transmite tal cual', async () => {
    lector.darDeAltaConFoto.mockResolvedValue({
      ...RESULTADO_OK,
      ok: false,
      motivo: 'sin_plantilla',
      mensaje: 'No hay ninguna cara ni huella guardada para Ana Pérez.'
    });

    const res = await llamarPost(crearRequest(camposAlta));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.altaEquipo).toMatchObject({
      ok: false,
      motivo: 'sin_plantilla',
      codigo: '1001'
    });
    expect(userService.updateBiometric).not.toHaveBeenCalled();
  });
});
