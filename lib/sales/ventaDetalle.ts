// Cómo se vendió un ítem del carro, tal como queda en detalle_ventas (migración 039).
// Un shot se sirve por ml de la botella abierta y puede cobrarse a precio de cliente o
// a precio de anfitriona (opciones_venta.precio_anfitriona de la presentación).
import type { SaleType } from '@/types/sale-options';
import type { VentaDetalle } from '@/types/venta';

/** Compone líneas comerciales sin exponer las filas auxiliares del reparto de comisión. */
export function agruparProductosVenta(detalles: VentaDetalle[]): VentaDetalle[] {
  const grupos = new Map<string, VentaDetalle>();
  for (const detalle of detalles) {
    const key = JSON.stringify([
      detalle.producto_id,
      detalle.presentacion_id ?? null,
      Number(detalle.precio),
      detalle.tipo_venta ?? 'botella',
      Boolean(detalle.shot_anfitriona)
    ]);
    const grupo = grupos.get(key);
    if (!grupo) grupos.set(key, { ...detalle });
    else {
      grupo.cantidad += Number(detalle.cantidad);
      grupo.sub_total += Number(detalle.sub_total);
      grupo.comision += Number(detalle.comision);
    }
  }
  return [...grupos.values()].filter(d => Number(d.cantidad) > 0 || Number(d.sub_total) !== 0);
}

export interface DetalleConTipo {
  /** 'botella' (entera) o 'shot' (por ml). Ausente en datos anteriores a la 039. */
  tipo_venta?: SaleType | string | null;
  /** true si el shot se cobró al precio de anfitriona. Solo aplica a los shots. */
  shot_anfitriona?: boolean | null;
}

/** Un detalle es shot cuando se sirve por ml, sin importar a qué precio se cobró. */
export function esShot(detalle: DetalleConTipo): boolean {
  return detalle.tipo_venta === 'shot';
}

export type EtiquetaVentaDetalle = 'Botella' | 'Shot cliente' | 'Shot anfitriona';

/** Etiqueta corta para listados: qué se vendió y, si es shot, a quién se le cobró. */
export function etiquetaVentaDetalle(detalle: DetalleConTipo): EtiquetaVentaDetalle {
  if (!esShot(detalle)) return 'Botella';
  return detalle.shot_anfitriona ? 'Shot anfitriona' : 'Shot cliente';
}
