import type { OrdenReposicion } from '@/modules/inventario/contracts';
import { formatCurrencyCLP } from '@/lib/utils/formatters';

export const subtotalReposicion = (row: OrdenReposicion) => row.cantidad * row.precio_compra;
export const totalReposicion = (rows: OrdenReposicion[]) =>
  rows.reduce((total, row) => total + subtotalReposicion(row), 0);

export const REPLENISHMENT_PURCHASE_DRAFT_KEY = 'purchases:replenishment-draft';
export interface CompraPresetReposicion {
  presentacion_id: string;
  cantidad: number;
}

export function guardarBorradorCompraReposicion(rows: OrdenReposicion[]): void {
  const presets: CompraPresetReposicion[] = rows.map(row => ({
    presentacion_id: row.presentacion_id,
    cantidad: row.cantidad
  }));
  try {
    if (presets.length) {
      window.sessionStorage.setItem(REPLENISHMENT_PURCHASE_DRAFT_KEY, JSON.stringify(presets));
    } else {
      window.sessionStorage.removeItem(REPLENISHMENT_PURCHASE_DRAFT_KEY);
    }
  } catch {}
}

export function leerBorradorCompraReposicion(): CompraPresetReposicion[] {
  try {
    const raw = window.sessionStorage.getItem(REPLENISHMENT_PURCHASE_DRAFT_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is CompraPresetReposicion =>
        Boolean(item) &&
        typeof (item as CompraPresetReposicion).presentacion_id === 'string' &&
        Number.isInteger((item as CompraPresetReposicion).cantidad) &&
        (item as CompraPresetReposicion).cantidad > 0
    );
  } catch {
    return [];
  }
}

export function limpiarBorradorCompraReposicion(): void {
  try {
    window.sessionStorage.removeItem(REPLENISHMENT_PURCHASE_DRAFT_KEY);
  } catch {}
}

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
