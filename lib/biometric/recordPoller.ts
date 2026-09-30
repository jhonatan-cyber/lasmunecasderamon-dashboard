import { query, generateUUID } from '@/lib/database/db';
import { BaseRepository } from '@/lib/repositories/BaseRepository';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { procesarEventoBiometrico } from '@/lib/biometric/processBiometricEvent';
import {
  credencialesDeFila,
  leerRegistrosAcceso,
  type CredencialesEquipo
} from '@/lib/biometric/deviceClient';
import type { BiometricMetodo } from '@/lib/biometric/types';
import logger from '@/lib/utils/logger';

/**
 * Poller de registros del equipo (AccessControlCardRec).
 *
 * El lector es quien coteja en la puerta (con la copia de las plantillas, fase
 * 1) y va acumulando cada verificación en su memoria. El push en tiempo real es
 * opcional y frágil; este poller es la vía confiable: cada minuto baja del
 * equipo los registros nuevos, los deduplica en `biometric_device_records` y
 * convierte en asistencia EXACTAMENTE con las mismas reglas que las demás vías
 * (mismo `procesarEventoBiometrico` que usa el push: usuario activo, una por
 * día, ventana horaria, auditoría y SSE).
 *
 * Idempotencia: cada record del equipo se identifica por (serial, RecNo) y por
 * su timestamp+código; si el equipo se reinicia y re-enumera, la combinación
 * timestamp+código+metodo sigue siendo la misma y no se re-procesa.
 */

export interface RecordDelEquipo {
  recNo: number;
  /** Epoch UTC en segundos que reporta el equipo. */
  createTime: number;
  userId: string;
  tipo: string | null; // Entry / Exit
  status: number | null; // 1 = verificación exitosa
  metodo: number | null; // 6 = huella, 15 = cara, 1 = tarjeta, 0 = clave
}

export interface ResumenPoll {
  equipoId: string;
  serial: string;
  leidos: number;
  nuevos: number;
  registrados: number;
  duplicados: number;
  fueraVentana: number;
  sinUsuario: number;
  usuarioInactivo: number;
  errores: number;
  /** Hasta qué epoch se procesó (para logs). */
  hasta: number | null;
}

