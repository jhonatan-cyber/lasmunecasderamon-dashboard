/**
 * Ciclo de vida de la recepción biométrica — Fase 3, riesgo R4 de FASE0.
 *
 * Revisión del mecanismo previo, antes de cambiarlo (exigido por R4):
 *
 *  - `recordPoller`: su estado vive en `globalThis.__biometricPoller`, así que
 *    sobrevive a la recarga de módulos; `arrancarPoller` es idempotente.
 *  - `ipWatcher`: guard de módulo (`if (timer) return`). Idempotente dentro
 *    del proceso, pero el timer NO sobrevive una recarga de módulos: el módulo
 *    recién cargado volvería a crear otro intervalo encima del viejo.
 *  - `eventListener`: su `Map` de listeners es de módulo; al recargar,
 *    `encenderTodos` re-registra sin ver si el anterior sigue vivo.
 *
 * Esta API es el único punto de arranque (`instrumentation.ts` sólo la
 * llama): el guard vive en `globalThis`, sobrevive a la recarga de módulos —
 * el doble arranque que R4 describe — y `detenerRecepcionBiometrica` apaga
 * los tres subsistemas para un apagado ordenado.
 *
 * Multi-instancia: cada proceso Node enciende los suyos y los guards internos
 * impiden duplicarlos dentro de cada uno. Si una instancia no debe escuchar
 * (despliegue con el lector apagado), se apaga por flag de entorno como ya
 * hacen `BIOMETRIC_IP_WATCH` y `BIOMETRIC_POLLER_MS`; no por código.
 */
import { arrancarPoller, detenerPoller } from './biometrico/recordPoller';
import { encenderTodos, apagarListener, listenersActivos } from './biometrico/eventListener';
import { arrancarVigilanteIp, detenerVigilanteIp } from './biometrico/ipWatcher';

interface EstadoRecepcion {
  arrancada: boolean;
}

const estado = ((globalThis as Record<string, unknown>).__asistenciaRecepcion ??= {
  arrancada: false
}) as EstadoRecepcion;

/** Enciende poller + listeners en vivo + vigilancia de IP. Idempotente. */
export async function arrancarRecepcionBiometrica(): Promise<void> {
  if (estado.arrancada) return;
  estado.arrancada = true;
  try {
    arrancarPoller();
    await encenderTodos();
    arrancarVigilanteIp();
  } catch (error) {
    estado.arrancada = false;
    throw error;
  }
}

/** Apaga los tres subsistemas. Idempotente. */
export function detenerRecepcionBiometrica(): void {
  if (!estado.arrancada) return;
  for (const dispositivoId of listenersActivos()) apagarListener(dispositivoId);
  detenerPoller();
  detenerVigilanteIp();
  estado.arrancada = false;
}

/** Estado del ciclo de vida, para diagnóstico y tests. */
export function recepcionActiva(): boolean {
  return estado.arrancada;
}
