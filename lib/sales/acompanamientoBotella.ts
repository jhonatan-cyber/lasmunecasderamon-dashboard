import type { AcompanamientoBotella, AcompanamientoBotellaItem } from '@/types/venta';
import type { SaleOption } from '@/types/sale-options';

export type { AcompanamientoBotella, AcompanamientoBotellaItem };

export function acompanamientoElegibleParaVentaOCover(
  opcion?: Pick<SaleOption, 'en_venta' | 'cover_habilitado'> | null
): boolean {
  if (!opcion) return true;
  const tieneConfiguracionDeElegibilidad =
    opcion.en_venta !== undefined || opcion.cover_habilitado !== undefined;
  if (!tieneConfiguracionDeElegibilidad) return true;
  return opcion.en_venta === true || opcion.cover_habilitado === true;
}

/**
 * El acompañamiento de una botella reparte las unidades de bebida configuradas
 * en la presentación entre uno o varios sabores (2 fantas, 1 cocacola, 1 agua).
 *
 * La lista describe el acompañamiento de UNA unidad del producto: la suma de
 * `unidades` debe coincidir con lo configurado. Al vender `cantidad` unidades el
 * consumo total es `cantidad × suma`.
 *
 * Se acepta también el formato antiguo —un solo sabor— para leer sin migrar los
 * registros ya guardados.
 */
export function normalizarAcompanamientoBotella(
  value: AcompanamientoBotella | null | undefined
): AcompanamientoBotellaItem[] {
  if (!value) return [];
  const items = Array.isArray(value) ? value : [value];
  return items
    .filter(item => item && item.presentacion_id && Number.isFinite(Number(item.unidades)))
    .map(item => ({
      presentacion_id: String(item.presentacion_id),
      unidades: Math.floor(Number(item.unidades)),
      ...(item.nombre !== undefined ? { nombre: item.nombre } : {}),
      ...(item.foto !== undefined ? { foto: item.foto } : {}),
      ...(item.precio !== undefined ? { precio: Number(item.precio) } : {})
    }));
}

/** Unidades de bebida que reparte el acompañamiento de una unidad del producto. */
export function totalUnidadesAcompanamientoBotella(
  value: AcompanamientoBotella | null | undefined
): number {
  return normalizarAcompanamientoBotella(value).reduce((sum, item) => sum + item.unidades, 0);
}
