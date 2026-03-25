import { query, generateUUID, withTransaction } from '@/lib/db';
import { ServiceCreateSchema } from '@/lib/schemas';
import { getServiciosList, pauseConflictingServices } from '@/lib/procedures';
import { getNowInBusinessTimezone } from '@/lib/timezoneService';
import { Client } from '@/types/client';

export class ServiceRepository {
  static async getAll(params: { all?: string; caja_id?: string; limit?: string; page?: string }) {
    const lNum = parseInt(params.limit || '50');
    const pNum = parseInt(params.page || '1');
    const offset = (pNum - 1) * lNum;

    let where = 'WHERE 1=1';
    let sqlParams: any[] = [];
    if (params.all === 'true') where = 'WHERE s.estado = 1';
    else if (params.all === 'false') where = 'WHERE s.estado IN (2, 3, 4)';
    
    if (params.caja_id) {
      where += ' AND s.caja_id = ?';
      sqlParams.push(params.caja_id);
    }

    return await getServiciosList(where, sqlParams, lNum, offset);
  }

  static async create(body: any, createdBy: string) {
    const v = ServiceCreateSchema.parse(body);
    const servicioId = generateUUID();
    const codigo = Math.random().toString(36).substring(2, 10).toUpperCase();
    const now = getNowInBusinessTimezone();
    
    const cajaResult = await query<any[]>('SELECT id_caja FROM cajas WHERE estado = 1 LIMIT 1');
    const cajaId = cajaResult[0]?.id_caja;

    const hResult = await query<any[]>('SELECT comision_anfitriona FROM habitaciones WHERE id_habitacion = ?', [v.habitacion_id]);
    const roomComision = Number(hResult[0]?.comision_anfitriona || 0);
    const hasRoomComision = roomComision > 0;

    await withTransaction(async (trx) => {
      // 1. Prepago deduction
      if (v.metodo_pago === 'prepago') {
        const client = await trx<Client[]>('SELECT saldo FROM clientes WHERE id_cliente = ? FOR UPDATE', [v.cliente_id]);
        if (client.length === 0 || (client[0].saldo || 0) < v.total) throw new Error('Saldo insuficiente');
        await trx('UPDATE clientes SET saldo = saldo - ? WHERE id_cliente = ?', [v.total, v.cliente_id]);
      }

      // 2. Insert Service
      await trx(`
        INSERT INTO servicios (id_servicio, codigo, cliente_id, habitacion_id, precio_habitacion, precio_servicio, iva, sub_total, total, tiempo, metodo_pago, caja_id, created_by, estado, fecha_crea)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 2, ?)
      `, [servicioId, codigo, v.cliente_id, v.habitacion_id, v.precio_habitacion, v.precio_servicio, v.iva, v.sub_total, v.total, v.tiempo, v.metodo_pago, cajaId, createdBy, now]);

      // 3. Pause conflicts
      await pauseConflictingServices(trx, servicioId, v.usuarios);

      // 4. Commissions & Details
      const numAnfitrionas = v.usuarios.length;
      let comisionPerAnfitriona = hasRoomComision 
        ? Math.floor(roomComision / numAnfitrionas)
        : Math.floor((v.sub_total - v.precio_habitacion) / numAnfitrionas);

      for (const uId of v.usuarios) {
        if (comisionPerAnfitriona > 0) {
          const commId = generateUUID();
          await trx('INSERT INTO comisiones (id_comision, servicio_id, monto, estado) VALUES (?, ?, ?, 1)', [commId, servicioId, comisionPerAnfitriona]);
          await trx('INSERT INTO detalle_comisiones (id_detalle_comision, comision_id, usuario_id, comision, estado) VALUES (?, ?, ?, ?, 1)', [generateUUID(), commId, uId, comisionPerAnfitriona]);
        }
        await trx('INSERT INTO detalle_servicios (id_detalle_servicio, usuario_id, servicio_id, comision) VALUES (?, ?, ?, ?)', [generateUUID(), uId, servicioId, comisionPerAnfitriona]);
        await trx('UPDATE usuarios SET estado_servicio = 1 WHERE id_usuario = ?', [uId]);
      }

      // 5. Update Caja
      if (cajaId) {
        await trx(`
          UPDATE cajas SET 
            servicio = servicio + ?, efectivo = efectivo + ?, tarjeta = tarjeta + ?, transferencia = transferencia + ?, 
            prepago = prepago + ?, iva = iva + ?, comision = comision + ? 
          WHERE id_caja = ?
        `, [
          v.total - v.iva, 
          v.metodo_pago === 'efectivo' ? v.total : 0, 
          v.metodo_pago === 'tarjeta' ? v.total : 0, 
          v.metodo_pago === 'transferencia' ? v.total : 0, 
          v.metodo_pago === 'prepago' ? v.total : 0, 
          v.iva, 
          hasRoomComision ? roomComision : (comisionPerAnfitriona * numAnfitrionas),
          cajaId
        ]);
      }
    });

    return { id: servicioId, codigo, tiempo: v.tiempo, total: v.total };
  }

