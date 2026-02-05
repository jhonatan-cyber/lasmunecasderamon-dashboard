import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { z } from 'zod';

const reorderSchema = z.object({
  category_id: z.number(),
  product_orders: z.array(
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
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: parse.error.issues
      });
    }

    const { category_id, product_orders } = parse.data;

    // Actualizar el orden de cada producto en una transacción
    for (const item of product_orders) {
      await query(
        'UPDATE productos SET display_order = ? WHERE id_producto = ? AND categoria_id = ?',
        [item.display_order, item.id, category_id]
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Orden de productos actualizado correctamente'
    });
  } catch (error) {
    console.error('Error al reordenar productos:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar el orden de productos',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
}
