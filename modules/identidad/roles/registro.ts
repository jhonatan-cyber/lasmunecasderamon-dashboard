import { query, withTransaction, generateUUID } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { BaseRepository } from '@/lib/database/base-repository';

export class RoleRepository {
  private static readonly TABLE = 'roles';
  private static readonly ID_COL = 'id_rol';

  /**
   * Matriz inicial de un rol nuevo. Es explícita a propósito: la versión anterior
   * dejaba el rol sin filas y el motor de permisos lo completaba con una matriz
   * hardcodeada por nombre de rol (los roles creados desde la UI heredaban la de
   * Garzón). Con la resolución cerrada, sin filas el rol no puede hacer nada, así
   * que el alta deja por escrito su punto de partida mínimo para operar la app.
   */
  private static readonly INITIAL_PERMISSIONS: ReadonlyArray<{
    module: string;
    action: string;
  }> = [{ module: 'dashboard', action: 'view' }];
  static async getAll() {
    return await query(`
      SELECT r.*, (SELECT COUNT(*) FROM usuarios u WHERE u.rol_id = r.id_rol) as user_count
      FROM ${this.TABLE} r ORDER BY r.nombre ASC
    `);
  }

  static async getById(id: string) {
    return await BaseRepository.findOne<any>(query, this.TABLE, this.ID_COL, id);
  }

  static async getUsersByRole(roleId: string) {
    return await query<any[]>(
      `SELECT u.id_usuario AS id, u.nick, u.nombre, u.apellido, u.email, u.estado
       FROM usuarios u WHERE u.rol_id = ? ORDER BY u.nick ASC`,
      [roleId]
    );
  }

  static async create(data: { nombre: string; descripcion?: string }) {
    const id = generateUUID();

    await withTransaction(async trx => {
      await BaseRepository.insert(trx, this.TABLE, {
        [this.ID_COL]: id,
        nombre: data.nombre,
        descripcion: data.descripcion || '',
        fecha_crea: getNowInBusinessTimezone()
      });

      for (const { module, action } of this.INITIAL_PERMISSIONS) {
        // SELECT sobre permissions: si el catálogo no tiene ese permiso no se
        // inserta nada, en vez de dejar una fila rota.
        await trx(
          `INSERT INTO role_permissions (id, role_id, permission_id, created_at)
           SELECT ?, ?, p.id, ?
           FROM permissions p
           WHERE p.module = ? AND p.action = ? AND p.deleted_at IS NULL`,
          [generateUUID(), id, getNowInBusinessTimezone(), module, action]
        );
      }
    });

    return id;
  }

  static async updateRole(id: string, data: { nombre: string; descripcion?: string }) {
    await BaseRepository.update(query, this.TABLE, this.ID_COL, id, {
      ...data,
      fecha_mod: getNowInBusinessTimezone()
    });
  }

  static async delete(id: string) {
    await BaseRepository.delete(query, this.TABLE, this.ID_COL, id);
  }

  static async getAdminPermissions() {
    return await query(
      'SELECT * FROM role_permissions pr INNER JOIN roles r ON r.id_rol = pr.role_id'
    );
  }
}
