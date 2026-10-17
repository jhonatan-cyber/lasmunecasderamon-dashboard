import { query, generateUUID, type TransactionQuery } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';

const destinatario = `(usuario_id = ? OR LOWER(rol_destinatario) = (
  SELECT LOWER(r.nombre) FROM usuarios u JOIN roles r ON r.id_rol = u.rol_id WHERE u.id_usuario = ?
))`;

export class NotificationRepository {
  static async create(data: {
    usuario_id: string;
    tipo: string;
    titulo: string;
    mensaje: string;
    estado: number;
    data?: string;
  }) {
    const id = generateUUID();
    const now = getNowInBusinessTimezone();
    await query(
      'INSERT INTO notificaciones (id, usuario_id, tipo, titulo, mensaje, datos, leida, fecha_crea) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, data.usuario_id, data.tipo, data.titulo, data.mensaje, data.data || null, 0, now]
    );
    return id;
  }

  /** Aviso dirigido a un rol; `trx` permite emitirlo dentro de la transacción del emisor. */
  static async createForRole(
    data: {
      rol: string;
      tipo: string;
      titulo: string;
      mensaje: string;
      data?: string;
    },
    trx?: TransactionQuery
  ) {
    const id = generateUUID();
    const now = getNowInBusinessTimezone();
    const sql =
      'INSERT INTO notificaciones (id, rol_destinatario, tipo, titulo, mensaje, datos, leida, fecha_crea) VALUES (?, ?, ?, ?, ?, ?, 0, ?)';
    const params = [id, data.rol, data.tipo, data.titulo, data.mensaje, data.data || null, now];
    if (trx) await trx(sql, params);
    else await query(sql, params);
    return id;
  }

  static async getHistory(userId: string) {
    return await query(
      `
      SELECT * FROM notificaciones
      WHERE ${destinatario}
      ORDER BY fecha_crea DESC LIMIT 50
    `,
      [userId, userId]
    );
  }

  static async getPending(userId: string) {
    return await query(
      `SELECT * FROM notificaciones WHERE ${destinatario} AND leida = 0 ORDER BY fecha_crea DESC`,
      [userId, userId]
    );
  }

  static async getPendingCount(userId: string) {
    const res = await query<any[]>(
      `SELECT COUNT(*) as count FROM notificaciones WHERE ${destinatario} AND leida = 0`,
      [userId, userId]
    );
    return res[0]?.count || 0;
  }

  static async markAsRead(id: string) {
    const now = getNowInBusinessTimezone();
    await query('UPDATE notificaciones SET leida = 1, fecha_leida = ? WHERE id = ?', [now, id]);
  }

  static async registerToken(userId: string, token: string, deviceType?: string) {
    const id = generateUUID();
    await query(
      `INSERT INTO push_tokens (id, usuario_id, token, device_type) VALUES (?, ?, ?, ?)
      ON CONFLICT (token) DO UPDATE SET usuario_id = EXCLUDED.usuario_id, device_type = EXCLUDED.device_type`,
      [id, userId, token, deviceType || 'web']
    );
  }

  static async markAsReadForUser(userId: string, id?: string) {
    const now = getNowInBusinessTimezone();
    await query(
      `UPDATE notificaciones SET leida = 1, fecha_leida = ?
       WHERE ${destinatario} AND leida = 0${id ? ' AND id = ?' : ''}`,
      [now, userId, userId, ...(id ? [id] : [])]
    );
  }
}
