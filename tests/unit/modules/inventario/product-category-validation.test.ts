import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  create: vi.fn(),
  findDuplicate: vi.fn(),
  currentProduct: vi.fn(),
  update: vi.fn()
}));

vi.mock('@/lib/database/db', () => ({
  query: mocks.query,
  generateUUID: vi.fn(),
  withTransaction: vi.fn()
}));

vi.mock('@/modules/inventario/productos/servicio', () => ({
  actualizarProducto: mocks.update,
  buscarProductos: vi.fn(),
  crearProducto: mocks.create,
  eliminarProducto: vi.fn(),
  esPresentacionSimple: vi.fn(),
  guardarNivelesChampagne: vi.fn(),
  listarProductos: vi.fn(),
  obtenerNivelesChampagne: vi.fn(),
  obtenerProductoPorCodigoONombre: mocks.findDuplicate,
  obtenerProductoPorId: mocks.currentProduct,
  reordenarProductos: vi.fn()
}));

vi.mock('@/modules/inventario/presentaciones/servicio', () => ({
  actualizarFotoPresentacion: vi.fn(),
  actualizarPresentacion: vi.fn(),
  buscarPresentacionPorCodigo: vi.fn(),
  crearPresentacion: vi.fn(),
  eliminarPresentacion: vi.fn(),
  listarPresentaciones: vi.fn(),
  listarPresentacionesPorProductos: vi.fn(),
  obtenerPresentacion: vi.fn()
}));

import { ProductService } from '@/modules/inventario/productos/fachada';

describe('validación de categoría al guardar productos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.query.mockResolvedValue([]);
    mocks.findDuplicate.mockResolvedValue(null);
    mocks.currentProduct.mockResolvedValue({
      id: 'product-1',
      category_id: 'category-1',
      code: 'PRODUCT-1',
      name: 'Producto',
      foto: 'default.png'
    });
    mocks.create.mockResolvedValue({ id: 'product-1' });
    mocks.update.mockResolvedValue({ id: 'product-1' });
  });

  it('rechaza la creación cuando la categoría no existe', async () => {
    await expect(
      ProductService.createProduct({
        code: 'PRODUCT-1',
        name: 'Producto',
        category_id: 'missing-category',
        status: 1
      })
    ).rejects.toMatchObject({
      name: 'ValidationError',
      statusCode: 400,
      message: 'La categoría seleccionada no existe'
    });

    expect(mocks.findDuplicate).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.query).toHaveBeenCalledWith(
      'SELECT 1 FROM categorias WHERE id_categoria = ? LIMIT 1',
      ['missing-category']
    );
  });

  it('rechaza el cambio a una categoría inexistente antes de cargar el producto', async () => {
    await expect(
      ProductService.updateProduct('product-1', { category_id: 'missing-category' })
    ).rejects.toMatchObject({
      name: 'ValidationError',
      statusCode: 400,
      message: 'La categoría seleccionada no existe'
    });

    expect(mocks.currentProduct).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.query).toHaveBeenCalledWith(
      'SELECT 1 FROM categorias WHERE id_categoria = ? LIMIT 1',
      ['missing-category']
    );
  });

  it('rechaza una categoría inexistente en la actualización genérica', async () => {
    await expect(
      ProductService.update('product-1', { category_id: 'missing-category' })
    ).rejects.toMatchObject({
      name: 'ValidationError',
      statusCode: 400,
      message: 'La categoría seleccionada no existe'
    });

    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('permite crear con una categoría existente', async () => {
    mocks.query.mockResolvedValue([{ id_categoria: 'category-1' }]);

    await ProductService.createProduct({
      code: 'PRODUCT-1',
      name: 'Producto',
      category_id: 'category-1',
      status: 1
    });

    expect(mocks.create).toHaveBeenCalledOnce();
  });

  it('permite asignar una categoría existente al editar', async () => {
    mocks.query.mockResolvedValue([{ id_categoria: 'category-1' }]);

    await ProductService.updateProduct('product-1', { category_id: 'category-1' });

    expect(mocks.update).toHaveBeenCalledOnce();
  });

  it('no vuelve a validar la categoría al editar otro campo', async () => {
    await ProductService.updateProduct('product-1', { description: 'Actualizado' });

    expect(mocks.query).not.toHaveBeenCalled();
    expect(mocks.update).toHaveBeenCalledOnce();
  });
});
