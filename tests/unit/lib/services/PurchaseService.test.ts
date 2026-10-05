import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PurchaseService } from '@/lib/services/PurchaseService';
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

vi.mock('@/lib/repositories/PurchaseRepository', () => ({
  PurchaseRepository: {
    create: vi.fn(async (_trx: any, data: any) => ({ id: 'comp-1', folio: 'C-0001', ...data })),
    list: vi.fn().mockResolvedValue([])
  }
}));

vi.mock('@/modules/inventario', () => ({
  listarPresentacionesPorProductos: vi.fn(),
  generarUnidades: vi.fn().mockResolvedValue([]),
  sincronizarStockTotal: vi.fn().mockResolvedValue(0)
}));

import {
  generarUnidades,
  listarPresentacionesPorProductos,
  sincronizarStockTotal
} from '@/modules/inventario';
import { PurchaseRepository } from '@/lib/repositories/PurchaseRepository';
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
  trxMock = vi.fn(async (sql: string) => {
    if (sql.includes('FROM productos')) return [{ id_producto: 'prod-1', nombre: 'Ron Habana' }];
    return [];
  });
  vi.mocked(listarPresentacionesPorProductos).mockResolvedValue({
    'prod-1': [
      { id: 'pres-1', nombre: 'Botella 750ml' },
      { id: 'pres-2', nombre: 'Six pack' }
    ]
  } as any);
  // Un código por unidad pedida, con id para poder marcarlo como impreso.
  vi.mocked(generarUnidades).mockImplementation(async (input, _contexto) =>
    Array.from({ length: input.cantidad }, (_, i) => ({
      id: `${input.presentacion_id}-u${i + 1}`,
      codigo: `LM-${input.presentacion_id}-${i + 1}`,
      codigo_barras: `29${String(i + 1).padStart(11, '0')}`
    }))
  );
  vi.mocked(withTransaction).mockImplementation(async (cb: any) => cb(trxMock));
});

describe('PurchaseService.registrarCompra', () => {
  it('rechaza compra sin detalles', async () => {
    await expect(PurchaseService.registrarCompra({ detalles: [] }, 'u1')).rejects.toThrow(
      ValidationError
    );
  });

  it('rechaza cantidad fuera de rango y precio negativo', async () => {
    await expect(
      PurchaseService.registrarCompra({ detalles: [{ ...detalle, cantidad: 0 }] }, 'u1')
    ).rejects.toThrow(ValidationError);
    await expect(
      PurchaseService.registrarCompra({ detalles: [{ ...detalle, precio_compra: -1 }] }, 'u1')
    ).rejects.toThrow(ValidationError);
  });

  it('rechaza presentación que no pertenece al producto', async () => {
    vi.mocked(listarPresentacionesPorProductos).mockResolvedValue({} as any);
    await expect(PurchaseService.registrarCompra({ detalles: [detalle] }, 'u1')).rejects.toThrow(
      'no pertenece'
    );
  });

  it('rechaza producto inexistente', async () => {
    trxMock = vi.fn(async () => []);
    vi.mocked(withTransaction).mockImplementation(async (cb: any) => cb(trxMock));
    await expect(PurchaseService.registrarCompra({ detalles: [detalle] }, 'u1')).rejects.toThrow(
      'Producto'
    );
  });

  it('calcula el total en servidor y genera unidades en almacén', async () => {
    const compra = await PurchaseService.registrarCompra(
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
    expect(PurchaseRepository.create).toHaveBeenCalledWith(
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
      {
        producto_id: 'prod-1',
        cantidad: 3,
        presentacion_id: 'pres-1',
        compra_id: 'comp-1'
      },
      expect.anything()
    );
    expect(generarUnidades).toHaveBeenNthCalledWith(
      2,
      {
        producto_id: 'prod-1',
        cantidad: 2,
        presentacion_id: 'pres-2',
        compra_id: 'comp-1'
      },
      expect.anything()
    );
    expect(sincronizarStockTotal).toHaveBeenCalledTimes(1);
    expect(sincronizarStockTotal).toHaveBeenCalledWith('prod-1', expect.anything());
    expect(BaseRepository.update).toHaveBeenCalledWith(
      expect.anything(),
      'inventario_presentaciones',
      'id',
      'pres-1',
      { precio_compra: 5000 }
    );
  });

  it('devuelve los códigos generados con producto, presentación y folio', async () => {
    const compra = await PurchaseService.registrarCompra(
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
    const compra = await PurchaseService.registrarCompra({ detalles: [detalle] }, 'u1');
    expect(compra.codigos_generados).toEqual([]);
  });
});
