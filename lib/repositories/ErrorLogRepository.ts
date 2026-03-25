import { query } from '@/lib/db';

export class ErrorLogRepository {
  static async getAll() {
    return await query('SELECT * FROM error_logs ORDER BY fecha_crea DESC LIMIT 50');
  }

  static async log(data: { endpoint: string, error_message: string, stack_trace?: string, request_body?: string }) {
    await query(`
      CREATE TABLE IF NOT EXISTS error_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        endpoint VARCHAR(255),
        error_message TEXT,
        stack_trace TEXT,
        request_body TEXT,
        fecha_crea DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await query('INSERT INTO error_logs (endpoint, error_message, stack_trace, request_body) VALUES (?, ?, ?, ?)', [data.endpoint, data.error_message, data.stack_trace, data.request_body]);
  }
}
