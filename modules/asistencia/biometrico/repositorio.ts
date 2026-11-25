/**
 * Infraestructura del módulo Asistencia para los equipos biométricos y sus
 * registros. SQL privado: nadie fuera de `modules/asistencia` importa este archivo
 * (§5).
 *
 * Estas consultas vivían dentro de `/api/biometric/devices/[id]/poller` y
 * `/api/biometric/records/[id]/photo`, que mezclaban adaptación, consulta y el
 * arranque o apagado del listener.
 */
import { query } from '@/lib/database/db';
import { BaseRepository } from '@/lib/database/base-repository';

/** Fila mínima del equipo: lo que hace falta para encender el recolector. */
export interface FilaEquipo {
  id: string;
  serial: string;
  ip: string | null;
  usuario_equipo: string | null;
  clave_cifrada: string | null;
}

/**
 * Equipo vigente por id. Filtra los revocados: un equipo revocado no vuelve a
 * encender el recolector ni por error ni por una ruta que lo pidiera.
 */
export async function obtenerEquipoVigente<T = FilaEquipo>(id: string): Promise<T[]> {
  return await query<T[]>(
    'SELECT id, serial, ip, usuario_equipo, clave_cifrada FROM biometric_devices WHERE id = ? AND revocado_en IS NULL',
    [id]
  );
}

/** Enciende o apaga el recolector de registros del equipo. */
export async function setRecogerRegistros(id: string, activo: boolean): Promise<void> {
  await query('UPDATE biometric_devices SET recoger_registros = ? WHERE id = ?', [
    activo ? 1 : 0,
    id
  ]);
}

/** Foto de la verificación que originó una asistencia. */
export async function obtenerFotoDeRecord(id: string): Promise<{ foto: Buffer | null }[]> {
  return await query<{ foto: Buffer | null }[]>(
    'SELECT foto FROM biometric_device_records WHERE id = ?',
    [id]
  );
}

export function obtenerCredencialesDispositivo<T>(id: string): Promise<T[]> {
  return query<T[]>(
    `SELECT ip, usuario_equipo, clave_cifrada FROM biometric_devices
      WHERE id = ? AND revocado_en IS NULL`,
    [id]
  );
}

export function obtenerEquipoParaVerificacion<T>(id: string): Promise<T[]> {
  return query<T[]>(
    `SELECT verificacion_remota, ip, usuario_equipo, clave_cifrada
       FROM biometric_devices WHERE id = ? AND revocado_en IS NULL`,
    [id]
  );
}

export function obtenerEquipoParaDescubrir<T>(id: string): Promise<T[]> {
  return query<T[]>(
    `SELECT id, nombre, serial, ip, usuario_equipo, clave_cifrada, mac, recoger_registros
       FROM biometric_devices WHERE id = ? AND revocado_en IS NULL`,
    [id]
  );
}

export function obtenerMacDispositivo(id: string): Promise<Array<{ mac: string | null }>> {
  return query('SELECT mac FROM biometric_devices WHERE id = ?', [id]);
}

export async function actualizarMacDispositivo(id: string, mac: string): Promise<void> {
  await query('UPDATE biometric_devices SET mac = ? WHERE id = ?', [mac, id]);
}

export async function actualizarIpDispositivo(id: string, ip: string): Promise<void> {
  await query('UPDATE biometric_devices SET ip = ? WHERE id = ?', [ip, id]);
}

export function buscarDispositivoPorSerial<T>(serial: string): Promise<T[]> {
  return query<T[]>(
    `SELECT id, nombre, marca, serial FROM biometric_devices
      WHERE LOWER(serial) = LOWER(?) AND revocado_en IS NULL`,
    [serial]
  );
}

export function listarDispositivosPorSerial<T>(serial: string): Promise<T[]> {
  return query<T[]>(
    'SELECT id, revocado_en FROM biometric_devices WHERE LOWER(serial) = LOWER(?)',
    [serial]
  );
}

export async function eliminarDispositivoBiometrico(id: string): Promise<void> {
  await query('DELETE FROM biometric_devices WHERE id = ?', [id]);
}

