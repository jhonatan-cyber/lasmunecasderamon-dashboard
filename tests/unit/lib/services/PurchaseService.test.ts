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

vi.mock('@/lib/repositories/InventoryRepository', () => ({
  InventoryRepository: {
    listPresentationsByProducts: vi.fn(),
    generateUnits: vi.fn().mockResolvedValue([]),
    syncStockTotal: vi.fn().mockResolvedValue(0)
  }
}));

import { InventoryRepository } from '@/lib/repositories/InventoryRepository';
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
    if (sql.includes('FROM productos')) return [{ id_producto: 'prod-1' }];
    return [];
  });
  vi.mocked(InventoryRepository.listPresentationsByProducts).mockResolvedValue({
    'prod-1': [{ id: 'pres-1' }, { id: 'pres-2' }]
  } as any);
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
    vi.mocked(InventoryRepository.listPresentationsByProducts).mockResolvedValue({} as any);
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
    expect(InventoryRepository.generateUnits).toHaveBeenCalledTimes(2);
    expect(InventoryRepository.generateUnits).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      'prod-1',
      3,
      'pres-1',
      'comp-1'
    );
    expect(InventoryRepository.generateUnits).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      'prod-1',
      2,
      'pres-2',
      'comp-1'
    );
    expect(InventoryRepository.syncStockTotal).toHaveBeenCalledTimes(1);
    expect(InventoryRepository.syncStockTotal).toHaveBeenCalledWith(expect.anything(), 'prod-1');
    expect(BaseRepository.update).toHaveBeenCalledWith(
      expect.anything(),
      'inventario_presentaciones',
      'id',
      'pres-1',
      { precio_compra: 5000 }
    );
  });
});
