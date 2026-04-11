import { query, generateUUID, withTransaction, type TransactionQuery } from '@/lib/database/db';
import { ServiceSchema, ServiceCreateSchema, type ServiceType } from '@/lib/business/schemas';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { RoomManager } from '@/lib/services/RoomManager';
import { BaseRepository } from './BaseRepository';
import { NotFoundError } from '@/lib/errors/errors';
import { z } from 'zod';

type ServiceUpdateInput = z.input<typeof ServiceCreateSchema>;

export class ServiceRepository {
  private static readonly TABLE = 'servicios';
  private static readonly ID_COL = 'id_servicio';

  private static mapServiceFromDB(row: any): ServiceType {
    if (!row) return null as any;
    const creatorName = row.creator_nick
      || [row.creator_nombre, row.creator_apellido].filter(Boolean).join(' ').trim()
      || row.usuario_nick
      || [row.creator_name, row.creator_last_name].filter(Boolean).join(' ').trim()
      || null;

    // Calcular número de anfitrionas
    const anfitrionasIds = row.anfitrionas_ids ? String(row.anfitrionas_ids).split(',').filter(Boolean) : [];
    const numAnfitrionas = Math.max(1, anfitrionasIds.length);

    // Calcular comisiones
    const habitacionComision = row.habitacion_comision ? Number(row.habitacion_comision) : 0;
    const precioServicio = Number(row.precio_servicio || 0);
    
    // Si tiene comisión de habitación, se usa; si no, el precio del servicio es la comisión total
    const tieneComisionHabitacion = habitacionComision > 0;
    const totalComision = tieneComisionHabitacion ? habitacionComision : precioServicio * numAnfitrionas;
    const comisionIndividual = tieneComisionHabitacion 
      ? Math.floor(habitacionComision / numAnfitrionas) 
      : precioServicio;

    return ServiceSchema.parse({
      id: row.id_servicio,
      codigo: row.codigo,
      cliente_id: row.cliente_id,
      habitacion_id: row.habitacion_id,
      precio_habitacion: Number(row.precio_habitacion || 0),
      precio_servicio: Number(row.precio_servicio || 0),
      iva: Number(row.iva || 0),
      sub_total: Number(row.sub_total || 0),
      total: Number(row.total || 0),
      tiempo: Number(row.tiempo || 0),
      metodo_pago: row.metodo_pago,
      estado: row.estado,
      fecha_crea: row.fecha_crea || null,
      fecha_mod: row.fecha_mod || null,
      habitacion_nombre: row.habitacion_numero || row.habitacion_nombre || row.habitacion_name,
      anfitrionas_nombres: row.anfitrionas_nombres || row.anfitrionas,
      anfitrionas_ids: row.anfitrionas_ids,
      total_usuarios: numAnfitrionas,
      created_by: row.created_by,
      creator_nick: row.creator_nick || null,
      creator_nombre: row.creator_nombre || null,
      creator_apellido: row.creator_apellido || null,
      creator_foto: row.creator_foto || null,
      waiter_name: creatorName,
      waiter_foto: row.creator_foto || null,
      cliente_nombre: row.cliente_nombre || null,
      habitacion_comision: habitacionComision > 0 ? habitacionComision : null,
      total_comision: totalComision,
      comision_individual: comisionIndividual
    });
  }


