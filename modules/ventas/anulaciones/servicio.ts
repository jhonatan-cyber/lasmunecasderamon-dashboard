/**
 * Casos de uso de anulación de ventas — API pública de servidor del módulo
 * ventas.
 *
 * La anulación (total o parcial) coordina a los propietarios en una sola
 * unidad con `ContextoOperacion`: Ventas marca el estado y registra la
 * devolución, Clientes restituye el prepago, Caja revierte el movimiento,
 * Personal ajusta comisiones y propinas, Inventario devuelve el stock,
 * Identidad actualiza la disponibilidad y Operación libera habitación y
 * reabre el pedido. O confirma todo o no confirma nada (§6).
 *
 * Los avisos (auditoría y SSE) se aplazan hasta después del commit: un fallo
 * de envío no convierte una anulación confirmada en una respuesta fallida.
 */
import { enUnaUnidad, type ContextoOperacion } from '@/lib/transaccion/contrato';
import { ejecutarEfectosConfirmados } from '@/lib/transaccion/efectos';
import { sendNotificationToAll } from '@/lib/api/sseService';
import { addVentaLog } from '@/lib/utils/logUtils';
import { logger } from '@/lib/utils/logger';
import { NotFoundError } from '@/lib/errors/errors';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import {
  leerVentaParaAnular,
  leerAnfitrionasVenta,
  estadoTrasSolicitud,
  marcarEstadoVenta,
  leerDetallesParaDevolucion,
  registrarDevolucionVenta,
  ajustarDetallesVenta,
  actualizarVentaParcial,
  crearSolicitudAnulacion,
  actualizarEstadoSolicitud,
  leerVentaDeSolicitud,
  leerMontoSolicitud,
  parseMixedPayments,
  allocateProportionally
} from './repositorio';
import { registrarMovimientoCobro } from '@/modules/caja';
import { leerPrepagoConsumidoPorVenta, restituirPrepagoPorAnulacion } from '@/modules/clientes';
import {
  revertirComisionesPorAnulacion,
  revertirPropinasPorAnulacion,
  leerComisionesPorAnulacion,
  ajustarComisionesPorAnulacion,
  leerPropinasPorAnulacion,
  ajustarPropinasPorAnulacion
} from '@/modules/personal';
import { revertirStockAnulacion } from '@/modules/inventario';
import { actualizarDisponibilidad } from '@/modules/identidad';
import {
  liberarHabitacionPorAnulacion,
  reabrirPedidoPorAnulacion,
  marcarPedidoPorAnulacion
} from '@/modules/operacion';

export {
  existeSolicitudAnulacion,
  listarSolicitudesPendientes,
  obtenerSolicitudPorToken,
  obtenerVentaParaAnulacion
} from './repositorio';

type Tarea = () => void | Promise<void>;

/**
 * Anulación total: la venta deja de existir como hecho comercial. Mismo orden
 * que el `SaleQueries.updateStatus(id, 0)` heredado: estado, habitación,
 * anfitrionas, prepago, caja, devolución registrada, detalles, stock,
 * comisiones, propinas y pedido.
 */
