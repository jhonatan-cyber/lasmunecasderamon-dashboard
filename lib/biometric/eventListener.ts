import { query, generateUUID } from '@/lib/database/db';
import { BaseRepository } from '@/lib/repositories/BaseRepository';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { procesarEventoBiometrico } from '@/lib/biometric/processBiometricEvent';
import { credencialesDeFila, type CredencialesEquipo } from '@/lib/biometric/deviceClient';
import {
  EventManagerNoSoportadoError,
  abrirFlujoEventos,
  type EventoDelEquipo
} from '@/lib/biometric/eventStreamClient';
import type { BiometricMetodo } from '@/lib/biometric/types';
import logger from '@/lib/utils/logger';

/**
 * Listeners EN VIVO por equipo.
 *
 * Supervisor que mantiene una conexión `eventManager.cgi?action=attach` abierta
 * con cada equipo habilitado. Cuando la persona se pone frente al lector, el
 * equipo escribe el evento en el stream y acá:
 *
 *   1. se marca como visto (dedupe técnico en `biometric_device_records`),
 *   2. se procesa con `procesarEventoBiometrico` (misma regla que las demás
 *      vías: usuario activo, una asistencia por día, ventana horaria, SSE).
 *
 * La latencia es sub-segundo: la pantalla del local refresca al instante.
 *
 * Robustez:
 *   - Reconexión con backoff exponencial (5s → 60s) si el equipo se cae.
 *   - Si el firmware no soporta el stream (EventManagerNoSoportadoError), se
 *     desiste de este equipo: su asistencia seguirá por el poller de 1 minuto.
 *   - Dedupe por (serial, persona, fecha, metodo): si el stream y el poller
 *     solapan un instante, la asistencia no se duplica.
 */

const BACKOFF_INICIAL_MS = 5_000;
const BACKOFF_MAX_MS = 60_000;

interface Listener {
  dispositivoId: string;
  serial: string;
  abort: AbortController;
  /** Limpia el backoff pendiente al detener manualmente. */
  reintentar?: ReturnType<typeof setTimeout>;
}

const listeners = new Map<string, Listener>();
/** Equipos con el stream establecido AHORA (para la métrica de estado). */
const conectados = new Set<string>();

export function listenersActivos(): string[] {
  return [...listeners.keys()];
}

/** Serial-less: IDs de equipos con conexión viva en este proceso. */
export function conectadosEnVivo(): string[] {
  return [...conectados];
}

function metodoDesdeEvento(method: number | null): BiometricMetodo {
  switch (method) {
    case 0:
      return 'clave';
    case 1:
      return 'tarjeta';
    case 6:
      return 'huella';
    case 15:
      return 'cara';
    default:
      return 'otro';
  }
}

async function equipoCargado(dispositivoId: string): Promise<{
  id: string;
  serial: string;
  recoger_registros: number;
} | null> {
  const rows = await query<{ id: string; serial: string; recoger_registros: number }[]>(
    `SELECT id, serial, recoger_registros FROM biometric_devices
      WHERE id = ? AND revocado_en IS NULL`,
    [dispositivoId]
  );
  return rows[0] ?? null;
}

/** Marca el evento como visto; false si otro canal ya lo procesó. */
async function marcarVisto(
  serial: string,
  dispositivoId: string,
  evento: EventoDelEquipo,
  fechaHora: string,
  metodo: BiometricMetodo
): Promise<boolean> {
  const yaVistos = await query<{ id: string }[]>(
    `SELECT id FROM biometric_device_records
      WHERE serial = ? AND codigo_persona = ? AND fecha_dispositivo = ? AND metodo = ? LIMIT 1`,
    [serial, evento.userId, fechaHora, metodo]
  );
  if (yaVistos.length > 0) return false;
  try {
    await BaseRepository.insert(query, 'biometric_device_records', {
      id: generateUUID(),
      dispositivo_id: dispositivoId,
      serial,
      rec_no: evento.createTime, // el stream no trae RecNo: usamos el epoch como idempotencia
      codigo_persona: evento.userId.substring(0, 64),
      fecha_dispositivo: fechaHora,
      metodo,
      status: evento.status ?? null
    });
    return true;
  } catch (error: any) {
    if (error?.code === '23505') return false; // lo marcó el poller en paralelo
    throw error;
  }
}

async function manejarEvento(
  listener: { dispositivoId: string; serial: string },
  evento: EventoDelEquipo
): Promise<void> {
  if (evento.status !== null && evento.status !== 1) return; // verificación fallida

  const fechaHora = getNowInBusinessTimezone(new Date(evento.createTime * 1000));
  const metodo = metodoDesdeEvento(evento.metodo);

  if (!(await marcarVisto(listener.serial, listener.dispositivoId, evento, fechaHora, metodo))) {
    return; // ya lo llevó el poller (o un evento repetido del stream)
  }

  try {
    const resultado = await procesarEventoBiometrico(
      {
        codigo: evento.userId,
        fechaDispositivo: fechaHora,
        metodo,
        raw: evento.raw
      },
      { id: listener.dispositivoId, serial: listener.serial }
    );
    logger.info('[biometric-live] Evento procesado', {
      serial: listener.serial,
      userId: evento.userId,
      resultado: resultado.resultado
    });
  } catch (error) {
    logger.error('[biometric-live] Error procesando evento', {
      serial: listener.serial,
      userId: evento.userId,
      error
    });
  }
}

