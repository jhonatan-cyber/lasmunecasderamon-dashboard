/**
 * Lecturas y registro de solicitudes de anulación de servicios. Infraestructura
 * privada del módulo: nadie fuera de `modules/operacion` importa este archivo (§5).
 *
 * Este SQL vivía dentro de tres rutas HTTP (`/api/services/cancellation`,
 * `/api/services/cancellation-request` y `/api/services/process-cancellation`),
 * que mezclaban adaptación, consulta y validación. Mismo SQL y misma selección que
 * tenían las rutas: la primera casilla de la fase 5 pide sacarlo de ahí, y una ruta
 * autentica, valida el transporte, llama a un caso de uso y traduce la respuesta.
 *
 * El procesamiento (confirmar o rechazar) y la anulación corren en
 * `./anulaciones` con contexto opaco, en una sola unidad junto con caja,
 * prepago, comisiones, habitación y disponibilidad.
 */
import { guardarAsignaciones } from './asignacionesRepositorio';
import { generateUUID, query } from '@/lib/database/db';
import type { ContextoOperacion } from '@/lib/transaction/contract';
import { resolverTransaccion } from '@/lib/transaction/infrastructure';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { esHabitacionSoloVentas } from '@/lib/business/habitaciones';
import { BaseRepository } from '@/lib/database/base-repository';
import { BusinessError, DatabaseError } from '@/lib/errors/errors';
import { logger } from '@/lib/utils/logger';
import type { ServiceType } from '@/lib/business/schemas';
import { mapServiceFromDB } from '@/modules/operacion/servicios/mapeo';
import type { ServicioParaAnulacion, SolicitudAnulacionServicio } from '../contracts';

export function obtenerServicioParaAlerta(solicitudId: string) {
  return query<{ codigo: string; total: number }[]>(
    `SELECT s.codigo, s.total FROM servicios s
     INNER JOIN solicitudes_anulacion_servicios sas ON sas.servicio_id = s.id_servicio
     WHERE sas.id = ? LIMIT 1`,
    [solicitudId]
  );
}

/**
 * El servicio con su cliente y habitación. La ruta lo usa para el aviso de
 * WhatsApp; el nombre del cliente ya viene resuelto con `COALESCE` para no
 * repetir el texto de sustitución en tres sitios.
 */
export async function obtenerServicioParaAnulacion(
  servicioId: string | number
): Promise<ServicioParaAnulacion | null> {
  const rows = await query<ServicioParaAnulacion[]>(
    `SELECT s.codigo, s.total, s.tiempo, h.nombre as habitacion_nombre,
            COALESCE(c.nombre, 'Sin cliente registrado') as cliente_nombre
     FROM servicios s
     LEFT JOIN clientes c ON s.cliente_id = c.id_cliente
     LEFT JOIN habitaciones h ON s.habitacion_id = h.id_habitacion
     WHERE s.id_servicio = ?
     LIMIT 1`,
    [servicioId]
  );
  return rows[0] ?? null;
}

/** Solicitud por token, sólo si sigue pendiente: la vista de confirmación. */
export async function obtenerSolicitudAnulacionServicioPorToken(
  token: string
): Promise<SolicitudAnulacionServicio[]> {
  return await query<SolicitudAnulacionServicio[]>(
    `SELECT sas.id, sas.token, sas.estado, sas.motivo, sas.solicitado_por, sas.fecha_solicitud,
            s.id_servicio as servicio_id, s.codigo, s.total, s.tiempo,
            COALESCE(c.nombre, 'Sin cliente registrado') as cliente_nombre,
            COALESCE(h.nombre, 'Sin habitacion') as habitacion_numero
     FROM solicitudes_anulacion_servicios sas
     INNER JOIN servicios s ON s.id_servicio = sas.servicio_id
     LEFT JOIN clientes c ON c.id_cliente = s.cliente_id
     LEFT JOIN habitaciones h ON h.id_habitacion = s.habitacion_id
     WHERE sas.token = ? AND sas.estado = 'pendiente'
     LIMIT 1`,
    [token]
  );
}

