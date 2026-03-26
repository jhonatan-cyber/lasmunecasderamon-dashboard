import { query, generateUUID } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';

export class ErrorLogRepository {
  static async getAll() {
    return await query('SELECT * FROM error_logs ORDER BY fecha_crea DESC LIMIT 50');
  }

  static async log(data: { endpoint: string, error_message: string, stack_trace?: string, request_body?: string }) {
    const id = generateUUID();
    const now = getNowInBusinessTimezone();
    await query('INSERT INTO error_logs (id, endpoint, error_message, stack_trace, request_body, fecha_crea) VALUES (?, ?, ?, ?, ?, ?)', [
      id,
      data.endpoint ?? 'unknown',
      data.error_message ?? 'unknown error',
      data.stack_trace ?? null,
      data.request_body ?? null,
      now
    ]);
  }
}
