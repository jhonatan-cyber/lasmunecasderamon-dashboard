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

  static async update(id: string, data: { name?: string, description?: string, module?: string, action?: string }) {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
    if (data.module !== undefined) { fields.push('module = ?'); values.push(data.module); }
    if (data.action !== undefined) { fields.push('action = ?'); values.push(data.action); }

    if (fields.length > 0) {
      fields.push('updated_at = ?');
      values.push(getNowInBusinessTimezone());
      values.push(id);

      await query(`UPDATE permissions SET ${fields.join(', ')} WHERE id = ?`, values);
    }
  }
}
