import { query, generateUUID } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { BaseRepository } from './BaseRepository';

export class OvertimeRepository {
  static async getAll(userId?: string, startDate?: string, endDate?: string) {
    let sql = `
      SELECT HR.*, U.id_usuario, CONCAT(U.nombre, ' ', U.apellido) AS usuario, U.foto AS usuario_foto
      FROM horas_extras HR
      INNER JOIN usuarios U ON U.id_usuario = HR.usuario_id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (userId) {
      sql += ' AND HR.usuario_id = ?';
      params.push(userId);
    }
    if (startDate && endDate) {
      sql += ' AND DATE(HR.fecha_crea) BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }
    sql += ' ORDER BY HR.fecha_crea DESC';

    const rows = await query<any[]>(sql, params);
    return rows.map(row => ({
      id_hora_extra: row.id_hora_extra,
      id_usuario: row.id_usuario,
      usuario: String(row.usuario),
      usuario_foto: String(row.usuario_foto || ''),
      hora: Number(row.hora),
      monto: Number(row.monto),
      total: Number(row.total),
      fecha_crea: String(row.fecha_crea),
      fecha_mod: String(row.fecha_mod || ''),
      estado: Number(row.estado)
    }));
  }

  static async getByUser(userId: string, tipo?: string, startDate?: string, endDate?: string) {
    return this.getAll(userId, startDate, endDate);
  }

  static async getByDates(userId: string, dates: string[]) {
    if (dates.length === 0) return [];
    let sql = `
      SELECT HR.*, U.id_usuario, CONCAT(U.nombre, ' ', U.apellido) AS usuario, U.foto AS usuario_foto, HR.fecha_crea, HR.estado
      FROM horas_extras HR
      INNER JOIN usuarios U ON U.id_usuario = HR.usuario_id
      WHERE HR.usuario_id = ? AND DATE(HR.fecha_crea) IN (?)
      ORDER BY HR.fecha_crea DESC
    `;
    const rows = await query<any[]>(sql, [userId, dates]);
    return rows.map(row => ({
      id_hora_extra: row.id_hora_extra,
      id_usuario: row.id_usuario,
      usuario: String(row.usuario),
      usuario_foto: String(row.usuario_foto || ''),
      hora: Number(row.hora),
      monto: Number(row.monto),
      total: Number(row.total),
      fecha_crea: String(row.fecha_crea),
      fecha_mod: String(row.fecha_mod || ''),
      estado: Number(row.estado)
    }));
  }

  static async create(data: { usuario_id: string, hora: number, monto: number, device_date?: string }) {
    const id = generateUUID();
    const total = data.hora * data.monto;
    const now = getNowInBusinessTimezone(data.device_date);
    await BaseRepository.insert(query, 'horas_extras', {
      id_hora_extra: id,
      usuario_id: data.usuario_id,
      hora: data.hora,
      monto: data.monto,
      total,
      fecha_crea: now,
      estado: 1
    });
    const res = await query<any[]>('SELECT * FROM horas_extras WHERE id_hora_extra = ?', [id]);
    return res.length > 0 ? res[0] : null;
  }

  static async update(id: string, data: Partial<{ hora: number, monto: number, estado: number }>) {
    const now = getNowInBusinessTimezone();
    await BaseRepository.update(query, 'horas_extras', 'id_hora_extra', id, { ...data, fecha_mod: now });
    const res = await query<any[]>('SELECT * FROM horas_extras WHERE id_hora_extra = ?', [id]);
    return res.length > 0 ? res[0] : null;
  }

  static async delete(id: string) {
    await BaseRepository.delete(query, 'horas_extras', 'id_hora_extra', id);
  }
}
