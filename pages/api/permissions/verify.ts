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
    const userId = (req.query.userId as string) || 'admin'; // Fallback to 'admin' or similar if needed, but remove parseInt
    const module = (req.query.module as string) || 'clients';
    const action = (req.query.action as string) || 'view';

    // 1. Obtener rol del usuario
    const userResult = await query(
      'SELECT u.id_usuario, u.nombre, u.rol_id, r.nombre as rol_nombre FROM usuarios u JOIN roles r ON u.rol_id = r.id_rol WHERE u.id_usuario = ?',
      [userId]
    ) as any[];

    if (userResult.length === 0) {
      return res.status(200).json({ error: `Usuario ${userId} no encontrado` });
    }

    const user = userResult[0];
    const roleId = user.rol_id;

    // 2. Ejecutar la misma consulta que usa el middleware
    const permissionResult = await query(
      `SELECT COUNT(*) as has_permission 
       FROM role_permissions rp
       INNER JOIN permissions p ON rp.permission_id = p.id
       WHERE rp.role_id = ? AND p.module = ? AND p.action = ? AND p.deleted_at IS NULL`,
      [roleId, module, action]
    ) as any[];

    const hasPermission = permissionResult[0]?.has_permission > 0;

    // 3. Mostrar detalles del permiso si existe
    const permissionDetails = await query(
      `SELECT p.id, p.module, p.action, p.name, rp.role_id
       FROM permissions p
       INNER JOIN role_permissions rp ON rp.permission_id = p.id
       WHERE rp.role_id = ? AND p.module = ? AND p.action = ?`,
      [roleId, module, action]
    ) as any[];

    return res.status(200).json({
      success: true,
      test: {
        userId,
        module,
        action,
        query: `role_id=${roleId}, module='${module}', action='${action}'`
      },
      user: {
        id: user.id_usuario,
        nombre: user.nombre,
        rol_id: roleId,
        rol_nombre: user.rol_nombre
      },
      result: {
        hasPermission,
        permissionDetails: permissionDetails.length > 0 ? permissionDetails[0] : null
      },
      message: hasPermission 
        ? `✅ El usuario ${user.nombre} (${user.rol_nombre}) TIENE permiso ${module}.${action}`
        : `❌ El usuario ${user.nombre} (${user.rol_nombre}) NO TIENE permiso ${module}.${action}`
    });

  } catch (error: any) {
    console.error('[VERIFY] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
