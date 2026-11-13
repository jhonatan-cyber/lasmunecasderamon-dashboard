import 'server-only';
import {
  prepararVentaPedido,
  obtenerServicioParaConsumo,
  consultarHabitacion,
  cambiarAnfitrionasServicioEnUnidad
} from '@/modules/operacion';
import { validarAnfitrionasEnLocal } from '@/modules/identidad';
import { AuditService } from '@/modules/auditoria';
import { normalizarDestinosPrepago } from '@/lib/business/prepagoDistribucion';
import { generateUUID } from '@/lib/utils/ids';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { SaleCreateSchema } from '@/lib/business/schemas';
import {
  validarCambioAnfitrionasVenta,
  validarCajaVenta,
  calcularTotalComisionVenta,
  validarHabitacionVenta,
  obtenerAnfitrionasVenta,
  prepararDetallesVenta,
  calcularMovimientoCajaVenta
} from '@/lib/business/registroVenta';
import { validarAnfitrionasConfirmadas } from '@/lib/business/registroOperacion';
import type { ContextoOperacion } from '@/lib/transaction/contract';
import { resolverOrigenVenta } from '@/lib/business/ventasOrigen';
import type { EntradaRegistroVenta } from '@/modules/ventas/contracts';
import { consumirStockBar, validarPreciosVentaBar } from '@/modules/inventario';
import { obtenerCajaActiva, registrarMovimientoCobro } from '@/modules/caja';
import { registrarComisionesVenta, registrarPropinaVenta } from '@/modules/personal';
import { actualizarDisponibilidadTrasVenta } from '@/modules/identidad';
import {
  ocuparHabitacionVenta,
  cerrarPedidoFacturado,
  pausarConflictosVenta
} from '@/modules/operacion';
import { consumirPrepagoVenta, saldoPrepagoAgotado } from '@/modules/clientes';
import { cerrarCuentasPrepagoSaldadas } from '@/modules/operacion';
import { notifyBarShotAlerts } from '@/lib/business/shotAlerts';
import { sendNotificationToAll } from '@/lib/api/sseService';
import {
  parsePagosMixtos,
  prepararPagoRegistro,
  type MixedPayment
} from '@/lib/business/pagosMixtos';
import {
  registrarCabeceraVenta,
  registrarDetallesVenta,
  asignarAnfitrionasVenta
} from '@/modules/ventas';
export async function registrarVenta(
  body: EntradaRegistroVenta,
  createdBy: string,
  contexto: ContextoOperacion,
  aplazar: (task: () => void | Promise<void>) => void,
  options: {
    desdeCuenta?: boolean;
    ventaId?: string;
    entradaId?: string;
    baucherFilename?: string | null;
  } = {}
) {
  const requestedOrder = body.pedido_id || body.id_pedido;
  if (requestedOrder && !options.desdeCuenta) {
    body = await prepararVentaPedido(requestedOrder, Number(body.tiempo || 0), contexto, body);
  }
  const validated = SaleCreateSchema.parse(body);
  validarCambioAnfitrionasVenta(validated);
  // Cuenta cobra líneas ya registradas; Entradas construye precio/crédito en servidor.
  // Estas excepciones son opciones internas, nunca flags del body.
  if (!options.desdeCuenta && !options.entradaId) {
    const precios = await validarPreciosVentaBar(validated.detalles, contexto);
    validated.detalles = validated.detalles.map((detalle, index) => ({
      ...detalle,
      isChampagne: precios[index].isChampagne
    }));
  }
  validated.total_comision = validated.detalles.reduce((total, d) => total + d.comision, 0);
  const skipClientPrepago = Boolean(body?.skip_client_prepago || body?.origen === 'cuenta');
  const skipCashRegisterPosting = body?.origen === 'cuenta';

  const pedidoId = validated.pedido_id || body.pedido_id || body.id_pedido;
  const servicio = validated.servicio_id
    ? await obtenerServicioParaConsumo(validated.servicio_id, contexto)
    : null;
  if (servicio) {
    validated.habitacion_id = servicio.habitacion_id;
    validated.tiempo = 0;
  }
  const clienteId = validated.cliente_id || servicio?.cliente_id || body.cliente_id;

  const ventaId = options.ventaId ?? generateUUID();
  const codigo = validated.codigo || Math.random().toString(36).substring(2, 10).toUpperCase();
  const now = getNowInBusinessTimezone(validated.device_date);
  const pagosMixtos: MixedPayment[] = parsePagosMixtos(validated.pagos_mixtos);
  const cajaId = await obtenerCajaActiva(contexto);
  validarCajaVenta(cajaId, skipCashRegisterPosting);
  const totalComision = calcularTotalComisionVenta(validated);

  let prepagoMonto = 0;
  const { prepagoSolicitado } = prepararPagoRegistro(
    validated.metodo_pago,
    Number(validated.total || 0),
    pagosMixtos
  );

  const destinosPrepago = skipClientPrepago
    ? []
    : normalizarDestinosPrepago(validated.prepago_destinos, Number(validated.total || 0));

  if (destinosPrepago.length > 0) {
    for (const destino of destinosPrepago) {
      prepagoMonto += await consumirPrepagoVenta(
        {
          clienteId: destino.cliente_id,
          total: Number(validated.total || 0),
          prepagoSolicitado: destino.monto,
          ventaId,
          createdBy,
          now,
          codigo,
          concepto: `Pago venta ${codigo}`
        },
        contexto
      );
    }

    for (const destino of destinosPrepago) {
      if (await saldoPrepagoAgotado(destino.cliente_id, contexto)) {
        await cerrarCuentasPrepagoSaldadas(destino.cliente_id, contexto);
      }
    }
  } else if (clienteId && !skipClientPrepago) {
    prepagoMonto = await consumirPrepagoVenta(
      {
        clienteId,
        total: Number(validated.total || 0),
        prepagoSolicitado,
        ventaId,
        createdBy,
        now,
        codigo,
        concepto: `Pago venta ${codigo}`
      },
      contexto
    );

    if (prepagoMonto > 0 && (await saldoPrepagoAgotado(clienteId, contexto))) {
      await cerrarCuentasPrepagoSaldadas(clienteId, contexto);
    }
  }
  let esLibreIngreso = false;
  if (validated.habitacion_id) {
    const roomRows = await consultarHabitacion(validated.habitacion_id, contexto, !servicio);
    esLibreIngreso = validarHabitacionVenta(roomRows[0], validated.tiempo, Boolean(servicio));
  }

  const estado = validated.habitacion_id && validated.tiempo > 0 ? 2 : 1;
  const origen = resolverOrigenVenta({
    entradaId: options.entradaId,
    servicioId: validated.servicio_id,
    habitacionId: validated.habitacion_id,
    pedidoId
  });

  await registrarCabeceraVenta(contexto, {
    id_venta: ventaId,
    codigo,
    cliente_id: clienteId,
    pedido_id: pedidoId,
    servicio_id: validated.servicio_id || null,
    entrada_id: options.entradaId || null,
    origen,
    habitacion_id: validated.habitacion_id,
    metodo_pago: validated.metodo_pago,
    propina: validated.propina,
    sub_total: validated.sub_total,
    total: validated.total,
    total_comision: totalComision,
    tiempo: validated.tiempo,
    caja_id: cajaId,
    created_by: createdBy,
    estado,
    fecha_crea: now,
    pagos_mixtos: validated.pagos_mixtos ? JSON.stringify(validated.pagos_mixtos) : null,
    baucher_foto: options.baucherFilename || null
  });

  if (validated.habitacion_id && estado === 2 && !esLibreIngreso) {
    await ocuparHabitacionVenta(validated.habitacion_id, contexto);
  }

  const allRequestedHostessIds = obtenerAnfitrionasVenta(validated);

  let validatedHostessIds: string[] = [];
  if (allRequestedHostessIds.length > 0) {
    validatedHostessIds = await validarAnfitrionasEnLocal(allRequestedHostessIds, contexto);

    validarAnfitrionasConfirmadas(allRequestedHostessIds, validatedHostessIds);
  }

  const validatedHostessSet = new Set(validatedHostessIds);
  if (validated.servicio_id && validated.servicio_anfitrionas !== undefined) {
    await cambiarAnfitrionasServicioEnUnidad(
      validated.servicio_id,
      validated.servicio_anfitrionas,
      contexto
    );
  }

  if (validated.usuarios?.length) {
    const mainHostessIds = validated.usuarios.filter((id: string) => validatedHostessSet.has(id));

    if (estado === 2 && !esLibreIngreso) {
      await pausarConflictosVenta(mainHostessIds, ventaId, contexto);
    }

    await asignarAnfitrionasVenta(contexto, ventaId, mainHostessIds, now);

    await actualizarDisponibilidadTrasVenta(mainHostessIds, ventaId, contexto);
  }

  const { detailRows, commissionMainRows, commissionDetailRows } = prepararDetallesVenta(
    validated.detalles,
    validatedHostessSet,
    ventaId,
    now,
    generateUUID,
    Boolean(options.entradaId)
  );

  if (detailRows.length > 0) {
    await registrarDetallesVenta(contexto, detailRows);
  }
  const alertasShots = await consumirStockBar(
    validated.detalles,
    { usuarioId: createdBy, fecha: now, ventaId },
    contexto
  );

  if (commissionMainRows.length > 0) {
    await registrarComisionesVenta(commissionMainRows, commissionDetailRows, contexto);
  }

  if (cajaId && !skipCashRegisterPosting) {
    await registrarMovimientoCobro(
      cajaId,
      calcularMovimientoCajaVenta(validated, pagosMixtos, prepagoMonto, totalComision),
      contexto
    );
  }

  await AuditService.log(
    {
      user_id: createdBy,
      action: 'CREATE_SALE',
      resource_type: 'sales',
      resource_id: ventaId,
      details: { total: validated.total, metodo_pago: validated.metodo_pago, codigo }
    },
    contexto
  );

  if (pedidoId) {
    await cerrarPedidoFacturado(pedidoId, contexto);
  }

  if (validated.propina && validated.propina > 0) {
    await registrarPropinaVenta({ venta_id: ventaId, monto: validated.propina }, contexto);
  }

  const result = {
    id_venta: ventaId,
    id: ventaId,
    codigo,
    total: validated.total,
    estado,
    fecha_crea: now
  };

  const notificar = async () => {
    sendNotificationToAll('timers_updated', { timestamp: now });
    if (validated.servicio_id && validated.servicio_anfitrionas !== undefined)
      sendNotificationToAll('service_changed', { action: 'hostesses', id: validated.servicio_id });
    // El pedido quedó cerrado: los listados de pedidos deben quitarlo al instante.
    if (pedidoId) sendNotificationToAll('order_updated', { orderId: pedidoId, estado: 0 });
    sendNotificationToAll('updateSales', { id: result.id_venta, type: 'venta' });
    await notifyBarShotAlerts(alertasShots);
  };

  aplazar(notificar);

  return result;
}
