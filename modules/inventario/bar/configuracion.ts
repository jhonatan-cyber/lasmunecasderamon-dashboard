import { query, type TransactionQuery } from '@/lib/database/db';

export type ConsultaInventario = TransactionQuery | typeof query;

export const DEFAULT_SHOT_ML = 50;
export const DEFAULT_BOTTLE_ML = 750;
export const DEFAULT_SHOTS_ALERTA = 3;

export async function getBarMlConfig(
  consultar: ConsultaInventario = query
): Promise<{ shotMl: number; botellaMl: number; shotsAlerta: number }> {
  try {
    const rows = await consultar<any[]>(
      "SELECT clave, valor FROM configuraciones WHERE clave IN ('shot_ml', 'botella_ml', 'shots_alerta')",
      []
    );
    const valores = new Map<string, number>();
    for (const row of rows) {
      const valor = Number(row?.valor);
      if (Number.isFinite(valor) && valor > 0) valores.set(String(row.clave), Math.floor(valor));
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

export async function getTopeSimple(consultar: ConsultaInventario = query): Promise<number> {
  try {
    const rows = await consultar<any[]>(
      "SELECT valor FROM configuraciones WHERE clave = 'umbral_simple_hasta' LIMIT 1",
      []
    );
    const valor = Number(rows[0]?.valor);
    return Number.isFinite(valor) && valor >= 0 ? Math.floor(valor) : 10000;
  } catch {
    return 10000;
  }
}
