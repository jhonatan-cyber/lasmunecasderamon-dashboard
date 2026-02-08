import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: `Método ${req.method} no permitido`
    });
  }

  const { userId, module, action } = req.body;

  if (!userId || !module || !action) {
    return res.status(400).json({
      success: false,
      message: 'userId, module y action son requeridos'
    });
  }

  try {
    // Obtener el rol del usuario
    const userResult = (await query(
      `
      SELECT rol_id FROM usuarios WHERE id_usuario = ?
    `,
      [userId]
    )) as any[];

    if (!userResult || userResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const roleId = userResult[0].rol_id;

    if (!roleId) {
      // Usuario sin rol asignado
      return res.status(200).json({
        success: true,
        hasPermission: false
      });
    }

    // Verificar si el usuario es administrador
    const roleResult = (await query(
      `
      SELECT nombre FROM roles WHERE id_rol = ?
    `,
      [roleId]
    )) as any[];

    if (roleResult.length > 0 && roleResult[0].nombre.toLowerCase() === 'administrador') {
      return res.status(200).json({
        success: true,
        hasPermission: true
      });
    }

    // Verificar si tiene el permiso específico
    const permissionResult = (await query(
      `
      SELECT COUNT(*) as count
      FROM role_permissions rp
      INNER JOIN permissions p ON rp.permission_id = p.id
      WHERE rp.role_id = ? AND p.module = ? AND p.action = ? AND p.deleted_at IS NULL
    `,
      [roleId, module, action]
    )) as any[];

    const hasPermission = permissionResult[0].count > 0;

    return res.status(200).json({
      success: true,
      hasPermission
    });
  } catch (error) {
    console.error('Error checking permission:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al verificar el permiso'
    });
  }
}
