import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, getCurrentUser } from '@/lib/middleware/auth';
import { query } from '@/lib/db';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Método no permitido' });
  }

  // IMPORTANTE: Deshabilitar caché para que siempre obtenga datos actualizados
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');

  try {
    // Obtener datos del usuario usando la función helper
    const userData = getCurrentUser(req);

    if (!userData) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado'
      });
    }

    // Obtener información completa del usuario desde la base de datos con rol
    const users = await query(
      `SELECT u.*, r.nombre as rol_nombre 
       FROM usuarios u 
       LEFT JOIN roles r ON u.rol_id = r.id_rol 
       WHERE u.id_usuario = ? AND u.estado IN (1, 2, 3) AND u.fecha_baja IS NULL`,
      [userData.id]
    ) as any[];

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const user = users[0];

    return res.status(200).json({
      success: true,
      user: {
        id: user.id_usuario,
        name: user.nombre || '',
        lastName: user.apellido || '',
        email: user.email,
        role: user.rol_nombre || 'garzon',
        roleId: user.rol_id, // ← AGREGADO: ID del rol para SSE
        status: user.estado,
        foto: user.foto || '',
        nick: user.nick || '',
        run: user.run || '',
        phone: user.telefono || '',
        address: user.direccion || '',
        estado_civil: user.estado_civil || '',
        fecha_crea: user.fecha_crea
      }
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

export default withAuth(handler); 