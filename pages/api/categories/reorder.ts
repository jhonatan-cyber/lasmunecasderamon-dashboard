import type { NextApiRequest, NextApiResponse } from 'next';
import { query, rawQuery } from '@/lib/db';
import { z } from 'zod';

const reorderSchema = z.object({
  category_orders: z.array(
    z.object({
      id: z.number(),
      display_order: z.number()
    })
  )
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ success: false, message: 'Método no permitido' });
  }

  try {
    const parse = reorderSchema.safeParse(req.body);
    if (!parse.success) {
      return res
        .status(400)
        .json({ success: false, message: 'Datos inválidos', errors: parse.error.issues });
    }

    const { category_orders } = parse.data;

    // Actualizar en transacción
    await rawQuery('START TRANSACTION');
    for (const item of category_orders) {
      await query('UPDATE categorias SET display_order = ? WHERE id_categoria = ?', [
        item.display_order,
        item.id
      ]);
    }
    await rawQuery('COMMIT');

    // Notificar a clientes conectados (SSE)
    try {
      const { sendNotificationToAll } = await import('../notifications/sse');
      sendNotificationToAll('categories_updated', {
        action: 'reordered',
        order: category_orders.map(c => c.id)
      });
    } catch (err) {
      console.warn('[SSE] No se pudo notificar reordenamiento de categorías:', err);
    }

    return res.status(200).json({ success: true, message: 'Orden actualizado correctamente' });
  } catch (error) {
    await rawQuery('ROLLBACK');
    console.error('Error al reordenar categorías:', error);
    return res
      .status(500)
      .json({
        success: false,
        message: 'Error al actualizar el orden de categorías',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
  }
}
