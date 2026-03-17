import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { sendPushNotification, sendPushByRole } from '@/lib/pushNotifications';
import { sendNotificationToAll } from '../notifications/sse';
import { getSystemTimezone } from '@/lib/timezoneService';

const globalForCron = globalThis as typeof globalThis & { __attendanceCheckDate?: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        const now = new Date();
        const tz = getSystemTimezone();
        const localHour = parseInt(
            new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hour12: false }).format(now)
        );
        const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(now); // YYYY-MM-DD

        if (localHour === 21 && globalForCron.__attendanceCheckDate !== todayStr) {
            globalForCron.__attendanceCheckDate = todayStr;
            sendNotificationToAll('check_attendance', {
                roles: ['cajero', 'garzon', 'anfitriona'],
                message: 'Verifica tu asistencia del día'
            });
            console.log(`[cron] check_attendance enviado para ${todayStr}`);
        }
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

        let notifiedCount = 0;

        for (const service of activeServices) {
            const startTime = new Date(service.fecha_crea);
            const durationMinutes = Number(service.tiempo);
            const endTime = new Date(startTime.getTime() + durationMinutes * 60000);
            const remainingMs = endTime.getTime() - now.getTime();
            const remainingMinutes = remainingMs / 60000;

            const usersToNotify = [service.created_by].filter(Boolean);

            if (remainingMinutes <= 5 && remainingMinutes > 4.5 && !service.push_notified_5m) {
                await query('UPDATE servicios SET push_notified_5m = 1 WHERE id_servicio = ?', [service.id_servicio]);

                const title = '5 MINUTOS RESTANTES';
                const body = `El tiempo en la ${service.room_name} está por terminar. (5 min)`;

                if (usersToNotify.length > 0) {
                    await sendPushNotification(usersToNotify, title, body, {
                        type: 'timer_warning_5m',
                        service_id: service.id_servicio,
                        room_name: service.room_name
                    });
                }

                sendNotificationToAll('timer_warning_5m', {
                    service_id: service.id_servicio,
                    room_name: service.room_name
                });

                notifiedCount++;
            }

            // B. ALERTA DE TIEMPO AGOTADO
            if (remainingMinutes <= 0 && !service.push_notified_end) {
                await query('UPDATE servicios SET push_notified_end = 1 WHERE id_servicio = ?', [service.id_servicio]);

                const title = 'TIEMPO AGOTADO';
                const body = `El tiempo contratado para la ${service.room_name} ha finalizado.`;

                if (usersToNotify.length > 0) {
                    await sendPushNotification(usersToNotify, title, body, {
                        type: 'timer_ended',
                        service_id: service.id_servicio,
                        room_name: service.room_name
                    });
                }

                await sendPushByRole('cajero', 'TIEMPO AGOTADO', `Habitación ${service.room_name} lista para finalizar.`, { type: 'timer_ended', service_id: service.id_servicio });
                await sendPushByRole('administrador', 'TIEMPO AGOTADO', `Habitación ${service.room_name} lista para finalizar.`, { type: 'timer_ended', service_id: service.id_servicio });

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