export async function anularVentaTotalEnUnidad(
  ventaId: string,
  userId: string | undefined,
  contexto: ContextoOperacion,
  aplazar: (tarea: Tarea) => void
): Promise<{ total: number; cajaId: string | null }> {
  const previa = await leerVentaParaAnular(ventaId, contexto);
  if (!previa) throw new NotFoundError('Venta', ventaId);
  const estadoAnterior = previa.estado;
  const habitacionId = previa.habitacion_id;
  const clienteId = previa.cliente_id;
  const cajaId = previa.caja_id;
  const pedidoId = previa.pedido_id;
  const metodoPago = String(previa.metodo_pago || '').toLowerCase();
  const total = Number(previa.total || 0);
  const subTotal = Number(previa.sub_total || 0);
  const propina = Number(previa.propina || 0);
  const totalComision = Number(previa.total_comision || 0);
  const pagosMixtos = parseMixedPayments(previa.pagos_mixtos);

  await marcarEstadoVenta(ventaId, 0, contexto);

  if (habitacionId) await liberarHabitacionPorAnulacion(habitacionId, contexto, ventaId);
  const anfitrionas = await leerAnfitrionasVenta(ventaId, contexto);
  await actualizarDisponibilidad(anfitrionas, contexto, undefined, ventaId);

  // Segunda anulación de la misma venta: la plata y el stock ya se
  // revirtieron; sólo se reacomodan habitación y disponibilidad.
  if (estadoAnterior === 0) return { total, cajaId };

  const detailRows = await leerDetallesParaDevolucion(ventaId, contexto);
  const prepagoMonto =
    clienteId != null ? await leerPrepagoConsumidoPorVenta(clienteId, ventaId, contexto) : 0;

  if (clienteId && prepagoMonto > 0) {
    await restituirPrepagoPorAnulacion(
      {
        clienteId,
        ventaId,
        monto: prepagoMonto,
        usuarioId: userId || null,
        concepto: `Anulacion venta ${ventaId}`
      },
      contexto
    );
  }

  if (cajaId) {
    let efectivo = 0;
    let tarjeta = 0;
    let transferencia = 0;
    if (metodoPago === 'mixto') {
      for (const pago of pagosMixtos) {
        if (pago.metodo === 'efectivo') efectivo += pago.monto;
        if (pago.metodo === 'tarjeta') tarjeta += pago.monto;
        if (pago.metodo === 'transferencia') transferencia += pago.monto;
      }
    } else {
      const montoMetodoPrincipal = Math.max(0, total - prepagoMonto);
      if (metodoPago === 'efectivo') efectivo = montoMetodoPrincipal;
      if (metodoPago === 'tarjeta') tarjeta = montoMetodoPrincipal;
      if (metodoPago === 'transferencia') transferencia = montoMetodoPrincipal;
    }
    await registrarMovimientoCobro(
      cajaId,
      {
        venta: -(total - propina),
        efectivo: -efectivo,
        tarjeta: -tarjeta,
        transferencia: -transferencia,
        prepago: -prepagoMonto,
        propina: -propina,
        comision: -totalComision,
        devolucion: total
      },
      contexto
    );
  }

  await registrarDevolucionVenta(
    {
      ventaId,
      clienteId,
      refundTotal: total,
      refundSubTotal: subTotal,
      refundComision: totalComision,
      detailRows
    },
    contexto
  );

  await revertirStockAnulacion(
    { venta_id: ventaId, usuario_id: userId || null, fecha: getNowInBusinessTimezone() },
    contexto
  );

  await revertirComisionesPorAnulacion(ventaId, contexto);
  await revertirPropinasPorAnulacion(ventaId, contexto);
  if (pedidoId) await reabrirPedidoPorAnulacion(pedidoId, contexto);

  aplazar(async () => {
    await addVentaLog(ventaId, 'ANULADO', 'Venta anulada manualmente.', userId);
  });
  aplazar(() => {
    try {
      sendNotificationToAll('sale_cancelled', { ventaId, total, cajaId: cajaId ?? null });
    } catch (error) {
      logger.warn('[ventas/anulaciones] No se pudo emitir sale_cancelled', { ventaId, error });
    }
  });

  return { total, cajaId };
}

/**
 * Anulación parcial: la venta sigue viva con el total reducido. Mismo cálculo
 * proporcional que el `SaleQueries.approveAnulacion` heredado sobre prepago,
 * métodos de pago, detalles, comisiones y propinas.
 */
