// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as products from '@/modules/inventario/productos/repositorio';
const mocks = vi.hoisted(() => ({ query: vi.fn(), insert: vi.fn(), update: vi.fn(), remove: vi.fn(), find: vi.fn(), presentation: vi.fn(), units: vi.fn(), sync: vi.fn() }));
vi.mock('@/lib/database/db', () => ({ query: mocks.query, generateUUID: () => 'p1', withTransaction: vi.fn() }));
vi.mock('@/lib/database/base-repository', () => ({ BaseRepository: { insert: mocks.insert, update: mocks.update, delete: mocks.remove, findOne: mocks.find } }));
vi.mock('@/modules/inventario/presentaciones/repositorio', () => ({ crearPresentacion: mocks.presentation }));
vi.mock('@/modules/inventario/unidades/repositorio', () => ({ generarUnidades: mocks.units, sincronizarStockTotal: mocks.sync }));
vi.mock('@/lib/utils/logger', () => ({ logger: { debug: vi.fn() } }));
const row = { id_producto: 'p1', codigo: 'RON', nombre: 'Ron Añejó', categoria_id: 'c1', estado: 1, categoria: 'Bebidas' };
beforeEach(() => { vi.resetAllMocks(); mocks.query.mockResolvedValue([]); mocks.presentation.mockResolvedValue({ id: 'pr1' }); mocks.units.mockResolvedValue([{ id: 'u1', codigo: 'U1', codigo_barras: '123' }]); });
describe('catálogo de inventario', () => {
  it.each([undefined, 'undefined', 'NaN', 'c1'])('parametriza la categoría y mapea campos opcionales: %s', async category => {
    mocks.query.mockResolvedValue([row, { ...row, stock_almacen: 5, max_anfitrionas: 2, ml_shot: 50, ml_shot_anfitriona: 30 }]);
    const result = await products.listarProductos(category); expect(result[0]).toMatchObject({ id: 'p1', name: 'Ron Añejó', stock_almacen: 0, ml_shot: null }); expect(result[1].stock_almacen).toBe(5); expect(mocks.query.mock.calls[0][1]).toEqual(category === 'c1' ? ['c1'] : []);
  });
  it('devuelve null cuando no encuentra producto y el catálogo normalizado cuando existe', async () => {
    mocks.find.mockResolvedValue(null); expect(await products.obtenerProductoPorId('missing')).toBeNull(); mocks.find.mockResolvedValue(row); expect((await products.obtenerProductoPorId('p1'))?.code).toBe('RON');
    expect(await products.obtenerProductoPorCodigoONombre('RON', 'Ron', 'c1')).toBeNull(); mocks.query.mockResolvedValue([row]); expect((await products.obtenerProductoPorCodigoONombre('RON', 'Ron', 'c1'))?.name).toBe('Ron Añejó');
  });
  it.each(['', 'default.png', 'global.png'])('alta conserva foto global o usa presentación: %s', async photo => {
    const result = await products.crearProducto(mocks.query as any, { code: 'RON', name: 'Ron', category_id: 'c1', status: 1 }, photo, [{ nombre: '750', foto: 'presentation.png', cantidad: 2.9 }, { nombre: '1L', cantidad: -1 }, { nombre: 'Mini' }]);
    expect(mocks.insert.mock.calls[0][2]).toMatchObject({ stock_almacen: 0, precio: 0, comision: 0, descripcion: '', foto: photo === 'global.png' ? 'global.png' : 'presentation.png' });
    expect(mocks.units).toHaveBeenCalledTimes(1); expect(mocks.units).toHaveBeenCalledWith(mocks.query, 'p1', 2, 'pr1'); expect(result.codigos).toHaveLength(1); expect(mocks.sync).toHaveBeenCalled();
  });
  it('alta sin fotos usa el default y conserva precios, descripción y medidas', async () => {
    await products.crearProducto(mocks.query as any, { price: 100, commission: 10, description: 'Suave', ml_shot: 50, ml_shot_anfitriona: 30 }, '', []);
    expect(mocks.insert.mock.calls[0][2]).toMatchObject({ precio: 100, comision: 10, descripcion: 'Suave', foto: 'default.png', ml_shot: 50 });
  });
  it('edición parcial no borra campos omitidos y acepta cero y null explícitos', async () => {
    await products.actualizarProducto(mocks.query as any, 'p1', {}); expect(Object.keys(mocks.update.mock.calls[0][4])).toEqual(['fecha_mod']);
    await products.actualizarProducto(mocks.query as any, 'p1', { code: 'C', name: 'Nombre', category_id: 'c2', price: 0, commission: 0, max_anfitrionas: null, ml_shot: null, ml_shot_anfitriona: null, stock_almacen: 0, description: '', status: 0 }, 'photo.png');
    expect(mocks.update.mock.calls[1][4]).toMatchObject({ codigo: 'C', nombre: 'Nombre', categoria_id: 'c2', precio: 0, ml_shot: null, estado: 0, foto: 'photo.png' });
  });
  it.each([undefined, '', 'default.png', 'global.png'])('edición con presentaciones usa correctamente foto %s', async photo => {
    await products.actualizarProducto(mocks.query as any, 'p1', {}, photo, [{ nombre: '750', foto: 'new.png', cantidad: 2 }, { nombre: 'Mini' }]);
    expect(mocks.update.mock.calls[0][4].foto).toBe(photo === 'global.png' ? 'global.png' : 'new.png'); expect(mocks.units).toHaveBeenCalledTimes(1);
  });
  it('búsqueda ignora espacios y acentos y respeta resultados directos', async () => {
    expect(await products.buscarProductos(' ')).toEqual([]); expect(mocks.query).not.toHaveBeenCalled();
    mocks.query.mockResolvedValue([row]); expect(await products.buscarProductos('ron')).toHaveLength(1); expect(mocks.query).toHaveBeenCalledTimes(1);
    mocks.query.mockResolvedValueOnce([]).mockResolvedValueOnce([row]); expect(await products.buscarProductos(' añejo ')).toHaveLength(1);
    mocks.query.mockResolvedValueOnce([]).mockResolvedValueOnce([row]); expect(await products.buscarProductos('no existe')).toEqual([]);
  });
  it('reordena, elimina y normaliza niveles de champaña sin mutar existencias', async () => {
    await products.reordenarProductos([{ id: 'p1', display_order: 2 }]); expect(mocks.update).toHaveBeenCalledWith(mocks.query, 'productos', 'id_producto', 'p1', expect.objectContaining({ display_order: 2 }));
    await products.eliminarProducto('p1'); expect(mocks.remove).toHaveBeenCalledWith(mocks.query, 'productos', 'id_producto', 'p1');
    mocks.query.mockResolvedValue([{ anfitrionas: '2', precio: '100', comision: '10' }, { anfitrionas: 1 }]); expect(await products.obtenerNivelesChampagne('p1')).toEqual([{ anfitrionas: 2, precio: 100, comision: 10 }, { anfitrionas: 1, precio: 0, comision: 0 }]);
    await products.guardarNivelesChampagne(mocks.query as any, 'p1', [{ anfitrionas: 2, precio: 100, comision: 10 }]); expect(mocks.insert).toHaveBeenCalledWith(mocks.query, 'producto_champagne_tiers', expect.objectContaining({ producto_id: 'p1', anfitrionas: 2 }));
    expect(await products.productosPorIds(mocks.query as any, [])).toEqual([]); mocks.query.mockResolvedValue([row]); await products.productosPorIds(mocks.query as any, ['p1', 'p2']); expect(mocks.query).toHaveBeenLastCalledWith(expect.stringContaining('IN (?,?)'), ['p1', 'p2']);
  });
});
