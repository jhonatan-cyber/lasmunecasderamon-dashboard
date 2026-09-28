// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-validation';
});

/**
 * Las rutas hacen `validated instanceof NextResponse`, así que el mock tiene que
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
    id: 'u-cajero',
    username: 'pepe',
    role: 'cajero',
    // withRoute exige la matriz, no el rol: sales.write / finances.write son el gate real.
    permissions: { sales: { write: true }, finances: { write: true } },
    iat: 0,
    exp: 0
  })
}));

vi.mock('@/lib/services/AuditService', () => ({
  AuditService: { log: vi.fn().mockResolvedValue(undefined) }
}));

vi.mock('@/lib/services/ErrorLogService', () => ({
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

vi.mock('@/lib/repositories/SyncOperationRepository', () => ({
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

const saleService = vi.hoisted(() => ({ createSale: vi.fn() }));
vi.mock('@/lib/services/SaleService', () => ({ SaleService: saleService }));

const accountService = vi.hoisted(() => ({ updateCuenta: vi.fn(), cobrarConVenta: vi.fn() }));
vi.mock('@/lib/services/AccountService', () => ({ AccountService: accountService }));

import { POST as postSale } from '@/app/api/sales/route';
import { PUT as putCuenta } from '@/app/api/cuentas/[id]/route';
import { POST as postCobroConVenta } from '@/app/api/cuentas/[id]/cobrar-con-venta/route';
import { IDEMPOTENCY_HEADER } from '@/lib/api/idempotency';

const VENTA = {
  detalles: [{ producto_id: 'prod-1', cantidad: 2, precio: 5000, sub_total: 10000, comision: 0 }],
  metodo_pago: 'efectivo',
  sub_total: 10000,
  total: 10000,
  propina: 0,
  device_date: '2026-09-28T10:00:00.000Z'
};

const CONSUMOS = {
  detalles: [{ producto_id: 'prod-2', precio: 3000, cantidad: 1, sub_total: 3000, comision: 0 }],
  usuarios: [],
  device_date: '2026-09-28T10:00:00.000Z'
};

const postVenta = (key?: string) =>
  postSale(
    new Request('http://localhost/api/sales', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(key ? { [IDEMPOTENCY_HEADER]: key } : {})
      },
      body: JSON.stringify(VENTA)
    }),
    { params: Promise.resolve({}) }
  );

const putConsumos = (key?: string, id = 'c-1') =>
  putCuenta(
    new Request(`http://localhost/api/cuentas/${id}`, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        ...(key ? { [IDEMPOTENCY_HEADER]: key } : {})
      },
      body: JSON.stringify(CONSUMOS)
    }),
    { params: Promise.resolve({ id }) }
  );

describe('POST /api/sales con idempotencia', () => {
  beforeEach(() => {
    syncOperations.filas.clear();
    saleService.createSale.mockReset();
    saleService.createSale.mockResolvedValue({ id_venta: 'v-1' });
  });

  it('debe cobrar la venta la primera vez que llega la clave', async () => {
    const response = await postVenta('sale-key-000001');

    expect(response.status).toBe(201);
    expect(saleService.createSale).toHaveBeenCalledTimes(1);
    expect(syncOperations.filas.get('sale-key-000001')?.estado).toBe('aplicada');
  });

  it('no debe cobrar dos veces al reintentar la misma venta', async () => {
    const primera = await postVenta('sale-key-000002');
    const bodyPrimera = await primera.clone().json();

    const reintento = await postVenta('sale-key-000002');

    expect(saleService.createSale).toHaveBeenCalledTimes(1);
    expect(reintento.status).toBe(201);
    expect(reintento.headers.get('x-idempotent-replay')).toBe('1');
    await expect(reintento.json()).resolves.toEqual(bodyPrimera);
  });

  it('debe dejar en revisión la venta si el servicio falla a medias', async () => {
    saleService.createSale.mockRejectedValueOnce(new Error('se cayó la transacción'));

    const fallo = await postVenta('sale-key-000003');
    expect(fallo.ok).toBe(false);
    expect(syncOperations.filas.get('sale-key-000003')?.estado).toBe('fallida');

    const reintento = await postVenta('sale-key-000003');

    expect(reintento.status).toBe(409);
    expect(saleService.createSale).toHaveBeenCalledTimes(1);
  });
});

const COBRO_CON_VENTA = {
  metodo_pago: 'efectivo',
  total_cobrado: 12000,
  propina: 1200,
  habitacion_id: null,
  device_date: '2026-09-28T10:00:00.000Z'
};

const postCobro = (key?: string, id = 'c-1') =>
  postCobroConVenta(
    new Request(`http://localhost/api/cuentas/${id}/cobrar-con-venta`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(key ? { [IDEMPOTENCY_HEADER]: key } : {})
      },
      body: JSON.stringify(COBRO_CON_VENTA)
    }),
    { params: Promise.resolve({ id }) }
  );

describe('POST /api/cuentas/[id]/cobrar-con-venta con idempotencia', () => {
  beforeEach(() => {
    syncOperations.filas.clear();
    accountService.cobrarConVenta.mockReset();
    accountService.cobrarConVenta.mockResolvedValue({ id_cuenta: 'c-1', estado: 0 });
  });

  it('deja el cobro y la venta en UNA sola llamada transaccional', async () => {
    const response = await postCobro('checkout-key-0001');

    expect(response.status).toBe(200);
    expect(accountService.cobrarConVenta).toHaveBeenCalledTimes(1);
    expect(accountService.cobrarConVenta).toHaveBeenCalledWith(
      'c-1',
      expect.objectContaining({
        montoFinal: 12000,
        propinaFinal: 1200,
        metodoPago: 'efectivo',
        device_date: COBRO_CON_VENTA.device_date
      }),
      'u-cajero'
    );
    expect(syncOperations.filas.get('checkout-key-0001')?.endpoint).toBe(
      'cuentas.cobrar_con_venta'
    );
  });

  it('no cobra dos veces al reintentar: replica la respuesta original', async () => {
    const primera = await postCobro('checkout-key-0002');
    const bodyPrimera = await primera.clone().json();

    const reintento = await postCobro('checkout-key-0002');

    expect(accountService.cobrarConVenta).toHaveBeenCalledTimes(1);
    expect(reintento.status).toBe(200);
    expect(reintento.headers.get('x-idempotent-replay')).toBe('1');
    await expect(reintento.json()).resolves.toEqual(bodyPrimera);
  });

  it('deja en revisión el cobro si la transacción se cae a mitad', async () => {
    accountService.cobrarConVenta.mockRejectedValueOnce(new Error('se cortó la transacción'));

    const fallo = await postCobro('checkout-key-0003');
    expect(fallo.ok).toBe(false);
    expect(syncOperations.filas.get('checkout-key-0003')?.estado).toBe('fallida');

    const reintento = await postCobro('checkout-key-0003');

    // 409: la operación pudo aplicarse, así que reintentar en automático es
    // justo lo que duplicaría un cobro.
    expect(reintento.status).toBe(409);
    expect(accountService.cobrarConVenta).toHaveBeenCalledTimes(1);
  });
});

describe('PUT /api/cuentas/[id] con idempotencia', () => {
  beforeEach(() => {
    syncOperations.filas.clear();
    accountService.updateCuenta.mockReset();
    accountService.updateCuenta.mockResolvedValue({ id_cuenta: 'c-1', total: 13000 });
  });

  it('debe agregar los consumos la primera vez', async () => {
    const response = await putConsumos('consumos-key-0001');

    expect(response.status).toBe(200);
    expect(accountService.updateCuenta).toHaveBeenCalledWith(
      'c-1',
      expect.objectContaining({ device_date: CONSUMOS.device_date }),
      'u-cajero'
    );
    expect(syncOperations.filas.get('consumos-key-0001')?.endpoint).toBe('cuentas.consumos');
  });

  it('no debe duplicar los consumos al reintentar (era el riesgo real)', async () => {
    await putConsumos('consumos-key-0002');
    const reintento = await putConsumos('consumos-key-0002');

    expect(accountService.updateCuenta).toHaveBeenCalledTimes(1);
    expect(reintento.headers.get('x-idempotent-replay')).toBe('1');
    expect(reintento.status).toBe(200);
  });

  it('debe aislar cuentas distintas con la misma clave en momentos distintos', async () => {
    await putConsumos('consumos-key-0003', 'c-1');
    await putConsumos('consumos-key-0004', 'c-2');

    expect(accountService.updateCuenta).toHaveBeenCalledTimes(2);
  });

  it('debe rechazar y recordar un body inválido sin tocar la cuenta', async () => {
    accountService.updateCuenta.mockRejectedValueOnce(new Error('Cuenta no encontrada'));

    const fallo = await putConsumos('consumos-key-0005');
    expect(fallo.ok).toBe(false);

    const reintento = await putConsumos('consumos-key-0005');
    expect(reintento.status).toBe(409);
    expect(accountService.updateCuenta).toHaveBeenCalledTimes(1);
  });
});
