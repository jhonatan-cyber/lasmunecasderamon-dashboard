import { NextApiRequest, NextApiResponse } from 'next';
import { sendPushByRole } from '@/lib/pushNotifications';
import { sendNotificationToAll } from '../sse';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    // @ts-ignore
    const user = req.user;

    if (req.method === 'GET') {
        try {
            // Obtener solicitudes pendientes (estado 0)
            const solicitudes = await query(`
                SELECT sa.*, 
                       u.nick as anfitriona_nick,
                       CONCAT(u.nombre, ' ', u.apellido) as anfitriona_nombre,
                       h.nombre as habitacion_nombre
                FROM solicitudes_atencion sa
                JOIN usuarios u ON sa.anfitriona_id = u.id_usuario
                LEFT JOIN habitaciones h ON sa.habitacion_id = h.id_habitacion
                WHERE sa.estado = 0
                ORDER BY sa.fecha_crea DESC
            `);
            return res.status(200).json({ success: true, data: solicitudes });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    if (req.method === 'POST') {
        const { servicioId, roomName, roomId, type, message } = req.body;

        // Validar campos según el tipo de llamada
        // Si viene desde "Servicios", trae servicioId y roomName.
        // Si viene desde el Botón General, puede traer solo el tipo.

        try {
            const anfitrionaId = user.id;

            // Obtener el nick de la anfitriona
            const userRes = await query('SELECT nick FROM usuarios WHERE id_usuario = ?', [anfitrionaId]) as any[];
            const anfitrionaNick = userRes.length > 0 ? userRes[0].nick : user.username;

            // Intentar buscar roomId si no viene pero roomName sí
            let hId = roomId || null;
            let finalRoomName = roomName || null;

            if (!hId && roomName) {
                const roomRes = await query('SELECT id_habitacion FROM habitaciones WHERE nombre = ?', [roomName]) as any[];
                if (roomRes.length > 0) hId = roomRes[0].id_habitacion;
            }

            // Si aún no tenemos habitación, buscar si la anfitriona tiene un servicio activo
            if (!hId) {
                const activeService = await query(`
                    SELECT s.id_servicio, s.habitacion_id, h.nombre as habitacion_nombre
                    FROM servicios s
                    JOIN detalle_servicios ds ON s.id_servicio = ds.servicio_id
                    JOIN habitaciones h ON s.habitacion_id = h.id_habitacion
                    WHERE ds.usuario_id = ? AND s.estado = 2
                    LIMIT 1
                `, [anfitrionaId]) as any[];

                if (activeService.length > 0) {
                    hId = activeService[0].habitacion_id;
                    finalRoomName = activeService[0].habitacion_nombre;
                }
            }

            const insertResult = await query(
                `INSERT INTO solicitudes_atencion (anfitriona_id, habitacion_id, servicio_id, tipo, mensaje, estado) 
                 VALUES (?, ?, ?, ?, ?, 0)`,
                [anfitrionaId, hId, servicioId || null, type || 'Asistencia General', message || null]
            ) as any;

            const idSolicitud = insertResult.insertId;

            const title = '⚠️ LLAMADO STAFF';
            const body = `[${anfitrionaNick}] ${finalRoomName ? `en Hab. ${finalRoomName} ` : ''}solicita: ${type}${message ? ` (${message})` : ''}`;

            // Notificar a Cajeros y Garzones por Push
            await sendPushByRole('garzon', title, body, {
                type: 'staff_call',
                idSolicitud,
                roomName: finalRoomName || 'N/A',
                assistanceType: type,
                anfitrionaNick
            });
            await sendPushByRole('cajero', title, body, {
                type: 'staff_call',
                idSolicitud,
                roomName: finalRoomName || 'N/A',
                assistanceType: type,
                anfitrionaNick
            });
            await sendPushByRole('administrador', title, body, {
                type: 'staff_call',
                idSolicitud,
                roomName: finalRoomName || 'N/A',
                assistanceType: type,
                anfitrionaNick
            });

            // Notificar por SSE para UI en tiempo real
            sendNotificationToAll('staff_call', {
                id: idSolicitud,
                anfitriona_id: anfitrionaId,
                anfitriona_nombre: user.username,
                anfitriona_nick: anfitrionaNick,
                servicioId,
                roomName: finalRoomName || 'N/A',
                assistanceType: type,
                message,
                timestamp: new Date().toISOString()
            });

            return res.status(201).json({ success: true, id: idSolicitud });
        } catch (error: any) {
            console.error('[ASSISTANCE API] Error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    return res.status(405).json({ message: 'Method not allowed' });
}

export default withAuth(handler);
