/**
 * Edición de cuentas — caso de uso del módulo Operación.
 *
 * Mismo comportamiento que `CuentaQueries.updateCuenta`, en una sola unidad
 * con `ContextoOperacion`: detalles y usuarios, extensión de tiempo y cambio
 * de habitación, con la habitación ocupada o liberada por su propietario y
 * los avisos después del commit. La lógica pura de historial se reusa de
 * `lib/repositories/cuenta/CuentaRoomHistory` sin duplicar.
 */
import { enUnaUnidad, type ContextoOperacion } from '@/lib/transaccion/contrato';
import { ejecutarEfectosConfirmados } from '@/lib/transaccion/efectos';
import { getNowInBusinessTimezone, parseBusinessDate } from '@/lib/business/timezoneService';
import { sendNotificationToAll } from '@/lib/api/sseService';
import {
  parseRoomHistory,
  getRemainingMinutes,
  ensureOpenHistorySegment,
  closeOpenHistorySegment,
  appendHistorySegment,
  stringifyRoomHistory
} from '@/lib/repositories/cuenta/CuentaRoomHistory';
import {
  acumularTotalesCuenta,
  agregarDetallesCuenta,
  reemplazarUsuariosCuenta,
  leerCuentaParaTiempo,
  leerCuentaParaCambio,
  marcarEstadoCuenta,
  actualizarTiempoCuenta,
  actualizarHabitacionCuenta,
  leerHabitacionParaCuenta,
  leerNombreHabitacion,
  leerNombreClienteCuenta,
  type DetalleCuentaNuevo
} from './repositorio';
import {
  liberarHabitacionPorAnulacion,
  ocuparHabitacionSiCorresponde
} from '../facturacion/repositorio';

type Tarea = () => void | Promise<void>;

export interface EntradaActualizacionCuenta {
  estado?: number;
  detalles?: DetalleCuentaNuevo[];
  usuarios?: string[];
  extraTiempo?: number;
  habitacion_id?: string | null;
  tiempo?: number;
}

