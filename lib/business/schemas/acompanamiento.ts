import { z } from 'zod';
import type { AcompanamientoBotellaItem } from '@/types/venta';

/** Un sabor elegido como acompañamiento de una botella, con sus unidades. */
export const acompanamientoBotellaItemSchema = z.object({
  presentacion_id: z.string().min(1),
  unidades: z.number().int().min(1).max(1000),
  // Precio del acompañamiento al momento de la venta: con él se calcula el
  // recargo sobre el tope configurado.
  precio: z.number().min(0).optional()
});

/**
 * Las unidades de bebida de UNA botella se reparten entre uno o varios sabores.
 * Se sigue aceptando el formato antiguo (un solo sabor) y siempre se normaliza a
 * una lista, para que el resto del código tenga una sola forma que leer.
 */
export const acompanamientoBotellaSchema = z
  .union([acompanamientoBotellaItemSchema, z.array(acompanamientoBotellaItemSchema).min(1).max(50)])
  .transform(items => (Array.isArray(items) ? items : [items]));

/**
 * La bebida de cada sabor debe ser distinta de la presentación vendida y ningún
 * sabor puede repetirse: repartir 3 unidades entre dos filas del mismo sabor
 * ocultaría el reparto real.
 */
export function saboresAcompanamientoValidos(
  presentacionId: string | null | undefined,
  items: AcompanamientoBotellaItem[]
): boolean {
  const ids = items.map(item => item.presentacion_id);
  return (
    Boolean(presentacionId) &&
    ids.length > 0 &&
    new Set(ids).size === ids.length &&
    ids.every(id => id !== presentacionId)
  );
}
