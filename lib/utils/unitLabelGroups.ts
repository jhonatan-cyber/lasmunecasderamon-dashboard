import { getSystemTimezone } from '@/lib/business/timezoneService';

export interface LabelUnit {
  id: string;
  codigo: string;
  codigo_barras?: string | null;
  compra_folio?: string | null;
  fecha_crea?: string | null;
  fecha_impresion?: string | null;
  estado?: string;
  presentacion_id?: string | null;
  producto_nombre?: string | null;
  presentacion_nombre?: string | null;
}

/**
 * "Product" agrupa por producto; "presentation" separa el producto por su
 * presentación, que es la unidad real de compra y venta.
 */
export type LabelGroupBy = 'purchase' | 'date' | 'product' | 'presentation';

function presentationTitle(unit: LabelUnit): string {
  const partes = [unit.producto_nombre?.trim(), unit.presentacion_nombre?.trim()].filter(Boolean);
  return partes.length ? partes.join(' · ') : 'Sin presentación';
}

export function labelDate(value?: string | null) {
  if (!value) return 'Sin fecha';
  if (!/(Z|[+-]\d{2}:?\d{2})$/.test(value)) return value.slice(0, 10);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return new Intl.DateTimeFormat('sv-SE', { timeZone: getSystemTimezone() }).format(date);
}

export function groupLabelUnits(units: LabelUnit[], by: LabelGroupBy) {
  const groups = new Map<string, LabelUnit[]>();
  for (const unit of units) {
    const title =
      by === 'product'
        ? unit.producto_nombre?.trim() || 'Sin producto'
        : by === 'presentation'
          ? presentationTitle(unit)
          : by === 'purchase' && unit.compra_folio
            ? `Compra ${unit.compra_folio}`
            : `${by === 'purchase' ? 'Sin compra · ' : ''}${labelDate(unit.fecha_crea)}`;
    const group = groups.get(title) ?? [];
    group.push(unit);
    groups.set(title, group);
  }
  return [...groups].map(([title, items]) => ({ title, units: items }));
}
