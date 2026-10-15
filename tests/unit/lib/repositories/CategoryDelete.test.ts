import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  trx: vi.fn(),
  transaction: vi.fn(),
  cleanup: vi.fn(),
  delete: vi.fn(),
  notify: vi.fn()
}));
vi.mock('@/lib/database/db', () => ({
  query: mocks.query,
  generateUUID: vi.fn(),
  withTransaction: mocks.transaction
}));
vi.mock('@/lib/database/base-repository', () => ({ BaseRepository: { delete: mocks.delete } }));
vi.mock('@/lib/business/timezoneService', () => ({ getNowInBusinessTimezone: vi.fn() }));
vi.mock('@/lib/api/sseService', () => ({ sendNotificationToAll: mocks.notify }));
vi.mock('@/modules/inventario/productos/eliminarFotos', () => ({
  eliminarFotosProductosSinUso: mocks.cleanup
}));
import { CategoryRepository } from '@/modules/inventario/categorias/repositorio';
beforeEach(() => {
  vi.resetAllMocks();
  mocks.transaction.mockImplementation(async callback => callback(mocks.trx));
  mocks.cleanup.mockResolvedValue(0);
});
it('incluye productos activos e inactivos en la confirmación', async () => {
  mocks.query
    .mockResolvedValueOnce([{ nombre: 'Bebidas' }])
    .mockResolvedValueOnce([{ id: 'p1', name: 'Vino', status: 0 }]);
  expect(await CategoryRepository.deletionPreview('cat')).toEqual({
    name: 'Bebidas',
    products: [{ id: 'p1', name: 'Vino', status: 0 }]
  });
  expect(mocks.query.mock.calls[1][0]).not.toContain('estado = 1');
});
it('borra las fotos del producto y de sus presentaciones después del commit', async () => {
  mocks.trx
    .mockResolvedValueOnce([{ foto: 'vino.webp' }])
    .mockResolvedValueOnce([{ foto: 'botella.webp' }])
    .mockResolvedValueOnce([]);
  mocks.transaction.mockImplementation(async callback => {
    const result = await callback(mocks.trx);
    expect(mocks.cleanup).not.toHaveBeenCalled();
    return result;
  });
  await CategoryRepository.delete('cat');
  expect(mocks.cleanup).toHaveBeenCalledWith(['vino.webp', 'botella.webp']);
  expect(mocks.delete).toHaveBeenCalledWith(mocks.trx, 'categorias', 'id_categoria', 'cat');
  expect(mocks.trx.mock.calls[2][0]).toContain('DELETE FROM inventario_movimiento_unidades');
  expect(mocks.trx.mock.calls[2][0]).toContain('WHERE P.categoria_id = ?');
  expect(mocks.trx.mock.calls[2][1]).toEqual(['cat']);
  expect(mocks.trx.mock.calls[3]).toEqual([
    'DELETE FROM productos WHERE categoria_id = ?',
    ['cat']
  ]);
});
it('no borra productos ni fotos si falla la limpieza de consumos de unidades', async () => {
  mocks.trx
    .mockResolvedValueOnce([{ foto: 'vino.webp' }])
    .mockResolvedValueOnce([])
    .mockRejectedValueOnce(new Error('consumos'));
  await expect(CategoryRepository.delete('cat')).rejects.toThrow('consumos');
  expect(mocks.trx).toHaveBeenCalledTimes(3);
  expect(mocks.delete).not.toHaveBeenCalled();
  expect(mocks.cleanup).not.toHaveBeenCalled();
  expect(mocks.notify).not.toHaveBeenCalled();
});
it('conserva las fotos si falla el borrado de la categoría', async () => {
  mocks.trx
    .mockResolvedValueOnce([{ foto: 'vino.webp' }])
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([]);
  mocks.delete.mockRejectedValue(new Error('foreign key'));
  await expect(CategoryRepository.delete('cat')).rejects.toThrow('foreign key');
  expect(mocks.cleanup).not.toHaveBeenCalled();
  expect(mocks.notify).not.toHaveBeenCalled();
});
