import type { StockReconciliationProduct } from '../contracts';

export const NOMBRES_PRESENTACION_PENDIENTE = [
  'Stock legado (formato por confirmar)',
  'Formato por confirmar'
] as const;

export type StockReconciliationRow = {
  producto_id: string;
  producto_nombre: string;
  producto_codigo: string | null;
  stock_producto: number | string;
  stock_unidades: number | string;
  presentacion_id: string | null;
  presentacion_nombre: string | null;
  stock_presentacion: number | string;
};

export function esPresentacionPendiente(nombre: string): boolean {
  return NOMBRES_PRESENTACION_PENDIENTE.includes(
    nombre as (typeof NOMBRES_PRESENTACION_PENDIENTE)[number]
  );
}

export function agruparStockConciliacion(
  rows: StockReconciliationRow[]
): StockReconciliationProduct[] {
  const productos = new Map<string, StockReconciliationProduct>();

  for (const row of rows) {
    let producto = productos.get(row.producto_id);
    if (!producto) {
      const stockProducto = Number(row.stock_producto);
      const stockUnidades = Number(row.stock_unidades);
      producto = {
        productoId: row.producto_id,
        productoNombre: row.producto_nombre,
        productoCodigo: row.producto_codigo,
        stockProducto,
        stockUnidades,
        discrepanciaStock: stockProducto !== stockUnidades,
        presentaciones: []
      };
      productos.set(row.producto_id, producto);
    }

    if (!row.presentacion_id || !row.presentacion_nombre) continue;
    producto.presentaciones.push({
      id: row.presentacion_id,
      nombre: row.presentacion_nombre,
      stockBodega: Number(row.stock_presentacion),
      pendiente: esPresentacionPendiente(row.presentacion_nombre)
    });
  }

  return [...productos.values()];
}