export async function anularVentaParcialEnUnidad(
  ventaId: string,
  approvedBy: string,
  approvedAmount: number,
  contexto: ContextoOperacion,
  aplazar: (tarea: Tarea) => void
): Promise<void> {
  const venta = await leerVentaParaAnular(ventaId, contexto);
  if (!venta) throw new NotFoundError('Venta', ventaId);
  const currentTotal = Math.max(0, Math.round(Number(venta.total || 0)));
  const currentSubTotal = Math.max(0, Math.round(Number(venta.sub_total || 0)));
  const monto = Math.max(0, Math.round(Number(approvedAmount || 0)));

  if (monto <= 0 || monto >= currentTotal) {
    await anularVentaTotalEnUnidad(ventaId, approvedBy, contexto, aplazar);
    return;
  }

  const currentPropina = Math.max(0, Math.round(Number(venta.propina || 0)));
  const currentComision = Math.max(0, Math.round(Number(venta.total_comision || 0)));
  const clienteId = venta.cliente_id;
  const cajaId = venta.caja_id;
  const pedidoId = venta.pedido_id;
  const metodoPago = String(venta.metodo_pago || '').toLowerCase();
  const pagosMixtos = parseMixedPayments(venta.pagos_mixtos);

  const currentPrepago =
    clienteId != null ? await leerPrepagoConsumidoPorVenta(clienteId, ventaId, contexto) : 0;
  const newTotal = Math.max(0, currentTotal - monto);
  const newPropina =
    currentTotal > 0 ? Math.max(0, Math.round((currentPropina * newTotal) / currentTotal)) : 0;
  const newComision =
    currentTotal > 0 ? Math.max(0, Math.round((currentComision * newTotal) / currentTotal)) : 0;
  const newSubTotal = Math.max(0, newTotal - newPropina);

  const prepagoAllocation = allocateProportionally(
    currentPrepago > 0 ? [{ key: 'prepago', amount: currentPrepago }] : [],
    row => row.amount,
    currentTotal > 0 ? Math.round((currentPrepago * newTotal) / currentTotal) : 0
  );
  const newPrepago = Number(prepagoAllocation[0]?.nextAmount || 0);
  const prepagoRefund = Math.max(0, currentPrepago - newPrepago);

  const mixedSourceRows =
    metodoPago === 'mixto'
      ? pagosMixtos.map((payment, index) => ({
          key: `${payment.metodo}_${index}`,
          metodo: payment.metodo,
          amount: Math.max(0, Math.round(Number(payment.monto || 0)))
        }))
      : [
          {
            key: `${metodoPago || 'efectivo'}_principal`,
            metodo: metodoPago || 'efectivo',
            amount: Math.max(0, currentTotal - currentPrepago)
          }
        ];
  const updatedMixedRows = allocateProportionally(
    mixedSourceRows,
    row => row.amount,
    Math.max(0, newTotal - newPrepago)
  );
  const methodRefunds = { efectivo: 0, tarjeta: 0, transferencia: 0 };
  for (const row of updatedMixedRows) {
    const refundAmount = Math.max(0, row.currentAmount - Number(row.nextAmount || 0));
    if (row.metodo === 'efectivo') methodRefunds.efectivo += refundAmount;
    if (row.metodo === 'tarjeta') methodRefunds.tarjeta += refundAmount;
    if (row.metodo === 'transferencia') methodRefunds.transferencia += refundAmount;
  }

  if (clienteId && prepagoRefund > 0) {
    await restituirPrepagoPorAnulacion(
      {
        clienteId,
        ventaId,
        monto: prepagoRefund,
        usuarioId: approvedBy || null,
        concepto: `Anulacion parcial venta ${ventaId}`
      },
      contexto
    );
  }

  if (cajaId) {
    await registrarMovimientoCobro(
      cajaId,
      {
        venta: -(monto - Math.max(0, currentPropina - newPropina)),
        efectivo: -methodRefunds.efectivo,
        tarjeta: -methodRefunds.tarjeta,
        transferencia: -methodRefunds.transferencia,
        prepago: -prepagoRefund,
        propina: -(currentPropina - newPropina),
        comision: -(currentComision - newComision),
        devolucion: monto
      },
      contexto
    );
  }

  const nextState = await estadoTrasSolicitud(ventaId, contexto);
  await actualizarVentaParcial(
    ventaId,
    {
      newTotal,
      newSubTotal,
      newPropina,
      newComision,
      pagosMixtosJson: JSON.stringify(
        updatedMixedRows
          .filter(row => Number(row.nextAmount || 0) > 0)
          .map(row => ({ metodo: row.metodo, monto: Number(row.nextAmount || 0) }))
      ),
      nextState
    },
    contexto
  );

  const detailRows = await leerDetallesParaDevolucion(ventaId, contexto);
  await registrarDevolucionVenta(
    {
      ventaId,
      clienteId,
      refundTotal: monto,
      refundSubTotal: Math.max(0, currentSubTotal - newSubTotal),
      refundComision: Math.max(0, currentComision - newComision),
      detailRows
    },
    contexto
  );

  await revertirStockAnulacion(
    {
      venta_id: ventaId,
      usuario_id: approvedBy || null,
      fecha: getNowInBusinessTimezone(),
      fraccion: currentTotal > 0 ? monto / currentTotal : 0
    },
    contexto
  );

  await ajustarDetallesVenta(detailRows, newSubTotal, newComision, contexto);

  const comisionRows = await leerComisionesPorAnulacion(ventaId, contexto);
  const updatedComisiones = allocateProportionally(comisionRows, row => row.comision, newComision);
  await ajustarComisionesPorAnulacion(
    updatedComisiones.map(row => ({
      id_comision: row.id_comision,
      id_detalle_comision: row.id_detalle_comision,
      monto: Number(row.nextAmount || 0)
    })),
    contexto
  );

  const { detalles: propinaDetails, cabeceras: propinaHeaders } = await leerPropinasPorAnulacion(
    ventaId,
    contexto
  );
  const updatedPropinas = allocateProportionally(propinaDetails, row => row.monto, newPropina);
  const propinaByHeaderId = new Map<string, number>();
  for (const row of updatedPropinas) {
    propinaByHeaderId.set(
      row.propina_id,
      (propinaByHeaderId.get(row.propina_id) || 0) + Number(row.nextAmount || 0)
    );
  }
  await ajustarPropinasPorAnulacion(
    updatedPropinas.map(row => ({
      id_detalle_propina: row.id_detalle_propina,
      propina_id: row.propina_id,
      monto: Number(row.nextAmount || 0)
    })),
    propinaHeaders.map(header => ({
      id_propina: header.id_propina,
      propina: propinaByHeaderId.get(header.id_propina) || 0
    })),
    contexto
  );

  if (pedidoId) await marcarPedidoPorAnulacion(pedidoId, 2, contexto);

  aplazar(async () => {
    await addVentaLog(
      ventaId,
      'ANULACION_PARCIAL',
      `Venta ajustada por anulacion parcial de ${monto}.`,
      approvedBy
    );
  });
}

