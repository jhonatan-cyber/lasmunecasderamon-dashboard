// Tabla de precios del champagne por cantidad de anfitrionas.
// Regla del club: base 40.000 de comisión con 1-2 anfitrionas y +20.000
// por cada anfitriona extra. Precios: 1-2 → 120.000, 3 → 160.000,
// 4 → 180.000, 5 → 200.000.

export interface ChampagneTier {
  anfitrionas: number;
  precio: number;
  comision: number;
}

export const CHAMPAGNE_DEFAULT_TIERS: ChampagneTier[] = [
  { anfitrionas: 1, precio: 120000, comision: 40000 },
  { anfitrionas: 2, precio: 120000, comision: 40000 },
  { anfitrionas: 3, precio: 160000, comision: 60000 },
  { anfitrionas: 4, precio: 180000, comision: 80000 },
  { anfitrionas: 5, precio: 200000, comision: 100000 }
];

export const CHAMPAGNE_MAX_ANFITRIONAS = 5;

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
