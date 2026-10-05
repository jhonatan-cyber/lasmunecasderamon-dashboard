import { query, generateUUID } from '@/lib/database/db';
import { BaseRepository } from '@/lib/database/base-repository';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { procesarEventoBiometrico } from '@/modules/asistencia/biometrico/processBiometricEvent';
import {
  credencialesDeFila,
  leerRegistrosAcceso,
  type CredencialesEquipo
} from '@/modules/asistencia/biometrico/deviceClient';
import {
  encolarFotoDeRecord,
  recuperarFotosPendientes
} from '@/modules/asistencia/biometrico/recordPhotos';
import { recuperarIdentificacionesPendientes } from '@/modules/asistencia/biometrico/identificacionFacial';
import type { BiometricMetodo } from '@/modules/asistencia/biometrico/types';
import logger from '@/lib/utils/logger';
import { quizasSincronizarReloj } from '@/modules/asistencia/biometrico/clockSync';
export interface RecordDelEquipo {
  recNo: number;
  createTime: number;
  userId: string;
  tipo: string | null;
  status: number | null;
  metodo: number | null;
  url: string | null;
}

export interface ResumenPoll {
  equipoId: string;
  serial: string;
  leidos: number;
  nuevos: number;
  ignorados: number;
  registrados: number;
  duplicados: number;
  fueraVentana: number;
  salidas: number;
  sinUsuario: number;
  usuarioInactivo: number;
  errores: number;
  hasta: number | null;
}

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

function epochAHoraNegocio(epochSegundos: number): string {
  return getNowInBusinessTimezone(new Date(epochSegundos * 1000));
}

function esSalida(tipo: string | null): boolean {
  return (tipo || '').trim().toLowerCase() === 'exit';
}

