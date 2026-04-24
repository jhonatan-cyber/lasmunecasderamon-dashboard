import { query, generateUUID, type TransactionQuery } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';

export interface AuditLog {
  id?: string;
  user_id?: string | number;
  action: string;
  resource_type?: string;
  resource_id?: string;
  details?: any;
  ip_address?: string;
  created_at?: Date | string;
}

export class AuditRepository {
  /**
   * Registra un evento de auditoría en la base de datos.
   */
  static async log(data: AuditLog, trx?: TransactionQuery): Promise<void> {
    const id = generateUUID();
    const now = getNowInBusinessTimezone();
    const sql = `
      INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, details, ip_address, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      id,
      data.user_id || null,
      data.action,
      data.resource_type || null,
      data.resource_id || null,
      data.details ? JSON.stringify(data.details) : null,
      data.ip_address || null,
      now
    ];

    if (trx) {
      await trx(sql, params);
    } else {
      await query(sql, params);
    }
  }

  /**
   * Obtiene los últimos logs de auditoría.
   */
  static async getLatest(limit: number = 100): Promise<any[]> {
    return await query(
      `
      SELECT a.*, u.nick as usuario_nick, u.nombre as usuario_nombre
      FROM audit_logs a
      LEFT JOIN usuarios u
        ON CONVERT(a.user_id USING utf8mb4) COLLATE utf8mb4_unicode_ci =
           CONVERT(u.id_usuario USING utf8mb4) COLLATE utf8mb4_unicode_ci
      ORDER BY a.created_at DESC
      LIMIT ?
    `,
      [limit]
    );
  }
}
