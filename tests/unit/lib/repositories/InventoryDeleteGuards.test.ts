import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  trx: vi.fn(),
  transaction: vi.fn(),
  delete: vi.fn(),
  update: vi.fn()
}));
vi.mock('@/lib/database/db', () => ({
  query: vi.fn(),
  generateUUID: vi.fn(),
  withTransaction: mocks.transaction
}));
vi.mock('@/lib/database/base-repository', () => ({
  BaseRepository: {
    delete: mocks.delete,
    update: mocks.update,
    findOne: vi.fn(),
    insert: vi.fn()
  }
}));
vi.mock('@/lib/business/timezoneService', () => ({
  getNowInBusinessTimezone: () => '2026-10-19T00:00:00.000Z'
}));
import { eliminarProducto } from '@/modules/inventario/productos/repositorio';
import { eliminarPresentacion } from '@/modules/inventario/presentaciones/repositorio';
import { ConflictError, NotFoundError } from '@/lib/errors/errors';

const sinDependenciasProducto = {
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

const sinDependenciasPresentacion = {
  unidades: '0',
  movimientos: '0',
  consumos: '0',
  compras: '0',
  ventas: '0',
  colaciones: '0',
  entradas: '0',
  entradas_productos: '0',
  reposicion: '0',
  servicios: '0',
  solicitudes: '0'
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.transaction.mockImplementation(async callback => callback(mocks.trx));
});

it('bloquea el borrado de un producto con stock o historial', async () => {
  mocks.trx
    .mockResolvedValueOnce([{ id_producto: 'p1' }])
    .mockResolvedValueOnce([{ ...sinDependenciasProducto, unidades: '1' }]);

  await expect(eliminarProducto('p1')).rejects.toBeInstanceOf(ConflictError);
  expect(mocks.delete).not.toHaveBeenCalled();
});

it('borra un producto sin dependencias', async () => {
  mocks.trx
    .mockResolvedValueOnce([{ id_producto: 'p1' }])
    .mockResolvedValueOnce([sinDependenciasProducto]);

  await eliminarProducto('p1');

  expect(mocks.delete).toHaveBeenCalledWith(mocks.trx, 'productos', 'id_producto', 'p1');
});

it('considera exitoso borrar un producto que ya no existe', async () => {
  mocks.trx.mockResolvedValueOnce([]);

  await expect(eliminarProducto('p1')).resolves.toBeUndefined();
  expect(mocks.delete).not.toHaveBeenCalled();
});

it('desactiva una presentación con referencias históricas para conservarlas', async () => {
  mocks.trx
    .mockResolvedValueOnce([{ id: 'pres1' }])
    .mockResolvedValueOnce([{ ...sinDependenciasPresentacion, ventas: '1' }]);

  await expect(eliminarPresentacion('pres1')).resolves.toBe('desactivada');
  expect(mocks.delete).not.toHaveBeenCalled();
  expect(mocks.update).toHaveBeenCalledWith(mocks.trx, 'inventario_presentaciones', 'id', 'pres1', {
    activa: false
  });
});

it('borra una presentación con stock si no tiene historial', async () => {
  mocks.trx
    .mockResolvedValueOnce([{ id: 'pres1' }])
    .mockResolvedValueOnce([{ ...sinDependenciasPresentacion, unidades: '2' }]);

  await expect(eliminarPresentacion('pres1')).resolves.toBe('eliminada');

  expect(mocks.delete).toHaveBeenCalledWith(mocks.trx, 'inventario_presentaciones', 'id', 'pres1');
  expect(mocks.update).not.toHaveBeenCalled();
});

it('borra una presentación sin dependencias', async () => {
  mocks.trx
    .mockResolvedValueOnce([{ id: 'pres1' }])
    .mockResolvedValueOnce([sinDependenciasPresentacion]);

  await expect(eliminarPresentacion('pres1')).resolves.toBe('eliminada');

  const [sql, params] = mocks.trx.mock.calls[1];
  expect([...String(sql).matchAll(/\?/g)]).toHaveLength(params.length);
  expect(mocks.delete).toHaveBeenCalledWith(mocks.trx, 'inventario_presentaciones', 'id', 'pres1');
});

it('responde NotFound cuando la presentación no existe', async () => {
  mocks.trx.mockResolvedValueOnce([]);

  await expect(eliminarPresentacion('pres1')).rejects.toBeInstanceOf(NotFoundError);
  expect(mocks.delete).not.toHaveBeenCalled();
});
