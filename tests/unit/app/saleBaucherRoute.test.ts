// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Lector de la foto del baucher de una venta con transferencia.
 *
 * Se mockea `withRoute` (auth/auditoría), el acceso a la venta y el sistema de
 * archivos: acá se prueba que la ruta sirva el archivo guardado, que no entregue
 * nada si la venta no tiene baucher y que un nombre de archivo manipulado no
 * salga de `public/img/sales`.
 */

const sales = vi.hoisted(() => ({ getBaucherFoto: vi.fn() }));
const mocks = vi.hoisted(() => ({ readFile: vi.fn() }));
vi.mock('@/workflows/ventas', () => ({ SaleService: sales }));

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
        params: context?.params ?? Promise.resolve({ id: 'venta-1' })
      });
    }
}));

vi.mock('@/lib/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }
}));

import { GET } from '@/app/api/sales/[id]/baucher/route';

type Handler = (
  request: Request,
  context?: { params?: Promise<{ id: string }> }
) => Promise<Response>;

const get = (id = 'venta-1') =>
  (GET as unknown as Handler)(new Request(`http://localhost/api/sales/${id}/baucher`), {
    params: Promise.resolve({ id })
  });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/sales/[id]/baucher', () => {
  it('sirve la foto guardada con su tipo de contenido', async () => {
    sales.getBaucherFoto.mockResolvedValue('sale_1718_abc.webp');
    mocks.readFile.mockResolvedValue(Buffer.from('imagen'));

    const response = await get();

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/webp');
    // La foto es evidencia de pago: no se cachea en un shared cache.
    expect(response.headers.get('Cache-Control')).toContain('private');
    expect(sales.getBaucherFoto).toHaveBeenCalledWith('venta-1');
    expect(mocks.readFile.mock.calls[0][0]).toMatch(
      /[\\\/]public[\\\/]img[\\\/]sales[\\\/]sale_1718_abc\.webp$/
    );
  });

  it('responde 404 cuando la venta no tiene foto de baucher', async () => {
    sales.getBaucherFoto.mockResolvedValue(null);

    const response = await get();

    expect(response.status).toBe(404);
    expect(fs.readFile).not.toHaveBeenCalled();
  });

  it('rechaza un nombre de archivo que escape del directorio de bauchers', async () => {
    sales.getBaucherFoto.mockResolvedValue('../../etc/passwd');

    const response = await get();

    expect(response.status).toBe(404);
    expect(fs.readFile).not.toHaveBeenCalled();
  });
});
