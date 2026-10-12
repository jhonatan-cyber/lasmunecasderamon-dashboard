import { beforeEach, expect, it, vi } from 'vitest';
import path from 'node:path';
const mocks = vi.hoisted(() => ({ query: vi.fn(), unlink: vi.fn(), captureException: vi.fn() }));
vi.mock('@/lib/database/db', () => ({ query: mocks.query }));
vi.mock('node:fs/promises', () => ({ default: { unlink: mocks.unlink } }));
vi.mock('@/lib/utils/logger', () => ({ default: { captureException: mocks.captureException } }));
import { eliminarFotosProductosSinUso } from '@/modules/inventario/productos/eliminarFotos';
beforeEach(() => {
  vi.resetAllMocks();
  mocks.query.mockResolvedValue([]);
  mocks.unlink.mockResolvedValue(undefined);
});
it('elimina una sola vez cada foto local sin referencias', async () => {
  expect(await eliminarFotosProductosSinUso(['foto.webp', 'foto.webp'])).toBe(0);
  expect(mocks.unlink).toHaveBeenCalledExactlyOnceWith(
    path.resolve(process.cwd(), 'public', 'img', 'products', 'foto.webp')
  );
});
it('protege fotos compartidas, predeterminadas y rutas fuera del directorio', async () => {
  mocks.query.mockResolvedValue([{ exists: 1 }]);
  await eliminarFotosProductosSinUso([
    'compartida.webp',
    'default.png',
    '../escape.webp',
    'C:\\foto.webp',
    'https://site/foto.webp'
  ]);
  expect(mocks.unlink).not.toHaveBeenCalled();
  expect(mocks.query).toHaveBeenCalledTimes(1);
});
it('tolera fotos inexistentes y comunica fallos reales de permisos', async () => {
  mocks.unlink.mockRejectedValueOnce({ code: 'ENOENT' }).mockRejectedValueOnce({ code: 'EACCES' });
  expect(await eliminarFotosProductosSinUso(['ausente.webp', 'bloqueada.webp'])).toBe(1);
  expect(mocks.captureException).toHaveBeenCalledTimes(1);
});
