import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { conectadosEnVivo, listenersActivos } from '@/modules/asistencia/biometrico/eventListener';
import { estaCorriendo } from '@/modules/asistencia/biometrico/recordPoller';
import {
  listarAsistenciasBiometricasHoy,
  listarDesfasesRecientes,
  listarEstadoLectores,
  obtenerVentanaAsistencia
} from './repositorio';
export interface DesfaseReloj {
  segundos: number;
  muestras: number;
}

export interface EstadoLector {
  id: string;
  nombre: string;
  marca: string;
  serial: string;
  ip: string | null;
  habilitado: boolean;
  ultimo_evento: string | null;
  desfase: DesfaseReloj | null;
  hoy: string;
}

export interface EstadoBiometrico {
  asistenciasBiometricasHoy: number;
  asistencias: { usuario: string; hora: string; recordId: string | null }[];
  ventana: { inicio: number; minutoInicio?: number; fin: number; minutoFin?: number };
  lectores: EstadoLector[];
  pollerActivo: boolean;
}

export async function obtenerEstadoBiometrico(): Promise<EstadoBiometrico> {
  const hoy = getNowInBusinessTimezone().substring(0, 10);

  const [asistenciasRows, ventanaRows, lectoresRows, desfaseRows] = await Promise.all([
    listarAsistenciasBiometricasHoy<{
      nombre_completo: string;
      hora: string;
      record_id: string | null;
    }>(hoy),
    obtenerVentanaAsistencia<{ clave: string; valor: string }>(),
    listarEstadoLectores<{
      id: string;
      nombre: string;
      marca: string;
      serial: string;
      ip: string | null;
      recoger_registros: number;
      ultimo_uso: string | null;
    }>(),
    listarDesfasesRecientes<{
      serial: string;
      desfase_promedio: number | string;
      muestras: number | string;
    }>()
  ]);

  let inicio = 21;
  let minutoInicio = 0;
  let fin = 23;
  let minutoFin = 0;
  for (const row of ventanaRows) {
    const val = parseInt(row.valor, 10);
    if (Number.isNaN(val)) continue;
    if (row.clave === 'asistencia_hora_inicio') inicio = val;
    if (row.clave === 'asistencia_minuto_inicio') minutoInicio = val;
    if (row.clave === 'asistencia_hora_fin') fin = val;
    if (row.clave === 'asistencia_minuto_fin') minutoFin = val;
  }

  const enVivo = new Set(conectadosEnVivo());
  const activos = new Set(listenersActivos());
  const desfasePorSerial = new Map(
    desfaseRows.map(row => [
      row.serial,
      {
        segundos: Math.round(Number(row.desfase_promedio)),
        muestras: Number(row.muestras)
      } as DesfaseReloj
    ])
  );

  const lectores: EstadoLector[] = lectoresRows.map(row => ({
    id: row.id,
    nombre: row.nombre,
    marca: row.marca,
    serial: row.serial,
    ip: row.ip,
    habilitado: Number(row.recoger_registros) === 1,
    ultimo_evento: row.ultimo_uso,
    desfase: desfasePorSerial.get(row.serial) ?? null,
    hoy
  }));

  return {
    asistenciasBiometricasHoy: asistenciasRows.length,
    asistencias: asistenciasRows.map(r => ({
      usuario: r.nombre_completo,
      hora: r.hora,
      recordId: r.record_id
    })),
    ventana: { inicio, minutoInicio, fin, minutoFin },
    lectores,
    pollerActivo: estaCorriendo()
  };
}