  static async update(id: string, body: any) {
    const { cliente_id, habitacion_id, precio_habitacion, precio_servicio, iva, sub_total, total, tiempo, usuarios } = body;
    const [prev] = await query<any[]>('SELECT iva FROM servicios WHERE id_servicio = ?', [id]);
    const ivaDelta = Number(iva || 0) - Number(prev?.iva || 0);

    await withTransaction(async (trx) => {
      await trx('UPDATE servicios SET cliente_id = ?, habitacion_id = ?, precio_habitacion = ?, precio_servicio = ?, iva = ?, sub_total = ?, total = ?, tiempo = ? WHERE id_servicio = ?', [cliente_id, habitacion_id, precio_habitacion || 0, precio_servicio, iva || 0, sub_total, total, tiempo, id]);
      if (ivaDelta !== 0) {
        const caja = await trx<any[]>('SELECT id_caja FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1');
        if (caja.length > 0) await trx('UPDATE cajas SET iva = GREATEST(0, iva + ?) WHERE id_caja = ?', [ivaDelta, caja[0].id_caja]);
      }
      await trx('DELETE FROM detalle_servicios WHERE servicio_id = ?', [id]);
      for (const uId of usuarios || []) {
        await trx('INSERT INTO detalle_servicios (usuario_id, servicio_id) VALUES (?, ?)', [uId, id]);
      }
    });
  }

  static async updateStatus(id: string, estado: number, userId?: string) {
    const [prev] = await query<any[]>('SELECT estado, habitacion_id FROM servicios WHERE id_servicio = ?', [id]);
    const estadoAnterior = prev?.estado;
    const habitacionId = prev?.habitacion_id;

    await withTransaction(async (trx) => {
      if (estado === 1 || estado === 0) {
        if (habitacionId) {
          const [vP] = await trx<any[]>('SELECT id_venta, paused_at FROM ventas WHERE habitacion_id = ? AND estado = 3 ORDER BY paused_at DESC LIMIT 1', [habitacionId]);
          const [sP] = await trx<any[]>('SELECT id_servicio, paused_at FROM servicios WHERE habitacion_id = ? AND estado = 3 AND id_servicio != ? ORDER BY paused_at DESC LIMIT 1', [habitacionId, id]);
          if (vP || sP) {
            const resumeV = vP && (!sP || new Date(vP.paused_at) >= new Date(sP.paused_at));
            if (resumeV) await trx('UPDATE ventas SET estado = 2, fecha_crea = DATE_ADD(fecha_crea, INTERVAL TIMESTAMPDIFF(SECOND, paused_at, NOW()) SECOND), paused_at = NULL WHERE id_venta = ?', [vP.id_venta]);
            else await trx('UPDATE servicios SET estado = 2, fecha_crea = DATE_ADD(fecha_crea, INTERVAL TIMESTAMPDIFF(SECOND, paused_at, NOW()) SECOND), paused_at = NULL WHERE id_servicio = ?', [sP.id_servicio]);
          } else {
            await trx('UPDATE habitaciones SET estado = 1 WHERE id_habitacion = ?', [habitacionId]);
          }
        }
      }

      const { addServicioLog } = await import('@/lib/logUtils');
      if (estado === 1 && estadoAnterior !== 1) await addServicioLog(id, 'FINALIZADO', 'Servicio finalizado manualmente.', userId);
      else if (estado === 0 && estadoAnterior !== 0) await addServicioLog(id, 'ANULADO', 'Servicio anulado.', userId);
      else if (estado === 3 && estadoAnterior !== 3) {
        await addServicioLog(id, 'PAUSA', 'Servicio pausado manualmente.', userId);
        await trx('UPDATE servicios SET estado = 3, paused_at = ? WHERE id_servicio = ?', [getNowInBusinessTimezone(), id]);
      } else if (estadoAnterior === 3 && estado === 2) {
        const [ps] = await trx<any[]>('SELECT paused_at FROM servicios WHERE id_servicio = ?', [id]);
        if (ps?.paused_at) {
          await trx('UPDATE servicios SET fecha_crea = DATE_ADD(fecha_crea, INTERVAL TIMESTAMPDIFF(SECOND, paused_at, NOW()) SECOND), paused_at = NULL WHERE id_servicio = ?', [id]);
          await addServicioLog(id, 'REANUDACION', 'Servicio reanudado manualmente.', userId);
        }
      }

      await trx('UPDATE servicios SET estado = ? WHERE id_servicio = ?', [estado, id]);

      if (estado === 1 || estado === 0) {
        const anfs = await trx<any[]>('SELECT usuario_id FROM detalle_servicios WHERE servicio_id = ?', [id]);
        for (const a of anfs || []) {
          const [other] = await trx<any[]>('SELECT COUNT(*) as cnt FROM detalle_servicios ds JOIN servicios s ON ds.servicio_id = s.id_servicio WHERE s.estado IN (2, 3, 4) AND s.id_servicio != ? AND ds.usuario_id = ?', [id, a.usuario_id]);
          const [inV] = await trx<any[]>('SELECT COUNT(*) as cnt FROM ventas_usuarios vu JOIN ventas v ON vu.venta_id = v.id_venta WHERE v.estado = 2 AND vu.usuario_id = ?', [a.usuario_id]);
          if ((other?.cnt || 0) === 0 && (inV?.cnt || 0) === 0) {
            await trx('UPDATE usuarios SET estado_servicio = 0 WHERE id_usuario = ?', [a.usuario_id]);
          }
        }
      }
    });
  }

