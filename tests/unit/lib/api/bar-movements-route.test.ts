// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const buscar = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api/withRoute', () => ({
  withPublicRoute: (handler: unknown) => handler
}));

vi.mock('@/modules/inventario', () => ({
  ProductService: { buscarMovimientosRecientes: buscar }
}));

import { GET } from '@/app/api/bar/movements/route';

const call = (query = '') =>
  (
    GET as unknown as (
      request: Request,
      context: { params: Record<string, never> }
    ) => Promise<Response>
  )(new Request(`http://localhost/api/bar/movements${query}`), { params: {} });

beforeEach(() => {
  buscar.mockReset();
  buscar.mockResolvedValue({
    movimientos: [{ id: 'mov-1' }],
    total: 137,
    pagina: 2,
    paginas: 3,
    limite: 50
  });
});

describe('GET /api/bar/movements', () => {
  it('entrega la página pedida con el meta para paginar', async () => {
    const response = await call('?page=2&limit=50&desde=2026-10-01&hasta=2026-10-15');

    expect(response.status).toBe(200);
    expect(buscar).toHaveBeenCalledWith({
      desde: '2026-10-01',
      hasta: '2026-10-15',
      page: 2,
      limit: 50
    });
    expect(await response.json()).toEqual({
      success: true,
      data: [{ id: 'mov-1' }],
      meta: { total: 137, pagina: 2, paginas: 3, limite: 50 }
    });
  });

  it('omite los parámetros vacíos y usa los valores por defecto', async () => {
    await call('?tipo=&q=%20&page=');

    expect(buscar).toHaveBeenCalledWith({});
  });

  it('pasa el tipo de movimiento y el texto de búsqueda', async () => {
    await call('?tipo=colacion&q=whisky');

    expect(buscar).toHaveBeenCalledWith({ tipo: 'colacion', q: 'whisky' });
  });

  it.each([
    ['?desde=01-10-2026', /fecha inicial.*AAAA-MM-DD/i],
    ['?hasta=2026/10/15', /fecha final.*AAAA-MM-DD/i],
    ['?page=0', /página debe ser 1/i],
    ['?page=abc', /página debe ser un número entero/i],
    ['?limit=0', /límite debe estar entre 1 y 500/i],
    ['?limit=501', /límite debe estar entre 1 y 500/i],
    ['?tipo=Venta Total', /tipo de movimiento inválido/i],
    ['?q=' + 'x'.repeat(101), /no puede superar 100 caracteres/i]
  ])('rechaza parámetros inválidos: %s', async (query, mensaje) => {
    await expect(call(query)).rejects.toThrow(mensaje);
    expect(buscar).not.toHaveBeenCalled();
  });
});
