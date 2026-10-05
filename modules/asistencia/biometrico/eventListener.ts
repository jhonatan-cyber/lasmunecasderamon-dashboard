import { query, generateUUID } from '@/lib/database/db';
import { BaseRepository } from '@/lib/database/base-repository';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { procesarEventoBiometrico } from '@/modules/asistencia/biometrico/processBiometricEvent';
import {
  credencialesDeFila,
  type CredencialesEquipo
} from '@/modules/asistencia/biometrico/deviceClient';
import {
  EventManagerNoSoportadoError,
  abrirFlujoEventos,
  type EventoDelEquipo
} from '@/modules/asistencia/biometrico/eventStreamClient';
import type { BiometricMetodo } from '@/modules/asistencia/biometrico/types';
import logger from '@/lib/utils/logger';
import { abrirAvisosSdk } from './eventSdkClient';
import { crearLecturaPorAviso } from './eventRecordWakeup';
import { pollEquipo } from './recordPoller';

function esSalida(tipo: string | null): boolean {
  return (tipo || '').trim().toLowerCase() === 'exit';
}

const BACKOFF_INICIAL_MS = 5_000;
const BACKOFF_MAX_MS = 60_000;

interface Listener {
  dispositivoId: string;
  serial: string;
  abort: AbortController;
  reintentar?: ReturnType<typeof setTimeout>;
}

const listeners = new Map<string, Listener>();
const conectados = new Set<string>();

export function listenersActivos(): string[] {
  return [...listeners.keys()];
}

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
      rec_no: evento.createTime,
      codigo_persona: evento.userId.substring(0, 64),
      fecha_dispositivo: fechaHora,
      metodo,
      status: evento.status ?? null
    });
    return true;
  } catch (error: any) {
    if (error?.code === '23505') return false;
    throw error;
  }
}

async function manejarEvento(
  listener: { dispositivoId: string; serial: string; corteMs: number | null },
  evento: EventoDelEquipo
): Promise<void> {
  if (
    listener.corteMs !== null &&
    Number.isFinite(evento.createTime) &&
    evento.createTime * 1000 < listener.corteMs
  ) {
    logger.debug('[biometric-live] Evento anterior al corte de histórico; ignorado', {
      serial: listener.serial,
      userId: evento.userId
    });
    return;
  }

  const fechaHora = getNowInBusinessTimezone(new Date(evento.createTime * 1000));
  const metodo = metodoDesdeEvento(evento.metodo);

  if (esSalida(evento.tipo)) {
    logger.info('[biometric-live] Salida del lector: no acredita asistencia', {
      serial: listener.serial,
      userId: evento.userId
    });
    return;
  }

  if (!(await marcarVisto(listener.serial, listener.dispositivoId, evento, fechaHora, metodo))) {
    return;
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

async function mantenerListener(dispositivoId: string, serial: string, abort: AbortController) {
  let backoff = BACKOFF_INICIAL_MS;
  const alAviso = crearLecturaPorAviso(
    abort.signal,
    () => pollEquipo(dispositivoId),
    error => {
      logger.warn('[biometric-live] No se pudieron recuperar los registros del aviso', {
        serial,
        error
      });
    }
  );
  while (!abort.signal.aborted) {
    const filas = await query<
      {
        id: string;
        serial: string;
        ip: string | null;
        usuario_equipo: string | null;
        clave_cifrada: string | null;
        recoger_registros: number;
        historico_limpiado_en: Date | string | null;
      }[]
    >(
      `SELECT id, serial, ip, usuario_equipo, clave_cifrada, recoger_registros, historico_limpiado_en
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
    const corteMs = fila.historico_limpiado_en
      ? new Date(fila.historico_limpiado_en).getTime()
      : null;

    let despertar: () => void = () => {};
    const apagadoOcaida = new Promise<void>(resolver => {
      despertar = resolver;
    });
    const alAbortar = () => despertar();
    abort.signal.addEventListener('abort', alAbortar, { once: true });
    let falloStream: unknown = null;

    try {
      let transporte = 'NetSDK';
      try {
        await abrirAvisosSdk(credenciales, {
          signal: abort.signal,
          onAviso: () => {
            logger.debug('[biometric-live] Aviso NetSDK recibido; consultando registros', {
              serial
            });
            alAviso();
          },
          onError: error => {
            falloStream = error;
            despertar();
          }
        });
      } catch (error) {
        if (abort.signal.aborted) return;
        transporte = 'CGI';
        logger.info('[biometric-live] NetSDK no disponible; probando suscripciones CGI', {
          serial
        });
        await abrirFlujoEventos(credenciales, {
          signal: abort.signal,
          onEvento: evento => manejarEvento({ dispositivoId, serial, corteMs }, evento),
          onChunk: texto => {
            if (!texto.includes('=')) return;
            logger.info('[biometric-live] Bloque recibido del equipo', {
              serial,
              bytes: texto.length
            });
          },
          onError: error => {
            falloStream = error;
            despertar();
          }
        });
      }
      conectados.add(dispositivoId);
      backoff = BACKOFF_INICIAL_MS;
      logger.info('[biometric-live] Suscripción conectada (pendiente de eventos)', {
        serial,
        transporte
      });
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
