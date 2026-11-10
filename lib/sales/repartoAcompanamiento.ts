import type { AcompanamientoBotellaItem } from './acompanamientoBotella';

/**
 * Reparte un total de unidades de acompañamiento entre las entregas de una
 * línea: cada entrega recibe `unidadesPorEntrega` unidades y ningún sabor se
 * repite dentro de la misma entrega (el servidor lo rechaza).
 *
 * Ejemplo para cortes (1 unidad por entrega): 2 cocas y 1 sprite con 3 cortes
 * quedan `[coca]`, `[coca]`, `[sprite]`.
 */
export function dividirRepartoPorEntrega(
  reparto: AcompanamientoBotellaItem[],
  unidadesPorEntrega: number,
  entregas: number
): AcompanamientoBotellaItem[][] {
  const porEntrega = Math.max(1, Math.floor(Number(unidadesPorEntrega) || 0));
  const totalEntregas = Math.max(0, Math.floor(Number(entregas) || 0));
  const disponibles = reparto
    .map(sabor => ({ ...sabor, unidades: Math.max(0, Math.floor(Number(sabor.unidades) || 0)) }))
    .filter(sabor => sabor.unidades > 0);

  const resultado: AcompanamientoBotellaItem[][] = [];
  for (let indice = 0; indice < totalEntregas; indice += 1) {
    const grupo: AcompanamientoBotellaItem[] = [];
    let faltan = porEntrega;
    for (const sabor of disponibles) {
      if (faltan <= 0) break;
      if (sabor.unidades <= 0) continue;
      const tomar = Math.min(sabor.unidades, faltan);
      grupo.push({ ...sabor, unidades: tomar });
      sabor.unidades -= tomar;
      faltan -= tomar;
    }
    resultado.push(grupo);
  }
  return resultado;
}

/** Recorta el reparto a `maxUnidades`, conservando el orden de los sabores. */
export function recortarReparto(
  reparto: AcompanamientoBotellaItem[],
  maxUnidades: number
): AcompanamientoBotellaItem[] {
  let restante = Math.max(0, Math.floor(Number(maxUnidades) || 0));
  const resultado: AcompanamientoBotellaItem[] = [];
  for (const sabor of reparto) {
    if (restante <= 0) break;
    const unidades = Math.min(Math.max(0, Math.floor(Number(sabor.unidades) || 0)), restante);
    if (unidades <= 0) continue;
    resultado.push({ ...sabor, unidades });
    restante -= unidades;
  }
  return resultado;
}