  static async getAll(params: { all?: string; caja_id?: string; limit?: string; page?: string }): Promise<any> {
    const lNum = parseInt(params.limit || '50');
    const pNum = parseInt(params.page || '1');
    const offset = (pNum - 1) * lNum;

    let where = 'WHERE 1=1';
    let sqlParams: any[] = [];
    if (params.all === 'true') where = 'WHERE s.estado IN (0, 1)';
    else if (params.all === 'false') where = 'WHERE s.estado IN (2, 3, 4)';
    else where = 'WHERE s.estado IN (1, 2, 3, 4)'; // Default: todos los estados válidos
    
    if (params.caja_id) {
      where += ' AND s.caja_id = ?';
      sqlParams.push(params.caja_id);
    }
    
    const sql = `
      SELECT 
        s.*, h.nombre as habitacion_numero, h.comision_anfitriona as habitacion_comision,
        cu.nick as creator_nick, cu.nombre as creator_nombre, cu.apellido as creator_apellido, cu.foto as creator_foto,
        CONCAT(cl.nombre, ' ', cl.apellido) as cliente_nombre,
        GROUP_CONCAT(DISTINCT u.nick SEPARATOR ', ') as anfitrionas_nombres,
        GROUP_CONCAT(DISTINCT u.id_usuario SEPARATOR ',') as anfitrionas_ids
      FROM servicios s
      LEFT JOIN habitaciones h ON h.id_habitacion = s.habitacion_id
      LEFT JOIN usuarios cu ON cu.id_usuario = s.created_by
      LEFT JOIN clientes cl ON cl.id_cliente = s.cliente_id
      LEFT JOIN detalle_servicios ds ON ds.servicio_id = s.id_servicio
      LEFT JOIN usuarios u ON u.id_usuario = ds.usuario_id
      ${where}
      GROUP BY s.id_servicio
      ORDER BY s.fecha_crea DESC
      LIMIT ? OFFSET ?
    `;
    const countSql = `SELECT COUNT(*) as count FROM servicios s ${where}`;
    const data = await query<any[]>(sql, [...sqlParams, lNum, offset]);
    const count = await query<any[]>(countSql, sqlParams);

    return { 
      data: data.map(row => this.mapServiceFromDB(row)), 
      total: count[0]?.count || 0 
    };
  }


  static async rawInsert(trx: TransactionQuery | typeof query, data: any): Promise<void> {
    await BaseRepository.insert(trx, this.TABLE, data);
  }

