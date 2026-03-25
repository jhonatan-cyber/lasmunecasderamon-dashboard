import { query, generateUUID } from '@/lib/db';
import { getNowInBusinessTimezone } from '@/lib/timezoneService';

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
}
