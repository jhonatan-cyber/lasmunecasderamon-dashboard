import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { z } from 'zod';

const reorderSchema = z.object({
  room_orders: z.array(
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

    const { room_orders } = parse.data;

    // Actualizar el orden de cada habitación
    for (const item of room_orders) {
      await query(
        'UPDATE habitaciones SET display_order = ? WHERE id_habitacion = ?',
        [item.display_order, item.id]
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Orden de habitaciones actualizado correctamente'
    });
  } catch (error) {
    console.error('Error al reordenar habitaciones:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar el orden de habitaciones',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
}
