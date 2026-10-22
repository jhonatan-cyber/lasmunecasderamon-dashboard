// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/withRoute', () => ({
  withRoute: (_config: unknown, handler: unknown) => handler
}));

const registrarColacion = vi.hoisted(() => vi.fn());
vi.mock('@/modules/colaciones', () => ({
  registrarColacion,
  listarColaciones: vi.fn()
}));

const warn = vi.hoisted(() => vi.fn());
vi.mock('@/lib/utils/logger', () => ({
  default: {
    warn,
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    captureException: vi.fn()
  }
}));

import { POST } from '@/app/api/meals/route';

/**
 * Los ml y el nombre de la colación los decide el servidor. La ruta no le
 * pasa al módulo lo que declara el cliente: lo que se registró y se descontó
 * del bar sale de la configuración de la bebida. La respuesta devuelve el
 * valor real y, si el cliente había declarado otro, se avisa.
 */

const call = (body: unknown) =>
  (
    POST as unknown as (
      request: Request,
      context: { params: Record<string, never>; user: { id: string } }
    ) => Promise<Response>
  )(
    new Request('http://localhost/api/meals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }),
    { params: {}, user: { id: 'u-1' } }
  );

beforeEach(() => {
  vi.clearAllMocks();
  registrarColacion.mockResolvedValue({
    id: 'col-1',
    caja_id: 'c1',
    fecha: '2025-01-01',
    ml_bebida: 120,
    nombre_bebida: 'Whisky 750 ml'
  });
});

describe('POST /api/meals', () => {
  it('no le pasa al módulo los ml que declara el cliente', async () => {
    await call({
      usuario_id: 'w-1',
      presentacion_id: 'p-1',
      ml_bebida: 9999,
      nombre_bebida: 'lo que sea'
    });

    expect(registrarColacion).toHaveBeenCalledTimes(1);
    const [input] = registrarColacion.mock.calls[0];
    expect(input).not.toHaveProperty('mlBebida');
    expect(input).not.toHaveProperty('nombreBebida');
  });

  it('devuelve los ml y el nombre que quedaron registrados', async () => {
    const response = await call({
      usuario_id: 'w-1',
      presentacion_id: 'p-1',
      ml_bebida: 9999
    });

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toEqual({
      success: true,
      data: {
        id: 'col-1',
        caja_id: 'c1',
        fecha: '2025-01-01',
        ml_bebida: 120,
        nombre_bebida: 'Whisky 750 ml'
      }
    });
  });

  it('avisa cuando los ml del cliente no coinciden con los del servidor', async () => {
    await call({ usuario_id: 'w-1', presentacion_id: 'p-1', ml_bebida: 9999 });

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/ml distintos/);
    expect(warn.mock.calls[0][1]).toMatchObject({
      ml_declarado: 9999,
      ml_registrado: 120
    });
  });

  it('no avisa cuando los ml del cliente coinciden', async () => {
    await call({ usuario_id: 'w-1', presentacion_id: 'p-1', ml_bebida: 120 });

    expect(warn).not.toHaveBeenCalled();
  });

  it('no avisa cuando el cliente no manda ml', async () => {
    await call({ usuario_id: 'w-1', presentacion_id: 'p-1' });

    expect(warn).not.toHaveBeenCalled();
  });
});
