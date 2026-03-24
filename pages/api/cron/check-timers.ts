/* eslint-disable */
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
        const allActive = (await query(`
            SELECT 
                s.id_servicio as id, s.codigo, s.tiempo, s.fecha_crea, s.created_by, 
                s.push_notified_5m, s.push_notified_end, s.habitacion_id, h.nombre as room_name,
                'servicio' as type
            FROM servicios s
            LEFT JOIN habitaciones h ON s.habitacion_id = h.id_habitacion
            WHERE s.estado = 2 AND s.paused_at IS NULL AND s.tiempo > 0
            
            UNION ALL
            
            SELECT 
                v.id_venta as id, v.codigo, v.tiempo, v.fecha_crea, v.created_by,
                v.push_notified_5m, v.push_notified_end, v.habitacion_id, h.nombre as room_name,
                'venta' as type
            FROM ventas v
            LEFT JOIN habitaciones h ON v.habitacion_id = h.id_habitacion
            WHERE v.estado = 2 AND v.paused_at IS NULL AND v.tiempo > 0

            UNION ALL

            SELECT 
                c.id_cuenta as id, c.codigo, c.tiempo, c.fecha_crea, c.created_by,
                c.push_notified_5m, c.push_notified_end, c.habitacion_id, h.nombre as room_name,
                'cuenta' as type
            FROM cuentas c
            LEFT JOIN habitaciones h ON c.habitacion_id = h.id_habitacion
            WHERE c.estado = 1 AND c.tiempo > 0
        `)) as any[];

        let notifiedCount = 0;

        for (const item of allActive) {
            const startTime = new Date(item.fecha_crea);
            const durationMinutes = Number(item.tiempo);
            const endTime = new Date(startTime.getTime() + durationMinutes * 60000);
            const remainingMs = endTime.getTime() - now.getTime();
            const remainingMinutes = remainingMs / 60000;

            const usersToNotify = [item.created_by].filter(Boolean);
            const tableMap: Record<string, string> = {
                'servicio': 'servicios',
                'venta': 'ventas',
                'cuenta': 'cuentas'
            };
            const idFieldMap: Record<string, string> = {
                'servicio': 'id_servicio',
                'venta': 'id_venta',
                'cuenta': 'id_cuenta'
            };
            const tableName = tableMap[item.type];
            const idField = idFieldMap[item.type];

            // A. ALERTA DE 5 MINUTOS
            if (remainingMinutes <= 5 && remainingMinutes > 4.5 && !item.push_notified_5m) {
                await query(`UPDATE ${tableName} SET push_notified_5m = 1 WHERE ${idField} = ?`, [item.id]);

                const title = '5 MINUTOS RESTANTES';
                const body = `El tiempo en la ${item.room_name || 'habitación'} (${item.type}) está por terminar. (5 min)`;

                if (usersToNotify.length > 0) {
                    await sendPushNotification(usersToNotify, title, body, {
                        type: 'timer_warning_5m',
                        id: item.id,
                        transaction_type: item.type,
                        room_name: item.room_name
                    });
                }

                sendNotificationToAll('timer_warning_5m', {
                    id: item.id,
                    type: item.type,
                    room_name: item.room_name
                });

                notifiedCount++;
            }

            // B. ALERTA DE TIEMPO AGOTADO Y LIBERACIÓN AUTOMÁTICA
            if (remainingMinutes <= 0 && !item.push_notified_end) {
                await query(`UPDATE ${tableName} SET push_notified_end = 1 WHERE ${idField} = ?`, [item.id]);

                const title = 'TIEMPO AGOTADO';
                const body = `El tiempo para la ${item.room_name || 'habitación'} (${item.type}) ha finalizado.`;

                if (usersToNotify.length > 0) {
                    await sendPushNotification(usersToNotify, title, body, {
                        type: 'timer_ended',
                        id: item.id,
                        transaction_type: item.type,
                        room_name: item.room_name
                    });
                }

                await sendPushByRole('cajero', title, body, { type: 'timer_ended', id: item.id, transaction_type: item.type });
                await sendPushByRole('administrador', title, body, { type: 'timer_ended', id: item.id, transaction_type: item.type });

                sendNotificationToAll('timer_ended_event', {
                    id: item.id,
                    type: item.type,
                    room_name: item.room_name
                });

                // LIBERACIÓN AUTOMÁTICA DE HABITACIÓN
                if (item.habitacion_id) {
                    console.log(`[cron] Liberando habitación ${item.habitacion_id} por tiempo agotado en ${item.type} ${item.id}`);
                    await query('UPDATE habitaciones SET estado = 1 WHERE id_habitacion = ?', [item.habitacion_id]);
                }

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

