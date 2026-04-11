import { query, generateUUID, withTransaction } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { sendNotificationToAll } from '@/lib/api/sseService';
import { BaseRepository } from './BaseRepository';
import { ConflictError } from '@/lib/errors/errors';

export class CategoryRepository {
  private static mapCategoryFromDB(row: any) {
    return {
      id: row.id_categoria,
      name: row.nombre,
      description: row.descripcion ?? '',
      status: row.estado,
      total_products: row.total_productos || 0,
      created_at: row.fecha_crea,
      updated_at: row.fecha_mod,
      display_order: row.display_order || 0
    };
  }

  static async getAll() {
    const results = (await query(`
      SELECT 
        C.id_categoria, C.nombre, C.descripcion, C.estado, C.fecha_crea, C.display_order,
        COUNT(P.id_producto) AS total_productos
      FROM categorias C
      LEFT JOIN productos P ON P.categoria_id = C.id_categoria AND P.estado = 1
      GROUP BY C.id_categoria, C.nombre, C.descripcion, C.estado, C.fecha_crea, C.display_order
      ORDER BY C.display_order ASC, C.nombre ASC
    `)) as any[];
    return results.map(this.mapCategoryFromDB);
  }

  static async create(name: string, description: string = '') {
    const dup = await query<any[]>(
      'SELECT id_categoria FROM categorias WHERE LOWER(nombre) = LOWER(?)',
      [name]
    );
    if (dup.length > 0) throw new ConflictError('Ya existe una categoría con ese nombre');

    const id = generateUUID();
    const now = getNowInBusinessTimezone();
    await BaseRepository.insert(query, 'categorias', {
      id_categoria: id,
      nombre: name,
      descripcion: description,
      estado: 1,
      fecha_crea: now
    });

    sendNotificationToAll('categories_updated', { action: 'created', id, name });

    const results = (await query(
      `
      SELECT 
        C.id_categoria, C.nombre, C.descripcion, C.estado, C.fecha_crea, C.display_order,
        0 AS total_productos
      FROM categorias C
      WHERE C.id_categoria = ?
    `,
      [id]
    )) as any[];

    return results.length > 0 ? this.mapCategoryFromDB(results[0]) : null;
  }

  static async update(id: string, name: string, description: string = '') {
    const dup = await query<any[]>(
      'SELECT id_categoria FROM categorias WHERE LOWER(nombre) = LOWER(?) AND id_categoria != ?',
      [name, id]
    );
    if (dup.length > 0) throw new ConflictError('Ya existe una categoría con ese nombre');

    await BaseRepository.update(query, 'categorias', 'id_categoria', id, {
      nombre: name,
      descripcion: description,
      fecha_mod: getNowInBusinessTimezone()
    });
    sendNotificationToAll('categories_updated', { action: 'updated', id, name });

    const results = (await query(
      `
      SELECT 
        C.id_categoria, C.nombre, C.descripcion, C.estado, C.fecha_crea, C.fecha_mod, C.display_order,
        COUNT(P.id_producto) AS total_productos
      FROM categorias C
      LEFT JOIN productos P ON P.categoria_id = C.id_categoria AND P.estado = 1
      WHERE C.id_categoria = ?
      GROUP BY C.id_categoria, C.nombre, C.descripcion, C.estado, C.fecha_crea, C.fecha_mod, C.display_order
    `,
      [id]
    )) as any[];

    return results.length > 0 ? this.mapCategoryFromDB(results[0]) : null;
  }

  static async reorder(categories: { id: string }[]) {
    const now = getNowInBusinessTimezone();
    await withTransaction(async trx => {
      for (let i = 0; i < categories.length; i++) {
        await BaseRepository.update(trx, 'categorias', 'id_categoria', categories[i].id, {
          display_order: i,
          fecha_mod: now
        });
      }
    });
    sendNotificationToAll('categories_updated', {
      action: 'reordered',
      order: categories.map(c => c.id)
    });
  }

  static async updateStatus(id: string, action: string) {
    const newStatus = action === 'activate' ? 1 : 0;
    await withTransaction(async trx => {
      await BaseRepository.update(trx, 'categorias', 'id_categoria', id, {
        estado: newStatus,
        fecha_mod: getNowInBusinessTimezone()
      });
      await trx('UPDATE productos SET estado = ? WHERE categoria_id = ?', [newStatus, id]);
    });

    sendNotificationToAll('categories_updated', {
      action: action === 'activate' ? 'activated' : 'deactivated',
      id
    });

    const updatedRows = (await query(
      `
      SELECT C.id_categoria, C.nombre, C.descripcion, C.estado, C.fecha_crea, C.display_order,
             COUNT(P.id_producto) AS total_productos
      FROM categorias C
      LEFT JOIN productos P ON P.categoria_id = C.id_categoria AND P.estado = 1
      WHERE C.id_categoria = ?
      GROUP BY C.id_categoria, C.nombre, C.descripcion, C.estado, C.fecha_crea, C.display_order
    `,
      [id]
    )) as any[];

    return updatedRows.length > 0 ? this.mapCategoryFromDB(updatedRows[0]) : null;
  }

  static async delete(id: string) {
    await withTransaction(async trx => {
      await trx('DELETE FROM productos WHERE categoria_id = ?', [id]);
      await BaseRepository.delete(trx, 'categorias', 'id_categoria', id);
    });
    sendNotificationToAll('categories_updated', { action: 'deleted', id });
  }
}
