import { query } from '@/lib/database/db';
import {
  credencialesDeFila,
  type CredencialesEquipo
} from '@/modules/asistencia/biometrico/deviceClient';
import {
  audioDeResultado,
  reproducirAudioDeResultado,
  reproducirAvisoEnrolamiento,
  AUDIO_ENROLAMIENTO,
  type ResultadoAudio
} from '@/modules/asistencia/biometrico/audioService';
import logger from '@/lib/utils/logger';

const colas = new Map<string, Promise<void>>();

const COOLDOWN_DEFECTO_MS = 30_000;

function cooldownMs(): number {
  const crudo = Number(process.env.BIOMETRIC_AUDIO_COOLDOWN_MS);
  return Number.isFinite(crudo) && crudo >= 0 ? crudo : COOLDOWN_DEFECTO_MS;
}

// Último aviso enviado por (equipo, audio). Sin esta ventana, una ola masiva
// de eventos (p. ej. la re-importación de todo el historial del lector)
// encola cientos de avisos y el parlante repite el mismo mensaje durante
// minutos sin que nadie se acerque a la puerta.
const ultimosEnvios = new Map<string, number>();

function deboEnviar(dispositivoId: string, audio: string): boolean {
  const ahora = Date.now();
  const clave = `${dispositivoId}:${audio}`;
  const anterior = ultimosEnvios.get(clave);
  if (anterior !== undefined && ahora - anterior < cooldownMs()) {
    logger.debug('[biometric-audio] Aviso suprimido por rate-limit', {
      dispositivoId,
      audio,
      cooldownMs: cooldownMs()
    });
    return false;
  }
  ultimosEnvios.set(clave, ahora);
  return true;
}

function enCola(equipoId: string, tarea: () => Promise<void>): Promise<void> {
  const anterior = colas.get(equipoId) ?? Promise.resolve();
  const siguiente = anterior.then(tarea, tarea);
  colas.set(equipoId, siguiente);
  return siguiente;
}

async function credencialesDelEquipo(dispositivoId: string): Promise<CredencialesEquipo | null> {
  const filas = await query<
    {
      ip: string | null;
      usuario_equipo: string | null;
      clave_cifrada: string | null;
    }[]
  >(
    `SELECT ip, usuario_equipo, clave_cifrada FROM biometric_devices
      WHERE id = ? AND revocado_en IS NULL`,
    [dispositivoId]
  );
  return filas[0] ? credencialesDeFila(filas[0]) : null;
}

export interface OpcionesAviso {
  credenciales?: CredencialesEquipo;
}

async function enviarAviso(
  dispositivoId: string,
  claveAudio: string,
  opciones: OpcionesAviso,
  tarea: (credenciales: CredencialesEquipo) => Promise<ResultadoAudio>
): Promise<void> {
  try {
    if (!deboEnviar(dispositivoId, claveAudio)) return;
    const credenciales = opciones.credenciales ?? (await credencialesDelEquipo(dispositivoId));
    if (!credenciales) {
      logger.debug('[biometric-audio] Equipo sin credenciales; sin aviso sonoro', {
        dispositivoId
      });
      return;
    }
    await enCola(dispositivoId, async () => {
      await tarea(credenciales);
    });
  } catch (error) {
    logger.warn('[biometric-audio] El aviso sonoro no se pudo enviar', {
      dispositivoId,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

export function avisarResultadoEnEquipo(
  dispositivoId: string,
  resultado: string,
  opciones: OpcionesAviso = {}
): Promise<void> {
  const audio = audioDeResultado(resultado);
  if (!audio) return Promise.resolve();
  return enviarAviso(dispositivoId, audio, opciones, credenciales =>
    reproducirAudioDeResultado(credenciales, resultado)
  );
}

export function avisarEnrolamientoEnEquipo(
  dispositivoId: string,
  opciones: OpcionesAviso = {}
): Promise<void> {
  return enviarAviso(dispositivoId, AUDIO_ENROLAMIENTO, opciones, credenciales =>
    reproducirAvisoEnrolamiento(credenciales)
  );
}