export async function listarSolicitudesAnulacionServiciosPendientes() {
  return query<
    Array<{
      id: string;
      servicio_id: string;
      monto: number;
      motivo: string;
      estado: string;
      fecha_solicitud: string;
      codigo: string;
    }>
  >(
    `SELECT sas.id, sas.servicio_id, s.total AS monto, sas.motivo, sas.estado, sas.fecha_solicitud, s.codigo
     FROM solicitudes_anulacion_servicios sas JOIN servicios s ON s.id_servicio = sas.servicio_id
     WHERE sas.estado = 'pendiente' ORDER BY sas.fecha_solicitud DESC`
  );
}

/**
 * Alta de la solicitud. `solicitado_por` se guarda como NULL a propósito: esta
 * ruta es pública y no conoce al actor; quien sí lo conoce es `ServiceService`.
 */
export async function registrarSolicitudAnulacionServicio(
  servicioId: string | number,
  motivo: string
): Promise<string> {
  const token = generateUUID();
  const now = getNowInBusinessTimezone();

  await query(
    `INSERT INTO solicitudes_anulacion_servicios (id, token, servicio_id, motivo, solicitado_por, fecha_solicitud, estado)
       VALUES (?, ?, ?, ?, NULL, ?, 'pendiente')`,
    [generateUUID(), token, Number(servicioId), motivo, now]
  );

  return token;
}

/**
 * Escrituras sobre tablas propias de Operación (`servicios`,
 * `detalle_servicios`, `solicitudes_anulacion_servicios`). Reciben
 * `ContextoOperacion`: la anulación o el cambio de estado confirman o
 * revierten junto con caja, prepago, comisiones, habitación y disponibilidad.
 * Mismo SQL heredado de `ServiceQueries`.
 */

export interface ServicioAnulacion {
  id_servicio: string;
  estado: number;
  habitacion_id: string | null;
  cliente_id: string | null;
  caja_id: string | null;
  metodo_pago: string | null;
  total: number;
  iva: number;
  pagos_mixtos: unknown;
}

export async function leerServicioParaAnular(
  servicioId: string,
  contexto: ContextoOperacion
): Promise<ServicioAnulacion | null> {
  const rows = await resolverTransaccion(contexto)<ServicioAnulacion[]>(
    `SELECT id_servicio, estado, habitacion_id, cliente_id, caja_id, metodo_pago, total, iva, pagos_mixtos
       FROM servicios
      WHERE id_servicio = ?
      LIMIT 1 FOR UPDATE`,
    [servicioId]
  );
  return rows[0] ?? null;
}

export async function leerEstadoServicio(
  servicioId: string,
  contexto: ContextoOperacion
): Promise<{ estado: number; habitacion_id: string | null; paused_at: unknown } | null> {
  const rows = await resolverTransaccion(contexto)<
    { estado: number; habitacion_id: string | null; paused_at: unknown }[]
  >('SELECT estado, habitacion_id, paused_at FROM servicios WHERE id_servicio = ? FOR UPDATE', [
    servicioId
  ]);
  return rows[0] ?? null;
}

export async function marcarEstadoServicio(
  servicioId: string,
  estado: number,
  contexto: ContextoOperacion
): Promise<void> {
  await resolverTransaccion(contexto)(
    'UPDATE servicios SET estado = ?, fecha_mod = ? WHERE id_servicio = ?',
    [estado, getNowInBusinessTimezone(), servicioId]
  );
}

export async function marcarPausaServicio(
  servicioId: string,
  contexto: ContextoOperacion
): Promise<void> {
  const now = getNowInBusinessTimezone();
  const trx = resolverTransaccion(contexto);
  await trx('UPDATE servicios SET estado = ?, fecha_mod = ? WHERE id_servicio = ?', [
    3,
    now,
    servicioId
  ]);
  await trx('UPDATE servicios SET estado = ?, paused_at = ? WHERE id_servicio = ?', [
    3,
    now,
    servicioId
  ]);
}

