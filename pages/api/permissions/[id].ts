/* eslint-disable */
import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { getNowInBusinessTimezone } from '@/lib/timezoneService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'PUT') {
    try {
      const { name, description, module, action } = req.body;

      if (!name || !module || !action) {
        return res.status(400).json({
          success: false,
          message: 'Nombre, módulo y acción son requeridos'
        });
      }

      const now = getNowInBusinessTimezone();
      await query(
        `
        UPDATE permissions 
        SET name = ?, description = ?, module = ?, action = ?, updated_at = ?
        WHERE id = ?
      `,
        [name, description, module, action, now, id]
      );

      res.status(200).json({
        success: true,
        message: 'Permiso actualizado correctamente'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al actualizar el permiso'
      });
    }
  } else if (req.method === 'DELETE') {
    try {
      const now = getNowInBusinessTimezone();
      await query(
        `
        UPDATE permissions 
        SET deleted_at = ?
        WHERE id = ?
      `,
        [now, id]
      );

      res.status(200).json({
        success: true,
        message: 'Permiso eliminado correctamente'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al eliminar el permiso'
      });
    }
  } else {
    res.setHeader('Allow', ['PUT', 'DELETE']);
    res.status(405).json({
      success: false,
      message: `Method ${req.method} Not Allowed`
    });
  }
}
