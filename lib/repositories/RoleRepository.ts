import { query, generateUUID } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { BaseRepository } from './BaseRepository';

export class RoleRepository {
  private static readonly TABLE = 'roles';
  private static readonly ID_COL = 'id_rol';
  static async getAll() {
    return await query(`
      SELECT r.*, (SELECT COUNT(*) FROM usuarios u WHERE u.rol_id = r.id_rol) as user_count
      FROM ${this.TABLE} r ORDER BY r.nombre ASC
    `);
  }

  static async getById(id: string) {
    return await BaseRepository.findOne<any>(query, this.TABLE, this.ID_COL, id);
  }

  static async create(data: { nombre: string, descripcion?: string }) {
    const id = generateUUID();
    await BaseRepository.insert(query, this.TABLE, {
      [this.ID_COL]: id,
      nombre: data.nombre,
      descripcion: data.descripcion || '',
      fecha_crea: getNowInBusinessTimezone()
    });
    return id;
  }

  static async updateRole(id: string, data: { nombre: string, descripcion?: string }) {
    await BaseRepository.update(query, this.TABLE, this.ID_COL, id, {
      ...data,
      fecha_mod: getNowInBusinessTimezone()
    });
  }

  static async delete(id: string) {
    await BaseRepository.delete(query, this.TABLE, this.ID_COL, id);
  }

  static async getAdminPermissions() {
    return await query('SELECT * FROM permisos_roles pr INNER JOIN roles r ON r.id_rol = pr.rol_id');
  }
}