export async function reanudarServicio(
  servicioId: string,
  pausedAt: unknown,
  contexto: ContextoOperacion
): Promise<boolean> {
  if (!pausedAt) return false;
  const now = getNowInBusinessTimezone();
  await resolverTransaccion(contexto)(
    `UPDATE servicios SET fecha_crea = (CAST(fecha_crea AS timestamp) + make_interval(secs => CAST(TRUNC(EXTRACT(EPOCH FROM (CAST(? AS timestamp) - CAST(paused_at AS timestamp))) / 1) AS double precision))), paused_at = NULL WHERE id_servicio = ?`,
    [now, servicioId]
  );
  return true;
}

export async function leerAnfitrionasServicio(
  servicioId: string,
  contexto: ContextoOperacion
): Promise<string[]> {
  const rows = await resolverTransaccion(contexto)<{ usuario_id: string }[]>(
    'SELECT usuario_id FROM detalle_servicios WHERE servicio_id = ?',
    [servicioId]
  );
  return rows.map(row => row.usuario_id);
}

export async function crearSolicitudAnulacionServicio(
  servicioId: string,
  motivo: string,
  solicitadoPor: string,
  contexto: ContextoOperacion
): Promise<string> {
  const idAnul = generateUUID();
  const token = generateUUID();
  await resolverTransaccion(contexto)(
    `INSERT INTO solicitudes_anulacion_servicios (id, servicio_id, token, estado, fecha_solicitud, solicitado_por, motivo)
     VALUES (?, ?, ?, 'pendiente', ?, ?, ?)`,
    [idAnul, servicioId, token, getNowInBusinessTimezone(), solicitadoPor, motivo]
  );
  return token;
}

export async function actualizarEstadoSolicitudServicio(
  requestId: string,
  status: string,
  contexto: ContextoOperacion
): Promise<'confirmada' | 'rechazada'> {
  const normalized = String(status || '').toLowerCase();
  const trx = resolverTransaccion(contexto);
  const rows = await trx<Array<{ estado: string }>>(
    'SELECT estado FROM solicitudes_anulacion_servicios WHERE id = ? FOR UPDATE',
    [requestId]
  );
  if (!rows[0] || rows[0].estado !== 'pendiente')
    throw new BusinessError('La solicitud ya fue procesada');
  const nextStatus =
    normalized === 'confirmar' || normalized === 'aprobado' || normalized === 'confirmada'
      ? 'confirmada'
      : 'rechazada';
  await resolverTransaccion(contexto)(
    'UPDATE solicitudes_anulacion_servicios SET estado = ? WHERE id = ?',
    [nextStatus, requestId]
  );
  return nextStatus;
}

export async function leerServicioDeSolicitud(
  requestId: string,
  contexto: ContextoOperacion
): Promise<string | null> {
  const rows = await resolverTransaccion(contexto)<{ servicio_id: string }[]>(
    'SELECT servicio_id FROM solicitudes_anulacion_servicios WHERE id = ?',
    [requestId]
  );
  return rows[0]?.servicio_id ?? null;
}

/**
 * Alta y edición de servicios. Mismo SQL que `ServiceService.createService` y
 * `updateServicio`: la unidad la abre el caso de uso.
 */

export async function leerHabitacionParaServicio(
  habitacionId: string,
  contexto: ContextoOperacion
): Promise<{ precio: number; comision_anfitriona: number; tiempo: number; estado: number } | null> {
  const rows = await resolverTransaccion(contexto)<
    { precio: number; comision_anfitriona: number; tiempo: number; estado: number }[]
  >(
    'SELECT precio, comision_anfitriona, tiempo, estado FROM habitaciones WHERE id_habitacion = ? FOR UPDATE',
    [habitacionId]
  );
  return rows[0] ?? null;
}

