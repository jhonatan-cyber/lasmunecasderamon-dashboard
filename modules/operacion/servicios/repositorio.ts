/**
 * Lecturas y registro de solicitudes de anulación de servicios. Infraestructura
 * privada del módulo: nadie fuera de `modules/operacion` importa este archivo (§5).
 *
 * Este SQL vivía dentro de tres rutas HTTP (`/api/servicios/anulacion`,
 * `/api/servicios/solicitud-anulacion` y `/api/servicios/procesar-anulacion`),
 * que mezclaban adaptación, consulta y validación. Mismo SQL y misma selección que
 * tenían las rutas: la primera casilla de la fase 5 pide sacarlo de ahí, y una ruta
 * autentica, valida el transporte, llama a un caso de uso y traduce la respuesta.
 *
 * El procesamiento (confirmar o rechazar) y la anulación corren en
 * `./anulaciones` con contexto opaco, en una sola unidad junto con caja,
 * prepago, comisiones, habitación y disponibilidad.
 */
import { generateUUID, query } from '@/lib/database/db';
import type { ContextoOperacion } from '@/lib/transaccion/contrato';
import { resolverTransaccion } from '@/lib/transaccion/infraestructura';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { BaseRepository } from '@/lib/database/base-repository';
import { DatabaseError } from '@/lib/errors/errors';
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
      LIMIT 1`,
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
  >('SELECT estado, habitacion_id, paused_at FROM servicios WHERE id_servicio = ?', [servicioId]);
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
): Promise<{ precio: number; comision_anfitriona: number } | null> {
  const rows = await resolverTransaccion(contexto)<
    { precio: number; comision_anfitriona: number }[]
  >('SELECT precio, comision_anfitriona FROM habitaciones WHERE id_habitacion = ?', [habitacionId]);
  return rows[0] ?? null;
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
  const trx = resolverTransaccion(contexto);
  const now = getNowInBusinessTimezone();
  await trx('DELETE FROM detalle_servicios WHERE servicio_id = ?', [servicioId]);
  await insertarDetallesServicio(
    usuarioIds.map(uId => ({
      id_detalle_servicio: generateUUID(),
      usuario_id: uId,
      servicio_id: servicioId,
      comision: 0,
      fecha_crea: now
    })),
    contexto
  );
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
        s.fecha_crea, s.fecha_mod, s.pagos_mixtos,
        h.nombre as habitacion_numero, h.comision_anfitriona as habitacion_comision,
        cu.nick as creator_nick, cu.nombre as creator_nombre, cu.apellido as creator_apellido, cu.foto as creator_foto,
        (CAST(cl.nombre AS text) || CAST(' ' AS text) || CAST(cl.apellido AS text)) as cliente_nombre,
        STRING_AGG(DISTINCT u.nick, ', ') as anfitrionas_nombres,
        STRING_AGG(DISTINCT u.id_usuario, ',') as anfitrionas_ids
      FROM servicios s
      LEFT JOIN habitaciones h ON h.id_habitacion = s.habitacion_id
      LEFT JOIN usuarios cu ON cu.id_usuario = s.created_by
      LEFT JOIN clientes cl ON cl.id_cliente = s.cliente_id
      LEFT JOIN detalle_servicios ds ON ds.servicio_id = s.id_servicio
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
      `SELECT s.*, h.nombre as habitacion_nombre, cl.nombre as cliente_nombre
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
        h.nombre as habitacion, h.comision_anfitriona as habitacion_comision,
        COALESCE((CAST(c.nombre AS text) || CAST(' ' AS text) || CAST(c.apellido AS text)), 'Sin cliente registrado') as cliente,
        STRING_AGG(DISTINCT COALESCE(u.nick, (CAST(u.nombre AS text) || CAST(' ' AS text) || CAST(u.apellido AS text))), ', ') as anfitriona,
        cu.nick as creado_por
       FROM servicios s
       INNER JOIN detalle_servicios ds ON s.id_servicio = ds.servicio_id AND ds.usuario_id = ?
       LEFT JOIN habitaciones h ON s.habitacion_id = h.id_habitacion
       LEFT JOIN clientes c ON c.id_cliente = s.cliente_id
       LEFT JOIN detalle_servicios ds2 ON ds2.servicio_id = s.id_servicio
       LEFT JOIN usuarios u ON u.id_usuario = ds2.usuario_id
       LEFT JOIN usuarios cu ON cu.id_usuario = s.created_by
       GROUP BY s.id_servicio, ds.comision, h.id_habitacion, c.id_cliente, cu.id_usuario
       ORDER BY s.fecha_crea DESC`,
      [userId]
    );
  } catch (err) {
    logger.error('[operacion/servicios] Error en listarServiciosDeUsuario:', { userId, err });
    throw new DatabaseError(`Error al obtener servicios del usuario ${userId}`, err);
  }
}

export async function obtenerServicioDetallado(id: string): Promise<ServiceType | null> {
  try {
    const res = await query<any[]>(
      `SELECT s.*, h.nombre as habitacion_name, cl.nombre as cliente_name,
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
       LEFT JOIN detalle_servicios ds ON s.id_servicio = ds.servicio_id
       LEFT JOIN usuarios u ON u.id_usuario = ds.usuario_id
       WHERE s.id_servicio = ?
       GROUP BY s.id_servicio, h.id_habitacion, cl.id_cliente, cu.id_usuario`,
      [id]
    );
    return res.length > 0 ? mapServiceFromDB(res[0]) : null;
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
