import { query, generateUUID } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';

export class NotificationRepository {
  static async create(data: { usuario_id: string; tipo: string; titulo: string; mensaje: string; estado: number; data?: string }) {
    const id = generateUUID();
    const now = getNowInBusinessTimezone();
    await query(
      'INSERT INTO notificaciones (id_notificacion, usuario_id, tipo, titulo, mensaje, leida, estado, fecha_crea, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, data.usuario_id, data.tipo, data.titulo, data.mensaje, 0, data.estado, now, data.data || null]
    );
    return id;
  }

  static async getHistory(userId: string) {
    return await query(`
      SELECT * FROM notificaciones 
      WHERE (usuario_id = ? OR rol_destinatario IS NOT NULL)
      ORDER BY fecha_crea DESC LIMIT 50
    `, [userId]);
  }

  static async getPending(userId: string) {
    return await query('SELECT * FROM notificaciones WHERE usuario_id = ? AND leida = 0', [userId]);
  }

  static async getPendingCount(userId: string) {
    const res = await query<any[]>('SELECT COUNT(*) as count FROM notificaciones WHERE (usuario_id = ? OR rol_destinatario IS NOT NULL) AND leida = 0', [userId]);
    return res[0]?.count || 0;
  }

  static async markAsRead(id: string) {
    const now = getNowInBusinessTimezone();
    try {
      await query('UPDATE notificaciones SET leida = 1, fecha_leida = ? WHERE id = ?', [now, id]);
    } catch {
      await query('UPDATE notificaciones SET leida = 1, fecha_leida = ? WHERE id_notificacion = ?', [now, id]);
    }
  }

  static async registerToken(userId: string, token: string, deviceType?: string) {
    const id = generateUUID();
    await query('REPLACE INTO push_tokens (id, usuario_id, token, device_type) VALUES (?, ?, ?, ?)', [id, userId, token, deviceType || 'web']);
  }
}
