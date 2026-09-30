import { query } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { conectadosEnVivo, listenersActivos } from '@/lib/biometric/eventListener';
import { estaCorriendo } from '@/lib/biometric/recordPoller';

/**
 * Estado del subsistema biométrico para el panel de Configuraciones.
 *
 * Todo lo que lee acá es de esta conexión o de la base: NADA consulta a los
 * equipos (el panel carga al instante y no depende de que el lector responda).
 *
 * "En vivo" significa listener conectado en ESTE proceso; si el servidor tiene
 * varias instancias, la fila puede aparecer conectada desde otra instancia.
 */

export interface EstadoLector {
  id: string;
  nombre: string;
  marca: string;
  serial: string;
  ip: string | null;
  /** Interruptor del recolector (recoger_registros). */
  habilitado: boolean;
  /** Último evento recibido por cualquier vía (push/stream/poller). */
  ultimo_evento: string | null;
  /** Hora de negocio de hoy (para entender el "nunca" vs "sin eventos hoy"). */
  hoy: string;
}

export interface EstadoBiometrico {
  /** Asistencias registradas hoy por el lector (origen = biometrico). */
  asistenciasBiometricasHoy: number;
  /** Lista de asistencias biométricas de hoy (persona + hora). */
  asistencias: { usuario: string; hora: string }[];
  /** Config de ventana horaria vigente. */
  ventana: { inicio: number; fin: number };
  lectores: EstadoLector[];
  /** Poller de red de seguridad activo en este proceso. */
  pollerActivo: boolean;
}

export async function obtenerEstadoBiometrico(): Promise<EstadoBiometrico> {
  const hoy = getNowInBusinessTimezone().substring(0, 10);

  const [asistenciasRows, ventanaRows, lectoresRows] = await Promise.all([
    query<{ nombre_completo: string; hora: string }[]>(
      `SELECT (TRIM(CAST(U.nombre AS text)) || ' ' || TRIM(CAST(U.apellido AS text))) AS nombre_completo,
              A.hora
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

  const lectores: EstadoLector[] = lectoresRows.map(row => ({
    id: row.id,
    nombre: row.nombre,
    marca: row.marca,
    serial: row.serial,
    ip: row.ip,
    habilitado: Number(row.recoger_registros) === 1,
    ultimo_evento: row.ultimo_uso,
    hoy
  }));

  return {
    asistenciasBiometricasHoy: asistenciasRows.length,
    asistencias: asistenciasRows.map(r => ({ usuario: r.nombre_completo, hora: r.hora })),
    ventana: { inicio, fin },
    lectores,
    pollerActivo: estaCorriendo()
  };
}
