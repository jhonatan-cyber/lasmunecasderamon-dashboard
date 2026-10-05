/**
 * Chequeo de temporizadores — aplicación del módulo Operación.
 *
 * Es el caso de uso que el cron dispara cada minuto: avisa a los 5 minutos
 * restantes, cierra al agotarse el tiempo, libera la habitación y avisa por push y
 * SSE. El SQL vive en `./repositorio`, que es privado del módulo.
 *
 * Los avisos salen después de marcar la fila que los evita repetir, igual que antes:
 * si el push falla, el temporizador ya queda marcado y no se reintenta en bucle.
 */
import { RoomManager } from '@/lib/services/RoomManager';
import { sendPushByRole, sendPushNotification } from '@/lib/integrations/pushNotifications';
import { sendNotificationToAll } from '@/lib/api/sseService';
import type { TemporizadorActivo } from './repositorio';
import * as repositorio from './repositorio';

/** Cantidad de avisos que se procesaron en la pasada; útil en logs y pruebas. */
export interface ResultadoTemporizadores {
  avisos5m: number;
  cierres: number;
}

/**
 * Corre una pasada de avisos y cierres. Devuelve cuántos hizo de cada cosa para que
 * el llamador pueda registrarlo.
 */
export async function revisarTemporizadores(ahora: Date): Promise<ResultadoTemporizadores> {
  const activos = await repositorio.listarTemporizadoresActivos();
  let avisos5m = 0;
  let cierres = 0;

  for (const item of activos) {
    const startTime = new Date(item.fecha_crea);
    const remainingMin = (startTime.getTime() + item.tiempo * 60000 - ahora.getTime()) / 60000;

    if (remainingMin <= 5 && remainingMin > 4.5 && !item.push_notified_5m) {
      await repositorio.marcarAviso5m(item.type, item.id);
      avisos5m++;
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
      await repositorio.marcarAvisoFin(item.type, item.id);
      cierres++;

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

      await repositorio.cerrarTemporizador(item.type, item.id, item.habitacion_id, async trx => {
        if (item.type !== 'servicio') return;
        const anfitrionas = await repositorio.obtenerAnfitrionasDeServicio(trx, item.id);
        const hostessIds = anfitrionas.map(a => a.usuario_id);
        if (hostessIds.length > 0) {
          await RoomManager.updateHostessServiceStatus(trx, hostessIds, item.id);
        }
        await RoomManager.resumeRoomLogic(trx, item.habitacion_id!, item.id);
      });

      if (item.type === 'venta' || item.type === 'servicio') {
        sendNotificationToAll('updateSales', { id: item.id, type: item.type });
      }
    }
  }

  return { avisos5m, cierres };
}

export type { TemporizadorActivo } from './repositorio';
