import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

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

      await query(`
        UPDATE permissions 
        SET name = ?, description = ?, module = ?, action = ?, updated_at = NOW()
        WHERE id = ?
      `, [name, description, module, action, id]);

      res.status(200).json({
        success: true,
        message: 'Permiso actualizado correctamente'
      });
    } catch (error) {
      console.error('Error updating permission:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar el permiso'
      });
    }
  } else if (req.method === 'DELETE') {
    try {
      await query(`
        UPDATE permissions 
        SET deleted_at = NOW()
        WHERE id = ?
      `, [id]);

      res.status(200).json({
        success: true,
        message: 'Permiso eliminado correctamente'
      });
    } catch (error) {
      console.error('Error deleting permission:', error);
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