export async function validarHabitacionDisponibleParaServicio(
  habitacionId: string,
  contexto: ContextoOperacion,
  servicioOriginalId?: string
) {
  // La fila de habitación serializa las altas concurrentes. La actividad se
  // consulta después del bloqueo para ver el servicio que terminó de crearse.
  const habitacion = await leerHabitacionParaServicio(habitacionId, contexto);
  if (!habitacion) throw new BusinessError('La habitación ya no existe');
  // Sin precio, comisión ni duración la habitación es solo para ventas con
  // habitación. Un servicio original (edición de uno heredado) se conserva.
  if (!servicioOriginalId && esHabitacionSoloVentas(habitacion))
    throw new BusinessError(
      'Esta habitación solo está disponible para ventas con habitación',
      'ROOM_SALES_ONLY'
    );
  if (Number(habitacion.estado) !== 1 && !(servicioOriginalId && Number(habitacion.estado) === 2))
    throw new BusinessError('La habitación está ocupada o no está disponible', 'ROOM_OCCUPIED');
  const actividad = await resolverTransaccion(contexto)<{ ocupada: number }[]>(
    `SELECT 1 AS ocupada WHERE EXISTS (
      SELECT 1 FROM servicios WHERE habitacion_id = ? AND estado IN (2, 3)
        ${servicioOriginalId ? 'AND id_servicio <> ?' : ''}
    )${
      servicioOriginalId
        ? ''
        : `
      OR EXISTS (SELECT 1 FROM ventas WHERE habitacion_id = ? AND estado IN (2, 3) AND tiempo > 0)
      OR EXISTS (SELECT 1 FROM cuentas WHERE habitacion_id = ? AND estado = 1 AND COALESCE(tiempo_actual, tiempo) > 0)`
    }`,
    servicioOriginalId
      ? [habitacionId, servicioOriginalId]
      : [habitacionId, habitacionId, habitacionId]
  );
  if (actividad.length)
    throw new BusinessError('La habitación ya tiene un servicio o privado activo', 'ROOM_OCCUPIED');
  return habitacion;
}

export async function insertarServicio(
  data: Record<string, unknown>,
  contexto: ContextoOperacion
): Promise<void> {
  await BaseRepository.insert(resolverTransaccion(contexto), 'servicios', data);
}

export interface DetalleServicioFila {
  id_detalle_servicio: string;
  usuario_id: string;
  servicio_id: string;
  comision: number;
  fecha_crea: string;
}

export async function insertarDetallesServicio(
  filas: DetalleServicioFila[],
  contexto: ContextoOperacion
): Promise<void> {
  if (filas.length === 0) return;
  const trx = resolverTransaccion(contexto);
  const columns = ['id_detalle_servicio', 'usuario_id', 'servicio_id', 'comision', 'fecha_crea'];
  const placeholders = filas.map(() => `(${columns.map(() => '?').join(', ')})`).join(', ');
  const values = filas.flatMap(row => columns.map(col => row[col as keyof DetalleServicioFila]));
  await trx(`INSERT INTO detalle_servicios (${columns.join(', ')}) VALUES ${placeholders}`, values);
}

export async function reemplazarDetallesServicio(
  servicioId: string,
  usuarioIds: string[],
  contexto: ContextoOperacion
): Promise<void> {
  await guardarAsignaciones(servicioId, usuarioIds, getNowInBusinessTimezone(), contexto);
}

export async function insertarClientesServicio(
  servicioId: string,
  clienteIds: string[],
  contexto: ContextoOperacion
): Promise<void> {
  const filas = clienteIds
    .filter(Boolean)
    .map(clienteId => [generateUUID(), servicioId, clienteId]);
  if (filas.length === 0) return;
  const placeholders = filas.map(() => '(?, ?, ?)').join(', ');
  await resolverTransaccion(contexto)(
    `INSERT INTO detalle_servicios_clientes (id, servicio_id, cliente_id) VALUES ${placeholders}`,
    filas.flat()
  );
}

