import { query, generateUUID } from '@/lib/db';

export class NotificationRepository {
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

  static async registerToken(userId: string, token: string, deviceType?: string) {
    const id = generateUUID();
    await query('REPLACE INTO push_tokens (id, usuario_id, token, device_type) VALUES (?, ?, ?, ?)', [id, userId, token, deviceType || 'web']);
  }
}
