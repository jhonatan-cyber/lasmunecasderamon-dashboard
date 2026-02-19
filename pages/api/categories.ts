import type { NextApiRequest, NextApiResponse } from 'next';
import { query, rawQuery } from '@/lib/db';
import { z } from 'zod';

const categorySchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  description: z.string().optional().default('')
});

const mapCategoryFromDB = (row: any) => ({
  id: row.id_categoria,
  name: row.nombre,
  description: row.descripcion ?? '',
  status: row.estado,
  total_products: row.total_productos || 0,
  created_at: row.fecha_crea,
  display_order: row.display_order || 0
});

const handleGet = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    // logs removidos

    const results = await query(
      `
      SELECT 
        C.id_categoria,
        C.nombre,
        C.descripcion,
        C.estado,
        C.fecha_crea,
        C.display_order,
        COUNT(P.id_producto) AS total_productos
      FROM 
        categorias C
      LEFT JOIN 
        productos P ON P.categoria_id = C.id_categoria AND P.estado = 1
      GROUP BY C.id_categoria, C.nombre, C.descripcion, C.estado, C.fecha_crea, C.display_order
      ORDER BY C.display_order ASC, C.nombre ASC
    `,
      []
    );

    const categories = Array.isArray(results) ? results.map(mapCategoryFromDB) : [];

    return res.status(200).json({ success: true, data: categories });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error al obtener categorías',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

const handlePost = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const parse = categorySchema.safeParse(req.body);
    if (!parse.success) {
      return res
        .status(400)
        .json({ success: false, message: 'Datos inválidos', errors: (parse as any).error?.issues });
    }
    // Validar duplicado por nombre
    const dup = await query('SELECT id_categoria FROM categorias WHERE LOWER(nombre) = LOWER(?)', [
      parse.data.name
    ]);
    if (Array.isArray(dup) && dup.length) {
      return res
        .status(400)
        .json({ success: false, message: 'Ya existe una categoría con ese nombre' });
    }
    const result: any = await query(
      'INSERT INTO categorias (nombre, descripcion, estado) VALUES (?, ?, 1)',
      [parse.data.name, parse.data.description]
    );

    // Notificar a clientes conectados (tiempo real)
    try {
      const { sendNotificationToAll } = await import('./notifications/sse');
      sendNotificationToAll('categories_updated', {
        action: 'created',
        id: (result as any).insertId,
        name: parse.data.name
      });
    } catch (err) {
      console.warn('[SSE] No se pudo notificar creación de categoría:', err);
    }

    return res
      .status(201)
      .json({ success: true, message: 'Categoría creada correctamente', id: result.insertId });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al crear categoría', error });
  }
};

const handlePut = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { id } = req.query;
    console.log('PUT - ID recibido:', id);
    console.log('PUT - Body:', req.body);

    if (!id) return res.status(400).json({ success: false, message: 'Falta el id' });
    const parse = categorySchema.safeParse(req.body);
    if (!parse.success) {
      return res
        .status(400)
        .json({ success: false, message: 'Datos inválidos', errors: (parse as any).error?.issues });
    }

    // Validar duplicado por nombre (excluyendo el actual)
    const dup = await query(
      'SELECT id_categoria FROM categorias WHERE LOWER(nombre) = LOWER(?) AND id_categoria != ?',
      [parse.data.name, id]
    );
    console.log('PUT - Duplicados encontrados:', dup);

    if (Array.isArray(dup) && dup.length) {
      return res
        .status(400)
        .json({ success: false, message: 'Ya existe una categoría con ese nombre' });
    }
    await query('UPDATE categorias SET nombre = ?, descripcion = ? WHERE id_categoria = ?', [
      parse.data.name,
      parse.data.description,
      id
    ]);

    // Notificar a clientes conectados (tiempo real)
    try {
      const { sendNotificationToAll } = await import('./notifications/sse');
      sendNotificationToAll('categories_updated', {
        action: 'updated',
        id: Number(id),
        name: parse.data.name
      });
    } catch (err) {
      console.warn('[SSE] No se pudo notificar actualización de categoría:', err);
    }

    return res.status(200).json({ success: true, message: 'Categoría actualizada correctamente' });
  } catch (error) {
    console.error('PUT - Error:', error);
    return res
      .status(500)
      .json({ success: false, message: 'Error al actualizar categoría', error });
  }
};