export async function actualizarCamposServicio(
  servicioId: string,
  campos: Record<string, unknown>,
  contexto: ContextoOperacion
): Promise<void> {
  await BaseRepository.update(
    resolverTransaccion(contexto),
    'servicios',
    'id_servicio',
    servicioId,
    campos
  );
}

export async function leerIvaServicio(
  servicioId: string,
  contexto: ContextoOperacion
): Promise<number> {
  const rows = await resolverTransaccion(contexto)<{ iva: number }[]>(
    'SELECT iva FROM servicios WHERE id_servicio = ?',
    [servicioId]
  );
  return Number(rows[0]?.iva || 0);
}

/**
 * Lecturas de servicios. Mismo SQL que `ServiceQueries`: listado, por fechas,
 * por usuario y detalle con comisiones. La UI las consume igual.
 */

export async function listarServicios(params: {
  all?: string;
  estado?: string;
  caja_id?: string;
  limit?: string;
  page?: string;
}): Promise<any> {
  try {
    const lNum = parseInt(params.limit || '50');
    const pNum = parseInt(params.page || '1');
    const offset = (pNum - 1) * lNum;

    let where = 'WHERE 1=1';
    let sqlParams: any[] = [];
    if (params.estado) {
      where = 'WHERE s.estado = ?';
      sqlParams.push(Number(params.estado));
    } else if (params.all === 'true') where = 'WHERE s.estado IN (0, 1, 4)';
    else if (params.all === 'false') where = 'WHERE s.estado IN (2, 3)';
    else where = 'WHERE s.estado IN (1, 2, 3, 4)';

    if (params.caja_id) {
      where += ' AND s.caja_id = ?';
      sqlParams.push(params.caja_id);
    }

    const sql = `
      SELECT
        s.id_servicio, s.codigo, s.cliente_id, s.habitacion_id, s.precio_habitacion,
        s.precio_servicio, s.iva, s.sub_total, s.total, s.tiempo, s.metodo_pago,
        s.caja_id, s.created_by, s.estado, s.es_temporal, s.servicio_original_id,
        s.fecha_crea, s.fecha_mod, s.pagos_mixtos, s.producto_incluido_presentacion_id,
        (SELECT CONCAT(pr.nombre, ' · ', ip.nombre) FROM inventario_presentaciones ip JOIN productos pr ON pr.id_producto = ip.producto_id WHERE ip.id = s.producto_incluido_presentacion_id) AS producto_incluido_nombre,
        (SELECT COALESCE(SUM(dc.comision),0) FROM detalle_servicios dc WHERE dc.servicio_id = s.id_servicio) AS comision_registrada,
        h.nombre as habitacion_numero, h.comision_anfitriona as habitacion_comision,
        cu.nick as creator_nick, cu.nombre as creator_nombre, cu.apellido as creator_apellido, cu.foto as creator_foto,
        (CAST(cl.nombre AS text) || CAST(' ' AS text) || CAST(cl.apellido AS text)) as cliente_nombre,
        STRING_AGG(DISTINCT u.nick, ', ') as anfitrionas_nombres,
        STRING_AGG(DISTINCT u.id_usuario, ',') as anfitrionas_ids
      FROM servicios s
      LEFT JOIN habitaciones h ON h.id_habitacion = s.habitacion_id
      LEFT JOIN usuarios cu ON cu.id_usuario = s.created_by
      LEFT JOIN clientes cl ON cl.id_cliente = s.cliente_id
      LEFT JOIN detalle_servicios ds ON ds.servicio_id = s.id_servicio AND ds.liberado_en IS NULL
      LEFT JOIN usuarios u ON u.id_usuario = ds.usuario_id
      ${where}
      GROUP BY s.id_servicio, h.id_habitacion, cl.id_cliente, cu.id_usuario
      ORDER BY s.fecha_crea DESC
      LIMIT ? OFFSET ?
    `;
    const countSql = `SELECT COUNT(*) as count FROM servicios s ${where}`;
    const data = await query<any[]>(sql, [...sqlParams, lNum, offset]);
    const count = await query<any[]>(countSql, sqlParams);

    return {
      data: data.map(row => mapServiceFromDB(row)),
      total: count[0]?.count || 0
    };
  } catch (err) {
    logger.error('[operacion/servicios] Error en listarServicios:', { params, err });
    throw new DatabaseError('Error al obtener lista de servicios', err);
  }
}

