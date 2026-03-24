/* eslint-disable @typescript-eslint/no-explicit-any */
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
    // Primero, mostrar todos los roles existentes
    const allRoles = await query('SELECT * FROM roles') as any[];
    
    // Buscar un usuario con rol Cajero (case insensitive)
    const users = await query(
      `SELECT u.id_usuario, u.nombre, u.rol_id, r.nombre as rol_nombre 
       FROM usuarios u 
       JOIN roles r ON u.rol_id = r.id_rol 
       WHERE LOWER(r.nombre) = 'cajero' 
       LIMIT 1`
    ) as any[];

    if (users.length === 0) {
      return res.status(200).json({ error: 'No hay usuarios con rol Cajero' });
    }

    const cajeroUser = users[0];
    const roleId = cajeroUser.rol_id;

    // Obtener permisos del rol (exactamente como lo hace /api/users/[id]/permissions.ts)
    const permissions = await query(
      `SELECT 
        p.id,
        p.name,
        p.description,
        p.module,
        p.action
      FROM permissions p
      INNER JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = ? AND p.deleted_at IS NULL
      ORDER BY p.module, p.action`,
      [roleId]
    ) as any[];

    // Buscar específicamente el permiso clients.view
    const clientsViewPerm = permissions.find(
      (p: any) => p.module === 'clients' && p.action === 'view'
    );

    // Listar todos los módulos únicos
    const uniqueModules = [...new Set(permissions.map((p: any) => p.module))];

    // Verificar permisos específicos que usa el middleware
    const middlewareChecks = {
      'orders.view': permissions.some((p: any) => p.module === 'orders' && p.action === 'view'),
      'sales.view': permissions.some((p: any) => p.module === 'sales' && p.action === 'view'),
      'cash_register.view': permissions.some((p: any) => p.module === 'cash_register' && p.action === 'view'),
      'clients.view': permissions.some((p: any) => p.module === 'clients' && p.action === 'view'),
      'products.view': permissions.some((p: any) => p.module === 'products' && p.action === 'view'),
      'categories.view': permissions.some((p: any) => p.module === 'categories' && p.action === 'view'),
      'tips.view': permissions.some((p: any) => p.module === 'tips' && p.action === 'view'),
      'returns.view': permissions.some((p: any) => p.module === 'returns' && p.action === 'view'),
      'accounts.view': permissions.some((p: any) => p.module === 'accounts' && p.action === 'view'),
      'rooms.view': permissions.some((p: any) => p.module === 'rooms' && p.action === 'view'),
      'private_rooms.view': permissions.some((p: any) => p.module === 'private_rooms' && p.action === 'view'),
      'advances.view': permissions.some((p: any) => p.module === 'advances' && p.action === 'view'),
    };

    return res.status(200).json({
      success: true,
      allRoles: allRoles.map((r: any) => ({ id: r.id_rol, nombre: r.nombre })),
      user: {
        id: cajeroUser.id_usuario,
        nombre: cajeroUser.nombre,
        rol_id: roleId,
        rol_nombre: cajeroUser.rol_nombre
      },
      totalPermissions: permissions.length,
      uniqueModules,
      hasClientsView: !!clientsViewPerm,
      middlewareChecks,
      clientsViewPermission: clientsViewPerm || null,
      allClientsPermissions: permissions.filter((p: any) => p.module === 'clients'),
      // Mostrar primeros 20 permisos como ejemplo
      samplePermissions: permissions.slice(0, 20).map((p: any) => `${p.module}.${p.action}`)
    });

  } catch (error: any) {
    console.error('[TEST] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

