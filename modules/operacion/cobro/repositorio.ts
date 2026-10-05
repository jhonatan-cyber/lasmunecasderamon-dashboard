import type { ContextoOperacion } from '@/lib/transaccion/contrato';
import { resolverTransaccion } from '@/lib/transaccion/infraestructura';
import { obtenerCajaActiva, registrarMovimientoCobro } from '@/modules/caja';
import { consumirPrepagoCuenta } from '@/modules/clientes';
import { getNowInBusinessTimezone, parseBusinessDate } from '@/lib/business/timezoneService';
import { sendNotificationToAll } from '@/lib/api/sseService';
import { NotFoundError, BusinessError } from '@/lib/errors/errors';
import type { CuentaRow, HabitacionRow } from '@/lib/repositories/types';
import type { CuentaCobrarBody } from '../contracts';
import {
  getRemainingMinutes,
  parseRoomHistory,
  ensureOpenHistorySegment,
  closeOpenHistorySegment,
  stringifyRoomHistory
} from '@/lib/repositories/cuenta/CuentaRoomHistory';
import {
  buildCuentaSalePayload,
  esMetodoPagoVenta,
  type CuentaSaleRow,
  type CuentaSaleDetalleRow,
  type CuentaSalePayload
} from '@/lib/business/cuentaSale';
export async function cerrarCuenta(
  contexto: ContextoOperacion,
  id: string,
  body: CuentaCobrarBody,
  cobradoPor: string,
  onAfterCommit?: (task: () => void | Promise<void>) => void
): Promise<void> {
  const trx = resolverTransaccion(contexto);
  const emitir = onAfterCommit ?? ((tarea: () => void) => tarea());
  const cuenta = await trx<CuentaRow[]>('SELECT * FROM cuentas WHERE id_cuenta = ? FOR UPDATE', [
    id
  ]);
  if (!cuenta.length) throw new NotFoundError('Cuenta', id);
  if (![1, 4].includes(Number(cuenta[0].estado))) {
    throw new BusinessError('La cuenta ya fue procesada', 'CUENTA_YA_PROCESADA');
  }

  // Validación server-side de caja abierta (paridad con el bloqueo de UI):
  // el cobro postula el monto a la caja activa; sin caja se perdía el
  // registro de caja aunque la cuenta quedara cobrada.
  const idCajaCobro = await obtenerCajaActiva(contexto);
  if (!idCajaCobro) {
    throw new BusinessError(
      'No hay una caja abierta para registrar el cobro de la cuenta',
      'NO_CAJA_ABIERTA'
    );
  }

  const now = getNowInBusinessTimezone();
  const montoFinal = Number(body.montoFinal ?? body.total_cobrado ?? cuenta[0].total ?? 0);
  const propinaFinal = Number(body.propinaFinal ?? body.propina ?? 0);
  // El cliente paga el total de la cuenta + la propina; la venta registrada
  // es el total de la cuenta y la propina va a su bucket (se reparte).
  const montoCobrar = montoFinal + propinaFinal;
  const tipoPago = body.tipoPago ?? body.metodoPago ?? body.metodo_pago ?? 'efectivo';
  const metodoPago = body.metodoPago ?? body.metodo_pago ?? tipoPago;
  const timing = getRemainingMinutes(cuenta[0], parseBusinessDate(now));
  let history = parseRoomHistory(cuenta[0].habitaciones_historial);
  if (cuenta[0].habitacion_id) {
    const room = await trx<HabitacionRow[]>(
      'SELECT nombre FROM habitaciones WHERE id_habitacion = ?',
      [cuenta[0].habitacion_id]
    );
    history = ensureOpenHistorySegment(history, cuenta[0], room[0]?.nombre || 'Sin habitacion');
    history = closeOpenHistorySegment(
      history,
      now,
      timing.elapsedMinutes,
      !timing.isActive,
      'charged'
    );
  }

  await trx(
    'UPDATE cuentas SET estado = 0, metodo_pago = ?, cobrado_por = ?, tiempo_actual = 0, tiempo_inicio_actual = NULL, habitaciones_historial = ?, fecha_mod = ? WHERE id_cuenta = ?',
    [metodoPago, cobradoPor, stringifyRoomHistory(history), now, id]
  );

  if (tipoPago === 'prepago') {
    await consumirPrepagoCuenta(cuenta[0].cliente_id ?? null, montoCobrar, contexto);
  }

  // `idCajaCobro` se resolvió al inicio de la transacción (con validación
  // de existencia): aquí ya se sabe que existe.
  if (idCajaCobro) {
    await registrarMovimientoCobro(
      idCajaCobro,
      {
        venta: montoFinal,
        propina: propinaFinal,
        efectivo: tipoPago === 'efectivo' ? montoCobrar : 0,
        tarjeta: tipoPago === 'tarjeta' ? montoCobrar : 0,
        transferencia: tipoPago === 'transferencia' ? montoCobrar : 0,
        prepago: tipoPago === 'prepago' ? montoCobrar : 0
      },
      contexto
    );
  }

  if (cuenta[0].habitacion_id) {
    await trx('UPDATE habitaciones SET estado = 1 WHERE id_habitacion = ?', [
      cuenta[0].habitacion_id
    ]);
    emitir(() => sendNotificationToAll('room_available', { roomId: cuenta[0].habitacion_id }));
  }

  emitir(() =>
    sendNotificationToAll('timer_stopped', {
      servicioId: id,
      status: 0,
      tipoTransaccion: 'cuenta'
    })
  );
  emitir(() => sendNotificationToAll('timers_updated', { timestamp: now }));
}

