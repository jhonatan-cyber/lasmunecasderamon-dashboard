import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: `Método ${req.method} no permitido`
    });
  }

  const { id } = req.query;
  const userId = parseInt(id as string);

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: 'ID de usuario requerido'
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
        data: []
      });
    }

    // Obtener los permisos del rol del usuario
    const permissions = (await query(
      `
      SELECT 
        p.id,
        p.name,
        p.description,
        p.module,
        p.action
      FROM permissions p
      INNER JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = ? AND p.deleted_at IS NULL
      ORDER BY p.module, p.action
    `,
      [roleId]
    )) as any[];

    return res.status(200).json({
      success: true,
      data: permissions
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error al obtener los permisos del usuario'
    });
  }
}
