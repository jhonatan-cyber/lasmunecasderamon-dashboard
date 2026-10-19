import { query, generateUUID, withTransaction } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { sendNotificationToAll } from '@/lib/api/sseService';
import { BaseRepository } from '@/lib/database/base-repository';
import { ConflictError, NotFoundError } from '@/lib/errors/errors';
import { eliminarFotosProductosSinUso } from '../productos/eliminarFotos';
import { ESTADO_UNIDAD_ACTIVA } from '@/modules/inventario/estados';

export class CategoryRepository {
  private static mapCategoryFromDB(row: any) {
    return {
      id: row.id_categoria,
      system_key: row.system_key ?? null,
      name: row.nombre,
      description: row.descripcion ?? '',
      status: row.estado,
      total_products: row.total_productos || 0,
      created_at: row.fecha_crea,
      updated_at: row.fecha_mod,
      display_order: row.display_order || 0
    };
  }

  static async getAll(forSale = false) {
    const results = (await query(`
      SELECT 
        C.system_key, C.id_categoria, C.nombre, C.descripcion, C.estado, C.fecha_crea, C.display_order,
        (SELECT COUNT(DISTINCT P.id_producto)
         FROM productos P
         ${
           forSale
             ? `INNER JOIN inventario_presentaciones IP ON IP.producto_id = P.id_producto
         INNER JOIN inventario_unidades IU ON IU.presentacion_id = IP.id
           AND IU.estado = '${ESTADO_UNIDAD_ACTIVA}' AND IU.ubicacion = 'bar'`
             : ''
         }
         WHERE P.categoria_id = C.id_categoria AND P.estado = 1) AS total_productos
      FROM categorias C
      ${forSale ? 'WHERE C.estado = 1' : ''}
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
        C.system_key, C.id_categoria, C.nombre, C.descripcion, C.estado, C.fecha_crea, C.display_order,
        0 AS total_productos
      FROM categorias C
      WHERE C.id_categoria = ?
    `,
      [id]
    )) as any[];

    return results.length > 0 ? this.mapCategoryFromDB(results[0]) : null;
  }

  static async update(id: string, name: string, description: string = '') {
    const [current] = await query<{ system_key: string | null; nombre: string }[]>(
      'SELECT system_key, nombre FROM categorias WHERE id_categoria = ?',
      [id]
    );
    if (
      ['bebidas_analcoholicas', 'cigarrillos'].includes(current?.system_key ?? '') &&
      name !== current.nombre
    )
      throw new ConflictError('Esta categoría predeterminada no se puede renombrar');
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
        C.system_key, C.id_categoria, C.nombre, C.descripcion, C.estado, C.fecha_crea, C.fecha_mod, C.display_order,
        COUNT(P.id_producto) AS total_productos
      FROM categorias C
      LEFT JOIN productos P ON P.categoria_id = C.id_categoria AND P.estado = 1
      WHERE C.id_categoria = ?
      GROUP BY C.system_key, C.id_categoria, C.nombre, C.descripcion, C.estado, C.fecha_crea, C.fecha_mod, C.display_order
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
    if (newStatus === 0) {
      const [current] = await query<{ system_key: string | null }[]>(
        'SELECT system_key FROM categorias WHERE id_categoria = ?',
        [id]
      );
      if (['bebidas_analcoholicas', 'cigarrillos'].includes(current?.system_key ?? ''))
        throw new ConflictError('Esta categoría predeterminada no se puede desactivar');
    }
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
      SELECT C.system_key, C.id_categoria, C.nombre, C.descripcion, C.estado, C.fecha_crea, C.display_order,
             COUNT(P.id_producto) AS total_productos
      FROM categorias C
      LEFT JOIN productos P ON P.categoria_id = C.id_categoria AND P.estado = 1
      WHERE C.id_categoria = ?
      GROUP BY C.system_key, C.id_categoria, C.nombre, C.descripcion, C.estado, C.fecha_crea, C.display_order
    `,
      [id]
    )) as any[];

    return updatedRows.length > 0 ? this.mapCategoryFromDB(updatedRows[0]) : null;
  }

  static async deletionPreview(id: string) {
    const categories = await query<any[]>('SELECT nombre FROM categorias WHERE id_categoria = ?', [
      id
    ]);
    if (!categories.length) throw new NotFoundError('Categoría no encontrada');
    const products = await query<any[]>(
      'SELECT id_producto AS id, nombre AS name, estado AS status FROM productos WHERE categoria_id = ? ORDER BY nombre',
      [id]
    );
    return { name: categories[0].nombre, products };
  }

  static async delete(id: string) {
    const fotos = await withTransaction(async trx => {
      const rows = await trx<{ system_key: string | null }[]>(
        'SELECT system_key FROM categorias WHERE id_categoria = ? FOR UPDATE',
        [id]
      );
      if (['bebidas_analcoholicas', 'cigarrillos'].includes(rows[0]?.system_key ?? ''))
        throw new ConflictError('Esta categoría predeterminada no se puede eliminar');
      const products = (await trx('SELECT foto FROM productos WHERE categoria_id = ? FOR UPDATE', [
        id
      ])) as { foto: string | null }[];
      const presentations = (await trx(
        'SELECT IP.foto FROM inventario_presentaciones IP JOIN productos P ON P.id_producto = IP.producto_id WHERE P.categoria_id = ?',
        [id]
      )) as { foto: string | null }[];
      // Los consumos por shot/corto referencian unidades sin ON DELETE CASCADE.
      // Quitarlos antes de que el borrado del producto elimine sus unidades.
      await trx(
        `DELETE FROM inventario_movimiento_unidades
         WHERE unidad_id IN (
           SELECT IU.id FROM inventario_unidades IU
           JOIN productos P ON P.id_producto = IU.producto_id
           WHERE P.categoria_id = ?
         )`,
        [id]
      );
      await trx('DELETE FROM productos WHERE categoria_id = ?', [id]);
      await BaseRepository.delete(trx, 'categorias', 'id_categoria', id);
      return [...products, ...presentations].map(p => p.foto);
    });
    const failedImages = await eliminarFotosProductosSinUso(fotos);
    sendNotificationToAll('categories_updated', { action: 'deleted', id });
    return { failedImages };
  }
}
