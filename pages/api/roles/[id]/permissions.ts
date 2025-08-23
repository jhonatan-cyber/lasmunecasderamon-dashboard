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
          CASE WHEN rp.role_id IS NOT NULL THEN 1 ELSE 0 END as assigned
        FROM permissions p
        LEFT JOIN role_permissions rp ON p.id = rp.permission_id AND rp.role_id = ?
        WHERE p.deleted_at IS NULL
        ORDER BY p.module, p.action
      `, [roleId]);

      // Convertir assigned de number a boolean
      const processedPermissions = rolePermissions.map(permission => ({
        ...permission,
        assigned: Boolean(permission.assigned)
      }));

      console.log('🔍 [API] Role permissions raw:', rolePermissions);
      console.log('🔍 [API] Permisos procesados:', processedPermissions);
      console.log('🔍 [API] Permisos de pedidos específicos:');
      processedPermissions.filter(p => p.module === 'pedidos').forEach(p => {
        console.log(`   ${p.module}.${p.action} (ID: ${p.id}) - assigned: ${p.assigned} (tipo: ${typeof p.assigned})`);
      });

      res.status(200).json({
        success: true,
        data: processedPermissions
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
      
      console.log('Received permissions update request:', {
        roleId,
        permissions,
        permissionsType: typeof permissions,
        isArray: Array.isArray(permissions)
      });

      if (!Array.isArray(permissions)) {
        console.error('Invalid permissions format:', permissions);
        return res.status(400).json({
          success: false,
          message: 'Los permisos deben ser un array'
        });
      }

      // Verificar que el rol existe
      const roleExists = await query('SELECT id_rol FROM roles WHERE id_rol = ?', [roleId]);
      if (!roleExists || (Array.isArray(roleExists) && roleExists.length === 0)) {
        console.error('Role not found:', roleId);
        return res.status(404).json({
          success: false,
          message: 'Rol no encontrado'
        });
      }

      // Verificar que los permisos existen
      if (permissions.length > 0) {
        const permissionIds = permissions.map(p => parseInt(p)).filter(p => !isNaN(p));
        
        // Crear placeholders para la consulta IN
        const placeholders = permissionIds.map(() => '?').join(',');
        const existingPermissions = await query(
          `SELECT id FROM permissions WHERE id IN (${placeholders}) AND deleted_at IS NULL`,
          permissionIds
        );
        
        if (!existingPermissions || (Array.isArray(existingPermissions) && existingPermissions.length !== permissionIds.length)) {
          console.error('Some permissions not found:', permissionIds);
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
      console.log('=== PERMISSIONS COMPARISON ===');
      console.log('Current permissions in DB:', currentPermissionIds);
      console.log('New permissions from frontend:', permissions);
      console.log('Current count:', currentPermissionIds.length);
      console.log('New count:', permissions.length);

      // Simplificar: eliminar todos y reinsertar
      console.log('Deleting all current permissions...');
      await query(`
        DELETE FROM role_permissions WHERE role_id = ?
      `, [roleId]);

      // Insertar los nuevos permisos
      if (permissions.length > 0) {
        console.log('Inserting new permissions:', permissions);
        const values = permissions.map(permissionId => [roleId, parseInt(permissionId)]);
        const placeholders = values.map(() => '(?, ?)').join(', ');
        
        await query(`
          INSERT INTO role_permissions (role_id, permission_id) 
          VALUES ${placeholders}
        `, values.flat());
        console.log('Inserted permissions count:', permissions.length);
      }

      // Verificar que se guardaron correctamente
      const savedPermissions = await query(`
        SELECT permission_id FROM role_permissions WHERE role_id = ?
      `, [roleId]);
      
      console.log('Saved permissions count:', savedPermissions ? savedPermissions.length : 0);

      res.status(200).json({
        success: true,
        message: 'Permisos del rol actualizados correctamente',
        data: {
          roleId,
          permissionsCount: permissions.length,
          savedCount: savedPermissions ? savedPermissions.length : 0
        }
      });
    } catch (error) {
      console.error('Error updating role permissions:', error);
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