/**
 * Lecturas de `configuraciones` que usa el inventario. Tolerantes a propósito: si la clave
 * no está guardada, devuelven el default en vez de fallar, porque son valores de operación y
 * un día de bar no puede caerse porque falte una fila.
 */
import { query } from '@/lib/database/db';
import type { Queryable } from './inventoryTypes';

/** Defaults de servir shots cuando Configuraciones no tiene las claves. */
export const DEFAULT_SHOT_ML = 50;
export const DEFAULT_BOTTLE_ML = 750;
/** Shots restantes con los que una botella abierta entra en "por agotarse". */
export const DEFAULT_SHOTS_ALERTA = 3;

/**
 * Configuración de tragos (`shot_ml`, `botella_ml` y `shots_alerta`). Es tolerante a
 * propósito: sin las claves guardadas se sirve con 50 ml por shot, se asume una botella de
 * 750 ml y se avisa al llegar a 3 shots restantes.
 */
export async function getBarMlConfig(
  trx: Queryable = query
): Promise<{ shotMl: number; botellaMl: number; shotsAlerta: number }> {
  try {
    const rows = await trx<any[]>(
      "SELECT clave, valor FROM configuraciones WHERE clave IN ('shot_ml', 'botella_ml', 'shots_alerta')",
      []
    );
    const valores = new Map<string, number>();
    for (const row of rows) {
      const n = Number(row?.valor);
      if (Number.isFinite(n) && n > 0) valores.set(String(row.clave), Math.floor(n));
    }
    return {
      shotMl: valores.get('shot_ml') ?? DEFAULT_SHOT_ML,
      botellaMl: valores.get('botella_ml') ?? DEFAULT_BOTTLE_ML,
      shotsAlerta: valores.get('shots_alerta') ?? DEFAULT_SHOTS_ALERTA
    };
  } catch {
    return {
      shotMl: DEFAULT_SHOT_ML,
      botellaMl: DEFAULT_BOTTLE_ML,
      shotsAlerta: DEFAULT_SHOTS_ALERTA
    };
  }
}

/** Tope de venta simple (`umbral_simple_hasta`). Tolerante: 10000 si falta la clave. */
export async function getTopeSimple(trx: Queryable = query): Promise<number> {
  try {
    const rows = await trx<any[]>(
      "SELECT valor FROM configuraciones WHERE clave = 'umbral_simple_hasta' LIMIT 1",
      []
    );
    const n = Number(rows[0]?.valor);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 10000;
  } catch {
    return 10000;
  }
}
