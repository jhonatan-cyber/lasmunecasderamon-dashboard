import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { query, withTransaction } from '@/lib/database/db';
import { sendPushNotification, sendPushByRole } from '@/lib/integrations/pushNotifications';
import { sendNotificationToAll } from '@/lib/api/sseService';
import { getSystemTimezone, getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { RoomManager } from '@/lib/services/RoomManager';

export const dynamic = 'force-dynamic';

const globalForCron = globalThis as typeof globalThis & { __attendanceCheckDate?: string };

export const GET = withAppApiWrapper(async () => {
  const bizNow = getNowInBusinessTimezone();
  const now = new Date(bizNow.replace(' ', 'T'));
  const tz = getSystemTimezone();
  const localHour = parseInt(bizNow.substring(11, 13), 10);
  const todayStr = bizNow.substring(0, 10);

  if (localHour === 21 && globalForCron.__attendanceCheckDate !== todayStr) {
    globalForCron.__attendanceCheckDate = todayStr;
    sendNotificationToAll('check_attendance', {
      roles: ['cajero', 'garzon', 'anfitriona'],
      message: 'Verifica tu asistencia del día'
    });
  }

  const allActive = await query<any[]>(`
      SELECT s.id_servicio as id, s.codigo, s.tiempo, s.fecha_crea, s.created_by, s.push_notified_5m, s.push_notified_end, s.habitacion_id, h.nombre as room_name, 'servicio' as type
      FROM servicios s LEFT JOIN habitaciones h ON s.habitacion_id = h.id_habitacion WHERE s.estado = 2 AND s.paused_at IS NULL AND s.tiempo > 0
      UNION ALL
      SELECT v.id_venta as id, v.codigo, v.tiempo, v.fecha_crea, v.created_by, v.push_notified_5m, v.push_notified_end, v.habitacion_id, h.nombre as room_name, 'venta' as type
      FROM ventas v LEFT JOIN habitaciones h ON v.habitacion_id = h.id_habitacion WHERE v.estado = 2 AND v.paused_at IS NULL AND v.tiempo > 0
      UNION ALL
      SELECT c.id_cuenta as id, c.codigo, c.tiempo, c.fecha_crea, c.created_by, c.push_notified_5m, c.push_notified_end, c.habitacion_id, h.nombre as room_name, 'cuenta' as type
      FROM cuentas c LEFT JOIN habitaciones h ON c.habitacion_id = h.id_habitacion WHERE c.estado = 1 AND c.tiempo > 0
    `);

  for (const item of allActive) {
    const startTime = new Date(item.fecha_crea);
    const remainingMin = (startTime.getTime() + item.tiempo * 60000 - now.getTime()) / 60000;
    const table = { servicio: 'servicios', venta: 'ventas', cuenta: 'cuentas' }[
      item.type as 'servicio' | 'venta' | 'cuenta'
    ];
    const idField = { servicio: 'id_servicio', venta: 'id_venta', cuenta: 'id_cuenta' }[
      item.type as 'servicio' | 'venta' | 'cuenta'
    ];

    if (remainingMin <= 5 && remainingMin > 4.5 && !item.push_notified_5m) {
      await query(`UPDATE ${table} SET push_notified_5m = 1 WHERE ${idField} = ?`, [item.id]);
      if (item.created_by)
        sendPushNotification(
          [item.created_by],
          '5 MINUTOS RESTANTES',
          `Tiempo por terminar en ${item.room_name || 'habitación'}`,
          { type: 'timer_warning_5m' }
        );
      sendNotificationToAll('timer_warning_5m', {
        id: item.id,
        type: item.type,
        room_name: item.room_name
      });
    }

    if (remainingMin <= 0 && !item.push_notified_end) {
      await query(`UPDATE ${table} SET push_notified_end = 1 WHERE ${idField} = ?`, [item.id]);
      if (item.created_by)
        sendPushNotification(
          [item.created_by],
          'TIEMPO AGOTADO',
          `Tiempo finalizado en ${item.room_name || 'habitación'}`,
          { type: 'timer_ended' }
        );
      sendPushByRole('cajero', 'TIEMPO AGOTADO', `Tiempo finalizado en ${item.room_name}`, {
        type: 'timer_ended'
      });
      sendNotificationToAll('timer_ended_event', {
        id: item.id,
        type: item.type,
        room_name: item.room_name
      });
      
      // Liberar habitación y anfitrionas
      if (item.habitacion_id) {
        await query('UPDATE habitaciones SET estado = 1 WHERE id_habitacion = ?', [item.habitacion_id]);
        
        // Si es un servicio, liberar las anfitrionas
        if (item.type === 'servicio') {
          await withTransaction(async (trx) => {
            const anfsResult = await trx<any[]>('SELECT usuario_id FROM detalle_servicios WHERE servicio_id = ?', [item.id]);
            const hostessIds = anfsResult.map(a => a.usuario_id);
            if (hostessIds.length > 0) {
              await RoomManager.updateHostessServiceStatus(trx, hostessIds, item.id);
            }
            // Liberar la habitación usando el RoomManager
            await RoomManager.resumeRoomLogic(trx, item.habitacion_id, item.id);
          });
        }
      }
    }
  }

  return NextResponse.json({ success: true, timestamp: bizNow });
});
