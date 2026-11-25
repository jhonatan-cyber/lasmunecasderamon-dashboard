import { query, type TransactionQuery } from '@/lib/database/db';

export type ConsultaInventario = TransactionQuery | typeof query;

export async function leerConfiguracionBar(
  consultar: ConsultaInventario = query
): Promise<Array<{ clave: string; valor: string | null }>> {
  return consultar(
    "SELECT clave, valor FROM configuraciones WHERE clave IN ('shot_ml', 'botella_ml', 'shots_alerta', 'merma_shots_ml')",
    []
  );
}

export async function leerValorConfiguracionBar(
  clave: 'acompanamiento_max_ml' | 'umbral_simple_hasta',
  consultar: ConsultaInventario = query
): Promise<Array<{ valor: string | null }>> {
  return consultar('SELECT valor FROM configuraciones WHERE clave = ? LIMIT 1', [clave]);
}
