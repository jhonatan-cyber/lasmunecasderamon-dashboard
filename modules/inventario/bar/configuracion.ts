import { leerConfiguracionBar, leerValorConfiguracionBar } from './configuracionRepositorio';
import type { ConsultaInventario } from './configuracionRepositorio';

export const DEFAULT_SHOT_ML = 50;
export const DEFAULT_BOTTLE_ML = 750;
export const DEFAULT_SHOTS_ALERTA = 3;
export const DEFAULT_MERMA_SHOTS_ML = 50;
export const DEFAULT_ACOMPANAMIENTO_MAX_ML = 500;

export async function getBarMlConfig(
  consultar?: ConsultaInventario
): Promise<{ shotMl: number; botellaMl: number; shotsAlerta: number; mermaShotsMl: number }> {
  try {
    const rows = await leerConfiguracionBar(consultar);
    const valores = new Map<string, number>();
    for (const row of rows) {
      const valor = Number(row?.valor);
      if (Number.isFinite(valor) && valor >= 0 && (valor > 0 || row.clave === 'merma_shots_ml')) {
        valores.set(String(row.clave), Math.floor(valor));
      }
    }
    return {
      shotMl: valores.get('shot_ml') ?? DEFAULT_SHOT_ML,
      botellaMl: valores.get('botella_ml') ?? DEFAULT_BOTTLE_ML,
      shotsAlerta: valores.get('shots_alerta') ?? DEFAULT_SHOTS_ALERTA,
      mermaShotsMl: valores.get('merma_shots_ml') ?? DEFAULT_MERMA_SHOTS_ML
    };
  } catch {
    return {
      shotMl: DEFAULT_SHOT_ML,
      botellaMl: DEFAULT_BOTTLE_ML,
      shotsAlerta: DEFAULT_SHOTS_ALERTA,
      mermaShotsMl: DEFAULT_MERMA_SHOTS_ML
    };
  }
}

export async function getAcompanamientoMaxMl(consultar?: ConsultaInventario): Promise<number> {
  try {
    const rows = await leerValorConfiguracionBar('acompanamiento_max_ml', consultar);
    const valor = Number(rows[0]?.valor);
    return Number.isFinite(valor) && valor > 0 ? Math.floor(valor) : DEFAULT_ACOMPANAMIENTO_MAX_ML;
  } catch {
    return DEFAULT_ACOMPANAMIENTO_MAX_ML;
  }
}

export async function getTopeSimple(consultar?: ConsultaInventario): Promise<number> {
  try {
    const rows = await leerValorConfiguracionBar('umbral_simple_hasta', consultar);
    const valor = Number(rows[0]?.valor);
    return Number.isFinite(valor) && valor >= 0 ? Math.floor(valor) : 10000;
  } catch {
    return 10000;
  }
}
