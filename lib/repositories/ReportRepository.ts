import { query } from '@/lib/database/db';

export class ReportRepository {
  static async getSales(startDate: string, endDate: string) {
    return await query(`
      SELECT v.*, c.nombre as cliente_nombre, h.nombre as habitacion_nombre
      FROM ventas v
      LEFT JOIN clientes c ON v.cliente_id = c.id_cliente
      LEFT JOIN habitaciones h ON v.habitacion_id = h.id_habitacion
      WHERE DATE(v.fecha_crea) BETWEEN ? AND ?
      ORDER BY v.fecha_crea DESC
    `, [startDate, endDate]);
  }

  static async getCommissions(startDate: string, endDate: string, userId?: string) {
    let sql = `
      SELECT ds.comision, s.codigo, s.fecha_crea as date, u.nick, CONCAT(u.nombre, ' ', u.apellido) as usuario_nombre
      FROM detalle_servicios ds
      INNER JOIN servicios s ON ds.servicio_id = s.id_servicio
      INNER JOIN usuarios u ON ds.usuario_id = u.id_usuario
      WHERE DATE(s.fecha_crea) BETWEEN ? AND ?
    `;
    const params: any[] = [startDate, endDate];
    if (userId) {
      sql += ' AND ds.usuario_id = ?';
      params.push(userId);
    }
    sql += ' ORDER BY s.fecha_crea DESC';
    return await query(sql, params);
  }

  static async getCashRegister(cajaId: string) {
    const [caja, sales, services] = await Promise.all([
      query<any[]>('SELECT * FROM cajas WHERE id_caja = ?', [cajaId]),
      query<any[]>('SELECT * FROM ventas WHERE caja_id = ? AND estado IN (1, 2)', [cajaId]),
      query<any[]>('SELECT * FROM servicios WHERE caja_id = ? AND estado IN (1, 2)', [cajaId])
    ]);
    return { caja: caja[0], sales, services };
  }
}
