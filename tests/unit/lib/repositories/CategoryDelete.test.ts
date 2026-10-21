import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  trx: vi.fn(),
  transaction: vi.fn(),
  cleanup: vi.fn(),
  delete: vi.fn(),
  update: vi.fn(),
  notify: vi.fn()
}));
vi.mock('@/lib/database/db', () => ({
  query: mocks.query,
  generateUUID: vi.fn(),
  withTransaction: mocks.transaction
}));
vi.mock('@/lib/database/base-repository', () => ({
  BaseRepository: { delete: mocks.delete, update: mocks.update }
}));
vi.mock('@/lib/business/timezoneService', () => ({
  getNowInBusinessTimezone: () => '2026-10-19T00:00:00.000Z'
}));
vi.mock('@/lib/api/sseService', () => ({ sendNotificationToAll: mocks.notify }));
vi.mock('@/modules/inventario/productos/eliminarFotos', () => ({
  eliminarFotosProductosSinUso: mocks.cleanup
}));
import { CategoryRepository } from '@/modules/inventario/categorias/repositorio';
import { ConflictError } from '@/lib/errors/errors';

const sinDependencias = {
  unidades: '0',
  movimientos: '0',
  compras: '0',
  consumos: '0',
  colaciones: '0',
  entradas: '0',
  entradas_productos: '0',
  ventas: '0',
  reposicion: '0',
  servicios: '0',
  solicitudes: '0'
};

const dependenciasNumericas = {
  unidades: 0,
  movimientos: 0,
  compras: 0,
  consumos: 0,
  colaciones: 0,
  entradas: 0,
  entradasProductos: 0,
  ventas: 0,
  reposicion: 0,
  servicios: 0,
  solicitudes: 0
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.transaction.mockImplementation(async callback => callback(mocks.trx));
  mocks.cleanup.mockResolvedValue(0);
});

it('incluye productos activos e inactivos y el estado de borrado en la confirmación', async () => {
  mocks.query
    .mockResolvedValueOnce([{ nombre: 'Bebidas' }])
    .mockResolvedValueOnce([{ id: 'p1', name: 'Vino', status: 0 }])
    .mockResolvedValueOnce([sinDependencias]);
  expect(await CategoryRepository.deletionPreview('cat')).toEqual({
    name: 'Bebidas',
    products: [{ id: 'p1', name: 'Vino', status: 0 }],
    canDelete: true,
    blockedReason: null,
    dependencies: dependenciasNumericas
  });
  expect(mocks.query.mock.calls[1][0]).not.toContain('estado = 1');
});

it('informa por qué no se puede borrar una categoría con stock o historial', async () => {
  mocks.query
    .mockResolvedValueOnce([{ nombre: 'Bebidas' }])
    .mockResolvedValueOnce([{ id: 'p1', name: 'Vino', status: 1 }])
    .mockResolvedValueOnce([{ ...sinDependencias, unidades: '2' }]);

  const preview = await CategoryRepository.deletionPreview('cat');

  expect(preview.canDelete).toBe(false);
  expect(preview.blockedReason).toContain('stock o historial');
  expect(preview.dependencies.unidades).toBe(2);
});

it('borra las fotos del producto y de sus presentaciones después del commit', async () => {
  mocks.trx
    .mockResolvedValueOnce([{ system_key: null }])
    .mockResolvedValueOnce([{ foto: 'vino.webp' }])
    .mockResolvedValueOnce([{ foto: 'botella.webp' }])
    .mockResolvedValueOnce([sinDependencias])
    .mockResolvedValueOnce([]);
  mocks.transaction.mockImplementation(async callback => {
    const result = await callback(mocks.trx);
    expect(mocks.cleanup).not.toHaveBeenCalled();
    return result;
  });
  await CategoryRepository.delete('cat');
  expect(mocks.cleanup).toHaveBeenCalledWith(['vino.webp', 'botella.webp']);
  expect(mocks.delete).toHaveBeenCalledWith(mocks.trx, 'categorias', 'id_categoria', 'cat');
  const sqls = mocks.trx.mock.calls.map(call => String(call[0]));
  // La consulta de dependencias cuenta los consumos por unidad y menciona la
  // tabla; lo que no puede pasar es que el borrado la ESCRIBA.
  expect(
    sqls.some(
      sql =>
        /delete\s+from\s+inventario_movimiento_unidades/i.test(sql) ||
        /update\s+inventario_movimiento_unidades/i.test(sql) ||
        /insert\s+into\s+inventario_movimiento_unidades/i.test(sql)
    )
  ).toBe(false);
  expect(mocks.trx.mock.calls[4]).toEqual([
    'DELETE FROM productos WHERE categoria_id = ?',
    ['cat']
  ]);
});

it('no borra productos ni fotos si la categoría tiene dependencias', async () => {
  mocks.trx
    .mockResolvedValueOnce([{ system_key: null }])
    .mockResolvedValueOnce([{ foto: 'vino.webp' }])
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([{ ...sinDependencias, unidades: '1' }]);

  await expect(CategoryRepository.delete('cat')).rejects.toBeInstanceOf(ConflictError);
  expect(mocks.delete).not.toHaveBeenCalled();
  expect(mocks.cleanup).not.toHaveBeenCalled();
  expect(mocks.notify).not.toHaveBeenCalled();
});

it('conserva las fotos si falla el borrado de la categoría', async () => {
  mocks.trx
    .mockResolvedValueOnce([{ system_key: null }])
    .mockResolvedValueOnce([{ foto: 'vino.webp' }])
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([sinDependencias]);
  mocks.delete.mockRejectedValue(new Error('foreign key'));
  await expect(CategoryRepository.delete('cat')).rejects.toThrow('foreign key');
  expect(mocks.cleanup).not.toHaveBeenCalled();
  expect(mocks.notify).not.toHaveBeenCalled();
});

it('al desactivar marca solo los productos que estaban activos', async () => {
  mocks.query.mockResolvedValueOnce([{ system_key: null }]).mockResolvedValueOnce([]);
  mocks.trx.mockResolvedValue([]);

  await CategoryRepository.updateStatus('cat', 'deactivate');

  expect(mocks.update).toHaveBeenCalledWith(
    mocks.trx,
    'categorias',
    'id_categoria',
    'cat',
    expect.objectContaining({ estado: 0 })
  );
  const sql = String(mocks.trx.mock.calls[0][0]);
  expect(sql).toContain('desactivado_por_categoria = CASE');
  expect(sql).toContain('WHEN estado = 1 THEN true');
});

it('al activar revive solo los productos marcados por la categoría', async () => {
  mocks.query.mockResolvedValueOnce([]);
  mocks.trx.mockResolvedValue([]);

  await CategoryRepository.updateStatus('cat', 'activate');

  const sql = String(mocks.trx.mock.calls[0][0]);
  expect(sql).toContain('desactivado_por_categoria = false');
  expect(sql).toContain('AND desactivado_por_categoria = true');
});
