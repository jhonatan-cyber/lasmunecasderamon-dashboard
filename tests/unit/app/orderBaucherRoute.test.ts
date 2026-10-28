// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Lector de la foto del baucher de un pedido con transferencia.
 *
 * Se mockea `withRoute` (auth/auditoría), la consulta del pedido y el sistema de
 * archivos: acá se prueba que la ruta sirva el archivo guardado, que no entregue
 * nada si el pedido no tiene baucher y que un nombre de archivo manipulado no
 * salga de `public/img/orders`.
 */

const orders = vi.hoisted(() => ({ getBaucherFoto: vi.fn() }));
const mocks = vi.hoisted(() => ({ readFile: vi.fn() }));
vi.mock('@/modules/operacion', () => ({ OrderService: orders }));

vi.mock('fs/promises', async importOriginal => {
  const actual = await importOriginal<typeof import('fs/promises')>();
  // La ruta hace `import fs from 'fs/promises'`: hay que pisar `default`, si no
  // el spread conserva la función real y el test termina leyendo el disco.
  return {
    ...actual,
    readFile: mocks.readFile,
    default: { ...actual, readFile: mocks.readFile }
  };
});

import fs from 'fs/promises';

vi.mock('@/lib/api/withRoute', () => ({
  withRoute:
    (configOrHandler: unknown, maybeHandler?: unknown) =>
    (request: Request, context?: { params?: Promise<{ id: string }> }) => {
      const handler = (typeof configOrHandler === 'function' ? configOrHandler : maybeHandler) as (
        req: Request,
        ctx: unknown
      ) => Promise<Response>;
      return handler(request, {
        user: { id: 'u-cajero' },
        params: context?.params ?? Promise.resolve({ id: 'pedido-1' })
      });
    }
}));

vi.mock('@/lib/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }
}));

import { GET } from '@/app/api/orders/[id]/baucher/route';

type Handler = (
  request: Request,
  context?: { params?: Promise<{ id: string }> }
) => Promise<Response>;

const get = (id = 'pedido-1') =>
  (GET as unknown as Handler)(new Request(`http://localhost/api/orders/${id}/baucher`), {
    params: Promise.resolve({ id })
  });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/orders/[id]/baucher', () => {
  it('sirve la foto guardada con su tipo de contenido', async () => {
    orders.getBaucherFoto.mockResolvedValue('order_1718_abc.webp');
    mocks.readFile.mockResolvedValue(Buffer.from('imagen'));

    const response = await get();

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/webp');
    // La foto es evidencia de pago: no se cachea en un shared cache.
    expect(response.headers.get('Cache-Control')).toContain('private');
    expect(orders.getBaucherFoto).toHaveBeenCalledWith('pedido-1');
    expect(mocks.readFile.mock.calls[0][0]).toMatch(
      /[\\\/]public[\\\/]img[\\\/]orders[\\\/]order_1718_abc\.webp$/
    );
  });

  it('responde 404 cuando el pedido no tiene foto de baucher', async () => {
    orders.getBaucherFoto.mockResolvedValue(null);

    const response = await get();

    expect(response.status).toBe(404);
    expect(fs.readFile).not.toHaveBeenCalled();
  });

  it('responde 404 si el pedido no existe', async () => {
    orders.getBaucherFoto.mockResolvedValue(null);

    const response = await get();

    expect(response.status).toBe(404);
    expect(fs.readFile).not.toHaveBeenCalled();
  });

  it('rechaza un nombre de archivo que escape del directorio de bauchers', async () => {
    orders.getBaucherFoto.mockResolvedValue('../../etc/passwd');

    const response = await get();

    expect(response.status).toBe(404);
    expect(fs.readFile).not.toHaveBeenCalled();
  });

  it('devuelve 404 si el archivo ya no está en disco', async () => {
    orders.getBaucherFoto.mockResolvedValue('order_1718_abc.webp');
    mocks.readFile.mockRejectedValue(Object.assign(new Error('falta'), { code: 'ENOENT' }));

    const response = await get();

    expect(response.status).toBe(404);
  });

  it('responde 404 si la extensión no está soportada, sin siquiera leerlo', async () => {
    orders.getBaucherFoto.mockResolvedValue('order_1718.svg');

    const response = await get();

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.message).toMatch(/Formato de imagen no soportado/);
    expect(fs.readFile).not.toHaveBeenCalled();
  });

  it('distingue un disco que falla de un archivo que no existe', async () => {
    // Un EIO no es "la foto no existe": no se puede responder 404 y ocultar el fallo.
    orders.getBaucherFoto.mockResolvedValue('order_1718_abc.webp');
    mocks.readFile.mockRejectedValue(Object.assign(new Error('disco roto'), { code: 'EIO' }));

    const response = await get();

    expect(response.status).toBe(500);
  });

  it('responde 404 cuando el archivo fue borrado a mano desde disco', async () => {
    // El módulo está mockeado: "borrado a mano" es el ENOENT que devuelve el
    // disco al leer el archivo que la fila del pedido todavía referencia.
    // Antes tocaba public/ de verdad, dejando archivos *_tmp.webp en el repo.
    orders.getBaucherFoto.mockResolvedValue('order_1718_abc.webp');
    mocks.readFile.mockRejectedValue(Object.assign(new Error('falta'), { code: 'ENOENT' }));

    const response = await get();

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.message).toMatch(/no tiene foto de baucher/);
  });
});