export async function crearDispositivoBiometrico(data: {
  id: string;
  nombre: string;
  marca: string;
  modelo: string | null;
  serial: string;
  ip: string | null;
  creadoPor: string;
}): Promise<void> {
  await query(
    `INSERT INTO biometric_devices (id, nombre, marca, modelo, serial, ip, creado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [data.id, data.nombre, data.marca, data.modelo, data.serial, data.ip, data.creadoPor]
  );
}

export async function actualizarUltimoUsoDispositivo(id: string): Promise<void> {
  await query('UPDATE biometric_devices SET ultimo_uso = CURRENT_TIMESTAMP WHERE id = ?', [id]);
}

export async function listarDispositivosBiometricos<T>(): Promise<T[]> {
  return query<T[]>(
    `SELECT id, nombre, marca, modelo, serial, ip, usuario_equipo, mac, recoger_registros,
            fecha_crea, ultimo_uso, revocado_en, (revocado_en IS NULL) AS activo
       FROM biometric_devices ORDER BY fecha_crea DESC`
  );
}

export async function revocarDispositivoBiometrico(id: string): Promise<void> {
  await query(
    'UPDATE biometric_devices SET revocado_en = CURRENT_TIMESTAMP WHERE id = ? AND revocado_en IS NULL',
    [id]
  );
}

export function buscarUsuarioBiometricoPorCodigo<T>(codigo: string): Promise<T[]> {
  return query<T[]>(
    `SELECT id_usuario, nombre, apellido, estado FROM usuarios
      WHERE biometrico_codigo IS NOT NULL AND TRIM(biometrico_codigo) <> ''
        AND LOWER(TRIM(biometrico_codigo)) = LOWER(?)`,
    [codigo]
  );
}

export function buscarUsuarioBiometricoPorId<T>(usuarioId: string): Promise<T[]> {
  return query<T[]>(
    'SELECT id_usuario, nombre, apellido, estado FROM usuarios WHERE id_usuario = ?',
    [usuarioId]
  );
}

export function buscarAsistenciaBiometricaDelDia<T>(
  usuarioId: string,
  fecha: string
): Promise<T[]> {
  return query<T[]>('SELECT id_asistencia FROM asistencias WHERE usuario_id = ? AND fecha = ?', [
    usuarioId,
    fecha
  ]);
}

export async function insertarEventoBiometrico(data: Record<string, unknown>): Promise<void> {
  await BaseRepository.insert(query, 'biometric_events', data);
}

export function obtenerEquipoParaPoller<T>(dispositivoId: string): Promise<T[]> {
  return query<T[]>(
    `SELECT id, serial, recoger_registros, historico_limpiado_en FROM biometric_devices
      WHERE id = ? AND revocado_en IS NULL`,
    [dispositivoId]
  );
}

export function listarEquiposPoller<T>(): Promise<T[]> {
  return query<T[]>(
    `SELECT id, nombre, serial, ip, usuario_equipo, clave_cifrada, recoger_registros
       FROM biometric_devices
      WHERE revocado_en IS NULL AND recoger_registros = 1
        AND ip IS NOT NULL AND usuario_equipo IS NOT NULL AND clave_cifrada IS NOT NULL`
  );
}

export function obtenerMaximoRegistroDispositivo<T>(serial: string): Promise<T[]> {
  return query<T[]>('SELECT MAX(rec_no) AS max FROM biometric_device_records WHERE serial = ?', [
    serial
  ]);
}

export function buscarRegistroPorNumero<T>(serial: string, recNo: number): Promise<T[]> {
  return query<T[]>(
    'SELECT id FROM biometric_device_records WHERE serial = ? AND rec_no = ? LIMIT 1',
    [serial, recNo]
  );
}

export function buscarRegistroPorContenido<T>(data: {
  serial: string;
  codigo: string;
  fecha: string;
  metodo: string;
}): Promise<T[]> {
  return query<T[]>(
    `SELECT id FROM biometric_device_records
      WHERE serial = ? AND codigo_persona = ? AND fecha_dispositivo = ? AND metodo = ? LIMIT 1`,
    [data.serial, data.codigo, data.fecha, data.metodo]
  );
}

export async function insertarRegistroDispositivo(
  data: Record<string, unknown>
): Promise<string | null> {
  try {
    await BaseRepository.insert(query, 'biometric_device_records', data);
    return String(data.id);
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505')
      return null;
    throw error;
  }
}

export function equipoListenerActivo<T>(dispositivoId: string): Promise<T[]> {
  return query<T[]>(
    `SELECT id, serial, recoger_registros FROM biometric_devices
      WHERE id = ? AND revocado_en IS NULL`,
    [dispositivoId]
  );
}

export function listarEquiposListenerActivos<T>(): Promise<T[]> {
  return query<T[]>(
    `SELECT id FROM biometric_devices
      WHERE revocado_en IS NULL AND recoger_registros = 1
        AND ip IS NOT NULL AND usuario_equipo IS NOT NULL AND clave_cifrada IS NOT NULL`
  );
}

export function buscarRegistroListener<T>(data: {
  serial: string;
  codigo: string;
  fecha: string;
  metodo: string;
}): Promise<T[]> {
  return query<T[]>(
    `SELECT id FROM biometric_device_records
      WHERE serial = ? AND codigo_persona = ? AND fecha_dispositivo = ? AND metodo = ? LIMIT 1`,
    [data.serial, data.codigo, data.fecha, data.metodo]
  );
}

export function obtenerEquipoListener<T>(dispositivoId: string): Promise<T[]> {
  return query<T[]>(
    `SELECT id, serial, ip, usuario_equipo, clave_cifrada, recoger_registros, historico_limpiado_en
       FROM biometric_devices WHERE id = ? AND revocado_en IS NULL`,
    [dispositivoId]
  );
}

export function listarPlantillasDelUsuario<T>(
  usuarioId: string,
  dispositivoId: string
): Promise<T[]> {
  return query<T[]>(
    `SELECT tipo, datos FROM biometric_plantillas WHERE usuario_id = ? AND dispositivo_id = ?`,
    [usuarioId, dispositivoId]
  );
}

export function listarPlantillaFacial<T>(usuarioId: string): Promise<T[]> {
  return query<T[]>(
    `SELECT datos FROM biometric_plantillas
      WHERE usuario_id = ? AND tipo = 'cara'
      ORDER BY fecha_captura DESC NULLS LAST LIMIT 1`,
    [usuarioId]
  );
}

export function obtenerFotoPerfilUsuario<T>(usuarioId: string): Promise<T[]> {
  return query<T[]>('SELECT foto FROM usuarios WHERE id_usuario = ?', [usuarioId]);
}

export async function marcarPlantillasNoSincronizadas(
  usuarioId: string,
  dispositivoId: string
): Promise<void> {
  await query(
    `UPDATE biometric_plantillas SET sincronizada = 0, fecha_sincronizacion = NULL
      WHERE usuario_id = ? AND dispositivo_id = ?`,
    [usuarioId, dispositivoId]
  );
}

export function obtenerUltimasPlantillasFaciales<T>(): Promise<T[]> {
  return query<T[]>(
    `SELECT DISTINCT ON (usuario_id)
            id, usuario_id, dispositivo_id, datos, vector, vector_actualizado_en, fecha_captura
       FROM biometric_plantillas
      WHERE tipo = 'cara'
        AND usuario_id IN (SELECT id_usuario FROM usuarios WHERE estado = 1 AND biometrico_facial = 1)
      ORDER BY usuario_id, fecha_captura DESC NULLS LAST`
  );
}

export async function actualizarVectorPlantilla(id: string, vector: Buffer): Promise<void> {
  await query(
    `UPDATE biometric_plantillas
        SET vector = ?, vector_actualizado_en = CURRENT_TIMESTAMP
      WHERE id = ?`,
    [vector, id]
  );
}

export async function marcarVectorPlantillaRevisado(id: string): Promise<void> {
  await query(
    `UPDATE biometric_plantillas SET vector_actualizado_en = CURRENT_TIMESTAMP WHERE id = ?`,
    [id]
  );
}

export function listarCandidatosFaciales<T>(): Promise<T[]> {
  return query<T[]>(
    `SELECT DISTINCT ON (usuario_id) usuario_id, vector
       FROM biometric_plantillas
      WHERE tipo = 'cara' AND vector IS NOT NULL
        AND usuario_id IN (SELECT id_usuario FROM usuarios WHERE estado = 1 AND biometrico_facial = 1)
      ORDER BY usuario_id, fecha_captura DESC NULLS LAST`
  );
}

export async function actualizarResultadoIdentificacion(
  recordId: string,
  estado: string,
  usuarioId: string | null,
  similitud: number | null
): Promise<void> {
  await query(
    `UPDATE biometric_device_records
        SET identificado_usuario_id = ?, identificacion_similitud = ?, identificacion_estado = ?
      WHERE id = ?`,
    [usuarioId, similitud, estado, recordId]
  );
}

export function obtenerRecordParaIdentificar<T>(recordId: string): Promise<T[]> {
  return query<T[]>(
    `SELECT foto, codigo_persona, rec_no, fecha_dispositivo
       FROM biometric_device_records WHERE id = ?`,
    [recordId]
  );
}

export function listarIdentificacionesPendientes<T>(data: {
  limite: number;
  ventanaDias: number;
  excluirIds: string[];
}): Promise<T[]> {
  const exclusion = data.excluirIds.length
    ? ` AND id NOT IN (${data.excluirIds.map(() => '?').join(',')})`
    : '';
  return query<T[]>(
    `SELECT id, dispositivo_id
       FROM biometric_device_records
      WHERE foto IS NOT NULL
        AND (identificacion_estado IS NULL OR identificacion_estado = 'error')
        AND fecha_dispositivo > CURRENT_TIMESTAMP - make_interval(days => CAST(? AS integer))${exclusion}
      ORDER BY fecha_dispositivo DESC
      LIMIT ?`,
    [data.ventanaDias, ...data.excluirIds, data.limite]
  );
}

export function obtenerEquipoEnrolamiento<T>(dispositivoId: string): Promise<T[]> {
  return query<T[]>(
    `SELECT id, nombre, marca, serial, ip, usuario_equipo, clave_cifrada, mac
       FROM biometric_devices WHERE id = ? AND revocado_en IS NULL`,
    [dispositivoId]
  );
}

export function obtenerPrimerEquipoConIp<T>(): Promise<T[]> {
  return query<T[]>(
    `SELECT id, nombre, marca, serial, ip, usuario_equipo, clave_cifrada, mac
       FROM biometric_devices
      WHERE revocado_en IS NULL AND ip IS NOT NULL
      ORDER BY fecha_crea ASC LIMIT 1`
  );
}

export async function actualizarCredencialesEquipo(data: {
  dispositivoId: string;
  ip: string;
  usuario: string;
  claveCifrada: string;
}): Promise<void> {
  await query(
    `UPDATE biometric_devices
        SET ip = ?, usuario_equipo = ?, clave_cifrada = ?
      WHERE id = ?`,
    [data.ip, data.usuario, data.claveCifrada, data.dispositivoId]
  );
}

export function obtenerPlantillasDelUsuario<T>(
  usuarioId: string,
  dispositivoId: string
): Promise<T[]> {
  return listarPlantillasDelUsuario<T>(usuarioId, dispositivoId);
}

export function obtenerPlantillaCaraUsuario<T>(usuarioId: string): Promise<T[]> {
  return listarPlantillaFacial<T>(usuarioId);
}

export function obtenerPlantillaFacialMaestra<T>(usuarioId: string): Promise<T[]> {
  return query<T[]>(
    `SELECT 'cara' AS tipo, datos FROM biometric_plantillas
      WHERE usuario_id = ? AND tipo = 'cara'
      ORDER BY fecha_captura DESC NULLS LAST LIMIT 1`,
    [usuarioId]
  );
}

export function obtenerCodigoPersonaBiometrico<T>(usuarioId: string): Promise<T[]> {
  return query<T[]>('SELECT biometrico_codigo FROM usuarios WHERE id_usuario = ?', [usuarioId]);
}

export function listarEquiposParaEnrolamiento<T>(): Promise<T[]> {
  return query<T[]>(
    `SELECT id, nombre, marca, serial, ip, usuario_equipo, clave_cifrada, mac
       FROM biometric_devices WHERE revocado_en IS NULL ORDER BY fecha_crea ASC`,
    []
  );
}

export function listarPlantillasPruebaIdentificacion<T>(): Promise<T[]> {
  return query<T[]>(
    `SELECT DISTINCT ON (p.usuario_id)
            p.id, p.datos, p.fecha_captura,
            u.id_usuario, u.nombre, u.apellido, u.run, u.biometrico_codigo
       FROM biometric_plantillas p
       JOIN usuarios u ON u.id_usuario = p.usuario_id
      WHERE p.tipo = 'cara' AND u.estado = 1 AND u.biometrico_facial = 1
      ORDER BY p.usuario_id, p.fecha_captura DESC NULLS LAST`
  );
}

export function listarPlantillasPendientesSincronizacion<T>(dispositivoId: string): Promise<T[]> {
  return query<T[]>(
    `SELECT DISTINCT ON (bp.usuario_id)
           bp.usuario_id, u.nombre, u.apellido, u.estado
       FROM biometric_plantillas bp
       LEFT JOIN usuarios u ON u.id_usuario = bp.usuario_id
      WHERE bp.dispositivo_id = ? AND bp.sincronizada = 0
      ORDER BY bp.usuario_id, bp.fecha_captura ASC`,
    [dispositivoId]
  );
}

export function listarEquiposParaVigilanciaIp<T>(): Promise<T[]> {
  return query<T[]>(
    `SELECT id, serial, ip, usuario_equipo, clave_cifrada
       FROM biometric_devices
      WHERE revocado_en IS NULL AND ip IS NOT NULL
        AND usuario_equipo IS NOT NULL AND clave_cifrada IS NOT NULL`
  );
}

export function obtenerConfiguracionRecepcionAutomatica(): Promise<
  Array<{ clave: string; valor: string }>
> {
  return query(
    `SELECT clave, valor FROM configuraciones
      WHERE clave IN ('biometric_recepcion_activa', 'biometric_ip_watch')`
  );
}

export function listarAsistenciasBiometricasHoy<T>(hoy: string): Promise<T[]> {
  return query<T[]>(
    `SELECT (TRIM(CAST(U.nombre AS text)) || ' ' || TRIM(CAST(U.apellido AS text))) AS nombre_completo,
            A.hora, A.biometric_record_id AS record_id
       FROM asistencias A
       INNER JOIN usuarios U ON U.id_usuario = A.usuario_id
      WHERE A.origen = 'biometrico' AND A.fecha = ? AND A.estado = 1
      ORDER BY A.hora DESC`,
    [hoy]
  );
}

export function obtenerVentanaAsistencia<T>(): Promise<T[]> {
  return query<T[]>(
    `SELECT clave, valor FROM configuraciones
      WHERE clave IN ('asistencia_hora_inicio', 'asistencia_minuto_inicio', 'asistencia_hora_fin', 'asistencia_minuto_fin')`
  );
}

export function listarEstadoLectores<T>(): Promise<T[]> {
  return query<T[]>(
    `SELECT id, nombre, marca, serial, ip, recoger_registros, ultimo_uso
       FROM biometric_devices WHERE revocado_en IS NULL ORDER BY fecha_crea DESC`
  );
}

export function listarDesfasesRecientes<T>(): Promise<T[]> {
  return query<T[]>(
    `SELECT serial,
            AVG(EXTRACT(EPOCH FROM (fecha_recepcion - fecha_dispositivo))) AS desfase_promedio,
            COUNT(*) AS muestras
       FROM biometric_events
      WHERE fecha_dispositivo IS NOT NULL
        AND fecha_recepcion > CURRENT_TIMESTAMP - interval '24 hours'
      GROUP BY serial`
  );
}

export function obtenerCodigoBiometricoUsuario<T>(usuarioId: string): Promise<T[]> {
  return query<T[]>(
    `SELECT biometrico_codigo AS codigo FROM usuarios
      WHERE id_usuario = ? AND biometrico_codigo IS NOT NULL AND TRIM(biometrico_codigo) <> ''`,
    [usuarioId]
  );
}

export async function actualizarFotoRecord(id: string, foto: Buffer): Promise<void> {
  await query('UPDATE biometric_device_records SET foto = ? WHERE id = ?', [foto, id]);
}

export async function listarFotosPendientes<T>(limite: number): Promise<T[]> {
  return query<T[]>(
    `SELECT id, dispositivo_id, foto_url
       FROM biometric_device_records
      WHERE foto IS NULL AND foto_url IS NOT NULL
        AND fecha_dispositivo > CURRENT_TIMESTAMP - interval '3 days'
      ORDER BY fecha_dispositivo DESC
      LIMIT ?`,
    [limite]
  );
}
