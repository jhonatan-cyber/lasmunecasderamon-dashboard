import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: `Método ${req.method} no permitido`
    });
  }

  try {
    console.log('=== ASIGNANDO TODOS LOS PERMISOS AL ADMINISTRADOR ===');

    // Obtener el rol de administrador
    const adminRole = await query('SELECT id_rol FROM roles WHERE nombre = ?', ['Administrador']) as any[];
    
    if (!adminRole || adminRole.length === 0) {
      console.error('Rol de administrador no encontrado');
      return res.status(404).json({
        success: false,
        message: 'Rol de administrador no encontrado'
      });
    }

    const adminRoleId = adminRole[0].id_rol;
    console.log('ID del rol administrador:', adminRoleId);

    // Obtener todos los permisos del sistema
    const allPermissions = await query('SELECT id FROM permissions WHERE deleted_at IS NULL') as any[];
    console.log('Total de permisos en el sistema:', allPermissions.length);

    if (!allPermissions || allPermissions.length === 0) {
      console.error('No hay permisos en el sistema');
      return res.status(404).json({
        success: false,
        message: 'No hay permisos en el sistema'
      });
    }

    // Obtener permisos actuales del administrador
    const currentAdminPermissions = await query(`
      SELECT permission_id FROM role_permissions WHERE role_id = ?
    `, [adminRoleId]) as any[];
    
    console.log('Permisos actuales del administrador:', currentAdminPermissions.length);

    // Eliminar todos los permisos actuales del administrador
    await query(`
      DELETE FROM role_permissions WHERE role_id = ?
    `, [adminRoleId]);
    
    console.log('Permisos anteriores eliminados');

    // Asignar todos los permisos al administrador
    const values = allPermissions.map(permission => [adminRoleId, permission.id]);
    const placeholders = values.map(() => '(?, ?)').join(', ');
    
    await query(`
      INSERT INTO role_permissions (role_id, permission_id) 
      VALUES ${placeholders}
    `, values.flat());

    console.log('Todos los permisos asignados al administrador');

    // Verificar que se asignaron correctamente
    const finalAdminPermissions = await query(`
      SELECT permission_id FROM role_permissions WHERE role_id = ?
    `, [adminRoleId]) as any[];

    console.log('Permisos finales del administrador:', finalAdminPermissions.length);

    // Obtener información detallada de los permisos asignados
    const detailedPermissions = await query(`
      SELECT 
        p.id,
        p.name,
        p.module,
        p.action
      FROM permissions p
      INNER JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = ? AND p.deleted_at IS NULL
      ORDER BY p.module, p.name
    `, [adminRoleId]);

    return res.status(200).json({
      success: true,
      message: "Todos los permisos asignados al administrador correctamente",
      data: {
        adminRoleId,
        totalPermissions: allPermissions.length,
        assignedPermissions: finalAdminPermissions.length,
        permissions: detailedPermissions
      }
    });

  } catch (error) {
    console.error('Error al asignar permisos al administrador:', error);
    return res.status(500).json({
      success: false,
      message: "Error al asignar permisos al administrador",
      error: error instanceof Error ? error.message : "Error desconocido"
    });
  }
}
