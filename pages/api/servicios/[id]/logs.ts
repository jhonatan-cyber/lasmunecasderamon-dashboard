import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { withAuth, getCurrentUser } from '@/lib/middleware/auth';

/**
 * GET /api/servicios/[id]/logs
 * Obtiene el historial de eventos (Timeline) de un servicio
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;

    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, message: 'Método no permitido' });
    }

    try {
        const logs = await query(
            `
      SELECT 
        l.id,
        l.tipo_evento,
        l.descripcion,
        l.fecha_crea,
        u.nombre as usuario_nombre,
        u.apellido as usuario_apellido,
        u.nick as usuario_nick
      FROM servicio_logs l
      LEFT JOIN usuarios u ON u.id_usuario = l.usuario_id
      WHERE l.servicio_id = ?
      ORDER BY l.fecha_crea ASC
      `,
            [id]
        );

        return res.status(200).json({
            success: true,
            data: logs
        });
    } catch (error) {
        console.error('[API LOGS] Error:', error);
        return res.status(500).json({ success: false, message: 'Error al obtener logs' });
    }
}

export default withAuth(handler);
