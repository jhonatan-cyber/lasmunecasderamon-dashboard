import { query, generateUUID } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { BaseRepository } from './BaseRepository';

export class GratificacionRepository {
  static async getAll(userId?: string) {
    const tableCheck = await query<any[]>("SHOW TABLES LIKE 'gratificaciones'");
    if (tableCheck.length === 0) return [];

    let sql = `
      SELECT G.*, DATE_FORMAT(G.fecha_crea, "%Y-%m-%d %H:%i:%s") as fecha_crea_fmt, 
             U.id_usuario, CONCAT(U.nombre, ' ', U.apellido) AS usuario
      FROM gratificaciones G
      INNER JOIN usuarios U ON U.id_usuario = G.usuario_id
    `;
    const params: any[] = [];
    if (userId) {
      sql += ' WHERE G.usuario_id = ?';
      params.push(userId);
    }
    sql += ' ORDER BY G.fecha_crea DESC';

    const rows = await query<any[]>(sql, params);
    return rows.map(row => ({
      id: String(row.id),
      fecha_hora: row.fecha_crea_fmt,
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

    await BaseRepository.insert(query, 'gratificaciones', {
      id,
      usuario_id: data.usuario_id,
      monto: data.monto,
      descripcion: data.descripcion || '',
      estado: 1,
      fecha_crea: now
    });
    const res = await query<any[]>('SELECT * FROM gratificaciones WHERE id = ?', [id]);
    return res.length > 0 ? res[0] : null;
  }

  static async update(id: string, data: { monto: number, descripcion?: string }) {
    const now = getNowInBusinessTimezone();
    await BaseRepository.update(query, 'gratificaciones', 'id', id, {
      ...data,
      fecha_mod: now
    });
    const res = await query<any[]>('SELECT * FROM gratificaciones WHERE id = ?', [id]);
    return res.length > 0 ? res[0] : null;
  }

  static async delete(id: string) {
    await BaseRepository.delete(query, 'gratificaciones', 'id', id);
  }
}
