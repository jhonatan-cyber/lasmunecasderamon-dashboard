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
    id: 'u-garzon',
    username: 'sebas',
    role: 'garzon',
    // withRoute exige la matriz, no el rol: orders.write es el gate real.
    permissions: { orders: { write: true } },
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
          creado_en: '2026-09-28 10:00:00',
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
        fila.aplicado_en = '2026-09-28 10:00:01';
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

const orderService = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock('@/modules/operacion/pedidos/servicio', () => ({ OrderService: orderService }));

import { POST } from '@/app/api/orders/route';
import { IDEMPOTENCY_HEADER } from '@/lib/api/idempotency';

const PEDIDO = {
  codigo: 'ABC12345',
  meseroId: 'u-garzon',
  clienteId: null,
  subtotal: 5000,
  total: 5000,
  propina: 0,
  totalComision: 0,
  detalles: [
    {
      productoId: 'prod-1',
      precio: 5000,
      comision: 0,
      cantidad: 1,
      subtotal: 5000,
      selectedHostesses: []
    }
  ]
};

const CLAVE = 'mm3k1-abc12345-pedido';

const postOrder = (key?: string) =>
  POST(
    new Request('http://localhost/api/orders', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(key ? { [IDEMPOTENCY_HEADER]: key } : {})
      },
      body: JSON.stringify(PEDIDO)
    }),
    { params: Promise.resolve({}) }
  );

describe('POST /api/orders con idempotencia', () => {
  beforeEach(() => {
    syncOperations.filas.clear();
    orderService.create.mockReset();
    orderService.create.mockResolvedValue({ pedido: { id_pedido: 'p-1', codigo: PEDIDO.codigo } });
  });

  it('debe crear el pedido cuando no hay clave de idempotencia', async () => {
    const response = await postOrder();

    expect(response.status).toBe(201);
    expect(orderService.create).toHaveBeenCalledTimes(1);
    expect(syncOperations.filas.size).toBe(0);
  });

  it('debe crear el pedido la primera vez que llega la clave', async () => {
    const response = await postOrder(CLAVE);

    expect(response.status).toBe(201);
    expect(orderService.create).toHaveBeenCalledTimes(1);
    expect(syncOperations.filas.get(CLAVE)?.estado).toBe('aplicada');
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      pedido: { id_pedido: 'p-1' }
    });
  });

  it('no debe duplicar el pedido al reintentar la misma clave', async () => {
    const primera = await postOrder(CLAVE);
    const bodyPrimera = await primera.clone().json();

    const reintento = await postOrder(CLAVE);

    expect(orderService.create).toHaveBeenCalledTimes(1);
    expect(reintento.status).toBe(201);
    expect(reintento.headers.get('x-idempotent-replay')).toBe('1');
    await expect(reintento.json()).resolves.toEqual(bodyPrimera);
  });

  it('debe guardar el rechazo de validación y replicarlo sin re-ejecutar', async () => {
    const invalido = { ...PEDIDO, codigo: '' };
    const request = () =>
      POST(
        new Request('http://localhost/api/orders', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            [IDEMPOTENCY_HEADER]: 'clave-invalida-payload'
          },
          body: JSON.stringify(invalido)
        }),
        { params: Promise.resolve({}) }
      );

    const primera = await request();
    const reintento = await request();

    expect(primera.status).toBe(400);
    expect(reintento.status).toBe(400);
    expect(orderService.create).not.toHaveBeenCalled();
    expect(syncOperations.filas.get('clave-invalida-payload')?.estado).toBe('rechazada');
    await expect(reintento.json()).resolves.toEqual(await primera.clone().json());
  });

  it('debe dejar la operación en revisión si el servicio falla', async () => {
    orderService.create.mockRejectedValueOnce(new Error('se cayó la transacción'));

    // withRoute traduce la excepción a una respuesta de error, no la propaga.
    const fallo = await postOrder('clave-que-falla');

    expect(fallo.ok).toBe(false);
    expect(syncOperations.filas.get('clave-que-falla')?.estado).toBe('fallida');

    const reintento = await postOrder('clave-que-falla');

    expect(reintento.status).toBe(409);
    expect(orderService.create).toHaveBeenCalledTimes(1);
  });
});