export async function prepararVentaCuenta(
  contexto: ContextoOperacion,
  id: string,
  body: CuentaCobrarBody
): Promise<CuentaSalePayload> {
  const trx = resolverTransaccion(contexto);
  const [cuenta] = await trx<Array<CuentaSaleRow & { total: number }>>(
    'SELECT codigo, cliente_id, pedido_id, sub_total, total, total_comision FROM cuentas WHERE id_cuenta = ?',
    [id]
  );
  if (!cuenta) throw new NotFoundError('Cuenta', id);

  const detalles = await trx<CuentaSaleDetalleRow[]>(
    `SELECT producto_id, precio, cantidad, sub_total, comision, hostess_id
         FROM detalle_cuentas
        WHERE cuenta_id = ?
        ORDER BY fecha_crea ASC`,
    [id]
  );

  // Una cuenta sin líneas no puede facturarse (`SaleCreateSchema` exige al
  // menos un detalle). Se corta acá, dentro de la misma transacción: si el
  // cobro ya se había aplicado, se revierte en vez de dejar la cuenta cerrada
  // y sin venta.
  if (detalles.length === 0) {
    throw new BusinessError('La cuenta no tiene productos para facturar', 'CUENTA_SIN_DETALLES');
  }

  const usuarios = await trx<Array<{ usuario_id: string | null }>>(
    'SELECT usuario_id FROM cuentas_usuarios WHERE cuenta_id = ? ORDER BY fecha_crea ASC',
    [id]
  );

  const metodoPago = body.tipoPago ?? body.metodoPago ?? body.metodo_pago ?? 'efectivo';
  if (!esMetodoPagoVenta(metodoPago)) {
    // Rechazo determinista (4xx): la cola lo archiva como rechazada con este
    // motivo en vez de reintentar algo que daría lo mismo, y como todo corre
    // en la misma transacción, no se cobra nada a medias.
    throw new BusinessError(`Método de pago no válido: ${metodoPago}`, 'METODO_PAGO_INVALIDO');
  }

  return buildCuentaSalePayload({
    cuenta,
    cobro: {
      montoFinal: Number(body.montoFinal ?? body.total_cobrado ?? cuenta.total ?? 0),
      propinaFinal: Number(body.propinaFinal ?? body.propina ?? 0),
      metodoPago,
      deviceDate: body.device_date
    },
    detalles,
    usuarios: usuarios.map(fila => fila.usuario_id)
  });
}