export async function listarServiciosPorFechas(
  startDate: string,
  endDate: string
): Promise<ServiceType[]> {
  try {
    const results = await query<any[]>(
      `SELECT s.*,
      (SELECT CONCAT(pr.nombre, ' · ', ip.nombre) FROM inventario_presentaciones ip JOIN productos pr ON pr.id_producto = ip.producto_id WHERE ip.id = s.producto_incluido_presentacion_id) AS producto_incluido_nombre,
      (SELECT COALESCE(SUM(dc.comision),0) FROM detalle_servicios dc WHERE dc.servicio_id = s.id_servicio) AS comision_registrada, h.nombre as habitacion_nombre, cl.nombre as cliente_nombre
       , cu.nick as creator_nick, cu.nombre as creator_nombre, cu.apellido as creator_apellido, cu.foto as creator_foto
       FROM servicios s
       LEFT JOIN habitaciones h ON s.habitacion_id = h.id_habitacion
       LEFT JOIN clientes cl ON s.cliente_id = cl.id_cliente
       LEFT JOIN usuarios cu ON cu.id_usuario = s.created_by
       WHERE DATE(s.fecha_crea) BETWEEN ? AND ?
       ORDER BY s.fecha_crea DESC`,
      [startDate, endDate]
    );
    return results.map(row => mapServiceFromDB(row));
  } catch (err) {
    logger.error('[operacion/servicios] Error en listarServiciosPorFechas:', {
      startDate,
      endDate,
      err
    });
    throw new DatabaseError('Error al obtener servicios por fechas', err);
  }
}

export async function listarServiciosDeUsuario(userId: string): Promise<any[]> {
  try {
    return await query<any[]>(
      `SELECT
        s.id_servicio, s.codigo, s.tiempo, s.fecha_crea, s.precio_servicio,
        s.precio_habitacion, s.total, s.metodo_pago, s.estado,
        ds.comision as comision_usuario,
        ds.asignacion_activa,
        h.nombre as habitacion, h.comision_anfitriona as habitacion_comision,
        COALESCE((CAST(c.nombre AS text) || CAST(' ' AS text) || CAST(c.apellido AS text)), 'Sin cliente registrado') as cliente,
        STRING_AGG(DISTINCT COALESCE(u.nick, (CAST(u.nombre AS text) || CAST(' ' AS text) || CAST(u.apellido AS text))), ', ') as anfitriona,
        cu.nick as creado_por
       FROM servicios s
       INNER JOIN (SELECT servicio_id, usuario_id, SUM(comision) AS comision, BOOL_OR(liberado_en IS NULL) AS asignacion_activa FROM detalle_servicios GROUP BY servicio_id, usuario_id) ds ON s.id_servicio = ds.servicio_id AND ds.usuario_id = ?
       LEFT JOIN habitaciones h ON s.habitacion_id = h.id_habitacion
       LEFT JOIN clientes c ON c.id_cliente = s.cliente_id
       LEFT JOIN detalle_servicios ds2 ON ds2.servicio_id = s.id_servicio AND ds2.liberado_en IS NULL
       LEFT JOIN usuarios u ON u.id_usuario = ds2.usuario_id
       LEFT JOIN usuarios cu ON cu.id_usuario = s.created_by
       GROUP BY s.id_servicio, ds.comision, ds.asignacion_activa, h.id_habitacion, c.id_cliente, cu.id_usuario
       ORDER BY s.fecha_crea DESC`,
      [userId]
    );
  } catch (err) {
    logger.error('[operacion/servicios] Error en listarServiciosDeUsuario:', { userId, err });
    throw new DatabaseError(`Error al obtener servicios del usuario ${userId}`, err);
  }
}