export async function actualizarCuentaEnUnidad(
  id: string,
  body: EntradaActualizacionCuenta,
  createdBy: string,
  contexto: ContextoOperacion,
  aplazar: (tarea: Tarea) => void
): Promise<void> {
  const bizNow = getNowInBusinessTimezone();
  const nowObj = parseBusinessDate(bizNow);

  if (body.estado !== undefined) {
    await marcarEstadoCuenta(id, body.estado, contexto);
  }
  if (body.detalles?.length) {
    const nuevoSubTotal = body.detalles.reduce((acc, d) => acc + d.sub_total, 0);
    const nuevaComision = body.detalles.reduce((acc, d) => acc + d.comision, 0);
    await acumularTotalesCuenta(id, nuevoSubTotal, nuevaComision, bizNow, contexto);
    await agregarDetallesCuenta(id, body.detalles, body.usuarios, createdBy, bizNow, contexto);
  }
  if ((body.usuarios ?? []).length) {
    await reemplazarUsuariosCuenta(id, body.usuarios ?? [], bizNow, contexto);
  }

  if ((body.extraTiempo ?? 0) > 0) {
    const c = await leerCuentaParaTiempo(id, contexto);
    if (c) {
      const roomNombre = c.habitacion_id
        ? (await leerNombreHabitacion(c.habitacion_id, contexto)) || 'Sin habitacion'
        : 'Sin habitacion';
      const timing = getRemainingMinutes(c as never, nowObj);
      let history = parseRoomHistory(c.habitaciones_historial);
      history = ensureOpenHistorySegment(history, c as never, roomNombre);

      const addedMinutes = Number(body.extraTiempo ?? 0);
      const totalAssigned = Number(c.tiempo || 0) + addedMinutes;
      const currentRoomId = String(c.habitacion_id || '');
      const openIndex = [...history]
        .reverse()
        .findIndex(item => item.endedAt === null && String(item.roomId) === currentRoomId);
      const hasOpenSameRoom = openIndex !== -1;

      if (timing.isActive && hasOpenSameRoom) {
        const realIndex = history.length - 1 - openIndex;
        history[realIndex] = {
          ...history[realIndex],
          assignedMinutes: Number(history[realIndex].assignedMinutes || 0) + addedMinutes
        };
      } else {
        history = closeOpenHistorySegment(
          history,
          bizNow,
          timing.elapsedMinutes,
          !timing.isActive,
          timing.isActive ? 'changed_room' : 'expired'
        );
        history = appendHistorySegment(history, currentRoomId, roomNombre, bizNow, addedMinutes);
      }

      const nuevoTiempo = (timing.isActive ? timing.remainingMinutes : 0) + addedMinutes;
      await actualizarTiempoCuenta(
        id,
        {
          tiempo: totalAssigned,
          tiempo_actual: nuevoTiempo,
          tiempo_inicio_actual: bizNow,
          habitaciones_historial: stringifyRoomHistory(history),
          fecha_mod: bizNow
        },
        contexto
      );
      if (c.habitacion_id) {
        const habitacion = await leerHabitacionParaCuenta(c.habitacion_id, contexto);
        await ocuparHabitacionSiCorresponde(
          c.habitacion_id,
          Number(habitacion?.precio || 0) > 0 || Number(habitacion?.tiempo || 0) > 0,
          contexto
        );
      }

      const clienteNombre = (await leerNombreClienteCuenta(id, contexto)) || 'Cliente';
      const codigo = (c as { codigo?: string }).codigo;
      aplazar(() => {
        sendNotificationToAll(timing.isActive ? 'timer_updated' : 'timer_started', {
          servicioId: id,
          roomId: c.habitacion_id,
          roomName: roomNombre,
          duration: nuevoTiempo,
          startTime: bizNow,
          codigo,
          clienteNombre,
          tipoTransaccion: 'cuenta',
          status: 1
        });
      });
    }
  }

  if (body.habitacion_id && (body.tiempo ?? 0) >= 0) {
    const room = await leerHabitacionParaCuenta(body.habitacion_id, contexto);
    const c = await leerCuentaParaCambio(id, contexto);
    if (c && room) {
      const clienteNombre = (await leerNombreClienteCuenta(id, contexto)) || 'Cliente';
      const previousRoomId = c.habitacion_id || null;
      const sameRoom = previousRoomId && String(previousRoomId) === String(body.habitacion_id);
      const timing = getRemainingMinutes(c as never, nowObj);
      const nuevoTiempo =
        (timing.isActive ? timing.remainingMinutes : 0) + Number(body.tiempo || 0);
      const totalAssigned = Number(c.tiempo || 0) + Number(body.tiempo || 0);
      let history = parseRoomHistory(c.habitaciones_historial);
      if (previousRoomId) {
        const previousNombre =
          (await leerNombreHabitacion(previousRoomId, contexto)) || 'Sin habitacion';
        history = ensureOpenHistorySegment(history, c as never, previousNombre);
        history = closeOpenHistorySegment(
          history,
          bizNow,
          timing.elapsedMinutes,
          !timing.isActive,
          sameRoom
            ? timing.isActive
              ? 'manual'
              : 'expired'
            : timing.isActive
              ? 'changed_room'
              : 'expired'
        );
      }
      history = appendHistorySegment(
        history,
        String(body.habitacion_id),
        room.nombre || '',
        bizNow,
        nuevoTiempo,
        timing.isActive && Boolean(previousRoomId)
      );

      await actualizarHabitacionCuenta(
        id,
        {
          habitacion_id: body.habitacion_id,
          tiempo: totalAssigned,
          tiempo_actual: nuevoTiempo,
          tiempo_inicio_actual: bizNow,
          habitaciones_historial: stringifyRoomHistory(history),
          fecha_mod: bizNow
        },
        contexto
      );

      const tieneConfig =
        Number(room.precio || 0) > 0 ||
        Number(room.tiempo || 0) > 0 ||
        Number(room.comision_anfitriona || 0) > 0;
      await ocuparHabitacionSiCorresponde(body.habitacion_id, tieneConfig, contexto);

      if (previousRoomId && !sameRoom) {
        await liberarHabitacionPorAnulacion(previousRoomId, contexto);
        aplazar(() => {
          sendNotificationToAll('room_available', { roomId: previousRoomId });
        });
      }

      if ((body.tiempo ?? 0) > 0) {
        aplazar(() => {
          sendNotificationToAll('timer_started', {
            servicioId: id,
            roomId: body.habitacion_id,
            roomName: room.nombre || '',
            duration: nuevoTiempo,
            startTime: bizNow,
            codigo: c.codigo || '',
            clienteNombre,
            tipoTransaccion: 'cuenta',
            status: 1
          });
        });
        aplazar(() => {
          sendNotificationToAll('timers_updated', { timestamp: bizNow });
        });
      }
    }
  }
}

export async function actualizarCuenta(
  id: string,
  body: EntradaActualizacionCuenta,
  createdBy: string
): Promise<string> {
  const tareas: Tarea[] = [];
  const aplazar = (tarea: Tarea) => tareas.push(tarea);
  await enUnaUnidad(unidad =>
    unidad.ejecutar(contexto => actualizarCuentaEnUnidad(id, body, createdBy, contexto, aplazar))
  );
  await ejecutarEfectosConfirmados(tareas);
  return id;
}
