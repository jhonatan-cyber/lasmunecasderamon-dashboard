import 'server-only';
import {
  prepararVentaPedido,
  obtenerServicioParaConsumo,
  consultarHabitacion,
  cambiarAnfitrionasServicioEnUnidad
} from '@/modules/operacion';
import { validarAnfitrionasEnLocal } from '@/modules/identidad';
import { AuditService } from '@/modules/auditoria';
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
import { consumirStockBar } from '@/modules/inventario';
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
  options: { desdeCuenta?: boolean; ventaId?: string; entradaId?: string } = {}
) {
  const requestedOrder = body.pedido_id || body.id_pedido;
  if (requestedOrder && !options.desdeCuenta) {
    body = await prepararVentaPedido(requestedOrder, Number(body.tiempo || 0), contexto);
  }
  const validated = SaleCreateSchema.parse(body);
  validarCambioAnfitrionasVenta(validated);
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
  // Validación server-side de caja abierta (paridad con el bloqueo de UI en
  // las 3 apps): sin caja la venta se registraba con `caja_id` null,
  // descontaba inventario y no dejaba rastro en caja. Los cobros con
  // `origen: 'cuenta'` no postulan saldos a caja (skipCashRegisterPosting),
  // así que sí se permiten sin caja.
  validarCajaVenta(cajaId, skipCashRegisterPosting);
  const totalComision = calcularTotalComisionVenta(validated);

  let prepagoMonto = 0;
  const { prepagoSolicitado } = prepararPagoRegistro(
    validated.metodo_pago,
    Number(validated.total || 0),
    pagosMixtos
  );

  if (clienteId && !skipClientPrepago) {
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
  }

  if (clienteId && prepagoMonto > 0 && (await saldoPrepagoAgotado(clienteId, contexto))) {
    await cerrarCuentasPrepagoSaldadas(clienteId, contexto);
  }
  let esLibreIngreso = false;
  if (validated.habitacion_id) {
    const roomRows = await consultarHabitacion(validated.habitacion_id, contexto, !servicio);
    esLibreIngreso = validarHabitacionVenta(roomRows[0], validated.tiempo, Boolean(servicio));
  }

  const estado = validated.habitacion_id && validated.tiempo > 0 ? 2 : 1;

  // De dónde nació el cobro. Se decide acá, en el servidor, y viaja persistido:
  // el cliente HTTP no puede etiquetar su propia venta (S5 de
  // `odd/tasks/ventas-origen.md`).
  const origen = resolverOrigenVenta({
    entradaId: options.entradaId,
    servicioId: validated.servicio_id,
    habitacionId: validated.habitacion_id,
    pedidoId
  });

  // === INSERT VENTA PRINCIPAL ===
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
    pagos_mixtos: validated.pagos_mixtos ? JSON.stringify(validated.pagos_mixtos) : null
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

  // === VALIDACIÓN DE USUARIOS PRINCIPALES + RELACIONES ===
  if (validated.usuarios?.length) {
    const mainHostessIds = validated.usuarios.filter((id: string) => validatedHostessSet.has(id));

    if (estado === 2 && !esLibreIngreso) {
      await pausarConflictosVenta(mainHostessIds, ventaId, contexto);
    }

    // BATCH INSERT ventas_usuarios
    await asignarAnfitrionasVenta(contexto, ventaId, mainHostessIds, now);

    await actualizarDisponibilidadTrasVenta(mainHostessIds, ventaId, contexto);
  }

  const { detailRows, commissionMainRows, commissionDetailRows } = prepararDetallesVenta(
    validated.detalles,
    validatedHostessSet,
    ventaId,
    now,
    generateUUID
  );

  // BATCH INSERT detalles
  if (detailRows.length > 0) {
    await registrarDetallesVenta(contexto, detailRows);
  }

  // === INVENTARIO DEL BAR ===
  // Descuenta las botellas de las presentaciones vinculadas. Los detalles con
  // tipo_venta 'shot' descuentan ml de la botella abierta (y la abren si hace falta)
  // en lugar de gastar una unidad completa. Si no alcanza,
  // INSUFFICIENT_BAR_STOCK revierte la transacción entera: venta, caja, comisiones y
  // detalles. Cubre también el cobro de cuenta, que entra por este mismo método con
  // origen 'cuenta'. Los detalles sin presentación (catálogo anterior) no se tocan.
  const alertasShots = await consumirStockBar(
    validated.detalles,
    { usuarioId: createdBy, fecha: now, ventaId },
    contexto
  );

  // BATCH INSERT comisiones + detalle_comisiones
  if (commissionMainRows.length > 0) {
    await registrarComisionesVenta(commissionMainRows, commissionDetailRows, contexto);
  }

  // === ACTUALIZACIÓN CAJA ===
  if (cajaId && !skipCashRegisterPosting) {
    await registrarMovimientoCobro(
      cajaId,
      calcularMovimientoCajaVenta(validated, pagosMixtos, prepagoMonto, totalComision),
      contexto
    );
  }

  // === AUDITORÍA ===
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

  // === PROPI NAS ===
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
    // SSE notification (no bloquea — broadcast es síncrono en memoria)
    sendNotificationToAll('timers_updated', { timestamp: now });
    if (validated.servicio_id && validated.servicio_anfitrionas !== undefined)
      sendNotificationToAll('service_changed', { action: 'hostesses', id: validated.servicio_id });

    // Al crear una venta se notifica al staff: antes solo lo hacía el cron de
    // timers (y `sale_cancelled` al anular), así que las apps no veían ventas
    // nuevas hasta el siguiente refetch manual. Los suscriptores (Expo
    // SalesContext, Flutter refresh_bus 'sales') hacen refetch con este evento;
    // payload informativo, misma forma `{ id, type }` que usa el cron.
    sendNotificationToAll('updateSales', { id: result.id_venta, type: 'venta' });

    // Aviso al barman: una botella abierta bajó del umbral configurado de shots.
    await notifyBarShotAlerts(alertasShots);
  };

  aplazar(notificar);

  return result;
}
