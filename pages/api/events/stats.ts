import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, getCurrentUser } from '@/lib/middleware/auth';
import { query } from '@/lib/db';

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, message: 'Método no permitido' });
    }

    try {
        const userData = getCurrentUser(req);
        if (!userData) {
            return res.status(401).json({ success: false, message: 'No autorizado' });
        }

        const userId = userData.id;

        const weeklyIncome = await query(`
      SELECT DATE(date) as day, SUM(amount) as total
      FROM (
        /* Comisiones de servicios */
        SELECT S.fecha_crea as date, COALESCE(DC.comision, 0) as amount
        FROM servicios S
        INNER JOIN detalle_servicios DS ON DS.servicio_id = S.id_servicio
        LEFT JOIN comisiones C ON C.servicio_id = S.id_servicio
        LEFT JOIN detalle_comisiones DC ON DC.comision_id = C.id_comision AND DC.usuario_id = DS.usuario_id
        WHERE DS.usuario_id = ? AND S.fecha_crea >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        
        UNION ALL
        
        /* Comisiones de ventas */
        SELECT DC.fecha_crea as date, DC.comision as amount
        FROM detalle_comisiones DC
        INNER JOIN comisiones C ON C.id_comision = DC.comision_id
        WHERE DC.usuario_id = ? AND C.venta_id IS NOT NULL AND DC.fecha_crea >= DATE_SUB(NOW(), INTERVAL 7 DAY)

        UNION ALL

        /* Propinas */
        SELECT DP.fecha_crea as date, DP.monto as amount
        FROM detalle_propinas DP
        WHERE DP.usuario_id = ? AND DP.fecha_crea >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      ) as combined
      GROUP BY DATE(date)
      ORDER BY DATE(date) ASC
    `, [userId, userId, userId]);

        const totalServices = await query(`
      SELECT COUNT(*) as count FROM detalle_servicios WHERE usuario_id = ?
    `, [userId]) as any;

        const totalComission = await query(`
      SELECT SUM(comision) as total FROM detalle_comisiones WHERE usuario_id = ?
    `, [userId]) as any;

        const totalTips = await query(`
      SELECT SUM(monto) as total FROM detalle_propinas WHERE usuario_id = ?
    `, [userId]) as any;

        const badges = [];
        const svcCount = totalServices[0]?.count || 0;
        const totalEarnings = (totalComission[0]?.total || 0) + (totalTips[0]?.total || 0);

        if (svcCount >= 10) badges.push({ id: 'pro', icon: '🏆', title: 'Top 10 Servicios', description: '¡Has completado más de 10 servicios!' });
        if (totalEarnings >= 100000) badges.push({ id: 'gold', icon: '💰', title: 'Experta en Ventas', description: 'Más de $100,000 acumulados' });
        if (svcCount >= 50) badges.push({ id: 'legend', icon: '⭐', title: 'Leyenda', description: 'Más de 50 servicios' });

        return res.status(200).json({
            success: true,
            data: {
                weeklyIncome,
                badges,
                svcCount,
                totalEarnings
            }
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
}

export default withAuth(handler);
