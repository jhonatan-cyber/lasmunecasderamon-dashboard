import { query, generateUUID } from '@/lib/db';

export class RoleRepository {
  static async getAll() {
    return await query(`
      SELECT r.*, (SELECT COUNT(*) FROM usuarios u WHERE u.rol_id = r.id_rol) as user_count
      FROM roles r ORDER BY r.nombre ASC
    `);
  }

  static async getById(id: string) {
    const res = await query<any[]>('SELECT * FROM roles WHERE id_rol = ?', [id]);
    return res.length > 0 ? res[0] : null;
  }

  static async create(data: { nombre: string, descripcion?: string }) {
    const id = generateUUID();
    await query('INSERT INTO roles (id_rol, nombre, descripcion) VALUES (?, ?, ?)', [id, data.nombre, data.descripcion || '']);
    return id;
  }

  static async update(id: string, data: { nombre: string, descripcion?: string }) {
    await query('UPDATE roles SET nombre = ?, descripcion = ? WHERE id_rol = ?', [data.nombre, data.descripcion || '', id]);
  }

  static async delete(id: string) {
    await query('DELETE FROM roles WHERE id_rol = ?', [id]);
  }

  static async getAdminPermissions() {
    return await query('SELECT * FROM permisos_roles pr INNER JOIN roles r ON r.id_rol = pr.rol_id');
  }
}
