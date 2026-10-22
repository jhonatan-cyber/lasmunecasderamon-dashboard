// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Adaptadores HTTP de entradas.
 *
 * Se mockean `withRoute` (auth/auditoría), la idempotencia, el módulo y la venta:
 * acá se prueba la orquestación de las rutas —payload de la puerta, clave de
 * idempotencia, entrega con `SaleService` y mapeo de errores—, no la lógica del
 * módulo.
 */

const entradas = vi.hoisted(() => ({
  listarEntradas: vi.fn(),
  listarPendientes: vi.fn(),
  registrarEntrada: vi.fn(),
  entregarEntrada: vi.fn(),
  anularEntrada: vi.fn()
}));
const idempotencia = vi.hoisted(() => ({ runIdempotent: vi.fn() }));
const ventas = vi.hoisted(() => ({ createSale: vi.fn() }));

vi.mock('@/lib/api/withRoute', () => ({
  withRoute: (configOrHandler: unknown, maybeHandler?: unknown) => {
    const handler = (typeof configOrHandler === 'function' ? configOrHandler : maybeHandler) as (
      request: Request,
      contexto: unknown
    ) => Promise<Response>;
    return (request: Request) =>
      handler(request, {
        user: { id: 'user-1' },
        params: Promise.resolve({ id: 'e1' })
      });
  }
}));

vi.mock('@/lib/api/idempotency', () => ({ runIdempotent: idempotencia.runIdempotent }));
vi.mock('@/modules/entradas', () => entradas);
vi.mock('@/workflows/ventas', () => ({ SaleService: ventas }));

import { GET, POST } from '@/app/api/tickets/route';
import { GET as GET_PENDIENTES } from '@/app/api/tickets/pendientes/route';
import { POST as POST_ENTREGAR } from '@/app/api/tickets/[id]/entregar/route';
import { POST as POST_ANULAR } from '@/app/api/tickets/[id]/anular/route';
import { ValidationError } from '@/lib/errors/errors';

type Handler = (request: Request) => Promise<Response>;

function pedido(body: Record<string, unknown>, url = 'http://localhost/api/tickets') {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  idempotencia.runIdempotent.mockImplementation(
    async (_request: Request, _config: unknown, handler: () => Promise<Response>) => handler()
  );
  entradas.registrarEntrada.mockResolvedValue({ id: 'e1', ids: ['e1'], monto_total: 10000 });
  entradas.listarPendientes.mockResolvedValue([]);
  entradas.entregarEntrada.mockResolvedValue({ tipo: 'cortesia', montoCobrarBarra: 0 });
  entradas.anularEntrada.mockResolvedValue({ entradaId: 'e1', monto: 10000 });
});

describe('registro en la puerta', () => {
  it('envuelve el alta con la operación y el usuario', async () => {
    await (POST as unknown as Handler)(
      pedido({ cantidad_entradas: 1, fecha: '2026-10-19', hora: '20:30' })
    );

    expect(idempotencia.runIdempotent).toHaveBeenCalledWith(
      expect.any(Request),
      { endpoint: 'entradas.create', usuarioId: 'user-1' },
      expect.any(Function)
    );
  });

  it('manda sólo la intención de la puerta: personas, método, fecha y hora', async () => {
    await (POST as unknown as Handler)(
      pedido({
        cliente_nombre: 'Ana',
        cantidad_entradas: 3,
        metodo_pago: 'tarjeta',
        fecha: '2026-10-19',
        hora: '21:15'
      })
    );

    const [input] = entradas.registrarEntrada.mock.calls[0];
    expect(input).toEqual({
      clienteNombre: 'Ana',
      montoEntrada: undefined,
      cantidadEntradas: 3,
      metodoPago: 'tarjeta',
      fecha: '2026-10-19',
      hora: '21:15',
      registradoPor: 'user-1'
    });
  });

  it('valida monto_entrada cuando viene en el payload', async () => {
    await (POST as unknown as Handler)(
      pedido({ cantidad_entradas: 2, monto_entrada: 20000, fecha: '2026-10-19', hora: '20:30' })
    );

    const [input] = entradas.registrarEntrada.mock.calls[0];
    expect(input.montoEntrada).toBe(20000);
  });

  it('traduce un error de dominio a 400 con su mensaje', async () => {
    entradas.registrarEntrada.mockRejectedValue(
      new ValidationError('El precio de la entrada no coincide: son 10000 por persona')
    );

    const response = await (POST as unknown as Handler)(
      pedido({ cantidad_entradas: 1, fecha: '2026-10-19', hora: '20:30' })
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toMatch(/precio de la entrada no coincide/);
  });
});

describe('listados', () => {
  it('rechaza una fecha con formato inválido', async () => {
    await expect(
      (GET as unknown as Handler)(new Request('http://localhost/api/tickets?fecha=19-10-2026'))
    ).rejects.toThrow(/AAAA-MM-DD/);
  });

  it('devuelve la cola de pendientes del bar', async () => {
    const response = await (GET_PENDIENTES as unknown as Handler)(
      new Request('http://localhost/api/tickets/pendientes?fecha=2026-10-19')
    );

    expect(entradas.listarPendientes).toHaveBeenCalledWith('2026-10-19');
    await expect(response.json()).resolves.toEqual({ success: true, data: [] });
  });
});

describe('entrega en la barra', () => {
  it('registra la venta del adicional con SaleService y devuelve su id', async () => {
    ventas.createSale.mockResolvedValue({ id: 'venta-1' });
    entradas.entregarEntrada.mockImplementation(async (_input, onVenta) => {
      const creada = await onVenta(
        {
          totalVenta: 16000,
          metodoPago: 'efectivo',
          usuarioId: 'user-1',
          entradaId: 'e1',
          detalles: [{ precio: 16000 }]
        },
        { id: 'unidad-1' },
        () => undefined
      );
      return { tipo: 'upgrade', ventaId: creada?.ventaId };
    });

    const response = await (POST_ENTREGAR as unknown as Handler)(
      pedido({ presentacion_id: 'pres-1' }, 'http://localhost/api/tickets/e1/entregar')
    );

    const [input] = entradas.entregarEntrada.mock.calls[0];
    expect(input).toEqual({
      entradaId: 'e1',
      presentacionId: 'pres-1',
      acompanamientoPresentacionId: null,
      usuarioId: 'user-1'
    });
    const [venta] = ventas.createSale.mock.calls[0];
    expect(venta).toMatchObject({ total: 16000, sub_total: 16000, metodo_pago: 'efectivo' });
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: { tipo: 'upgrade', ventaId: 'venta-1' }
    });
  });

  it('exige la presentación a entregar', async () => {
    entradas.entregarEntrada.mockRejectedValue(
      new ValidationError('Selecciona la bebida a entregar')
    );

    const response = await (POST_ENTREGAR as unknown as Handler)(
      pedido({}, 'http://localhost/api/tickets/e1/entregar')
    );

    expect(response.status).toBe(400);
  });
});

describe('anulación', () => {
  it('anula la entrada con el usuario de la sesión', async () => {
    const response = await (POST_ANULAR as unknown as Handler)(
      pedido({}, 'http://localhost/api/tickets/e1/anular')
    );

    expect(entradas.anularEntrada).toHaveBeenCalledWith({ entradaId: 'e1', usuarioId: 'user-1' });
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: { entradaId: 'e1', monto: 10000 }
    });
  });
});
