import type { OrdenReposicion } from '@/modules/inventario/contracts';
import { formatCurrencyCLP } from '@/lib/utils/formatters';

export const subtotalReposicion = (row: OrdenReposicion) => row.cantidad * row.precio_compra;
export const totalReposicion = (rows: OrdenReposicion[]) =>
  rows.reduce((total, row) => total + subtotalReposicion(row), 0);

export function textoOrdenReposicion(rows: OrdenReposicion[]): string {
  return [
    'ORDEN DE COMPRA · REPOSICIÓN',
    'Stock total = Bar + Bodega.',
    ...rows.map(
      row =>
        `${row.producto} · ${row.presentacion}\nComprar: ${row.cantidad} unidades.\nPrecio unitario de referencia: ${formatCurrencyCLP(row.precio_compra)}\nSubtotal estimado: ${formatCurrencyCLP(subtotalReposicion(row))}\nStock actual: ${row.stock_actual}; mínimo: ${row.stock_minimo}; máximo: ${row.stock_maximo}. Ref. ${row.id}`
    ),
    `TOTAL ESTIMADO: ${formatCurrencyCLP(totalReposicion(rows))}`,
    'Precios de referencia sugeridos a partir del precio de compra registrado en Bodega. El importe final puede variar según el proveedor.',
    'Cantidades calculadas para llegar al máximo, sin superarlo. Orden pendiente de compra; no registra un ingreso de mercadería.'
  ].join('\n\n');
}
