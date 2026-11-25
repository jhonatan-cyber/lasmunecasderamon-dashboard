import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  transactionQuery: vi.fn(),
  withTransaction: vi.fn()
}));

vi.mock('@/lib/database/db', () => ({
  query: mocks.query,
  withTransaction: mocks.withTransaction
}));

import {
  agruparStockConciliacion,
  reclasificarStockPendiente
} from '@/modules/inventario/reconciliacion/servicio';

describe('conciliación de stock por presentación', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.withTransaction.mockImplementation(
      (callback: (trx: typeof mocks.transactionQuery) => unknown) =>
        callback(mocks.transactionQuery)
    );
    mocks.transactionQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT id_producto FROM productos')) return [{ id_producto: 'product-1' }];
      if (sql.includes('SELECT id, nombre FROM inventario_presentaciones'))
        return [
          { id: 'legacy', nombre: 'Stock legado (formato por confirmar)' },
          { id: 'target', nombre: 'Botella 750 ml' }
        ];
      if (sql.includes('SELECT id FROM inventario_movimientos')) return [];
      if (sql.includes('SELECT id, codigo, codigo_barras FROM inventario_unidades'))
        return [{ id: 'unit-1', codigo: 'LM-000001', codigo_barras: '1234567890128' }];
      if (sql.includes('UPDATE inventario_unidades')) return [{ id: 'unit-1' }];
      throw new Error(`Consulta no esperada en prueba: ${sql}`);
    });
  });

  it('agrupa stock por producto y marca formatos provisionales sin ocultar destinos', () => {
    const products = agruparStockConciliacion([
      {
        producto_id: 'product-1',
        producto_nombre: 'Vino de prueba',
        producto_codigo: 'V-1',
        stock_producto: 2,
        stock_unidades: 2,
        presentacion_id: 'legacy',
        presentacion_nombre: 'Stock legado (formato por confirmar)',
        stock_presentacion: 2
      },
      {
        producto_id: 'product-1',
        producto_nombre: 'Vino de prueba',
        producto_codigo: 'V-1',
        stock_producto: 2,
        stock_unidades: 2,
        presentacion_id: 'target',
        presentacion_nombre: 'Botella 750 ml',
        stock_presentacion: 0
      }
    ]);

    expect(products).toEqual([
      {
        productoId: 'product-1',
        productoNombre: 'Vino de prueba',
        productoCodigo: 'V-1',
        stockProducto: 2,
        stockUnidades: 2,
        discrepanciaStock: false,
        presentaciones: [
          {
            id: 'legacy',
            nombre: 'Stock legado (formato por confirmar)',
            stockBodega: 2,
            pendiente: true
          },
          { id: 'target', nombre: 'Botella 750 ml', stockBodega: 0, pendiente: false }
        ]
      }
    ]);
  });

  it('reclasifica solo los códigos escaneados que siguen en bodega', async () => {
    await expect(
      reclasificarStockPendiente({
        productoId: 'product-1',
        presentacionOrigenId: 'legacy',
        presentacionDestinoId: 'target',
        codigosUnidades: ['1234567890128']
      })
    ).resolves.toBe(1);

    expect(mocks.transactionQuery).toHaveBeenCalledWith(
      expect.stringContaining("estado = 'almacen' AND ubicacion = 'almacen'"),
      expect.any(Array)
    );
  });

  it('no modifica unidades cuando un código ya no pertenece al stock pendiente de bodega', async () => {
    mocks.transactionQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT id_producto FROM productos')) return [{ id_producto: 'product-1' }];
      if (sql.includes('SELECT id, nombre FROM inventario_presentaciones'))
        return [
          { id: 'legacy', nombre: 'Stock legado (formato por confirmar)' },
          { id: 'target', nombre: 'Botella 750 ml' }
        ];
      if (sql.includes('SELECT id FROM inventario_movimientos')) return [];
      if (sql.includes('SELECT id, codigo, codigo_barras FROM inventario_unidades')) return [];
      return [];
    });

    await expect(
      reclasificarStockPendiente({
        productoId: 'product-1',
        presentacionOrigenId: 'legacy',
        presentacionDestinoId: 'target',
        codigosUnidades: ['NO-ESTA-EN-BODEGA']
      })
    ).rejects.toThrow('No se encontraron todas las unidades seleccionadas en Bodega');
    expect(mocks.transactionQuery).not.toHaveBeenCalledWith(
      expect.stringContaining('UPDATE inventario_unidades'),
      expect.any(Array)
    );
  });

  it('no inicia transacción para una lista de códigos duplicada', async () => {
    await expect(
      reclasificarStockPendiente({
        productoId: 'product-1',
        presentacionOrigenId: 'legacy',
        presentacionDestinoId: 'target',
        codigosUnidades: ['1234567890128', ' 1234567890128 ']
      })
    ).rejects.toThrow('Escanea entre 1 y 200 códigos de unidad únicos');
    expect(mocks.withTransaction).not.toHaveBeenCalled();
  });

  it('detiene la conciliación si hay un traspaso pendiente del producto y presentación', async () => {
    mocks.transactionQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT id_producto FROM productos')) return [{ id_producto: 'product-1' }];
      if (sql.includes('SELECT id, nombre FROM inventario_presentaciones'))
        return [
          { id: 'legacy', nombre: 'Stock legado (formato por confirmar)' },
          { id: 'target', nombre: 'Botella 750 ml' }
        ];
      if (sql.includes('SELECT id FROM inventario_movimientos')) return [{ id: 'transfer-1' }];
      return [];
    });

    await expect(
      reclasificarStockPendiente({
        productoId: 'product-1',
        presentacionOrigenId: 'legacy',
        presentacionDestinoId: 'target',
        codigosUnidades: ['1234567890128']
      })
    ).rejects.toThrow('Recibe o cancela la transferencia pendiente antes de conciliar');
    expect(mocks.transactionQuery).not.toHaveBeenCalledWith(
      expect.stringContaining('UPDATE inventario_unidades'),
      expect.any(Array)
    );
  });
});
