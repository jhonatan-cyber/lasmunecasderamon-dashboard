import type { NextApiRequest, NextApiResponse } from 'next';
import { query, generateUUID } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método no permitido' });
  }

  try {
    // Agregar permiso faltante para usuarios (ver detalle)
    await query(`
      INSERT IGNORE INTO permissions (id, name, description, module, action) VALUES
      (?, 'Ver detalle de usuarios', 'Acceso para ver información detallada de usuarios específicos', 'users', 'detail')
    `, [generateUUID()]);

    // Crear módulo completo de clientes
    const clientsViewId = generateUUID();
    const clientsDetailId = generateUUID();
    const clientsCreateId = generateUUID();
    const clientsEditId = generateUUID();
    const clientsDeleteId = generateUUID();

    await query(`
      INSERT IGNORE INTO permissions (id, name, description, module, action) VALUES
      (?, 'Ver clientes', 'Acceso para visualizar todos los clientes del sistema', 'clients', 'view'),
      (?, 'Ver detalle de clientes', 'Acceso para ver información detallada de clientes específicos', 'clients', 'detail'),
      (?, 'Crear clientes', 'Acceso para crear nuevos clientes en el sistema', 'clients', 'create'),
      (?, 'Editar clientes', 'Acceso para modificar información de clientes', 'clients', 'edit'),
      (?, 'Eliminar clientes', 'Acceso para eliminar clientes del sistema', 'clients', 'delete')
    `, [clientsViewId, clientsDetailId, clientsCreateId, clientsEditId, clientsDeleteId]);

    // Obtener ID real del administrador
    const adminRole = await query("SELECT id_rol FROM roles WHERE nombre = 'Administrador'") as any[];
    const adminRoleId = adminRole.length > 0 ? adminRole[0].id_rol : 'admin-uuid-001';

    // Asignar todos los nuevos permisos al administrador
    await query(`
      INSERT IGNORE INTO role_permissions (role_id, permission_id)
      SELECT ?, p.id 
      FROM permissions p 
      WHERE p.module IN ('users', 'clients') 
      AND p.action IN ('detail', 'view', 'create', 'edit', 'delete')
      AND p.id NOT IN (
          SELECT rp.permission_id 
          FROM role_permissions rp 
          WHERE rp.role_id = ?
      )
    `, [adminRoleId, adminRoleId]);

    // Obtener los permisos agregados para la respuesta
    const newPermissions = await query(`
      SELECT * FROM permissions 
      WHERE (module = 'users' AND action = 'detail') 
      OR module = 'clients'
      ORDER BY module, action
    `) as any[];

    return res.status(200).json({
      success: true,
      message: 'Permisos agregados correctamente',
      data: {
        permissionsAdded: newPermissions.length,
        permissions: newPermissions
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor al agregar permisos'
    });
  }
}

export default withAuth(handler);
