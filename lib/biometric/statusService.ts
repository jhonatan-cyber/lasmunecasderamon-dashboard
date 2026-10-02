import { query } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { conectadosEnVivo, listenersActivos } from '@/lib/biometric/eventListener';
import { estaCorriendo } from '@/lib/biometric/recordPoller';
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
  ventana: { inicio: number; fin: number };
  lectores: EstadoLector[];
  pollerActivo: boolean;
}

export async function obtenerEstadoBiometrico(): Promise<EstadoBiometrico> {
  const hoy = getNowInBusinessTimezone().substring(0, 10);

  const [asistenciasRows, ventanaRows, lectoresRows, desfaseRows] = await Promise.all([
    query<{ nombre_completo: string; hora: string; record_id: string | null }[]>(
      `SELECT (TRIM(CAST(U.nombre AS text)) || ' ' || TRIM(CAST(U.apellido AS text))) AS nombre_completo,
              A.hora,
              A.biometric_record_id AS record_id
         FROM asistencias A
         INNER JOIN usuarios U ON U.id_usuario = A.usuario_id
        WHERE A.origen = 'biometrico' AND A.fecha = ? AND A.estado = 1
        ORDER BY A.hora DESC`,
      [hoy]
    ),
    query<{ clave: string; valor: string }[]>(
      `SELECT clave, valor FROM configuraciones
        WHERE clave IN ('asistencia_hora_inicio', 'asistencia_hora_fin')`
    ),
    query<
      {
        id: string;
        nombre: string;
        marca: string;
        serial: string;
        ip: string | null;
        recoger_registros: number;
        ultimo_uso: string | null;
      }[]
    >(
      `SELECT id, nombre, marca, serial, ip, recoger_registros, ultimo_uso
         FROM biometric_devices
        WHERE revocado_en IS NULL
        ORDER BY fecha_crea DESC`
    ),
    query<{ serial: string; desfase_promedio: number | string; muestras: number | string }[]>(
      `SELECT serial,
              AVG(EXTRACT(EPOCH FROM (fecha_recepcion - fecha_dispositivo))) AS desfase_promedio,
              COUNT(*) AS muestras
         FROM biometric_events
        WHERE fecha_dispositivo IS NOT NULL
          AND fecha_recepcion > CURRENT_TIMESTAMP - interval '24 hours'
        GROUP BY serial`
    )
  ]);

  let inicio = 21;
  let fin = 23;
  for (const row of ventanaRows) {
    const val = parseInt(row.valor, 10);
    if (Number.isNaN(val)) continue;
    if (row.clave === 'asistencia_hora_inicio') inicio = val;
    if (row.clave === 'asistencia_hora_fin') fin = val;
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
    ventana: { inicio, fin },
    lectores,
    pollerActivo: estaCorriendo()
  };
}