/** Abre el stream del equipo y lo reconecta con backoff hasta que lo detengan. */
async function mantenerListener(dispositivoId: string, serial: string, abort: AbortController) {
  let backoff = BACKOFF_INICIAL_MS;
  while (!abort.signal.aborted) {
    // Credenciales frescas en cada intento: reflejan ediciones sin reiniciar.
    const filas = await query<
      {
        id: string;
        serial: string;
        ip: string | null;
        usuario_equipo: string | null;
        clave_cifrada: string | null;
        recoger_registros: number;
      }[]
    >(
      `SELECT id, serial, ip, usuario_equipo, clave_cifrada, recoger_registros
         FROM biometric_devices WHERE id = ? AND revocado_en IS NULL`,
      [dispositivoId]
    );
    const fila = filas[0];
    const credenciales: CredencialesEquipo | null = fila ? credencialesDeFila(fila) : null;
    if (!credenciales) {
      logger.warn('[biometric-live] Equipo sin credenciales; listener detenido', { serial });
      listeners.delete(dispositivoId);
      return;
    }

    let despertar: () => void = () => {};
    const apagadoOcaida = new Promise<void>(resolver => {
      despertar = resolver;
    });
    const alAbortar = () => despertar();
    abort.signal.addEventListener('abort', alAbortar, { once: true });
    let falloStream: unknown = null;

    try {
      await abrirFlujoEventos(credenciales, {
        signal: abort.signal,
        onEvento: evento => manejarEvento({ dispositivoId, serial }, evento),
        onError: error => {
          falloStream = error;
          despertar(); // el stream cayó: reconectar con backoff
        }
      });
      // abrirFlujoEventos resuelve con la conexión establecida.
      conectados.add(dispositivoId);
      backoff = BACKOFF_INICIAL_MS;
      logger.info('[biometric-live] Stream en vivo conectado', { serial });
    } catch (error) {
      conectados.delete(dispositivoId);
      abort.signal.removeEventListener('abort', alAbortar);
      if (abort.signal.aborted) return;
      if (error instanceof EventManagerNoSoportadoError) {
        logger.warn('[biometric-live] Equipo sin stream en vivo; queda el poller', { serial });
        listeners.delete(dispositivoId);
        return;
      }
      logger.warn('[biometric-live] Reconectando al equipo', {
        serial,
        backoffMs: backoff,
        error
      });
      await new Promise(resolve => setTimeout(resolve, backoff));
      backoff = Math.min(backoff * 2, BACKOFF_MAX_MS);
      continue;
    }

    // Conexión establecida: esperar una caída del stream o el apagado manual.
    await apagadoOcaida;
    abort.signal.removeEventListener('abort', alAbortar);
    conectados.delete(dispositivoId);
    if (abort.signal.aborted) return;

    logger.warn('[biometric-live] Stream interrumpido; reconectando', {
      serial,
      backoffMs: backoff,
      error: falloStream
    });
    await new Promise(resolve => setTimeout(resolve, backoff));
    backoff = Math.min(backoff * 2, BACKOFF_MAX_MS);
  }
}

export async function encenderListener(dispositivoId: string): Promise<boolean> {
  if (listeners.has(dispositivoId)) return true;
  const equipo = await equipoCargado(dispositivoId);
  if (!equipo || Number(equipo.recoger_registros) !== 1) return false;

  const abort = new AbortController();
  const listener: Listener = { dispositivoId, serial: equipo.serial, abort };
  listeners.set(dispositivoId, listener);
  // No await: el supervisor vive por su cuenta.
  void mantenerListener(dispositivoId, equipo.serial, abort);
  return true;
}

export function apagarListener(dispositivoId: string): void {
  const listener = listeners.get(dispositivoId);
  if (!listener) return;
  listener.abort.abort();
  if (listener.reintentar) clearTimeout(listener.reintentar);
  listeners.delete(dispositivoId);
}

/** Enciende listeners para todos los equipos habilitados (llamado al boot). */
export async function encenderTodos(): Promise<void> {
  const equipos = await query<{ id: string }[]>(
    `SELECT id FROM biometric_devices
      WHERE revocado_en IS NULL AND recoger_registros = 1
        AND ip IS NOT NULL AND usuario_equipo IS NOT NULL AND clave_cifrada IS NOT NULL`
  );
  for (const equipo of equipos) {
    await encenderListener(equipo.id);
  }
}
