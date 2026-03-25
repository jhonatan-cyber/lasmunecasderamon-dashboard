import { query, generateUUID, withTransaction } from '@/lib/db';
import { getCommissionStats, getCommissionsList } from '@/lib/procedures';
import { toDateKey } from '@/lib/calendarUtils';
import { getNowInBusinessTimezone } from '@/lib/timezoneService';

export class CommissionRepository {
  static async summary() {
    const cajaActiva = await query<any[]>(`SELECT fecha_apertura FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1`);
    let fechaApertura = toDateKey(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    if (cajaActiva.length > 0) fechaApertura = cajaActiva[0].fecha_apertura;

    const statsData = await getCommissionStats(fechaApertura);
    return {
      total_comisiones: parseFloat(statsData.total_comisiones || 0),
      comision_ventas: parseFloat(statsData.total_ventas || 0),
      comision_servicios: parseFloat(statsData.total_servicios || 0),
      promedio_comision: parseFloat(statsData.promedio_comision || 0),
      cantidad_comisiones: parseInt(statsData.cantidad_comisiones || 0),
      comision_minima: parseFloat(statsData.comision_minima || 0),
      comision_maxima: parseFloat(statsData.comision_maxima || 0),
      porcentaje_ventas: parseInt(statsData.porcentaje_ventas || 0),
      porcentaje_servicios: parseInt(statsData.porcentaje_servicios || 0)
    };
  }

  static async list(filters: { status?: string, employeeId?: string, search?: string }) {
    let whereClauses = ['C.estado IN (0, 1)'];
    let params: any[] = [];

    if (filters.status && filters.status !== 'all') {
      const statusMap: any = { por_pagar: 1, pagado: 0, anulado: 2 };
      whereClauses.push('C.estado = ?');
      params.push(statusMap[filters.status] ?? 1);
    }
    if (filters.employeeId && filters.employeeId !== 'all') {
      whereClauses.push('U.id_usuario = ?');
      params.push(filters.employeeId);
    }
    if (filters.search) {
      whereClauses.push('(U.nick LIKE ? OR U.nombre LIKE ? OR U.apellido LIKE ?)');
      const term = `%${filters.search}%`;
      params.push(term, term, term);
    }

    const data = await getCommissionsList(`WHERE ${whereClauses.join(' AND ')}`, params);
    return data.map(row => ({
      ...row,
      employeeId: row.id_usuario,
      employeeName: row.anfitriona,
      status: row.estado === 1 ? 'por_pagar' : row.estado === 0 ? 'pagado' : 'anulado',
      date: new Date(),
    }));
  }

  static async getDetails(userId: string) {
    const sql = `
      SELECT 
        C.id_comision, C.fecha_crea as fecha_hora, V.codigo as codigo_venta, S.codigo as codigo_servicio,
        CASE WHEN C.venta_id IS NOT NULL AND C.venta_id != '' THEN 'venta' WHEN C.servicio_id IS NOT NULL AND C.servicio_id != '' THEN 'servicio' ELSE 'otro' END as tipo,
        DC.comision as monto,
        CASE WHEN C.estado = 1 THEN 'Por pagar' WHEN C.estado = 0 THEN 'Pagado' ELSE 'Anulado' END as estado,
        DC.fecha_mod as fecha_pago,
        CASE 
          WHEN C.venta_id IS NOT NULL AND C.venta_id != '' THEN (SELECT p.nombre FROM detalle_ventas dv JOIN productos p ON dv.producto_id = p.id_producto WHERE dv.venta_id = C.venta_id LIMIT 1)
          WHEN C.servicio_id IS NOT NULL AND C.servicio_id != '' THEN 'Servicio de Habitación' ELSE 'Comisión Especial'
        END as producto,
        CASE WHEN C.venta_id IS NOT NULL AND C.venta_id != '' THEN CONCAT('Venta - ', V.codigo) WHEN C.servicio_id IS NOT NULL AND C.servicio_id != '' THEN CONCAT('Servicio - ', S.codigo) ELSE 'Comisión Directa' END as descripcion
      FROM comisiones C
      INNER JOIN detalle_comisiones DC ON DC.comision_id = C.id_comision
      LEFT JOIN ventas V ON V.id_venta = C.venta_id
      LEFT JOIN servicios S ON S.id_servicio = C.servicio_id
      WHERE DC.usuario_id = ? AND DC.comision > 0
      ORDER BY C.fecha_crea DESC
    `;
    return await query(sql, [userId]);
  }

  static async create(data: { venta_id?: string, servicio_id?: string, monto: number, usuario_id: string }) {
    const id = generateUUID();
    const now = getNowInBusinessTimezone();
    await withTransaction(async (trx) => {
      await trx(`INSERT INTO comisiones (id_comision, venta_id, servicio_id, monto, fecha_crea) VALUES (?, ?, ?, ?, ?)`, [id, data.venta_id || null, data.servicio_id || null, data.monto, now]);
      await trx(`INSERT INTO detalle_comisiones (comision_id, usuario_id, comision, fecha_crea) VALUES (?, ?, ?, ?)`, [id, data.usuario_id, data.monto, now]);
    });
    return id;
  }

  static async update(id: string, data: { status?: string, monto?: number }) {
    const now = getNowInBusinessTimezone();
    const statusMap: any = { por_pagar: 1, pagado: 0, anulado: 2 };

    await withTransaction(async (trx) => {
      if (data.status) {
        const statusValue = statusMap[data.status];
        await trx('UPDATE comisiones SET estado = ?, fecha_mod = ? WHERE id_comision = ?', [statusValue, now, id]);
        if (data.status === 'pagado') await trx('UPDATE detalle_comisiones SET fecha_mod = ? WHERE comision_id = ?', [now, id]);
      }
      if (data.monto !== undefined) {
        await trx('UPDATE comisiones SET monto = ?, fecha_mod = ? WHERE id_comision = ?', [data.monto, now, id]);
        await trx('UPDATE detalle_comisiones SET comision = ?, fecha_mod = ? WHERE comision_id = ?', [data.monto, now, id]);
      }
    });
  }

  static async delete(id: string) {
    const now = getNowInBusinessTimezone();
    await withTransaction(async (trx) => {
      await trx('UPDATE comisiones SET estado = 0, fecha_baja = ? WHERE id_comision = ?', [now, id]);
      await trx('UPDATE detalle_comisiones SET estado = 0, fecha_baja = ? WHERE comision_id = ?', [now, id]);
    });
  }
}