export async function obtenerServicioDetallado(id: string): Promise<
  | (ServiceType & {
      usuarios: Array<{
        id_usuario: string;
        nombre: string;
        apellido: string;
        nick: string | null;
        estado_servicio: number;
      }>;
    })
  | null
> {
  try {
    const res = await query<any[]>(
      `SELECT s.*,
      (SELECT CONCAT(pr.nombre, ' · ', ip.nombre) FROM inventario_presentaciones ip JOIN productos pr ON pr.id_producto = ip.producto_id WHERE ip.id = s.producto_incluido_presentacion_id) AS producto_incluido_nombre,
      (SELECT COALESCE(SUM(dc.comision),0) FROM detalle_servicios dc WHERE dc.servicio_id = s.id_servicio) AS comision_registrada, h.comision_anfitriona AS habitacion_comision, h.nombre as habitacion_name, cl.nombre as cliente_name,
              cu.nick as creator_nick, cu.nombre as creator_nombre, cu.apellido as creator_apellido, cu.foto as creator_foto,
              STRING_AGG(DISTINCT
                CASE
                  WHEN u.nick IS NOT NULL AND u.nick != '' THEN u.nick
                  ELSE (CAST(u.nombre AS text) || CAST(' ' AS text) || CAST(u.apellido AS text))
                END, ', '
              ) as anfitrionas,
              STRING_AGG(DISTINCT u.id_usuario, ',') as anfitrionas_ids
       FROM servicios s
       LEFT JOIN habitaciones h ON s.habitacion_id = h.id_habitacion
       LEFT JOIN clientes cl ON s.cliente_id = cl.id_cliente
       LEFT JOIN usuarios cu ON cu.id_usuario = s.created_by
       LEFT JOIN detalle_servicios ds ON s.id_servicio = ds.servicio_id AND ds.liberado_en IS NULL
       LEFT JOIN usuarios u ON u.id_usuario = ds.usuario_id
       WHERE s.id_servicio = ?
       GROUP BY s.id_servicio, h.id_habitacion, cl.id_cliente, cu.id_usuario`,
      [id]
    );
    if (!res.length) return null;
    const usuarios = await query<any[]>(
      `SELECT DISTINCT u.id_usuario, u.nombre, u.apellido, u.nick, u.estado_servicio
       FROM detalle_servicios ds
       JOIN usuarios u ON u.id_usuario = ds.usuario_id
       WHERE ds.servicio_id = ? AND ds.liberado_en IS NULL
       ORDER BY u.nombre, u.apellido`,
      [id]
    );
    return { ...mapServiceFromDB(res[0]), usuarios };
  } catch (err) {
    logger.error('[operacion/servicios] Error en obtenerServicioDetallado:', {
      servicioId: id,
      err
    });
    throw new DatabaseError(`Error al obtener servicio ${id}`, err);
  }
}

export async function eliminarServicioFisico(
  servicioId: string,
  contexto: ContextoOperacion
): Promise<void> {
  const trx = resolverTransaccion(contexto);
  await trx('DELETE FROM detalle_servicios WHERE servicio_id = ?', [servicioId]);
  await trx('DELETE FROM servicios WHERE id_servicio = ?', [servicioId]);
}

export async function leerAdicionalActivo(
  id: string,
  contexto: ContextoOperacion
): Promise<boolean> {
  const rows = await resolverTransaccion(contexto)<{ id_servicio: string }[]>(
    'SELECT id_servicio FROM servicios WHERE servicio_original_id = ? AND es_temporal = 1 AND estado IN (2, 3) LIMIT 1',
    [id]
  );
  return rows.length > 0;
}

export async function leerImportesServicio(servicioId: string, contexto: ContextoOperacion) {
  const rows = await resolverTransaccion(contexto)<Array<Record<string, unknown>>>(
    'SELECT precio_habitacion, precio_servicio, iva, sub_total, total FROM servicios WHERE id_servicio = ? FOR UPDATE',
    [servicioId]
  );
  return rows[0] ?? null;
}
