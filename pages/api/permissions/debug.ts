/* eslint-disable */
import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const roleName = (req.query.role as string) || 'Cajero';
    const module = (req.query.module as string) || 'clients';

    // 1. Obtener el rol (la tabla usa 'nombre' e 'id_rol')
    const roles = await query('SELECT * FROM roles WHERE nombre = ?', [roleName]) as any[];
    console.log(`[DEBUG] Roles encontrados para "${roleName}":`, roles);

    if (roles.length === 0) {
      return res.status(200).json({ 
        error: `No se encontró el rol "${roleName}"`,
        roles: [] 
      });
    }

    const roleId = roles[0].id_rol;

    // 2. Buscar permisos del módulo especificado
    const modulePermissions = await query(
      'SELECT * FROM permissions WHERE module = ?',
      [module]
    ) as any[];
    console.log(`[DEBUG] Permisos del módulo "${module}":`, modulePermissions);

    // 3. Obtener role_permissions para este rol
    const rolePerms = await query(
      `SELECT rp.*, p.module, p.action 
       FROM role_permissions rp 
       JOIN permissions p ON rp.permission_id = p.id 
       WHERE rp.role_id = ?`,
      [roleId]
    ) as any[];
    console.log(`[DEBUG] Permisos asignados al rol ${roleName}:`, rolePerms);

    // 4. Verificar si clients.view está asignado
    const clientsViewPerm = await query(
      `SELECT p.*, rp.role_id 
       FROM permissions p 
       LEFT JOIN role_permissions rp ON p.id = rp.permission_id AND rp.role_id = ?
       WHERE p.module = ? AND p.action = 'view'`,
      [roleId, module]
    ) as any[];
    console.log(`[DEBUG] Permiso ${module}.view:`, clientsViewPerm);

    // 5. Simular la consulta exacta del middleware
    const middlewareQuery = await query(
      `SELECT p.module, p.action 
       FROM role_permissions rp
       JOIN permissions p ON rp.permission_id = p.id
       WHERE rp.role_id = ? AND p.module = ? AND p.action = ?`,
      [roleId, module, 'view']
    ) as any[];
    console.log(`[DEBUG] Resultado simulación middleware:`, middlewareQuery);

    return res.status(200).json({
      success: true,
      role: roles[0],
      roleId,
      modulePermissionsInDB: modulePermissions,
      allRolePermissions: rolePerms,
      specificPermissionCheck: clientsViewPerm,
      middlewareSimulation: {
        query: `module='${module}' AND action='view' AND role_id=${roleId}`,
        result: middlewareQuery,
        hasPermission: middlewareQuery.length > 0
      },
      summary: {
        totalPermissionsForRole: rolePerms.length,
        hasClientsView: rolePerms.some((p: any) => p.module === 'clients' && p.action === 'view'),
        permissionsForModule: rolePerms.filter((p: any) => p.module === module)
      }
    });

  } catch (error: any) {
    console.error('[DEBUG] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

