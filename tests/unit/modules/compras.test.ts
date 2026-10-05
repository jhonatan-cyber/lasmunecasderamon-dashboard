import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ValidationError } from '@/lib/errors/errors';
import { withTransaction } from '@/lib/database/db';

vi.mock('@/lib/database/db', () => ({
  withTransaction: vi.fn(),
  query: vi.fn(),
  generateUUID: () => 'uuid-test'
}));

vi.mock('@/lib/repositories/BaseRepository', () => ({
  BaseRepository: { insert: vi.fn(), update: vi.fn(), findOne: vi.fn(), delete: vi.fn() }
}));

// La compra vive en el módulo: sus colaboradores son los repositorios privados
// del propio módulo, no una API pública ni un repositorio heredado.
vi.mock('@/modules/inventario/compras/repositorio', () => ({
  crearCompra: vi.fn(async (_trx: any, data: any) => ({ id: 'comp-1', folio: 'C-0001', ...data })),
  listarCompras: vi.fn().mockResolvedValue([])
}));

vi.mock('@/modules/inventario/productos/repositorio', () => ({
  productosPorIds: vi.fn(async () => [{ id_producto: 'prod-1', nombre: 'Ron Habana' }])
}));

vi.mock('@/modules/inventario/presentaciones/repositorio', () => ({
  listarPresentacionesPorProductos: vi.fn()
}));

vi.mock('@/modules/inventario/unidades/repositorio', () => ({
  generarUnidades: vi.fn().mockResolvedValue([]),
  sincronizarStockTotal: vi.fn().mockResolvedValue(0)
}));

import { registrarCompra } from '@/modules/inventario/compras/servicio';
import { crearCompra } from '@/modules/inventario/compras/repositorio';
import { productosPorIds } from '@/modules/inventario/productos/repositorio';
import { listarPresentacionesPorProductos } from '@/modules/inventario/presentaciones/repositorio';
import { generarUnidades, sincronizarStockTotal } from '@/modules/inventario/unidades/repositorio';
import { BaseRepository } from '@/lib/repositories/BaseRepository';

const detalle = {
  producto_id: 'prod-1',
  presentacion_id: 'pres-1',
  cantidad: 3,
  precio_compra: 5000
};

let trxMock: any;

beforeEach(() => {
  vi.clearAllMocks();
  trxMock = vi.fn(async () => []);
  vi.mocked(productosPorIds).mockResolvedValue([{ id_producto: 'prod-1', nombre: 'Ron Habana' }]);
  vi.mocked(listarPresentacionesPorProductos).mockResolvedValue({
    'prod-1': [
      { id: 'pres-1', nombre: 'Botella 750ml' },
      { id: 'pres-2', nombre: 'Six pack' }
    ]
  } as any);
  // Un código por unidad pedida, con id para poder marcarlo como impreso.
  // Un código por unidad pedida, con id para poder marcarlo como impreso.
  vi.mocked(generarUnidades).mockImplementation(
    async (_trx, _productoId, cantidad, presentacionId) =>
      Array.from({ length: cantidad }, (_, i) => ({
        id: `${presentacionId}-u${i + 1}`,
        codigo: `LM-${presentacionId}-${i + 1}`,
        codigo_barras: `29${String(i + 1).padStart(11, '0')}`
      })) as any
  );
  vi.mocked(withTransaction).mockImplementation(async (cb: any) => cb(trxMock));
});

describe('registrarCompra (modulo inventario)', () => {
  it('rechaza compra sin detalles', async () => {
    await expect(registrarCompra({ detalles: [] }, 'u1')).rejects.toThrow(ValidationError);
  });

  it('rechaza cantidad fuera de rango y precio negativo', async () => {
    await expect(
      registrarCompra({ detalles: [{ ...detalle, cantidad: 0 }] }, 'u1')
    ).rejects.toThrow(ValidationError);
    await expect(
      registrarCompra({ detalles: [{ ...detalle, precio_compra: -1 }] }, 'u1')
    ).rejects.toThrow(ValidationError);
  });

  it('rechaza presentación que no pertenece al producto', async () => {
    vi.mocked(listarPresentacionesPorProductos).mockResolvedValue({} as any);
    await expect(registrarCompra({ detalles: [detalle] }, 'u1')).rejects.toThrow('no pertenece');
  });

  it('rechaza producto inexistente', async () => {
    vi.mocked(productosPorIds).mockResolvedValue([]);
    await expect(registrarCompra({ detalles: [detalle] }, 'u1')).rejects.toThrow('Producto');
  });

  it('calcula el total en servidor y genera unidades en almacén', async () => {
    const compra = await registrarCompra(
      {
        detalles: [
          detalle,
          { ...detalle, presentacion_id: 'pres-2', cantidad: 2, precio_compra: 8000 }
        ],
        proveedor: 'Distribuidora Sur',
        telefono: '+56912345678'
      },
      'u1'
    );
    expect(compra.folio).toBe('C-0001');
    expect(crearCompra).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        total: 3 * 5000 + 2 * 8000,
        proveedor: 'Distribuidora Sur',
        telefono: '+56912345678',
        usuario_id: 'u1'
      }),
      [expect.objectContaining({ subtotal: 15000 }), expect.objectContaining({ subtotal: 16000 })]
    );
    expect(generarUnidades).toHaveBeenCalledTimes(2);
    expect(generarUnidades).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      'prod-1',
      3,
      'pres-1',
      'comp-1'
    );
    expect(generarUnidades).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      'prod-1',
      2,
      'pres-2',
      'comp-1'
    );
    expect(sincronizarStockTotal).toHaveBeenCalledTimes(1);
    expect(sincronizarStockTotal).toHaveBeenCalledWith(expect.anything(), 'prod-1');
    expect(BaseRepository.update).toHaveBeenCalledWith(
      expect.anything(),
      'inventario_presentaciones',
      'id',
      'pres-1',
      { precio_compra: 5000 }
    );
  });

  it('devuelve los códigos generados con producto, presentación y folio', async () => {
    const compra = await registrarCompra(
      {
        detalles: [
          detalle,
          { ...detalle, presentacion_id: 'pres-2', cantidad: 2, precio_compra: 8000 }
        ]
      },
      'u1'
    );

    expect(compra.codigos_generados).toHaveLength(5);
    expect(compra.codigos_generados[0]).toEqual({
      id: 'pres-1-u1',
      codigo: 'LM-pres-1-1',
      codigo_barras: '2900000000001',
      producto_id: 'prod-1',
      producto_nombre: 'Ron Habana',
      presentacion_id: 'pres-1',
      presentacion_nombre: 'Botella 750ml',
      compra_folio: 'C-0001'
    });
    // Los dos últimos son el six pack, con su propia presentación.
    expect(compra.codigos_generados.slice(3)).toEqual([
      expect.objectContaining({ id: 'pres-2-u1', presentacion_nombre: 'Six pack' }),
      expect.objectContaining({ id: 'pres-2-u2', presentacion_nombre: 'Six pack' })
    ]);
  });

  it('no inventa códigos cuando la compra no genera unidades', async () => {
    vi.mocked(generarUnidades).mockResolvedValue([]);
    const compra = await registrarCompra({ detalles: [detalle] }, 'u1');
    expect(compra.codigos_generados).toEqual([]);
  });
});
