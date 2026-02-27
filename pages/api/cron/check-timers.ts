import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { sendPushNotification, sendPushByRole } from '@/lib/pushNotifications';
import { sendNotificationToAll } from '../notifications/sse';

/**
 * Endpoint de Cron HEARTBEAT (debe ser llamado cada minuto)
 * Se encarga de:
 * 1. Alertar 5 minutos antes de que acabe un servicio.
 * 2. Alertar cuando el tiempo de un servicio ha terminado por completo.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Si necesitas seguridad (p.ej. una KEY en el header), puedes añadirla aquí

    try {
        // 1. Obtener todos los servicios activos (estado 2)
        const activeServices = (await query(`
            SELECT 
                s.id_servicio,
                s.codigo,
                s.tiempo,
                s.fecha_crea,
                s.created_by,
                s.push_notified_5m,
                s.push_notified_end,
                h.nombre as room_name,
                GROUP_CONCAT(ds.usuario_id) as anfitrionas_ids
            FROM servicios s
            LEFT JOIN habitaciones h ON s.habitacion_id = h.id_habitacion
            LEFT JOIN detalle_servicios ds ON s.id_servicio = ds.servicio_id
            WHERE s.estado = 2 AND s.paused_at IS NULL
            GROUP BY s.id_servicio
        `)) as any[];

        const now = new Date();
        let notifiedCount = 0;

        for (const service of activeServices) {
            const startTime = new Date(service.fecha_crea);
            const durationMinutes = Number(service.tiempo);
            const endTime = new Date(startTime.getTime() + durationMinutes * 60000);
            const remainingMs = endTime.getTime() - now.getTime();
            const remainingMinutes = remainingMs / 60000;

            const anfitrionaIds = service.anfitrionas_ids ?
                service.anfitrionas_ids.split(',').map(Number) : [];
            const usersToNotify = [...new Set([service.created_by, ...anfitrionaIds])].filter(Boolean);

            // A. ALERTA DE 5 MINUTOS (entre 4.5 y 6 minutos restantes)
            if (remainingMinutes <= 6 && remainingMinutes > 4.5 && !service.push_notified_5m) {

                // Marcar como notificado PRIMERO para evitar duplicados en concurrencia
                await query('UPDATE servicios SET push_notified_5m = 1 WHERE id_servicio = ?', [service.id_servicio]);

                const title = '⚠️ 5 MINUTOS RESTANTES';
                const body = `El tiempo en la ${service.room_name} está por terminar. (5 min)`;

                if (usersToNotify.length > 0) {
                    await sendPushNotification(usersToNotify, title, body, {
                        type: 'timer_warning',
                        service_id: service.id_servicio,
                        room_name: service.room_name
                    });
                }

                // También notificar por SSE para actualizar UI
                sendNotificationToAll('timer_warning_5m', {
                    service_id: service.id_servicio,
                    room_name: service.room_name
                });

                notifiedCount++;
            }

            // B. ALERTA DE TIEMPO AGOTADO (<= 0 minutos)
            if (remainingMinutes <= 0 && !service.push_notified_end) {

                await query('UPDATE servicios SET push_notified_end = 1 WHERE id_servicio = ?', [service.id_servicio]);

                const title = '⌛ TIEMPO AGOTADO';
                const body = `El tiempo contratado para la ${service.room_name} ha finalizado.`;

                // Notificar a los involucrados
                if (usersToNotify.length > 0) {
                    await sendPushNotification(usersToNotify, title, body, {
                        type: 'timer_ended',
                        service_id: service.id_servicio,
                        room_name: service.room_name
                    });
                }

                // Notificar a Cajeros y Admins para que procedan al pago/finalización
                await sendPushByRole('cajero', '⌛ TIEMPO AGOTADO', `Habitación ${service.room_name} lista para finalizar.`, { type: 'timer_ended', service_id: service.id_servicio });
                await sendPushByRole('administrador', '⌛ TIEMPO AGOTADO', `Habitación ${service.room_name} lista para finalizar.`, { type: 'timer_ended', service_id: service.id_servicio });

                // Notificar por SSE
                sendNotificationToAll('timer_ended_event', {
                    service_id: service.id_servicio,
                    room_name: service.room_name
                });

                notifiedCount++;
            }
        }

        return res.status(200).json({
            success: true,
            message: `Heartbeat procesado. Notificaciones enviadas: ${notifiedCount}`,
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {

        return res.status(500).json({
            success: false,
            message: 'Error procesando cron de timers',
            error: error.message
        });
    }
}
