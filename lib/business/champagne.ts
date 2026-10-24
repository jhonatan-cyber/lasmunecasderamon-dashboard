// Tabla de precios del champagne por cantidad de anfitrionas.
// Los tramos viven por producto en `producto_champagne_tiers` (configuración
// dinámica). No hay tabla por defecto: un producto de champaña sin tramos y sin
// máximo explícito no tiene cómo cobrarse y la venta se bloquea.

export interface ChampagneTier {
  anfitrionas: number;
  precio: number;
  comision: number;
}

/** Categoría de champaña, sin acentos ni mayúsculas. */
export function esCategoriaChampagne(categoria: unknown): boolean {
  const texto = String(categoria ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  return texto.includes('champagne') || texto.includes('champana') || texto.includes('shampana');
}

/** Mensaje único para el bloqueo, en UI y en validación de servidor. */
export const MENSAJE_CHAMPAGNE_SIN_CONFIGURAR =
  'El producto de champaña no tiene configurada la tabla de precios por anfitrionas';

/**
 * Sin máximo explícito ni tramos propios el producto no tiene precio por
 * cantidad de anfitrionas: hay que configurarlo antes de venderlo.
 */
export function faltaConfiguracionChampagne(
  maxAnfitrionas: unknown,
  tiers: Array<{ anfitrionas: number }>
): boolean {
  return !(Number(maxAnfitrionas) > 0) && tiers.length === 0;
}

/** Devuelve el tier aplicable a N anfitrionas (tope: último tier). */
export function champagneTierFor(n: number, tiers: ChampagneTier[]): ChampagneTier {
  const ordenados = [...tiers].sort((a, b) => a.anfitrionas - b.anfitrionas);
  const count = Math.max(1, Math.floor(n));
  let elegido = ordenados[0];
  for (const tier of ordenados) {
    if (tier.anfitrionas <= count) elegido = tier;
  }
  return elegido;
}

/** Comisión por anfitriona repartiendo el pozo del tier en partes iguales. */
export function champagneComisionPorAnfitriona(n: number, tiers: ChampagneTier[]): number {
  const count = Math.max(1, Math.floor(n));
  return Math.floor(champagneTierFor(count, tiers).comision / count);
}
