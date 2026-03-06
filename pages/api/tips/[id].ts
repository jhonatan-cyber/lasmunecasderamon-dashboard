import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { method } = req;
    const { id } = req.query;

    if (method !== 'GET') {
        return res.status(405).json({
            success: false,
            message: `Método ${method} no permitido`
        });
    }

    try {
        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'ID de propina es requerido'
            });
        }

        // Obtener información de la propina y conteo de participantes
        const tipInfo: any = await query(`
      SELECT 
        P.id_propina,
        P.venta_id,
        P.propina AS monto_total,
        P.fecha_crea,
        (SELECT COUNT(*) FROM detalle_propinas WHERE propina_id = P.id_propina) AS conteo_usuarios
      FROM propinas P
      WHERE P.id_propina = ?
    `, [id]);

        if (!tipInfo || tipInfo.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Propina no encontrada'
            });
        }

        return res.status(200).json({
            success: true,
            data: tipInfo[0]
        });

    } catch (error) {
        console.error('Error al obtener detalle de propina:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener detalle de propina',
            error: error instanceof Error ? error.message : String(error)
        });
    }
}

export default withAuth(handler);
