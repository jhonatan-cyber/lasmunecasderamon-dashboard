/**
 * Ciclo de vida de la recepción biométrica — Fase 3, riesgo R4 de FASE0.
 *
 * Revisión del mecanismo previo, antes de cambiarlo (exigido por R4):
 *
 *  - `recordPoller`: su estado vive en `globalThis.__biometricPoller`, así que
 *    sobrevive a la recarga de módulos; `arrancarPoller` es idempotente.
 *  - `ipWatcher` y `eventListener`: timers, listeners y AbortControllers viven
 *    en `globalThis`, así el control general puede detenerlos tras una recarga
 *    de módulos del servidor de desarrollo.
 *
 * Esta API es el único punto de arranque (`instrumentation.ts` sólo la
 * llama): el guard vive en `globalThis`, sobrevive a la recarga de módulos —
 * el doble arranque que R4 describe — y `detenerRecepcionBiometrica` apaga
 * los tres subsistemas para un apagado ordenado.
 *
 * Multi-instancia: un advisory lock de PostgreSQL elige un único proceso para
 * mantener conexiones con los lectores. Los demás esperan el lock sin arrancar
 * pollers ni listeners.
 */
import type { PoolClient } from 'pg';
import { arrancarPoller, detenerPoller } from './biometrico/recordPoller';
import { encenderTodos, apagarListener, listenersActivos } from './biometrico/eventListener';
import { arrancarVigilanteIp, detenerVigilanteIp } from './biometrico/ipWatcher';
import {
  adquirirLockRecepcion,
  liberarLockRecepcion
} from './biometrico/infraestructura/recepcionLock';
import { recepcionAutomaticaHabilitada } from './biometrico/recepcionConfig';

const RETRY_LOCK_MS = 30_000;

interface EstadoRecepcion {
  arrancada: boolean;
  arrancando: boolean;
  lockClient: PoolClient | null;
  lockErrorHandler: ((error: Error) => void) | null;
  retryTimer: NodeJS.Timeout | null;
  generation: number;
}

const estado = ((globalThis as Record<string, unknown>).__asistenciaRecepcion ??= {
  arrancada: false,
  arrancando: false,
  lockClient: null,
  lockErrorHandler: null,
  retryTimer: null,
  generation: 0
}) as EstadoRecepcion;
estado.arrancando ??= false;
estado.lockClient ??= null;
estado.lockErrorHandler ??= null;
estado.retryTimer ??= null;
estado.generation ??= 0;

function detenerSubsistemas(): void {
  for (const dispositivoId of listenersActivos()) apagarListener(dispositivoId);
  detenerPoller();
  detenerVigilanteIp();
}

function programarReintento(): void {
  if (estado.retryTimer) return;
  estado.retryTimer = setTimeout(() => {
    estado.retryTimer = null;
    void arrancarRecepcionBiometrica().catch(error => {
      console.error('[asistencia] No se pudo reintentar el liderazgo biométrico', error);
    });
  }, RETRY_LOCK_MS);
  estado.retryTimer.unref?.();
}

async function liberarLock(): Promise<void> {
  const client = estado.lockClient;
  if (!client) return;
  estado.lockClient = null;
  if (estado.lockErrorHandler) client.removeListener('error', estado.lockErrorHandler);
  estado.lockErrorHandler = null;
  await liberarLockRecepcion(client);
}

/** Enciende poller + listeners en vivo + vigilancia de IP. Idempotente. */
export async function arrancarRecepcionBiometrica(): Promise<void> {
  if (estado.arrancada || estado.arrancando) return;
  estado.arrancando = true;
  const generation = estado.generation;
  try {
    if (!(await recepcionAutomaticaHabilitada())) return;
    if (generation !== estado.generation) return;

    const client = await adquirirLockRecepcion();
    if (!client) {
      console.warn('[asistencia] Otra instancia mantiene la recepción biométrica');
      if (generation === estado.generation) programarReintento();
      return;
    }

    estado.lockClient = client;
    if (generation !== estado.generation) {
      await liberarLock();
      return;
    }
    const manejarErrorLock = (error: Error) => {
      if (estado.lockClient !== client) return;
      estado.lockClient = null;
      estado.lockErrorHandler = null;
      void liberarLockRecepcion(client, true);
      if (estado.arrancada) detenerSubsistemas();
      estado.arrancada = false;
      console.error('[asistencia] Se perdió el lock de recepción biométrica', error);
      programarReintento();
    };
    estado.lockErrorHandler = manejarErrorLock;
    client.on('error', manejarErrorLock);
    estado.arrancada = true;

    arrancarPoller();
    await encenderTodos();
    if (estado.lockClient !== client) {
      detenerSubsistemas();
      return;
    }
    arrancarVigilanteIp();
  } catch (error) {
    estado.arrancada = false;
    detenerSubsistemas();
    await liberarLock();
    if (generation === estado.generation) programarReintento();
    throw error;
  } finally {
    estado.arrancando = false;
  }
}

/** Interruptor general de la recepción automática del lector. */
export async function configurarRecepcionBiometrica(encender: boolean): Promise<void> {
  if (encender) await arrancarRecepcionBiometrica();
  else await detenerRecepcionBiometrica();
}

/** Apaga los tres subsistemas. Idempotente. */
export async function detenerRecepcionBiometrica(): Promise<void> {
  estado.generation++;
  if (estado.retryTimer) clearTimeout(estado.retryTimer);
  estado.retryTimer = null;
  if (!estado.arrancada && !estado.lockClient) return;
  if (estado.arrancada) detenerSubsistemas();
  estado.arrancada = false;
  await liberarLock();
}

/** Estado del ciclo de vida, para diagnóstico y tests. */
export function recepcionActiva(): boolean {
  return estado.arrancada;
}
