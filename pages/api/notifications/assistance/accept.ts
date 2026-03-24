/* eslint-disable */
import { NextApiRequest, NextApiResponse } from 'next';
import { sendNotificationToAll } from '../sse';
import { query } from '@/lib/db';
import { getNowInBusinessTimezone } from '@/lib/timezoneService';
import { withAuth } from '@/lib/middleware/auth';
import { sendPushNotification } from '@/lib/pushNotifications';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { id } = req.body;
    // @ts-ignore
    const user = req.user;

    if (!id) {
        return res.status(400).json({ success: false, message: 'ID de solicitud requerido' });
    }

    try {
        const userId = user.id;
        const userName = user.username || 'Personal de Staff';

        const now = getNowInBusinessTimezone();
        // Intento atómico de aceptar la solicitud solo si está pendiente (estado 0)
        const updateResult = await query(
            `UPDATE solicitudes_atencion 
             SET estado = 1, atendido_por = ?, fecha_acepta = ? 
             WHERE id = ? AND estado = 0`,
            [userId, now, id]
        ) as any;

        if (updateResult.affectedRows === 0) {
            // Ya fue aceptada por alguien más o no existe
            const info = await query('SELECT atendido_por FROM solicitudes_atencion WHERE id = ?', [id]) as any[];
            if (info.length === 0) return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });

            return res.status(409).json({
                success: false,
                message: 'Esta solicitud ya fue aceptada por otro compañero.'
            });
        }

        // Notificar por SSE que fue aceptada para que desaparezca de las pantallas de otros
        // y para avisar a la anfitriona
        const solicitudInfo = await query(`
            SELECT sa.anfitriona_id, sa.tipo, h.nombre as habitacion_nombre, u.nick as staff_nick
            FROM solicitudes_atencion sa
            LEFT JOIN habitaciones h ON sa.habitacion_id = h.id_habitacion
            JOIN usuarios u ON ? = u.id_usuario
            WHERE sa.id = ?
        `, [userId, id]) as any[];

        if (solicitudInfo.length > 0) {
            const info = solicitudInfo[0];
            const staffName = info.staff_nick || userName;

            // Notificar por SSE
            sendNotificationToAll('staff_call_accepted', {
                id,
                anfitriona_id: info.anfitriona_id,
                atendido_por: userId,
                atendido_por_nombre: staffName,
                timestamp: now
            });

        }

        return res.status(200).json({ success: true, message: 'Solicitud aceptada con éxito' });
    } catch (error: any) {
        console.error('[ACCEPT ASSISTANCE] Error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
}

export default withAuth(handler);

