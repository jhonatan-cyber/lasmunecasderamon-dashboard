import { query, rawQuery, generateUUID, withTransaction } from '@/lib/db';
import { sendNotificationToAll } from '@/lib/sseService';

export class CategoryRepository {
  private static mapCategoryFromDB(row: any) {
    return {
      id: row.id_categoria,
      name: row.nombre,
      description: row.descripcion ?? '',
      status: row.estado,
      total_products: row.total_productos || 0,
      created_at: row.fecha_crea,
      display_order: row.display_order || 0
    };
  }

  static async getAll() {
    const results = await query(`
      SELECT 
        C.id_categoria, C.nombre, C.descripcion, C.estado, C.fecha_crea, C.display_order,
        COUNT(P.id_producto) AS total_productos
      FROM categorias C
      LEFT JOIN productos P ON P.categoria_id = C.id_categoria AND P.estado = 1
      GROUP BY C.id_categoria, C.nombre, C.descripcion, C.estado, C.fecha_crea, C.display_order
      ORDER BY C.display_order ASC, C.nombre ASC
    `) as any[];
    return results.map(this.mapCategoryFromDB);
  }

  static async create(name: string, description: string = '') {
    const dup = await query<any[]>('SELECT id_categoria FROM categorias WHERE LOWER(nombre) = LOWER(?)', [name]);
    if (dup.length > 0) throw new Error('Ya existe una categoría con ese nombre');

    const id = generateUUID();
    await query('INSERT INTO categorias (id_categoria, nombre, descripcion, estado) VALUES (?, ?, ?, 1)', [id, name, description]);
    
    sendNotificationToAll('categories_updated', { action: 'created', id, name });
    return id;
  }

  static async update(id: string, name: string, description: string = '') {
    const dup = await query<any[]>('SELECT id_categoria FROM categorias WHERE LOWER(nombre) = LOWER(?) AND id_categoria != ?', [name, id]);
    if (dup.length > 0) throw new Error('Ya existe una categoría con ese nombre');

    await query('UPDATE categorias SET nombre = ?, descripcion = ? WHERE id_categoria = ?', [name, description, id]);
    sendNotificationToAll('categories_updated', { action: 'updated', id, name });
  }

  static async reorder(categories: { id: string }[]) {
    await withTransaction(async (trx) => {
      for (let i = 0; i < categories.length; i++) {
        await trx('UPDATE categorias SET display_order = ? WHERE id_categoria = ?', [i, categories[i].id]);
      }
    });
    sendNotificationToAll('categories_updated', { action: 'reordered', order: categories.map(c => c.id) });
  }

  static async updateStatus(id: string, action: string) {
    const newStatus = action === 'activate' ? 1 : 0;
    await withTransaction(async (trx) => {
      await trx('UPDATE categorias SET estado = ? WHERE id_categoria = ?', [newStatus, id]);
      await trx('UPDATE productos SET estado = ? WHERE categoria_id = ?', [newStatus, id]);
    });

    sendNotificationToAll('categories_updated', { action: action === 'activate' ? 'activated' : 'deactivated', id });

    const updatedRows = await query(`
      SELECT C.id_categoria, C.nombre, C.descripcion, C.estado, C.fecha_crea, C.display_order,
             COUNT(P.id_producto) AS total_productos
      FROM categorias C
      LEFT JOIN productos P ON P.categoria_id = C.id_categoria AND P.estado = 1
      WHERE C.id_categoria = ?
      GROUP BY C.id_categoria, C.nombre, C.descripcion, C.estado, C.fecha_crea, C.display_order
    `, [id]) as any[];
    
    return updatedRows.length > 0 ? this.mapCategoryFromDB(updatedRows[0]) : null;
  }

  static async delete(id: string) {
    await withTransaction(async (trx) => {
      await trx('DELETE FROM productos WHERE categoria_id = ?', [id]);
      await trx('DELETE FROM categorias WHERE id_categoria = ?', [id]);
    });
    sendNotificationToAll('categories_updated', { action: 'deleted', id });
  }
}
