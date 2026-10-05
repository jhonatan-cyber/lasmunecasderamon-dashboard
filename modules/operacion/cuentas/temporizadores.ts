/**
 * Temporizador y solicitud de anulación de cuentas — casos de uso del módulo
 * Operación.
 *
 * Mismo comportamiento que `CuentaQueries.stopTimer` y `requestAnulacion`,
 * en una sola unidad con `ContextoOperacion`: la habitación se libera vía el
 * propietario (`liberarHabitacionPorAnulacion`) y los avisos salen después
 * del commit. La lógica pura de historial vive en
 * `lib/repositories/cuenta/CuentaRoomHistory` y se reusa sin duplicar.
 */
import { enUnaUnidad, type ContextoOperacion } from '@/lib/transaccion/contrato';
import { ejecutarEfectosConfirmados } from '@/lib/transaccion/efectos';
import { getNowInBusinessTimezone, parseBusinessDate } from '@/lib/business/timezoneService';
import { sendNotificationToAll } from '@/lib/api/sseService';
import { NotFoundError, BusinessError } from '@/lib/errors/errors';
import {
  parseRoomHistory,
  getRemainingMinutes,
  ensureOpenHistorySegment,
  closeOpenHistorySegment,
  stringifyRoomHistory
} from '@/modules/operacion/cuentas/historial';
import {
  leerCuentaParaTemporizador,
  finalizarSesionHabitacion,
  detenerSinHabitacion,
  marcarEstadoCuenta,
  actualizarTemporizadorCancelado,
  crearSolicitudAnulacionCuenta
} from './repositorio';
import { liberarHabitacionPorAnulacion } from '../facturacion/servicio';

type Tarea = () => void | Promise<void>;

export async function detenerTemporizadorEnUnidad(
  cuentaId: string,
  contexto: ContextoOperacion,
  aplazar: (tarea: Tarea) => void
): Promise<void> {
  const now = getNowInBusinessTimezone();
  const cuenta = await leerCuentaParaTemporizador(cuentaId, contexto);
  if (!cuenta) throw new NotFoundError('Cuenta', cuentaId);

  if (cuenta.habitacion_id) {
    await finalizarSesionHabitacion(cuentaId, now, contexto);
    await liberarHabitacionPorAnulacion(String(cuenta.habitacion_id), contexto);
    aplazar(() => {
      sendNotificationToAll('room_available', { roomId: cuenta.habitacion_id });
    });
  } else {
    await detenerSinHabitacion(cuentaId, now, contexto);
  }

  aplazar(() => {
    sendNotificationToAll('timer_stopped', {
      servicioId: cuentaId,
      status: 1,
      tipoTransaccion: 'cuenta'
    });
  });
  aplazar(() => {
    sendNotificationToAll('timers_updated', { timestamp: now });
  });
}

export async function detenerTemporizadorCuenta(cuentaId: string): Promise<string> {
  const tareas: Tarea[] = [];
  const aplazar = (tarea: Tarea) => tareas.push(tarea);
  await enUnaUnidad(unidad =>
    unidad.ejecutar(contexto => detenerTemporizadorEnUnidad(cuentaId, contexto, aplazar))
  );
  await ejecutarEfectosConfirmados(tareas);
  return cuentaId;
}

export async function solicitarAnulacionCuentaEnUnidad(
  cuentaId: string,
  motivo: string,
  solicitadoPor: string,
  montoSolicitado: number,
  contexto: ContextoOperacion,
  aplazar: (tarea: Tarea) => void
): Promise<string> {
  const now = getNowInBusinessTimezone();
  const monto = Number(montoSolicitado || 0);

  const cuenta = await leerCuentaParaTemporizador(cuentaId, contexto);
  if (!cuenta) throw new NotFoundError('Cuenta', cuentaId);
  if (Number(cuenta.estado) !== 1) {
    throw new BusinessError('La cuenta no se puede solicitar para anulacion', 'CUENTA_NO_ANULABLE');
  }
  if (monto <= 0) {
    throw new BusinessError('El monto solicitado debe ser mayor a 0', 'MONTO_INVALIDO');
  }
  if (monto > Number(cuenta.total || 0)) {
    throw new BusinessError(
      'El monto solicitado no puede ser mayor al total de la cuenta',
      'MONTO_EXCEDE_TOTAL'
    );
  }

  let finalizedTimer = false;
  let roomIdToRelease: string | null = null;

  if (Number(cuenta.tiempo_actual || 0) > 0) {
    const timing = getRemainingMinutes(cuenta as never, parseBusinessDate(now));
    let history = parseRoomHistory(cuenta.habitaciones_historial);
    history = ensureOpenHistorySegment(
      history,
      cuenta as never,
      cuenta.habitacion_numero || 'Sin habitacion'
    );
    history = closeOpenHistorySegment(
      history,
      now,
      timing.elapsedMinutes,
      !timing.isActive,
      'cancelled'
    );

    await actualizarTemporizadorCancelado(cuentaId, stringifyRoomHistory(history), now, contexto);

    if (cuenta.habitacion_id) {
      await liberarHabitacionPorAnulacion(String(cuenta.habitacion_id), contexto);
      roomIdToRelease = String(cuenta.habitacion_id);
    }

    finalizedTimer = true;
  }

  const idAnul = await crearSolicitudAnulacionCuenta(
    cuentaId,
    monto,
    motivo,
    solicitadoPor,
    contexto
  );
  await marcarEstadoCuenta(cuentaId, 2, contexto);

  if (finalizedTimer) {
    if (roomIdToRelease) {
      const roomId = roomIdToRelease;
      aplazar(() => {
        sendNotificationToAll('room_available', { roomId });
      });
    }
    aplazar(() => {
      sendNotificationToAll('timer_stopped', {
        servicioId: cuentaId,
        status: 1,
        tipoTransaccion: 'cuenta'
      });
    });
    aplazar(() => {
      sendNotificationToAll('timers_updated', { timestamp: now });
    });
  }

  return idAnul;
}

export async function solicitarAnulacionCuenta(
  cuentaId: string,
  motivo: string,
  solicitadoPor: string,
  montoSolicitado: number
): Promise<string> {
  const tareas: Tarea[] = [];
  const aplazar = (tarea: Tarea) => tareas.push(tarea);
  const idAnul = await enUnaUnidad(unidad =>
    unidad.ejecutar(contexto =>
      solicitarAnulacionCuentaEnUnidad(
        cuentaId,
        motivo,
        solicitadoPor,
        montoSolicitado,
        contexto,
        aplazar
      )
    )
  );
  await ejecutarEfectosConfirmados(tareas);
  return idAnul;
}
