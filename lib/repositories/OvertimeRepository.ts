import { query, generateUUID } from '@/lib/db';

export class OvertimeRepository {
  static async getAll(userId?: string, startDate?: string, endDate?: string) {
    let sql = `
      SELECT HR.*, U.id_usuario, CONCAT(U.nombre, ' ', U.apellido) AS usuario, HR.fecha_crea, HR.estado
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
      SELECT HR.*, U.id_usuario, CONCAT(U.nombre, ' ', U.apellido) AS usuario, HR.fecha_crea, HR.estado
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
      hora: Number(row.hora),
      monto: Number(row.monto),
      total: Number(row.total),
      fecha_crea: String(row.fecha_crea),
      fecha_mod: String(row.fecha_mod || ''),
      estado: Number(row.estado)
    }));
  }

  static async create(data: { usuario_id: string, hora: number, monto: number }) {
    const id = generateUUID();
    const total = data.hora * data.monto;
    await query(`INSERT INTO horas_extras (id_hora_extra, usuario_id, hora, monto, total, estado) VALUES (?, ?, ?, ?, ?, 1)`, [id, data.usuario_id, data.hora, data.monto, total]);
    return id;
  }
}