const handlePatch = async (req: NextApiRequest, res: NextApiResponse) => {
  const { id, action } = req.query;

  // Manejo de reordenamiento
  if (action === 'reorder') {
    try {
      const { categories } = req.body;
      if (!Array.isArray(categories)) {
        return res
          .status(400)
          .json({ success: false, message: 'Se requiere un array de categorías' });
      }

      // Actualizar el display_order de cada categoría
      await rawQuery('START TRANSACTION');
      for (let i = 0; i < categories.length; i++) {
        const category = categories[i];
        await query('UPDATE categorias SET display_order = ? WHERE id_categoria = ?', [
          i,
          category.id
        ]);
      }
      await rawQuery('COMMIT');

      // Notificar a clientes conectados (reordenamiento)
      try {
        const { sendNotificationToAll } = await import('./notifications/sse');
        sendNotificationToAll('categories_updated', {
          action: 'reordered',
          order: categories.map((c: any) => c.id)
        });
      } catch (err) {
        console.warn('[SSE] No se pudo notificar reordenamiento de categorías:', err);
      }

      return res.status(200).json({ success: true, message: 'Orden actualizado correctamente' });
    } catch (error) {
      await rawQuery('ROLLBACK');
      return res
        .status(500)
        .json({ success: false, message: 'Error al actualizar el orden', error });
    }
  }

  if (!id || !action) {
    return res.status(400).json({ success: false, message: 'Faltan parámetros id o action' });
  }
  let newStatus;
  if (action === 'activate') newStatus = 1;
  else if (action === 'deactivate') newStatus = 0;
  else return res.status(400).json({ success: false, message: 'Acción no válida' });
  try {
    console.log('[API][categories] PATCH action=', action, 'id=', id, 'newStatus=', newStatus);
    await rawQuery('START TRANSACTION');
    await query('UPDATE categorias SET estado = ? WHERE id_categoria = ?', [newStatus, id]);
    // Si desactivamos la categoría, desactivar todos sus productos asociados
    if (newStatus === 0) {
      await query('UPDATE productos SET estado = 0 WHERE categoria_id = ?', [id]);
    } else if (newStatus === 1) {
      await query('UPDATE productos SET estado = 1 WHERE categoria_id = ?', [id]);
    }
    await rawQuery('COMMIT');

    // Obtener la categoría actualizada desde la BD para devolverla al cliente
    const updatedRows = await query(
      `SELECT 
         C.id_categoria, C.nombre, C.descripcion, C.estado, C.fecha_crea, C.display_order,
         COUNT(P.id_producto) AS total_productos
       FROM categorias C
       LEFT JOIN productos P ON P.categoria_id = C.id_categoria AND P.estado = 1
       WHERE C.id_categoria = ?
       GROUP BY C.id_categoria, C.nombre, C.descripcion, C.estado, C.fecha_crea, C.display_order`,
      [id]
    );
    const updatedCategory =
      Array.isArray(updatedRows) && updatedRows.length ? mapCategoryFromDB(updatedRows[0]) : null;

    // Notificar a clientes conectados (activación/desactivación)
    try {
      const { sendNotificationToAll } = await import('./notifications/sse');
      sendNotificationToAll('categories_updated', {
        action: action === 'activate' ? 'activated' : 'deactivated',
        id: Number(id)
      });
    } catch (err) {
      console.warn('[SSE] No se pudo notificar cambio de estado de categoría:', err);
    }

    return res.status(200).json({
      success: true,
      message: `Categoría ${action === 'activate' ? 'activada' : 'desactivada'} correctamente${newStatus === 0 ? ' y productos asociados desactivados' : ' y productos asociados activados'}`,
      category: updatedCategory
    });
  } catch (error) {
    await rawQuery('ROLLBACK');
    return res.status(500).json({
      success: false,
      message: `Error al ${action === 'activate' ? 'activar' : 'desactivar'} categoría`,
      error
    });
  }
};

const handleDelete = async (req: NextApiRequest, res: NextApiResponse) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ success: false, message: 'Falta el id' });
  try {
    // Eliminar productos asociados y luego la categoría en una transacción
    await rawQuery('START TRANSACTION');
    await query('DELETE FROM productos WHERE categoria_id = ?', [id]);
    await query('DELETE FROM categorias WHERE id_categoria = ?', [id]);
    await rawQuery('COMMIT');

    // Notificar a clientes conectados (eliminación)
    try {
      const { sendNotificationToAll } = await import('./notifications/sse');
      sendNotificationToAll('categories_updated', { action: 'deleted', id: Number(id) });
    } catch (err) {
      console.warn('[SSE] No se pudo notificar eliminación de categoría:', err);
    }

    return res
      .status(200)
      .json({ success: true, message: 'Categoría y productos asociados eliminados correctamente' });
  } catch (error) {
    await rawQuery('ROLLBACK');
    return res
      .status(500)
      .json({ success: false, message: 'Error al eliminar categoría y sus productos', error });
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case 'GET':
      return await handleGet(req, res);
    case 'POST':
      return await handlePost(req, res);
    case 'PUT':
      return await handlePut(req, res);
    case 'PATCH':
      return await handlePatch(req, res);
    case 'DELETE':
      return await handleDelete(req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
      return res.status(405).json({ success: false, message: `Método ${req.method} no permitido` });
  }
}