async function equipoHabilitado(dispositivoId: string): Promise<{
  id: string;
  serial: string;
  recoger_registros: number;
  historico_limpiado_en: Date | string | null;
} | null> {
  const rows = await query<
    {
      id: string;
      serial: string;
      recoger_registros: number;
      historico_limpiado_en: Date | string | null;
    }[]
  >(
    `SELECT id, serial, recoger_registros, historico_limpiado_en FROM biometric_devices
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

export async function equiposParaPoller(): Promise<EquipoParaPoller[]> {
  return query<EquipoParaPoller[]>(
    `SELECT id, nombre, serial, ip, usuario_equipo, clave_cifrada, recoger_registros
       FROM biometric_devices
      WHERE revocado_en IS NULL AND recoger_registros = 1
        AND ip IS NOT NULL AND usuario_equipo IS NOT NULL AND clave_cifrada IS NOT NULL`
  );
}

async function marcarProcesado(
  serial: string,
  record: RecordDelEquipo,
  fechaHora: string,
  dispositivoId: string,
  metodo: BiometricMetodo
): Promise<string | null> {
  const id = generateUUID();
  try {
    await BaseRepository.insert(query, 'biometric_device_records', {
      id,
      dispositivo_id: dispositivoId,
      serial,
      rec_no: record.recNo,
      codigo_persona: record.userId.substring(0, 64),
      fecha_dispositivo: fechaHora,
      metodo,
      status: record.status ?? null,
      foto_url: record.url
    });
    return id;
  } catch (error: any) {
    if (error?.code === '23505') return null;
    throw error;
  }
}

const lecturasEnCurso = new Map<string, Promise<ResumenPoll>>();

export function pollEquipo(
  dispositivoId: string,
  opciones: { limite?: number } = {}
): Promise<ResumenPoll> {
  const actual = lecturasEnCurso.get(dispositivoId);
  if (actual) return actual;
  const lectura = leerEquipo(dispositivoId, opciones).finally(() => {
    if (lecturasEnCurso.get(dispositivoId) === lectura) lecturasEnCurso.delete(dispositivoId);
  });
  lecturasEnCurso.set(dispositivoId, lectura);
  return lectura;
}

async function leerEquipo(
  dispositivoId: string,
  opciones: { limite?: number } = {}
): Promise<ResumenPoll> {
  const resumen: ResumenPoll = {
    equipoId: dispositivoId,
    serial: '',
    leidos: 0,
    nuevos: 0,
    ignorados: 0,
    registrados: 0,
    duplicados: 0,
    fueraVentana: 0,
    salidas: 0,
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

  const maximo = await query<{ max: number | null }[]>(
    'SELECT MAX(rec_no) AS max FROM biometric_device_records WHERE serial = ?',
    [equipo.serial]
  );
  const desde = Number(maximo[0]?.max ?? 0);

  const records = await leerRegistrosAcceso(credenciales, {
    count: opciones.limite ?? 200,
    desde
  });
  resumen.leidos = records.length;

  // Corte de histórico: tras un reset biométrico la tabla vacía hace que
  // MAX(rec_no) vuelva a 0, así que este filtro es lo único que impide que
  // el lector "resucite" todo su historial viejo.
  const corteMs = equipo.historico_limpiado_en
    ? new Date(equipo.historico_limpiado_en).getTime()
    : null;

  for (const record of records) {
    if (
      corteMs !== null &&
      Number.isFinite(record.createTime) &&
      record.createTime * 1000 < corteMs
    ) {
      resumen.ignorados += 1;
      continue;
    }
    resumen.hasta = Math.max(resumen.hasta ?? 0, record.createTime);

    const fechaHora = epochAHoraNegocio(record.createTime);
    const metodo = metodoDesdeRecords(record.metodo);
    const yaPorRecNo = await query<{ id: string }[]>(
      'SELECT id FROM biometric_device_records WHERE serial = ? AND rec_no = ? LIMIT 1',
      [equipo.serial, record.recNo]
    );
    if (yaPorRecNo.length > 0) continue;
    const yaPorContenido = await query<{ id: string }[]>(
      `SELECT id FROM biometric_device_records
        WHERE serial = ? AND codigo_persona = ? AND fecha_dispositivo = ? AND metodo = ? LIMIT 1`,
      [equipo.serial, record.userId, fechaHora, metodo]
    );
    if (yaPorContenido.length > 0) continue;

    const recordId = await marcarProcesado(equipo.serial, record, fechaHora, dispositivoId, metodo);
    if (!recordId) continue;
    resumen.nuevos += 1;

    if (record.url) {
      encolarFotoDeRecord({ recordId, dispositivoId, ruta: record.url });
    }

    if (record.userId) {
      void quizasSincronizarReloj(
        dispositivoId,
        equipo.serial,
        Date.now() / 1000 - record.createTime
      );
    }

    if (esSalida(record.tipo)) {
      resumen.salidas += 1;
      continue;
    }

    try {
      const resultado = await procesarEventoBiometrico(
        {
          codigo: record.userId,
          fechaDispositivo: fechaHora,
          metodo,
          raw: JSON.stringify(record).substring(0, 2000),
          recordId
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

  try {
    await recuperarFotosPendientes();
  } catch (error) {
    logger.warn('[biometric-poll] No se pudieron reanudar fotos pendientes', { error });
  }

  try {
    await recuperarIdentificacionesPendientes();
  } catch (error) {
    logger.warn('[biometric-poll] No se pudieron reanudar identificaciones pendientes', {
      error
    });
  }

  if (resumen.nuevos > 0) {
    logger.info('[biometric-poll] Registros nuevos bajados del equipo', {
      serial: equipo.serial,
      leidos: resumen.leidos,
      nuevos: resumen.nuevos,
      ignorados: resumen.ignorados,
      registrados: resumen.registrados,
      duplicados: resumen.duplicados,
      fueraVentana: resumen.fueraVentana,
      salidas: resumen.salidas,
      sinUsuario: resumen.sinUsuario,
      usuarioInactivo: resumen.usuarioInactivo
    });
  } else if (resumen.ignorados > 0) {
    logger.info('[biometric-poll] Registros anteriores al corte; ignorados', {
      serial: equipo.serial,
      leidos: resumen.leidos,
      ignorados: resumen.ignorados
    });
  }

  return resumen;
}

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

const INTERVALO_MS = 15_000;

interface EstadoPoller {
  timer: ReturnType<typeof setInterval> | null;
  enVuelo: boolean;
}

const estado = ((globalThis as Record<string, unknown>).__biometricPoller ??= {
  timer: null,
  enVuelo: false
}) as EstadoPoller;

export function estaCorriendo(): boolean {
  return estado.timer !== null;
}

export function arrancarPoller(): void {
  if (estado.timer) return;
  estado.timer = setInterval(() => {
    if (estado.enVuelo) return;
    estado.enVuelo = true;
    pollTodos()
      .catch(error => logger.error('[biometric-poll] Ciclo falló', { error }))
      .finally(() => {
        estado.enVuelo = false;
      });
  }, INTERVALO_MS);
  estado.timer.unref?.();
  logger.info('[biometric-poll] Ciclo de registros iniciado', { intervaloMs: INTERVALO_MS });
}

export function detenerPoller(): void {
  if (estado.timer) {
    clearInterval(estado.timer);
    estado.timer = null;
  }
}
