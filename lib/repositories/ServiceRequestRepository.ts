import { query, generateUUID } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { NotFoundError, BusinessError } from '@/lib/errors/errors';
import { ServiceService } from '@/lib/services/ServiceService';
import { ServiceRepository } from './ServiceRepository';

export class ServiceRequestRepository {
  static async getAll(estado?: string) {
    let sql = `
      SELECT ss.*, CONCAT(u_sol.nombre, ' ', u_sol.apellido) as solicitado_por_nombre, u_sol.nick as solicitado_por_nick, 
             CONCAT(c.nombre, ' ', c.apellido) as cliente_nombre, h.nombre as habitacion_nombre
      FROM solicitudes_servicios ss
      LEFT JOIN usuarios u_sol ON ss.solicitado_por = u_sol.id_usuario
      LEFT JOIN clientes c ON ss.cliente_id = c.id_cliente
      LEFT JOIN habitaciones h ON ss.habitacion_id = h.id_habitacion
    `;
    const params: any[] = [];
    if (estado) {
      sql += ' WHERE ss.estado = ?';
      params.push(estado);
    }
    sql += ' ORDER BY ss.fecha_solicitud DESC';
    const res = await query<any[]>(sql, params);
    return res.map(s => ({ ...s, anfitrionas_ids: typeof s.anfitrionas_ids === 'string' ? JSON.parse(s.anfitrionas_ids) : s.anfitrionas_ids }));
  }

  static async create(data: any, solicitadoPor: string) {
    const id = generateUUID();
    const fecha = getNowInBusinessTimezone(data.device_date);
    await query(`
      INSERT INTO solicitudes_servicios 
      (id_solicitud, cliente_id, habitacion_id, precio_servicio, precio_habitacion, comision_anfitriona, anfitrionas_ids, 
       num_clientes, metodo_pago, tiempo, total, iva, solicitado_por, codigo, fecha_solicitud) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, data.cliente_id || null, data.habitacion_id, data.precio_servicio || 0, data.precio_habitacion || 0, data.comision_anfitriona || 0, 
        JSON.stringify(data.anfitrionas_ids), data.num_clientes || 1, data.metodo_pago, data.tiempo || 0, data.total || 0, data.iva || 0, 
        solicitadoPor, data.codigo || null, fecha]);

    const info = await query<any[]>('SELECT h.nombre as habitacion_nombre, CONCAT(c.nombre, " ", c.apellido) as cliente_nombre FROM habitaciones h LEFT JOIN clientes c ON ? = c.id_cliente WHERE h.id_habitacion = ?', [data.cliente_id, data.habitacion_id]);
    return { id, ...info[0] };
  }

  static async getPendingCount() {
    const res = await query<any[]>('SELECT COUNT(*) as count FROM solicitudes_servicios WHERE estado = 0');
    return res[0]?.count || 0;
  }

  static async delete(id: string) {
    await query('DELETE FROM solicitudes_servicios WHERE id_solicitud = ?', [id]);
  }

  static async getById(id: string) {
    const rows = await query<any[]>(
      `
      SELECT ss.*, CONCAT(u_sol.nombre, ' ', u_sol.apellido) as solicitado_por_nombre, u_sol.nick as solicitado_por_nick,
             CONCAT(c.nombre, ' ', c.apellido) as cliente_nombre, h.nombre as habitacion_nombre
      FROM solicitudes_servicios ss
      LEFT JOIN usuarios u_sol ON ss.solicitado_por = u_sol.id_usuario
      LEFT JOIN clientes c ON ss.cliente_id = c.id_cliente
      LEFT JOIN habitaciones h ON ss.habitacion_id = h.id_habitacion
      WHERE ss.id_solicitud = ?
      LIMIT 1
    `,
      [id]
    );

    if (!rows.length) throw new NotFoundError('Solicitud de servicio', id);

    const row = rows[0];
    return {
      ...row,
      anfitrionas_ids:
        typeof row.anfitrionas_ids === 'string' ? JSON.parse(row.anfitrionas_ids) : row.anfitrionas_ids
    };
  }

  static async approve(id: string, processedBy: string, habitacionId?: string) {
    const solicitud = await this.getById(id);

    if (solicitud.estado !== 'pendiente') {
      throw new BusinessError('La solicitud ya fue procesada', 'SERVICE_REQUEST_ALREADY_PROCESSED');
    }

    const anfitrionasIds = Array.isArray(solicitud.anfitrionas_ids) ? solicitud.anfitrionas_ids : [];
    if (!anfitrionasIds.length) {
      throw new BusinessError('La solicitud no tiene anfitrionas asignadas', 'SERVICE_REQUEST_NO_HOSTESS');
    }

    const targetHabitacionId = String(habitacionId || solicitud.habitacion_id || '');
    if (!targetHabitacionId) {
      throw new BusinessError('La solicitud no tiene habitación válida', 'SERVICE_REQUEST_NO_ROOM');
    }

    const total = Number(solicitud.total || 0);
    const iva = Number(solicitud.iva || 0);

    const created = await ServiceService.createService(
      {
        cliente_id: solicitud.cliente_id ? String(solicitud.cliente_id) : null,
        clientes: solicitud.cliente_id ? [String(solicitud.cliente_id)] : [],
        habitacion_id: targetHabitacionId,
        precio_habitacion: Number(solicitud.precio_habitacion || 0),
        precio_servicio: Number(solicitud.precio_servicio || 0),
        iva,
        sub_total: Math.max(0, total - iva),
        total,
        tiempo: Number(solicitud.tiempo || 0),
        metodo_pago: solicitud.metodo_pago,
        usuarios: anfitrionasIds.map((hostessId: string | number) => String(hostessId))
      },
      processedBy
    );

    const now = getNowInBusinessTimezone();
    await query(
      `UPDATE solicitudes_servicios
       SET estado = 'aprobada', procesado_por = ?, fecha_procesamiento = ?, habitacion_id = ?
       WHERE id_solicitud = ?`,
      [processedBy, now, targetHabitacionId, id]
    );

    const servicio = await ServiceRepository.getById(created.id);
    return {
      solicitud_id: id,
      servicio_id: created.id,
      codigo: servicio?.codigo || created.codigo,
      habitacion_id: targetHabitacionId,
      habitacion_nombre: servicio?.habitacion_nombre || solicitud.habitacion_nombre || '',
      cliente_nombre: servicio?.cliente_nombre || solicitud.cliente_nombre || '',
      anfitrionas: servicio?.anfitrionas_nombres || '',
      tiempo: Number(servicio?.tiempo || solicitud.tiempo || 0),
      total: Number(servicio?.total || total)
    };
  }

  static async reject(id: string, processedBy: string, motivoRechazo: string) {
    const solicitud = await this.getById(id);

    if (solicitud.estado !== 'pendiente') {
      throw new BusinessError('La solicitud ya fue procesada', 'SERVICE_REQUEST_ALREADY_PROCESSED');
    }

    const now = getNowInBusinessTimezone();
    await query(
      `UPDATE solicitudes_servicios
       SET estado = 'rechazada', motivo_rechazo = ?, procesado_por = ?, fecha_procesamiento = ?
       WHERE id_solicitud = ?`,
      [motivoRechazo, processedBy, now, id]
    );

    return { id_solicitud: id, estado: 'rechazada', motivo_rechazo: motivoRechazo };
  }
}
