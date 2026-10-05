/**
 * Chequeo de temporizadores — aplicación del módulo Operación.
 *
 * Es el caso de uso que el cron dispara cada minuto: avisa a los 5 minutos
 * restantes, cierra al agotarse el tiempo, libera la habitación y avisa por push y
 * SSE. El SQL vive en `./repositorio`, que es privado del módulo.
 *
 * Los avisos salen después de marcar la fila que los evita repetir, igual que antes:
 * si el push falla, el temporizador ya queda marcado y no se reintenta en bucle.
 * El cierre corre en una sola unidad con `ContextoOperacion`: la habitación se
 * libera por su propietario y la disponibilidad por Identidad.
 */
import { enUnaUnidad, type ContextoOperacion } from '@/lib/transaccion/contrato';
import { ejecutarEfectosConfirmados } from '@/lib/transaccion/efectos';
import { sendPushByRole, sendPushNotification } from '@/modules/comunicaciones';
import { sendNotificationToAll } from '@/lib/api/sseService';
import { actualizarDisponibilidad } from '@/modules/identidad';
import { liberarHabitacionPorAnulacion } from '../facturacion/servicio';
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
      const tareas: Array<() => void | Promise<void>> = [];
      await enUnaUnidad(unidad =>
        unidad.ejecutar(async contexto => {
          await repositorio.marcarAvisoFin(item.type, item.id, contexto);
          await cerrarTemporizadorEnUnidad(item, contexto, tarea => tareas.push(tarea));
        })
      );
      cierres++;
      tareas.push(async () => {
        if (item.created_by)
          await sendPushNotification(
            [item.created_by],
            'TIEMPO AGOTADO',
            `Tiempo finalizado en ${item.room_name || 'habitación'}`,
            { type: 'timer_ended' }
          );
      });
      tareas.push(async () => {
        await sendPushByRole('cajero', 'TIEMPO AGOTADO', `Tiempo finalizado en ${item.room_name}`, {
          type: 'timer_ended'
        });
      });
      tareas.push(() => {
        sendNotificationToAll('timer_ended_event', {
          id: item.id,
          type: item.type,
          room_name: item.room_name
        });
      });
      await ejecutarEfectosConfirmados(tareas);
    }
  }

  return { avisos5m, cierres };
}

/**
 * Cierre de un temporizador vencido en la unidad del llamador: estado final
 * por su propietario, disponibilidad de anfitrionas y liberación de
 * habitación. El aviso a ventas sale después del commit.
 */
export async function cerrarTemporizadorEnUnidad(
  item: TemporizadorActivo,
  contexto: ContextoOperacion,
  aplazar: (tarea: () => void | Promise<void>) => void
): Promise<void> {
  await repositorio.cerrarTemporizador(item.type, item.id, contexto);

  if (item.type === 'servicio') {
    const anfitrionas = await repositorio.obtenerAnfitrionasDeServicio(contexto, item.id);
    const hostessIds = anfitrionas.map(a => a.usuario_id);
    if (hostessIds.length > 0) {
      await actualizarDisponibilidad(hostessIds, contexto, item.id);
    }
  }

  const habitacionId = await repositorio.leerHabitacionTemporizador(item.type, item.id, contexto);
  if (habitacionId) {
    await liberarHabitacionPorAnulacion(
      habitacionId,
      contexto,
      undefined,
      item.type === 'cuenta' ? undefined : item.id
    );
  }

  if (item.type === 'venta' || item.type === 'servicio') {
    aplazar(() => {
      sendNotificationToAll('updateSales', { id: item.id, type: item.type });
    });
  }
}

export type { TemporizadorActivo } from './repositorio';
