// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ read: vi.fn(), remove: vi.fn() }));
vi.mock('fs/promises', () => ({ default: { access: vi.fn(), readFile: mocks.read } }));
vi.mock('@/lib/media/product-background.mjs', () => ({ removeProductBackground: mocks.remove }));
import { GET } from '@/app/api/images/products/[filename]/route';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.read.mockResolvedValue(Buffer.from('original-webp'));
  mocks.remove.mockResolvedValue(Buffer.from('transparent-png'));
});

describe('entrega de fotos sin fondo', () => {
  it('entrega el PNG procesado cuando se solicita recorte', async () => {
    const response = await GET(
      new Request('http://localhost/api/images/products/foto.webp?sin_fondo=1'),
      { params: Promise.resolve({ filename: 'foto.webp' }) }
    );
    expect(response.headers.get('Content-Type')).toBe('image/png');
    expect(await response.text()).toBe('transparent-png');
    expect(mocks.remove).toHaveBeenCalledWith(Buffer.from('original-webp'));
  });
  it('conserva el archivo original para consumidores que no solicitan recorte', async () => {
    const response = await GET(new Request('http://localhost/api/images/products/foto.webp'), {
      params: Promise.resolve({ filename: 'foto.webp' })
    });
    expect(response.headers.get('Content-Type')).toBe('image/webp');
    expect(await response.text()).toBe('original-webp');
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it('un fallo del motor devuelve la foto original con caché breve para reintentar', async () => {
    mocks.remove.mockRejectedValue(new Error('inference unavailable'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const response = await GET(
        new Request('http://localhost/api/images/products/foto.webp?sin_fondo=1'),
        { params: Promise.resolve({ filename: 'foto.webp' }) }
      );
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('image/webp');
      expect(response.headers.get('Cache-Control')).toBe('public, max-age=60');
      expect(await response.text()).toBe('original-webp');
    } finally {
      warn.mockRestore();
    }
  });
});
