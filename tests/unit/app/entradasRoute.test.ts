// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Adaptador HTTP de entradas.
 *
 * Se mockean `withRoute` (auth/auditoría), la idempotencia, el módulo y la venta:
 * acá se prueba la orquestación de la ruta —partes del payload, clave de
 * idempotencia y mapeo de errores de dominio—, no la lógica del módulo.
 */

const entradas = vi.hoisted(() => ({
  listarEntradas: vi.fn(),
  registrarEntrada: vi.fn()
}));
const idempotencia = vi.hoisted(() => ({ runIdempotent: vi.fn() }));
const ventas = vi.hoisted(() => ({ createSale: vi.fn() }));

vi.mock('@/lib/api/withRoute', () => ({
  withRoute: (configOrHandler: unknown, maybeHandler?: unknown) => {
    const handler = (typeof configOrHandler === 'function' ? configOrHandler : maybeHandler) as (
      request: Request,
      contexto: { user: { id: string } }
    ) => Promise<Response>;
    return (request: Request) => handler(request, { user: { id: 'user-1' } });
  }
}));

vi.mock('@/lib/api/idempotency', () => ({ runIdempotent: idempotencia.runIdempotent }));
vi.mock('@/modules/entradas', () => entradas);
vi.mock('@/workflows/ventas', () => ({ SaleService: ventas }));

import { POST } from '@/app/api/entradas/route';
import { ValidationError } from '@/lib/errors/errors';

/** `withRoute` tipa el contexto de Next; acá la ruta sólo usa el request. */
const ejecutarPost = POST as unknown as (request: Request) => Promise<Response>;

function pedido(body: Record<string, unknown>) {
  return new Request('http://localhost/api/entradas', {
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
  entradas.registrarEntrada.mockResolvedValue({ id: 'e1', ids: ['e1'], caja_id: 'caja-1' });
});

describe('idempotencia', () => {
  it('envuelve el alta con la operación y el usuario', async () => {
    await ejecutarPost(
      pedido({
        monto_entrada: 10000,
        partes: [{ monto_bebida_adicional: 0 }],
        fecha: '2026-10-19',
        hora: '20:30'
      })
    );

    expect(idempotencia.runIdempotent).toHaveBeenCalledWith(
      expect.any(Request),
      { endpoint: 'entradas.create', usuarioId: 'user-1' },
      expect.any(Function)
    );
  });
});

describe('payload legacy', () => {
  it('expande cantidad_entradas a una parte por entrada', async () => {
    await ejecutarPost(
      pedido({
        monto_entrada: 30000,
        cantidad_entradas: 3,
        monto_bebida_adicional: 5000,
        metodo_pago: 'efectivo',
        bebida_cortesia_presentacion_id: 'bebida-1',
        fecha: '2026-10-19',
        hora: '21:15'
      })
    );

    const [input] = entradas.registrarEntrada.mock.calls[0];
    expect(input.partes).toHaveLength(3);
    expect(
      input.partes.map((parte: { montoBebidaAdicional: number }) => parte.montoBebidaAdicional)
    ).toEqual([5000, 0, 0]);
    expect(input.partes[0].bebidaCortesiaPresentacionId).toBe('bebida-1');
    expect(input.productosCortesia).toEqual([]);
  });

  it('respeta partes cuando el payload nuevo las envía', async () => {
    await ejecutarPost(
      pedido({
        monto_entrada: 10000,
        cantidad_entradas: 3,
        partes: [{ monto_bebida_adicional: 0 }],
        fecha: '2026-10-19',
        hora: '20:30'
      })
    );

    const [input] = entradas.registrarEntrada.mock.calls[0];
    expect(input.partes).toHaveLength(1);
  });
});

describe('respuesta', () => {
  it('devuelve el resultado del módulo', async () => {
    const response = await ejecutarPost(
      pedido({
        monto_entrada: 10000,
        partes: [{ monto_bebida_adicional: 0 }],
        fecha: '2026-10-19',
        hora: '20:30'
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: { id: 'e1', ids: ['e1'], caja_id: 'caja-1' }
    });
  });

  it('traduce un error de dominio a 400 con su mensaje', async () => {
    entradas.registrarEntrada.mockRejectedValue(
      new ValidationError('El precio de la entrada no coincide: son 10000 por persona')
    );

    const response = await ejecutarPost(
      pedido({
        monto_entrada: 1,
        partes: [{ monto_bebida_adicional: 0 }],
        fecha: '2026-10-19',
        hora: '20:30'
      })
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toMatch(/precio de la entrada no coincide/);
  });
});
