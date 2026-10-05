import { query, generateUUID, withTransaction, type TransactionQuery } from '@/lib/database/db';
import { ServiceCreateSchema, type ServiceType } from '@/lib/business/schemas';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { BaseRepository } from '../BaseRepository';
import { DatabaseError } from '@/lib/errors/errors';
import {
  actualizarEstadoServicio,
  aprobarAnulacionServicio,
  solicitarAnulacionServicio,
  procesarAnulacionServicio
} from '@/modules/operacion';
import { logger } from '@/lib/utils/logger';
import { z } from 'zod';
import { mapServiceFromDB } from './serviceMappers';

const TABLE = 'servicios';
const ID_COL = 'id_servicio';

type ServiceUpdateInput = z.input<typeof ServiceCreateSchema>;

export async function approveAnulacionServicio(
  servicioId: string,
  approvedBy: string
): Promise<void> {
  await aprobarAnulacionServicio(servicioId, approvedBy);
}

export async function getAllServicios(params: {
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
    logger.error('[ServiceQueries] Error en getAllServicios:', { params, err });
    throw new DatabaseError('Error al obtener lista de servicios', err);
  }
}

export async function rawInsertServicio(
  trx: TransactionQuery | typeof query,
  data: any
): Promise<void> {
  await BaseRepository.insert(trx, TABLE, data);
}

export async function updateServicio(
  id: string,
  body: Partial<ServiceUpdateInput>
): Promise<ServiceType | null> {
  try {
    const validated = ServiceCreateSchema.partial().parse(body);
    const [prev] = await query<any[]>('SELECT iva FROM servicios WHERE id_servicio = ?', [id]);
    const ivaDelta = Number(validated.iva || 0) - Number(prev?.iva || 0);
    const now = getNowInBusinessTimezone(validated.device_date);

    await withTransaction(async trx => {
      await BaseRepository.update(trx, TABLE, ID_COL, id, {
        cliente_id: validated.cliente_id || null,
        habitacion_id: validated.habitacion_id,
        precio_habitacion: validated.precio_habitacion || 0,
        precio_servicio: validated.precio_servicio,
        iva: validated.iva || 0,
        sub_total: validated.sub_total,
        total: validated.total,
        tiempo: validated.tiempo,
        fecha_mod: now
      });

      if (ivaDelta !== 0) {
        const caja = await trx<any[]>(
          'SELECT id_caja FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1'
        );
        if (caja.length > 0)
          await trx('UPDATE cajas SET iva = GREATEST(0, iva + ?) WHERE id_caja = ?', [
            ivaDelta,
            caja[0].id_caja
          ]);
      }

      if (validated.usuarios && validated.usuarios.length > 0) {
        await trx('DELETE FROM detalle_servicios WHERE servicio_id = ?', [id]);

        const rows = validated.usuarios.map(uId => ({
          id_detalle_servicio: generateUUID(),
          usuario_id: uId,
          servicio_id: id,
          comision: 0,
          fecha_crea: now
        }));

        const columns = [
          'id_detalle_servicio',
          'usuario_id',
          'servicio_id',
          'comision',
          'fecha_crea'
        ];
        const placeholders = rows.map(() => `(${columns.map(() => '?').join(', ')})`).join(', ');
        const values = rows.flatMap(row => columns.map(col => row[col as keyof typeof row]));

        await trx(
          `INSERT INTO detalle_servicios (${columns.join(', ')}) VALUES ${placeholders}`,
          values
        );
      }
    });

    return await getServicioById(id);
  } catch (err) {
    logger.error('[ServiceQueries] Error en updateServicio:', { servicioId: id, err });
    throw new DatabaseError(`Error al actualizar servicio ${id}`, err);
  }
}

export async function updateServicioStatus(
  id: string,
  estado: number,
  userId?: string
): Promise<ServiceType | null> {
  await actualizarEstadoServicio(id, estado, userId);
  return await getServicioById(id);
}

export async function deleteServicio(id: string): Promise<void> {
  try {
    await withTransaction(async trx => {
      await trx('DELETE FROM detalle_servicios WHERE servicio_id = ?', [id]);
      await trx('DELETE FROM servicios WHERE id_servicio = ?', [id]);
    });
  } catch (err) {
    logger.error('[ServiceQueries] Error en deleteServicio:', { servicioId: id, err });
    throw new DatabaseError(`Error al eliminar servicio ${id}`, err);
  }
}

export async function getServiciosByDates(
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
    logger.error('[ServiceQueries] Error en getServiciosByDates:', { startDate, endDate, err });
    throw new DatabaseError('Error al obtener servicios por fechas', err);
  }
}

export async function getServiciosByUser(userId: string): Promise<any[]> {
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
    logger.error('[ServiceQueries] Error en getServiciosByUser:', { userId, err });
    throw new DatabaseError(`Error al obtener servicios del usuario ${userId}`, err);
  }
}

export async function getServicioById(id: string): Promise<ServiceType | null> {
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
    logger.error('[ServiceQueries] Error en getServicioById:', { servicioId: id, err });
    throw new DatabaseError(`Error al obtener servicio ${id}`, err);
  }
}

export async function requestAnulacionServicio(
  id: string,
  reason: string,
  requestedBy: string
): Promise<string> {
  return solicitarAnulacionServicio(id, reason, requestedBy);
}

export async function processAnulacionServicio(
  requestId: string,
  approvedBy: string,
  status: string
): Promise<void> {
  await procesarAnulacionServicio(requestId, approvedBy, status);
}
