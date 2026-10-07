// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-validation';
});

/**
 * La ruta hace `validated instanceof NextResponse`, así que el mock tiene que
 * ser una clase de verdad (con `json`), no un objeto suelto.
 */
vi.mock('next/server', () => {
  class NextResponse extends Response {
    static json(body: unknown, init?: ResponseInit) {
      const headers = new Headers(init?.headers);
      if (!headers.has('content-type')) headers.set('content-type', 'application/json');
      return new NextResponse(JSON.stringify(body), { ...init, headers });
    }
  }

  return { NextResponse };
});

vi.mock('@/lib/api/date-response', () => ({ normalizeJsonResponseDates: (r: unknown) => r }));

vi.mock('@/lib/auth/auth-app', () => ({
  getAuth: vi.fn().mockResolvedValue({
    id: 'u-admin',
    username: 'admin',
    role: 'Administrador',
    permissions: { finances: { write: true } },
    iat: 0,
    exp: 0
  })
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

/** Tabla `sync_operations` en memoria, con la misma semántica del repositorio real. */
const syncOperations = vi.hoisted(() => ({ filas: new Map<string, Record<string, unknown>>() }));

vi.mock('@/lib/database/sync-operations', () => ({
  SyncOperationRepository: {
    claim: vi.fn(
      async (idCliente: string, input: { endpoint: string; usuarioId?: string | null }) => {
        const existente = syncOperations.filas.get(idCliente);
        if (existente) return { claimed: false, operation: existente };

        const fila = {
          id_cliente: idCliente,
          usuario_id: input.usuarioId ?? null,
          endpoint: input.endpoint,
          estado: 'pendiente',
          respuesta: null as string | null,
          intentos: 1,
          creado_en: '2026-10-06 10:00:00',
          aplicado_en: null as string | null
        };
        syncOperations.filas.set(idCliente, fila);
        return { claimed: true, operation: null };
      }
    ),
    resolve: vi.fn(
      async (idCliente: string, estado: string, response: { status: number; body: unknown }) => {
        const fila = syncOperations.filas.get(idCliente);
        if (!fila) return;
        fila.estado = estado;
        fila.respuesta = JSON.stringify(response);
        fila.aplicado_en = '2026-10-06 10:00:01';
      }
    ),
    fail: vi.fn(async (idCliente: string, message: string) => {
      const fila = syncOperations.filas.get(idCliente);
      if (!fila) return;
      fila.estado = 'fallida';
      fila.respuesta = JSON.stringify({ status: 500, body: { success: false, message } });
    }),
    parseResponse: (operation: { respuesta: string | null }) => {
      if (!operation.respuesta) return null;
      try {
        const parsed = JSON.parse(operation.respuesta);
        return { status: Number(parsed?.status ?? 200), body: parsed?.body ?? {} };
      } catch {
        return null;
      }
    }
  }
}));

const accountService = vi.hoisted(() => ({ cobrar: vi.fn() }));
vi.mock('@/modules/operacion/cuentas/fachada', () => ({ AccountService: accountService }));

import { POST } from '@/app/api/cuentas/[id]/cobrar/route';
import { IDEMPOTENCY_HEADER } from '@/lib/api/idempotency';

const COBRO = { metodoPago: 'efectivo', montoFinal: 176000, propinaFinal: 16000 };

const CLAVE = 'mcp-00000000-0000-4000-8000-000000000001';

const postCobro = (key?: string, cuerpo: unknown = COBRO) =>
  POST(
    new Request('http://localhost/api/cuentas/cuenta-1/cobrar', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(key ? { [IDEMPOTENCY_HEADER]: key } : {})
      },
      body: JSON.stringify(cuerpo)
    }),
    { params: Promise.resolve({ id: 'cuenta-1' }) }
  );

describe('POST /api/cuentas/:id/cobrar con idempotencia', () => {
  beforeEach(() => {
    syncOperations.filas.clear();
    accountService.cobrar.mockReset();
    accountService.cobrar.mockResolvedValue(undefined);
  });

  it('cobra cuando no llega clave de idempotencia', async () => {
    const response = await postCobro();

    expect(response.status).toBe(200);
    expect(accountService.cobrar).toHaveBeenCalledTimes(1);
    expect(syncOperations.filas.size).toBe(0);
  });

  it('cobra la primera vez que llega la clave y guarda la operación', async () => {
    const response = await postCobro(CLAVE);

    expect(response.status).toBe(200);
    expect(accountService.cobrar).toHaveBeenCalledTimes(1);
    expect(syncOperations.filas.get(CLAVE)?.estado).toBe('aplicada');
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      message: 'Cuenta cobrada exitosamente'
    });
  });

  it('no duplica el cobro al reintentar la misma clave', async () => {
    const primera = await postCobro(CLAVE);
    const bodyPrimera = await primera.clone().json();

    const reintento = await postCobro(CLAVE);

    expect(accountService.cobrar).toHaveBeenCalledTimes(1);
    expect(reintento.status).toBe(200);
    expect(reintento.headers.get('x-idempotent-replay')).toBe('1');
    await expect(reintento.json()).resolves.toEqual(bodyPrimera);
  });

  it('normaliza el cuerpo y lo pasa al servicio con el usuario autenticado', async () => {
    await postCobro(CLAVE, { metodo_pago: 'tarjeta', total_cobrado: 90000, propina: 5000 });

    expect(accountService.cobrar).toHaveBeenCalledWith(
      'cuenta-1',
      {
        metodoPago: 'tarjeta',
        tipoPago: 'tarjeta',
        montoFinal: 90000,
        propinaFinal: 5000,
        habitacion_id: null
      },
      'u-admin'
    );
  });

  it('deja la operación en revisión si el cobro falla y no la reintenta', async () => {
    accountService.cobrar.mockRejectedValueOnce(new Error('cuenta ya cobrada'));

    // withRoute traduce la excepción a una respuesta de error, no la propaga.
    const fallo = await postCobro('clave-que-falla');

    expect(fallo.ok).toBe(false);
    expect(syncOperations.filas.get('clave-que-falla')?.estado).toBe('fallida');

    const reintento = await postCobro('clave-que-falla');

    expect(reintento.status).toBe(409);
    expect(accountService.cobrar).toHaveBeenCalledTimes(1);
  });
});
