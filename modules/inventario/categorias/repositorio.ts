import { query, generateUUID, withTransaction, type TransactionQuery } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { sendNotificationToAll } from '@/lib/api/sseService';
import { BaseRepository } from '@/lib/database/base-repository';
import { ConflictError, NotFoundError } from '@/lib/errors/errors';
import { eliminarFotosProductosSinUso } from '../productos/eliminarFotos';
import { ESTADO_UNIDAD_ACTIVA } from '@/modules/inventario/estados';

type Ejecutor = TransactionQuery | typeof query;

interface DependenciasCategoria {
  unidades: number;
  movimientos: number;
  compras: number;
  consumos: number;
  colaciones: number;
  entradas: number;
  entradasProductos: number;
  ventas: number;
  reposicion: number;
  servicios: number;
  solicitudes: number;
}

/**
 * Cuenta todo lo que impide borrar una categoría sin perder auditoría: stock,
 * movimientos, compras, ventas, consumos y referencias a sus presentaciones.
 * Se evalúa tanto en el preview como en el borrado real.
 */
async function contarDependenciasCategoria(
  ejecutor: Ejecutor,
  id: string
): Promise<DependenciasCategoria> {
  const [row] = await ejecutor<Record<keyof DependenciasCategoria, string | number | null>[]>(
    `SELECT
       (SELECT COUNT(*) FROM inventario_unidades u
          INNER JOIN productos p ON p.id_producto = u.producto_id
         WHERE p.categoria_id = ?) AS unidades,
       (SELECT COUNT(*) FROM inventario_movimientos m
          INNER JOIN productos p ON p.id_producto = m.producto_id
         WHERE p.categoria_id = ?) AS movimientos,
       (SELECT COUNT(*) FROM detalle_compras d
          INNER JOIN productos p ON p.id_producto = d.producto_id
         WHERE p.categoria_id = ?) AS compras,
       (SELECT COUNT(*) FROM inventario_movimiento_unidades mu
          INNER JOIN inventario_unidades u ON u.id = mu.unidad_id
          INNER JOIN productos p ON p.id_producto = u.producto_id
         WHERE p.categoria_id = ?) AS consumos,
       (SELECT COUNT(*) FROM colaciones c
          INNER JOIN inventario_presentaciones pr ON pr.id = c.presentacion_id
          INNER JOIN productos p ON p.id_producto = pr.producto_id
         WHERE p.categoria_id = ?) AS colaciones,
       (SELECT COUNT(*) FROM entradas_clientes e
          INNER JOIN inventario_presentaciones pr
            ON pr.id IN (e.cover_presentacion_id, e.bebida_acompanamiento_presentacion_id)
          INNER JOIN productos p ON p.id_producto = pr.producto_id
         WHERE p.categoria_id = ?) AS entradas,
       (SELECT COUNT(*) FROM entradas_clientes_productos ecp
          INNER JOIN inventario_presentaciones pr
            ON pr.id IN (ecp.presentacion_id, ecp.acompanamiento_presentacion_id)
          INNER JOIN productos p ON p.id_producto = pr.producto_id
         WHERE p.categoria_id = ?) AS entradasProductos,
       (SELECT COUNT(*) FROM detalle_ventas dv
          INNER JOIN inventario_presentaciones pr ON pr.id = dv.presentacion_id
          INNER JOIN productos p ON p.id_producto = pr.producto_id
         WHERE p.categoria_id = ?) AS ventas,
       (SELECT COUNT(*) FROM ordenes_reposicion o
          INNER JOIN inventario_presentaciones pr ON pr.id = o.presentacion_id
          INNER JOIN productos p ON p.id_producto = pr.producto_id
         WHERE p.categoria_id = ?) AS reposicion,
       (SELECT COUNT(*) FROM servicios s
          INNER JOIN inventario_presentaciones pr ON pr.id = s.producto_incluido_presentacion_id
          INNER JOIN productos p ON p.id_producto = pr.producto_id
         WHERE p.categoria_id = ?) AS servicios,
       (SELECT COUNT(*) FROM solicitudes_servicios ss
          INNER JOIN inventario_presentaciones pr ON pr.id = ss.producto_incluido_presentacion_id
          INNER JOIN productos p ON p.id_producto = pr.producto_id
         WHERE p.categoria_id = ?) AS solicitudes`,
    [id, id, id, id, id, id, id, id, id, id, id]
  );

  return {
    unidades: Number(row?.unidades ?? 0),
    movimientos: Number(row?.movimientos ?? 0),
    compras: Number(row?.compras ?? 0),
    consumos: Number(row?.consumos ?? 0),
    colaciones: Number(row?.colaciones ?? 0),
    entradas: Number(row?.entradas ?? 0),
    entradasProductos: Number(row?.entradasProductos ?? 0),
    ventas: Number(row?.ventas ?? 0),
    reposicion: Number(row?.reposicion ?? 0),
    servicios: Number(row?.servicios ?? 0),
    solicitudes: Number(row?.solicitudes ?? 0)
  };
}

function tieneDependencias(dependencias: DependenciasCategoria): boolean {
  return Object.values(dependencias).some(valor => valor > 0);
}

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
      const now = getNowInBusinessTimezone();
      await BaseRepository.update(trx, 'categorias', 'id_categoria', id, {
        estado: newStatus,
        fecha_mod: now
      });
      if (newStatus === 0) {
        // Marca solo los productos que estaban activos: los que un usuario ya
        // había desactivado a mano conservan su estado y su marca previa.
        await trx(
          `UPDATE productos
              SET estado = 0,
                  desactivado_por_categoria = CASE
                    WHEN estado = 1 THEN true
                    ELSE desactivado_por_categoria
                  END,
                  fecha_mod = ?
            WHERE categoria_id = ?`,
          [now, id]
        );
      } else {
        // Reactiva únicamente los que apagó esta categoría. Un producto
        // desactivado manualmente no revive al activar la categoría.
        await trx(
          `UPDATE productos
              SET estado = 1,
                  desactivado_por_categoria = false,
                  fecha_mod = ?
            WHERE categoria_id = ? AND desactivado_por_categoria = true`,
          [now, id]
        );
      }
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
    const dependencias = await contarDependenciasCategoria(query, id);
    const canDelete = !tieneDependencias(dependencias);
    return {
      name: categories[0].nombre,
      products,
      canDelete,
      blockedReason: canDelete
        ? null
        : 'La categoría tiene productos con stock o historial asociado. Desactivala en su lugar.',
      dependencies: dependencias
    };
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
      // Borrar productos con stock o historial destruiría auditoría (y las
      // referencias sin cascada fallarían). Se bloquea y se sugiere desactivar.
      const dependencias = await contarDependenciasCategoria(trx, id);
      if (tieneDependencias(dependencias)) {
        throw new ConflictError(
          'No se puede eliminar la categoría: tiene productos con stock o historial asociado. Desactivala en su lugar.'
        );
      }
      await trx('DELETE FROM productos WHERE categoria_id = ?', [id]);
      await BaseRepository.delete(trx, 'categorias', 'id_categoria', id);
      return [...products, ...presentations].map(p => p.foto);
    });
    const failedImages = await eliminarFotosProductosSinUso(fotos);
    sendNotificationToAll('categories_updated', { action: 'deleted', id });
    return { failedImages };
  }
}
