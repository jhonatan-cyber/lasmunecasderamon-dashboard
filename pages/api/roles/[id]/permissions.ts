import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const roleId = parseInt(id as string);

  if (req.method === 'GET') {
    try {
      // Obtener permisos del rol
      const rolePermissions = await query(`
        SELECT 
          p.id,
          p.name,
          p.description,
          p.module,
          p.action,
          CASE WHEN rp.role_id IS NOT NULL THEN true ELSE false END as assigned
        FROM permissions p
        LEFT JOIN role_permissions rp ON p.id = rp.permission_id AND rp.role_id = ?
        WHERE p.deleted_at IS NULL
        ORDER BY p.module, p.action
      `, [roleId]);

      res.status(200).json({
        success: true,
        data: rolePermissions
      });
    } catch (error) {
      console.error('Error fetching role permissions:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener los permisos del rol'
      });
    }
  } else if (req.method === 'PUT') {
    try {
      const { permissions } = req.body;

      if (!Array.isArray(permissions)) {
        return res.status(400).json({
          success: false,
          message: 'Los permisos deben ser un array'
        });
      }

      // Eliminar todos los permisos actuales del rol
      await query(`
        DELETE FROM role_permissions WHERE role_id = ?
      `, [roleId]);

      // Insertar los nuevos permisos
      if (permissions.length > 0) {
        const values = permissions.map(permissionId => [roleId, permissionId]);
        const placeholders = values.map(() => '(?, ?)').join(', ');
        
        await query(`
          INSERT INTO role_permissions (role_id, permission_id) 
          VALUES ${placeholders}
        `, values.flat());
      }

      res.status(200).json({
        success: true,
        message: 'Permisos del rol actualizados correctamente'
      });
    } catch (error) {
      console.error('Error updating role permissions:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar los permisos del rol'
      });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT']);
    res.status(405).json({
      success: false,
      message: `Method ${req.method} Not Allowed`
    });
  }
} 