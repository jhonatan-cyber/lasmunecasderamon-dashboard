import { obtenerConfiguracionRecepcionAutomatica } from './repositorio';

/** Preferencia compartida para detener la recepción automática en todas las instancias. */
export async function recepcionAutomaticaHabilitada(): Promise<boolean> {
  const rows = await obtenerConfiguracionRecepcionAutomatica();
  const valores = new Map(rows.map(row => [row.clave, row.valor]));
  // Compatibilidad con instalaciones donde solo se había guardado el interruptor anterior.
  const valor = valores.get('biometric_recepcion_activa') ?? valores.get('biometric_ip_watch');
  return valor == null || !['false', '0'].includes(valor.toLowerCase());
}
