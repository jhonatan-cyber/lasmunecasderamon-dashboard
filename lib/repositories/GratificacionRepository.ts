import { query, generateUUID } from '@/lib/db';
import { getNowInBusinessTimezone } from '@/lib/timezoneService';

export class GratificacionRepository {
  static async getAll(userId?: string) {
    const tableCheck = await query<any[]>("SHOW TABLES LIKE 'gratificaciones'");
    if (tableCheck.length === 0) return [];

    let sql = `
      SELECT G.*, DATE_FORMAT(G.fecha_hora, "%Y-%m-%d %H:%i:%s") as fecha_hora_fmt, 
             U.id_usuario, CONCAT(U.nombre, ' ', U.apellido) AS usuario
      FROM gratificaciones G
      INNER JOIN usuarios U ON U.id_usuario = G.usuario_id
    `;
    const params: any[] = [];
    if (userId) {
      sql += ' WHERE G.usuario_id = ?';
      params.push(userId);
    }
    sql += ' ORDER BY G.fecha_hora DESC';

    const rows = await query<any[]>(sql, params);
    return rows.map(row => ({
      id: String(row.id),
      fecha_hora: row.fecha_hora_fmt,
      id_usuario: String(row.id_usuario),
      usuario: String(row.usuario),
      monto: Number(row.monto),
      descripcion: String(row.descripcion || ''),
      estado: Number(row.estado)
    }));
  }

  static async create(data: { usuario_id: string, monto: number, descripcion?: string }) {
    const tableCheck = await query<any[]>("SHOW TABLES LIKE 'gratificaciones'");
    const id = generateUUID();
    const now = getNowInBusinessTimezone();
    if (tableCheck.length === 0) return id;

    await query(`
      INSERT INTO gratificaciones (id, fecha_hora, usuario_id, monto, descripcion, estado, fecha_crea)
      VALUES (?, ?, ?, ?, ?, 1, ?)
    `, [id, now, data.usuario_id, data.monto, data.descripcion || '', now]);
    return id;
  }

  static async update(id: string, data: { monto: number, descripcion?: string }) {
    const now = getNowInBusinessTimezone();
    await query(`UPDATE gratificaciones SET monto = ?, descripcion = ?, fecha_mod = ? WHERE id = ?`, [data.monto, data.descripcion || '', now, id]);
  }

  static async delete(id: string) {
    await query('DELETE FROM gratificaciones WHERE id = ?', [id]);
  }
}