  static async delete(id: string) {
    await withTransaction(async (trx) => {
      await trx('DELETE FROM detalle_servicios WHERE servicio_id = ?', [id]);
      await trx('DELETE FROM servicios WHERE id_servicio = ?', [id]);
    });
  }

  static async getByDates(startDate: string, endDate: string) {
    return await query(`
      SELECT s.*, h.nombre as habitacion_nombre, cl.nombre as cliente_nombre
      FROM servicios s
      LEFT JOIN habitaciones h ON s.habitacion_id = h.id_habitacion
      LEFT JOIN clientes cl ON s.cliente_id = cl.id_cliente
      WHERE DATE(s.fecha_crea) BETWEEN ? AND ?
      ORDER BY s.fecha_crea DESC
    `, [startDate, endDate]);
  }

  static async getByUser(userId: string) {
    return await query(`
      SELECT s.*, ds.comision as mi_comision
      FROM servicios s
      INNER JOIN detalle_servicios ds ON s.id_servicio = ds.servicio_id
      WHERE ds.usuario_id = ?
      ORDER BY s.fecha_crea DESC
    `, [userId]);
  }

  static async getById(id: string) {
    const res = await query<any[]>(`
      SELECT s.*, h.nombre as habitacion_name, cl.nombre as cliente_name,
             GROUP_CONCAT(DISTINCT 
              CASE 
                WHEN u.nick IS NOT NULL AND u.nick != '' THEN u.nick
                ELSE CONCAT(u.nombre, ' ', u.apellido)
              END 
              SEPARATOR ', '
            ) as anfitrionas
      FROM servicios s
      LEFT JOIN habitaciones h ON s.habitacion_id = h.id_habitacion
      LEFT JOIN clientes cl ON s.cliente_id = cl.id_cliente
      LEFT JOIN detalle_servicios ds ON s.id_servicio = ds.servicio_id
      LEFT JOIN usuarios u ON u.id_usuario = ds.usuario_id
      WHERE s.id_servicio = ?
      GROUP BY s.id_servicio
    `, [id]);
    return res.length > 0 ? res[0] : null;
  }

  static async requestAnulacion(id: string, reason: string, requestedBy: string) {
    const idAnul = generateUUID();
    await query(`
      INSERT INTO solicitudes_anulacion (id, servicio_id, motivo, requested_by, estado, fecha_crea)
      VALUES (?, ?, ?, ?, 'pendiente', ?)
    `, [idAnul, id, reason, requestedBy, getNowInBusinessTimezone()]);
    return idAnul;
  }

  static async processAnulacion(requestId: string, approvedBy: string, status: 'aprobado' | 'rechazado') {
    const now = getNowInBusinessTimezone();
    await withTransaction(async (trx) => {
      await trx('UPDATE solicitudes_anulacion SET estado = ?, approved_by = ?, fecha_mod = ? WHERE id = ?', [status, approvedBy, now, requestId]);
      if (status === 'aprobado') {
        const req = await trx<any[]>('SELECT servicio_id FROM solicitudes_anulacion WHERE id = ?', [requestId]);
        if (req.length > 0) {
            const sId = req[0].servicio_id;
            await trx('UPDATE servicios SET estado = 0, fecha_mod = ? WHERE id_servicio = ?', [now, sId]);
            const s = await trx<any[]>('SELECT cliente_id, total, metodo_pago FROM servicios WHERE id_servicio = ?', [sId]);
            if (s.length > 0 && s[0].metodo_pago === 'prepago') {
              await trx('UPDATE clientes SET saldo = saldo + ? WHERE id_cliente = ?', [s[0].total, s[0].cliente_id]);
            }
        }
      }
    });
  }
}
