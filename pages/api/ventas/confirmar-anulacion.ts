import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { token, action } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Token requerido' });
    }

    // Buscar la solicitud por token
    const solicitudSql = `
      SELECT 
        sa.*,
        v.codigo,
        v.total,
        CONCAT(c.nombre, " ", c.apellido) as cliente_nombre
      FROM solicitudes_anulacion sa
      LEFT JOIN ventas v ON sa.venta_id = v.id_venta
      LEFT JOIN clientes c ON v.cliente_id = c.id_cliente
      WHERE sa.token = ? AND sa.estado = 'pendiente'
    `;

    const solicitudResult = await query(solicitudSql, [token]);
    
    // Redirigir a la página de confirmación (siempre, incluso si no encuentra la solicitud)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const confirmUrl = `${baseUrl}/confirmar-anulacion?token=${token}`;
    
    return res.redirect(302, confirmUrl);
    
  } catch (error) {
    
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
