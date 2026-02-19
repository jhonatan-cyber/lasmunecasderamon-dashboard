import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, getCurrentUser } from '@/lib/middleware/auth';
import { query } from '@/lib/db';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método no permitido' });
  }

  try {
    const userData = getCurrentUser(req);
    if (!userData) {
      return res.status(401).json({ success: false, message: 'No autorizado' });
    }

    const userId = userData.id;

    // Obtener valor rol del usuario
    const userResult = await query(
      'SELECT rol_id FROM usuarios WHERE id_usuario = ?',
      [userId]
    ) as any[];

    if (userResult.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    const roleId = userResult[0].rol_id;

    // Obtener permisos del rol (siempre frescos de la BD)
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

    return res.status(200).json({
      success: true,
      data: permissions,
      message: `Permisos recargados para el usuario. Total: ${permissions.length}`
    });
  } catch (error) {
    console.error('Error recargando permisos:', error);
    return res.status(500).json({ success: false, message: 'Error al recargar permisos' });
  }
}

export default withAuth(handler);
