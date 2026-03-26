import { query, generateUUID } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';

export class PermissionRepository {
  static async getAll() {
    return await query(`
      SELECT id, name, description, module, action, created_at, updated_at
      FROM permissions 
      WHERE deleted_at IS NULL 
      ORDER BY module, action
    `);
  }

  static async create(data: { name: string, description?: string, module: string, action: string }) {
    const id = generateUUID();
    await query(`
      INSERT INTO permissions (id, name, description, module, action) 
      VALUES (?, ?, ?, ?, ?)
    `, [id, data.name, data.description || '', data.module, data.action]);
    return id;
  }

  static async delete(id: string) {
    await query('UPDATE permissions SET deleted_at = ? WHERE id = ?', [getNowInBusinessTimezone(), id]);
  }
}