/** Mapa Method (CGI) → método del dominio. Lo mismo que hace el adapter de push. */
function metodoDesdeRecords(method: number | null): BiometricMetodo {
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

/** `123456789` (epoch s UTC) → `2026-09-29 21:30:00` en hora del negocio. */
function epochAHoraNegocio(epochSegundos: number): string {
  return getNowInBusinessTimezone(new Date(epochSegundos * 1000));
}

async function equipoHabilitado(dispositivoId: string): Promise<{
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

export interface EquipoParaPoller {
  id: string;
  nombre: string;
  serial: string;
  ip: string | null;
  usuario_equipo: string | null;
  clave_cifrada: string | null;
  recoger_registros: number;
}

/** Equipos activos con el recolector encendido y credenciales completas. */
export async function equiposParaPoller(): Promise<EquipoParaPoller[]> {
  return query<EquipoParaPoller[]>(
    `SELECT id, nombre, serial, ip, usuario_equipo, clave_cifrada, recoger_registros
       FROM biometric_devices
      WHERE revocado_en IS NULL AND recoger_registros = 1
        AND ip IS NOT NULL AND usuario_equipo IS NOT NULL AND clave_cifrada IS NOT NULL`
  );
}

/** Marca (serial, RecNo) como ya procesado, ignorando la carrera del mismo tick. */
async function marcarProcesado(
  serial: string,
  record: RecordDelEquipo,
  fechaHora: string,
  dispositivoId: string,
  metodo: BiometricMetodo
): Promise<boolean> {
  try {
    await BaseRepository.insert(query, 'biometric_device_records', {
      id: generateUUID(),
      dispositivo_id: dispositivoId,
      serial,
      rec_no: record.recNo,
      codigo_persona: record.userId.substring(0, 64),
      fecha_dispositivo: fechaHora,
      metodo,
      status: record.status ?? null
    });
    return true;
  } catch (error: any) {
    // 23505 = unique violation: ya lo procesó otro tick en paralelo.
    if (error?.code === '23505') return false;
    throw error;
  }
}

/**
 * Baja los registros del equipo y los convierte en asistencia.
 * Es seguro llamarlo concurrentemente: la dedupe por (serial, RecNo) y por
 * (timestamp+código+metodo) evita dobles asistencias.
 */
export async function pollEquipo(
  dispositivoId: string,
  opciones: { limite?: number } = {}
): Promise<ResumenPoll> {
  const resumen: ResumenPoll = {
    equipoId: dispositivoId,
    serial: '',
    leidos: 0,
    nuevos: 0,
    registrados: 0,
    duplicados: 0,
    fueraVentana: 0,
    sinUsuario: 0,
    usuarioInactivo: 0,
    errores: 0,
    hasta: null
  };

  const equipo = await equipoHabilitado(dispositivoId);
  if (!equipo) throw new Error(`Equipo ${dispositivoId} no encontrado, revocado o inhabilitado`);
  resumen.serial = equipo.serial;

  const filas = await query<
    {
      id: string;
      serial: string;
      ip: string | null;
      usuario_equipo: string | null;
      clave_cifrada: string | null;
    }[]
  >('SELECT id, serial, ip, usuario_equipo, clave_cifrada FROM biometric_devices WHERE id = ?', [
    dispositivoId
  ]);
  const fila = filas[0];
  const credenciales: CredencialesEquipo | null = fila ? credencialesDeFila(fila) : null;
  if (!credenciales) throw new Error(`Equipo ${dispositivoId} sin IP/credenciales`);

  const records = await leerRegistrosAcceso(credenciales, opciones.limite ?? 200);
  resumen.leidos = records.length;

  for (const record of records) {
    resumen.hasta = Math.max(resumen.hasta ?? 0, record.createTime);

    const fechaHora = epochAHoraNegocio(record.createTime);
    const metodo = metodoDesdeRecords(record.metodo);

    // Dedupe 1: mismo RecNo del mismo equipo (caso normal).
    const yaPorRecNo = await query<{ id: string }[]>(
      'SELECT id FROM biometric_device_records WHERE serial = ? AND rec_no = ? LIMIT 1',
      [equipo.serial, record.recNo]
    );
    if (yaPorRecNo.length > 0) continue;

    // Dedupe 2: mismo instante+persona+método (re-enumeración tras reinicio).
    const yaPorContenido = await query<{ id: string }[]>(
      `SELECT id FROM biometric_device_records
        WHERE serial = ? AND codigo_persona = ? AND fecha_dispositivo = ? AND metodo = ? LIMIT 1`,
      [equipo.serial, record.userId, fechaHora, metodo]
    );
    if (yaPorContenido.length > 0) continue;

    if (!(await marcarProcesado(equipo.serial, record, fechaHora, dispositivoId, metodo))) continue;
    resumen.nuevos += 1;

    if (record.status !== null && record.status !== 1) {
      // Verificación fallida (no coincidió con nadie): igual queda marcada como
      // procesada para no reintentarla eternamente, pero no genera asistencia.
      resumen.errores += 1;
      continue;
    }

    try {
      const resultado = await procesarEventoBiometrico(
        {
          codigo: record.userId,
          fechaDispositivo: fechaHora,
          metodo,
          raw: JSON.stringify(record).substring(0, 2000)
        },
        { id: dispositivoId, serial: equipo.serial }
      );
      switch (resultado.resultado) {
        case 'registrado':
          resumen.registrados += 1;
          break;
        case 'duplicado':
          resumen.duplicados += 1;
          break;
        case 'fuera_ventana':
          resumen.fueraVentana += 1;
          break;
        case 'sin_usuario':
          resumen.sinUsuario += 1;
          break;
        case 'usuario_inactivo':
          resumen.usuarioInactivo += 1;
          break;
      }
    } catch (error) {
      resumen.errores += 1;
      logger.error('[biometric-poll] Error procesando record', {
        serial: equipo.serial,
        recNo: record.recNo,
        error
      });
    }
  }

  return resumen;
}

/** Procesa todos los equipos habilitados; un equipo caído no tumba a los demás. */
export async function pollTodos(): Promise<ResumenPoll[]> {
  const equipos = await equiposParaPoller();
  const resumenes: ResumenPoll[] = [];
  for (const equipo of equipos) {
    try {
      resumenes.push(await pollEquipo(equipo.id));
    } catch (error) {
      logger.error('[biometric-poll] Equipo falló en el ciclo', { serial: equipo.serial, error });
    }
  }
  return resumenes;
}

/* ───────────────────────── Ciclo de fondo ───────────────────────── */

const INTERVALO_MS = 60_000;
let timer: ReturnType<typeof setInterval> | null = null;
let enVuelo = false;

export function estaCorriendo(): boolean {
  return timer !== null;
}

/** Enciende el ciclo de fondo (idempotente). Lo llama instrumentation.register(). */
export function arrancarPoller(): void {
  if (timer) return;
  timer = setInterval(() => {
    if (enVuelo) return; // un ciclo lento no se pisa con el siguiente
    enVuelo = true;
    pollTodos()
      .catch(error => logger.error('[biometric-poll] Ciclo falló', { error }))
      .finally(() => {
        enVuelo = false;
      });
  }, INTERVALO_MS);
  // En dev (hot reload) no conviene retener el proceso solo por el poller.
  timer.unref?.();
  logger.info('[biometric-poll] Ciclo de registros iniciado', { intervaloMs: INTERVALO_MS });
}

export function detenerPoller(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