export async function actualizarEstadoVenta(
  id: string,
  estado: number,
  userId?: string
): Promise<string> {
  const tareas: Tarea[] = [];
  const aplazar = (tarea: Tarea) => tareas.push(tarea);
  const ventaId = await enUnaUnidad(unidad =>
    unidad.ejecutar(async contexto => {
      if (estado === 0) {
        await anularVentaTotalEnUnidad(id, userId, contexto, aplazar);
        return id;
      }
      const previa = await leerVentaParaAnular(id, contexto);
      if (!previa) throw new NotFoundError('Venta', id);
      const estadoAnterior = previa.estado;
      await marcarEstadoVenta(id, estado, contexto);
      if (estado === 1) {
        if (previa.habitacion_id)
          await liberarHabitacionPorAnulacion(previa.habitacion_id, contexto, id);
        const anfitrionas = await leerAnfitrionasVenta(id, contexto);
        await actualizarDisponibilidad(anfitrionas, contexto, undefined, id);
        if (estadoAnterior !== 1) {
          aplazar(async () => {
            await addVentaLog(id, 'FINALIZADO', 'Venta finalizada manualmente.', userId);
          });
        }
      }
      return id;
    })
  );
  await ejecutarEfectosConfirmados(tareas);
  return ventaId;
}

export async function aprobarAnulacionVenta(
  ventaId: string,
  approvedBy: string,
  requestedAmount: number
): Promise<string> {
  const tareas: Tarea[] = [];
  const aplazar = (tarea: Tarea) => tareas.push(tarea);
  await enUnaUnidad(unidad =>
    unidad.ejecutar(contexto =>
      anularVentaParcialEnUnidad(ventaId, approvedBy, requestedAmount, contexto, aplazar)
    )
  );
  await ejecutarEfectosConfirmados(tareas);
  return ventaId;
}

export async function solicitarAnulacionVenta(
  id: string,
  motivo: string,
  solicitadoPor: string,
  monto: number
): Promise<string> {
  return await enUnaUnidad(unidad =>
    unidad.ejecutar(async contexto => {
      const token = await crearSolicitudAnulacion(id, motivo, solicitadoPor, monto, contexto);
      await marcarEstadoVenta(id, 3, contexto);
      return token;
    })
  );
}

export async function procesarAnulacionVenta(
  requestId: string,
  approvedBy: string,
  status: string
): Promise<string | null> {
  const tareas: Tarea[] = [];
  const aplazar = (tarea: Tarea) => tareas.push(tarea);
  const ventaId = await enUnaUnidad(unidad =>
    unidad.ejecutar(async contexto => {
      const nextStatus = await actualizarEstadoSolicitud(requestId, status, contexto);
      const solicitado = await leerVentaDeSolicitud(requestId, contexto);
      if (!solicitado) return null;
      if (nextStatus !== 'confirmada') {
        await marcarEstadoVenta(
          solicitado,
          await estadoTrasSolicitud(solicitado, contexto),
          contexto
        );
        return solicitado;
      }
      const monto = await leerMontoSolicitud(requestId, contexto);
      await anularVentaParcialEnUnidad(solicitado, approvedBy, monto, contexto, aplazar);
      return solicitado;
    })
  );
  await ejecutarEfectosConfirmados(tareas);
  return ventaId;
}
