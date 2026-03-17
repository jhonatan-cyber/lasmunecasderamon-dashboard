import { NextApiRequest, NextApiResponse } from 'next';
import { query, generateUUID } from '@/lib/db';
import { notifyPermissionsUpdate } from '../../permissions/sse';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const roleId = id as string;

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
          CASE WHEN rp.role_id IS NOT NULL THEN 1 ELSE 0 END as assigned
        FROM permissions p
        LEFT JOIN role_permissions rp ON p.id = rp.permission_id AND rp.role_id = ?
        WHERE p.deleted_at IS NULL
        ORDER BY p.module, p.action
      `, [roleId]) as any[];

      // Convertir assigned de number a boolean
      const processedPermissions = rolePermissions.map((permission: any) => ({
        ...permission,
        assigned: Boolean(permission.assigned)
      }));



      res.status(200).json({
        success: true,
        data: processedPermissions
      });
    } catch (error) {
   
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

      // Verificar que el rol existe
      const roleExists = await query('SELECT id_rol FROM roles WHERE id_rol = ?', [roleId]);
      if (!roleExists || (Array.isArray(roleExists) && roleExists.length === 0)) {
        return res.status(404).json({
          success: false,
          message: 'Rol no encontrado'
        });
      }

      // Verificar que los permisos existen
      if (permissions.length > 0) {
        const permissionIds = permissions.map(p => String(p));
        
        // Crear placeholders para la consulta IN
        const placeholders = permissionIds.map(() => '?').join(',');
        const existingPermissions = await query(
          `SELECT id FROM permissions WHERE id IN (${placeholders}) AND deleted_at IS NULL`,
          permissionIds
        );
        
        if (!existingPermissions || (Array.isArray(existingPermissions) && existingPermissions.length !== permissionIds.length)) {
          return res.status(400).json({
            success: false,
            message: 'Algunos permisos no existen'
          });
        }
      }

      // Obtener permisos actuales del rol
      const currentPermissions = await query(`
        SELECT permission_id FROM role_permissions WHERE role_id = ?
      `, [roleId]) as any[];
      
      const currentPermissionIds = currentPermissions.map(p => p.permission_id.toString());

      // Simplificar: eliminar todos y reinsertar
      await query(`
        DELETE FROM role_permissions WHERE role_id = ?
      `, [roleId]);

      // Insertar los nuevos permisos
      if (permissions.length > 0) {
        const values = permissions.map(permissionId => [generateUUID(), roleId, String(permissionId)]);
        const placeholders = values.map(() => '(?, ?, ?)').join(', ');
        
        await query(`
          INSERT INTO role_permissions (id, role_id, permission_id) 
          VALUES ${placeholders}
        `, values.flat());
      }

      // Verificar que se guardaron correctamente
      const savedPermissions = await query(`
        SELECT permission_id FROM role_permissions WHERE role_id = ?
      `, [roleId]) as any[];

      // Notificar a todos los clientes conectados vía SSE
      notifyPermissionsUpdate(roleId);

      // Notificar a todos los usuarios con este rol que sus permisos han cambiado
      // Esto se hace mediante un evento global que los clientes escuchan
      res.status(200).json({
        success: true,
        message: 'Permisos del rol actualizados correctamente',
        data: {
          roleId,
          permissionsCount: permissions.length,
          savedCount: savedPermissions ? savedPermissions.length : 0,
          shouldRefresh: true // Indicador para que el cliente refresque permisos
        }
      });
    } catch (error) {
      
      res.status(500).json({
        success: false,
        message: 'Error al actualizar los permisos del rol',
        error: error instanceof Error ? error.message : 'Error desconocido'
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