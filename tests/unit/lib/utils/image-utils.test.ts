import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/utils/logger', () => {
  const mocks = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
  return { logger: mocks, default: mocks };
});

// sharp escribe en disco: se reemplaza para poder asertar qué bytes llegaron sin dejar
// archivos sueltos en public/img ni pagar el coste de codificar en cada test.
const sharpMock = vi.hoisted(() => {
  const chain: Record<string, any> = { input: null };
  chain.resize = vi.fn(() => chain);
  chain.webp = vi.fn(() => chain);
  chain.toFile = vi.fn(async () => undefined);
  return chain;
});

vi.mock('sharp', () => ({
  default: vi.fn((input: Buffer) => {
    sharpMock.input = input;
    return sharpMock;
  })
}));

import logger from '@/lib/utils/logger';
import { BusinessError } from '@/lib/errors/errors';
import {
  IMAGE_FETCH_TIMEOUT_MS,
  MAX_IMAGE_BYTES,
  processAndSaveImage
} from '@/lib/utils/image-utils';

type FakeResponseOptions = {
  ok?: boolean;
  status?: number;
  contentType?: string | null;
  contentLength?: number | null;
  chunks?: Uint8Array[];
};

/**
 * Response mínimo para el camino de descarga: estado, cabeceras y lector de un solo
 * uso. Devuelve el lector para poder comprobar si el cuerpo llegó a leerse.
 */
function fakeResponse({
  ok = true,
  status = 200,
  contentType = 'image/webp',
  contentLength = null,
  chunks = []
}: FakeResponseOptions = {}) {
  const headers = new Map<string, string>();
  if (contentType !== null) headers.set('content-type', contentType);
  if (contentLength !== null) headers.set('content-length', String(contentLength));

  let index = 0;
  const reader = {
    read: vi.fn(async () => {
      if (index >= chunks.length) return { done: true, value: undefined };
      return { done: false, value: chunks[index++] };
    }),
    cancel: vi.fn(async () => undefined)
  };

  const response = {
    ok,
    status,
    headers: { get: (name: string) => headers.get(name.toLowerCase()) ?? null },
    body: { getReader: () => reader }
  } as unknown as Response;

  return { response, reader };
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  sharpMock.input = null;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function captureError(promise: Promise<unknown>): Promise<BusinessError> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(BusinessError);
    return error as BusinessError;
  }
  throw new Error('Se esperaba un BusinessError y la operación terminó sin error');
}

describe('processAndSaveImage — descarga de imágenes por URL', () => {
  it('reporta el estado HTTP cuando el origen responde con error', async () => {
    fetchMock.mockResolvedValue(fakeResponse({ ok: false, status: 404 }).response);

    const error = await captureError(processAndSaveImage('https://cdn.test/falta.webp', 'product'));

    expect(error.code).toBe('IMAGE_FETCH_FAILED');
    expect(error.statusCode).toBe(422);
    expect(error.message).toBe('La URL de la imagen respondió con estado 404');
  });

  it('reporta timeout cuando el origen no llega a responder', async () => {
    fetchMock.mockRejectedValue(
      new DOMException('The operation was aborted due to timeout', 'TimeoutError')
    );

    const error = await captureError(processAndSaveImage('https://cdn.lento/img.webp', 'product'));

    expect(error.code).toBe('IMAGE_FETCH_TIMEOUT');
    expect(error.message).toBe(
      `La URL de la imagen no respondió en ${IMAGE_FETCH_TIMEOUT_MS / 1000}s`
    );
  });

  it('distingue un fallo de red de un error HTTP', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    const error = await captureError(processAndSaveImage('https://caido.test/img.webp', 'product'));

    expect(error.code).toBe('IMAGE_FETCH_FAILED');
    expect(error.message).toBe('No se pudo conectar con la URL de la imagen');
  });

  it('rechaza una URL que no devuelve una imagen', async () => {
    fetchMock.mockResolvedValue(fakeResponse({ contentType: 'text/html; charset=utf-8' }).response);

    const error = await captureError(
      processAndSaveImage('https://cdn.test/pagina-html', 'product')
    );

    expect(error.code).toBe('IMAGE_NOT_AN_IMAGE');
    expect(error.message).toBe('La URL no apunta a una imagen (devuelve text/html)');
  });

  it('rechaza una imagen por Content-Length sin llegar a leer el cuerpo', async () => {
    const { response, reader } = fakeResponse({
      contentLength: MAX_IMAGE_BYTES + 1,
      chunks: [new Uint8Array(8)]
    });
    fetchMock.mockResolvedValue(response);

    const error = await captureError(
      processAndSaveImage('https://cdn.test/grande.webp', 'product')
    );

    expect(error.code).toBe('IMAGE_TOO_LARGE');
    expect(error.message).toBe('La imagen supera los 25MB');
    expect(reader.read).not.toHaveBeenCalled();
  });

  it('corta la descarga en streaming si el cuerpo supera el tope sin cabecera', async () => {
    // Sin Content-Length el límite solo se puede aplicar leyendo: por eso el lector.
    const half = Math.ceil(MAX_IMAGE_BYTES / 2) + 1;
    const { response, reader } = fakeResponse({
      contentLength: null,
      chunks: [new Uint8Array(half), new Uint8Array(half)]
    });
    fetchMock.mockResolvedValue(response);

    const error = await captureError(
      processAndSaveImage('https://cdn.test/chorreo.webp', 'product')
    );

    expect(error.code).toBe('IMAGE_TOO_LARGE');
    expect(reader.read).toHaveBeenCalledTimes(2);
    expect(reader.cancel).toHaveBeenCalledTimes(1);
    expect(sharpMock.toFile).not.toHaveBeenCalled();
  });

  it('arma el cuerpo en streaming y se lo entrega a sharp', async () => {
    const { response } = fakeResponse({
      chunks: [Buffer.from('hola '), Buffer.from('mundo')]
    });
    fetchMock.mockResolvedValue(response);

    const file = await processAndSaveImage('https://cdn.test/ok.webp', 'product');

    expect(file).toMatch(/^product_\d+\.webp$/);
    expect(Buffer.from(sharpMock.input).toString()).toBe('hola mundo');
    expect(sharpMock.toFile).toHaveBeenCalledTimes(1);
  });

  it('acepta application/octet-stream, que usan los CDN sin content-type de imagen', async () => {
    const { response } = fakeResponse({
      contentType: 'application/octet-stream',
      chunks: [Buffer.from('binario')]
    });
    fetchMock.mockResolvedValue(response);

    await expect(processAndSaveImage('https://cdn.test/archivo', 'product')).resolves.toMatch(
      /^product_\d+\.webp$/
    );
  });

  it('no registra la query string de la URL cuando el origen falla', async () => {
    fetchMock.mockResolvedValue(fakeResponse({ ok: false, status: 500 }).response);

    await captureError(
      processAndSaveImage('https://cdn.test/img.webp?token=super-secreto', 'product')
    );

    expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
      '[ImageUtils] La URL de la imagen respondió con error',
      { url: 'https://cdn.test/img.webp', status: 500 }
    );
  });

  it('no consulta la red con una ruta relativa y la devuelve tal cual', async () => {
    const result = await processAndSaveImage('/img/products/default.png', 'product');

    expect(result).toBe('/img/products/default.png');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(sharpMock.toFile).not.toHaveBeenCalled();
  });
});
