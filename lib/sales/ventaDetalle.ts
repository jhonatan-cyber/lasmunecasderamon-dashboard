// Cómo se vendió un ítem del carro, tal como queda en detalle_ventas (migración 039).
// Un shot se sirve por ml de la botella abierta y puede cobrarse a precio de cliente o
// a precio de anfitriona (opciones_venta.precio_anfitriona de la presentación).
import type { SaleType } from '@/types/sale-options';

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
