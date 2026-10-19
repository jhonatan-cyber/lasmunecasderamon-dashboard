import { query } from '@/lib/database/db';

/** Preferencia compartida para detener la recepción automática en todas las instancias. */
export async function recepcionAutomaticaHabilitada(): Promise<boolean> {
  const rows = await query<{ clave: string; valor: string }[]>(
    `SELECT clave, valor FROM configuraciones
      WHERE clave IN ('biometric_recepcion_activa', 'biometric_ip_watch')`
  );
  const valores = new Map(rows.map(row => [row.clave, row.valor]));
  // Compatibilidad con instalaciones donde solo se había guardado el interruptor anterior.
  const valor = valores.get('biometric_recepcion_activa') ?? valores.get('biometric_ip_watch');
  return valor == null || !['false', '0'].includes(valor.toLowerCase());
}