  static async updateService(id: string, body: Partial<ServiceUpdateInput>): Promise<ServiceType | null> {
    const validated = ServiceCreateSchema.partial().parse(body);
    const [prev] = await query<any[]>('SELECT iva FROM servicios WHERE id_servicio = ?', [id]);
    const ivaDelta = Number(validated.iva || 0) - Number(prev?.iva || 0);
    const now = getNowInBusinessTimezone(validated.device_date);

    await withTransaction(async (trx) => {
      await BaseRepository.update(trx, this.TABLE, this.ID_COL, id, {
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
        const caja = await trx<any[]>('SELECT id_caja FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1');
        if (caja.length > 0) await trx('UPDATE cajas SET iva = GREATEST(0, iva + ?) WHERE id_caja = ?', [ivaDelta, caja[0].id_caja]);
      }
      
      if (validated.usuarios) {
        await trx('DELETE FROM detalle_servicios WHERE servicio_id = ?', [id]);
        for (const uId of validated.usuarios) {
          await trx(
            'INSERT INTO detalle_servicios (id_detalle_servicio, usuario_id, servicio_id, comision, fecha_crea) VALUES (?, ?, ?, 0, ?)',
            [generateUUID(), uId, id, now]
          );
        }
      }
    });

    return await this.getById(id);
  }

  static async updateStatus(id: string, estado: number, userId?: string): Promise<ServiceType | null> {
    const prev = await query<any[]>('SELECT estado, habitacion_id FROM servicios WHERE id_servicio = ?', [id]);
    if (prev.length === 0) throw new NotFoundError('Servicio', id);
    const estadoAnterior = prev[0].estado;
    const habitacionId = prev[0].habitacion_id;
    const now = getNowInBusinessTimezone();

    await withTransaction(async (trx) => {
      await BaseRepository.update(trx, this.TABLE, this.ID_COL, id, { estado, fecha_mod: now });

      if (estado === 1 || estado === 0) {
        if (habitacionId) await RoomManager.resumeRoomLogic(trx, habitacionId, id);

        const anfsResult = await trx<any[]>('SELECT usuario_id FROM detalle_servicios WHERE servicio_id = ?', [id]);
        const hostessIds = anfsResult.map(a => a.usuario_id);
        await RoomManager.updateHostessServiceStatus(trx, hostessIds, id);
      }

      const { addServicioLog } = await import('@/lib/utils/logUtils');
      if (estado === 1 && estadoAnterior !== 1) await addServicioLog(id, 'FINALIZADO', 'Servicio finalizado manualmente.', userId);
      else if (estado === 0 && estadoAnterior !== 0) await addServicioLog(id, 'ANULADO', 'Servicio anulado.', userId);
      else if (estado === 3 && estadoAnterior !== 3) {
        await addServicioLog(id, 'PAUSA', 'Servicio pausado manualmente.', userId);
        await BaseRepository.update(trx, this.TABLE, this.ID_COL, id, { estado: 3, paused_at: now });
      } else if (estadoAnterior === 3 && estado === 2) {
        const psRes = await trx<any[]>('SELECT paused_at FROM servicios WHERE id_servicio = ?', [id]);
        if (psRes.length > 0 && psRes[0].paused_at) {
          await trx(`UPDATE ${this.TABLE} SET fecha_crea = DATE_ADD(fecha_crea, INTERVAL TIMESTAMPDIFF(SECOND, paused_at, ?) SECOND), paused_at = NULL WHERE ${this.ID_COL} = ?`, [now, id]);
          await addServicioLog(id, 'REANUDACION', 'Servicio reanudado manualmente.', userId);
        }
      }
    });

    return await this.getById(id);
  }

  static async delete(id: string): Promise<void> {
    await withTransaction(async (trx) => {
      await trx('DELETE FROM detalle_servicios WHERE servicio_id = ?', [id]);
      await trx('DELETE FROM servicios WHERE id_servicio = ?', [id]);
    });
  }

  static async getByDates(startDate: string, endDate: string): Promise<ServiceType[]> {
    const results = await query<any[]>(`
      SELECT s.*, h.nombre as habitacion_nombre, cl.nombre as cliente_nombre
      , cu.nick as creator_nick, cu.nombre as creator_nombre, cu.apellido as creator_apellido, cu.foto as creator_foto
      FROM servicios s
      LEFT JOIN habitaciones h ON s.habitacion_id = h.id_habitacion
      LEFT JOIN clientes cl ON s.cliente_id = cl.id_cliente
      LEFT JOIN usuarios cu ON cu.id_usuario = s.created_by
      WHERE DATE(s.fecha_crea) BETWEEN ? AND ?
      ORDER BY s.fecha_crea DESC
    `, [startDate, endDate]);
    return results.map(row => this.mapServiceFromDB(row));
  }

  static async getByUser(userId: string): Promise<any[]> {
    const results = await query<any[]>(`
      SELECT 
        s.id_servicio, s.codigo, s.tiempo, s.fecha_crea, s.precio_servicio, 
        s.precio_habitacion, s.total, s.metodo_pago, s.estado,
        ds.comision as comision_usuario,
        h.nombre as habitacion, h.comision_anfitriona as habitacion_comision,
        COALESCE(CONCAT(c.nombre, ' ', c.apellido), 'Sin cliente registrado') as cliente,
        GROUP_CONCAT(DISTINCT COALESCE(u.nick, CONCAT(u.nombre, ' ', u.apellido)) SEPARATOR ', ') as anfitriona,
        cu.nick as creado_por
      FROM servicios s
      INNER JOIN detalle_servicios ds ON s.id_servicio = ds.servicio_id AND ds.usuario_id = ?
      LEFT JOIN habitaciones h ON s.habitacion_id = h.id_habitacion
      LEFT JOIN clientes c ON c.id_cliente = s.cliente_id
      LEFT JOIN detalle_servicios ds2 ON ds2.servicio_id = s.id_servicio
      LEFT JOIN usuarios u ON u.id_usuario = ds2.usuario_id
      LEFT JOIN usuarios cu ON cu.id_usuario = s.created_by
      GROUP BY s.id_servicio, ds.comision
      ORDER BY s.fecha_crea DESC
    `, [userId]);
    return results;
  }

  static async getById(id: string): Promise<ServiceType | null> {
    const res = await query<any[]>(`
      SELECT s.*, h.nombre as habitacion_name, cl.nombre as cliente_name,
             cu.nick as creator_nick, cu.nombre as creator_nombre, cu.apellido as creator_apellido, cu.foto as creator_foto,
             GROUP_CONCAT(DISTINCT 
               CASE 
                 WHEN u.nick IS NOT NULL AND u.nick != '' THEN u.nick
                 ELSE CONCAT(u.nombre, ' ', u.apellido)
               END 
               SEPARATOR ', '
             ) as anfitrionas,
             GROUP_CONCAT(DISTINCT u.id_usuario SEPARATOR ',') as anfitrionas_ids
      FROM servicios s
      LEFT JOIN habitaciones h ON s.habitacion_id = h.id_habitacion
      LEFT JOIN clientes cl ON s.cliente_id = cl.id_cliente
      LEFT JOIN usuarios cu ON cu.id_usuario = s.created_by
      LEFT JOIN detalle_servicios ds ON s.id_servicio = ds.servicio_id
      LEFT JOIN usuarios u ON u.id_usuario = ds.usuario_id
      WHERE s.id_servicio = ?
      GROUP BY s.id_servicio
    `, [id]);
    return res.length > 0 ? this.mapServiceFromDB(res[0]) : null;
  }

  static async requestAnulacion(id: string, reason: string, requestedBy: string): Promise<string> {
    const idAnul = generateUUID();
    const token = generateUUID();
    await query(`
      INSERT INTO solicitudes_anulacion_servicios (id, servicio_id, token, estado, fecha_solicitud, solicitado_por, motivo)
      VALUES (?, ?, ?, 'pendiente', ?, ?, ?)
    `, [idAnul, id, token, getNowInBusinessTimezone(), requestedBy, reason]);
    return token;
  }

  static async processAnulacion(requestId: string, approvedBy: string, status: 'aprobado' | 'rechazado'): Promise<void> {
    const now = getNowInBusinessTimezone();
    await withTransaction(async (trx) => {
      await trx('UPDATE solicitudes_anulacion SET estado = ?, approved_by = ?, fecha_mod = ? WHERE id = ?', [status, approvedBy, now, requestId]);
      if (status === 'aprobado') {
        const req = await trx<any[]>('SELECT servicio_id FROM solicitudes_anulacion WHERE id = ?', [requestId]);
        if (req.length > 0) {
            const sId = req[0].servicio_id;
            await trx('UPDATE servicios SET estado = 0, fecha_mod = ? WHERE id_servicio = ?', [now, sId]);
            const s = await trx<any[]>('SELECT cliente_id FROM servicios WHERE id_servicio = ?', [sId]);
            if (s.length > 0 && s[0].cliente_id) {
              const prepagoMovs = await trx<any[]>(
                `SELECT COALESCE(SUM(monto), 0) as total_prepago
                 FROM clientes_prepago_movimientos
                 WHERE venta_id = ? AND cliente_id = ? AND tipo = 'CONSUMO'`,
                [sId, s[0].cliente_id]
              );

              const montoRestituir = Number(prepagoMovs[0]?.total_prepago || 0);
              if (montoRestituir > 0) {
                await trx(
                  'UPDATE clientes SET saldo = saldo + ? WHERE id_cliente = ?',
                  [montoRestituir, s[0].cliente_id]
                );
              }
            }
        }
      }
    });
  }
}
