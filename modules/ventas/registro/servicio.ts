import { generateUUID } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { SaleCreateSchema } from '@/lib/business/schemas';
import { BusinessError } from '@/lib/errors/errors';
import type { ContextoOperacion } from '@/lib/transaccion/contrato';
import type { EntradaRegistroVenta } from '../contracts';
import type { ComisionVenta, DetalleComisionVenta } from '@/modules/personal/contracts';
import { consumirStockBar } from '@/modules/inventario';
import type { ShotAlert } from '@/modules/inventario/contracts';
import { obtenerCajaActiva, registrarMovimientoCobro } from '@/modules/caja';
import { registrarComisionesVenta, registrarPropinaVenta } from '@/modules/personal';
import { actualizarDisponibilidadTrasVenta } from '@/modules/identidad';
import {
  ocuparHabitacionVenta,
  cerrarPedidoFacturado,
  pausarConflictosVenta
} from '@/modules/operacion';
import { consumirPrepagoVenta } from '@/modules/clientes';
import { notifyBarShotAlerts } from '@/lib/business/shotAlerts';
import { sendNotificationToAll } from '@/lib/api/sseService';
import {
  parsePagosMixtos,
  validatePagosMixtos,
  calcularDeltasCaja,
  type MixedPayment
} from '@/lib/business/pagosMixtos';
import {
  RegistroVenta,
  consultarHabitacion,
  consultarAnfitrionas,
  registrarAuditoriaVenta
} from './repositorio';
export async function registrarVenta(
  body: EntradaRegistroVenta,
  createdBy: string,
  contexto: ContextoOperacion,
  aplazar: (task: () => void | Promise<void>) => void
) {
  const validated = SaleCreateSchema.parse(body);
  const skipClientPrepago = Boolean(body?.skip_client_prepago || body?.origen === 'cuenta');
  const skipCashRegisterPosting = body?.origen === 'cuenta';

  const pedidoId = validated.pedido_id || body.pedido_id || body.id_pedido;
  const clienteId = validated.cliente_id || body.cliente_id;

  const ventaId = generateUUID();
  const codigo = validated.codigo || Math.random().toString(36).substring(2, 10).toUpperCase();
  const now = getNowInBusinessTimezone(validated.device_date);
  const pagosMixtos: MixedPayment[] = parsePagosMixtos(validated.pagos_mixtos);

  const cajaId = await obtenerCajaActiva(contexto);
  // Validación server-side de caja abierta (paridad con el bloqueo de UI en
  // las 3 apps): sin caja la venta se registraba con `caja_id` null,
  // descontaba inventario y no dejaba rastro en caja. Los cobros con
  // `origen: 'cuenta'` no postulan saldos a caja (skipCashRegisterPosting),
  // así que sí se permiten sin caja.
  if (!cajaId && !skipCashRegisterPosting) {
    throw new BusinessError('No hay una caja abierta para registrar la venta', 'NO_CAJA_ABIERTA');
  }
  const totalComisionCalculada = validated.detalles.reduce(
    (sum, detalle) => sum + Number(detalle.comision || 0),
    0
  );
  const totalComision =
    Number(validated.total_comision || 0) > 0
      ? Number(validated.total_comision || 0)
      : totalComisionCalculada;

  // Botellas que con esta venta cruzaron el umbral de shots: se avisa recién
  // cuando la transacción confirma, para no notificar ventas que se revierten.
  let alertasShots: ShotAlert[] = [];

  const ejecutar = async () => {
    let prepagoMonto = 0;
    const esMixto = validated.metodo_pago === 'mixto';
    const prepagoSolicitado = esMixto
      ? pagosMixtos
          .filter((pago: MixedPayment) => pago.metodo === 'prepago')
          .reduce((sum: number, pago: MixedPayment) => sum + pago.monto, 0)
      : null;

    if (esMixto) {
      validatePagosMixtos(pagosMixtos, Number(validated.total || 0));
    }

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

    let esLibreIngreso = false;
    if (validated.habitacion_id) {
      const roomRows = await consultarHabitacion(validated.habitacion_id, contexto);
      if (roomRows.length > 0) {
        const roomPrice = Number(roomRows[0].precio || 0);
        const roomCommission = Number(roomRows[0].comision_anfitriona || 0);
        esLibreIngreso = roomPrice <= 0 || roomCommission <= 0;
      }
    }

    const estado = validated.habitacion_id && validated.tiempo > 0 && !esLibreIngreso ? 2 : 1;

    // === INSERT VENTA PRINCIPAL ===
    await RegistroVenta.rawInsert(contexto, {
      id_venta: ventaId,
      codigo,
      cliente_id: clienteId,
      pedido_id: pedidoId,
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

    if (validated.habitacion_id && estado === 2) {
      await ocuparHabitacionVenta(validated.habitacion_id, contexto);
    }

    // === OPTIMIZACIÓN: Validar TODAS las hostesses en UNA query ===
    // Extraer todos los IDs únicos de hostesses desde usuarios principales + detalles
    const allRequestedHostessIds = [
      ...new Set(
        [
          ...(validated.usuarios || []),
          ...validated.detalles.flatMap(d => {
            const ids = d.hostesses?.length ? d.hostesses : d.hostess_id ? [d.hostess_id] : [];
            return ids;
          })
        ].filter(Boolean)
      )
    ] as string[];

    let validatedHostessIds: string[] = [];
    if (allRequestedHostessIds.length > 0) {
      const hostessRows = await consultarAnfitrionas(allRequestedHostessIds, contexto);
      validatedHostessIds = hostessRows.map((row: { id_usuario: string }) => row.id_usuario);

      if (validatedHostessIds.length !== allRequestedHostessIds.length) {
        throw new BusinessError(
          'Hay anfitrionas seleccionadas que no estan logueadas en el local',
          'HOSTESS_NOT_LOGGED_IN'
        );
      }
    }

    const validatedHostessSet = new Set(validatedHostessIds);

    // === VALIDACIÓN DE USUARIOS PRINCIPALES + RELACIONES ===
    if (validated.usuarios?.length) {
      const mainHostessIds = validated.usuarios.filter((id: string) => validatedHostessSet.has(id));

      if (estado === 2) {
        await pausarConflictosVenta(mainHostessIds, ventaId, contexto);
      }

      // BATCH INSERT ventas_usuarios
      await RegistroVenta.batchInsertUserRelations(contexto, ventaId, mainHostessIds, now);

      await actualizarDisponibilidadTrasVenta(mainHostessIds, ventaId, contexto);
    }

    // === OPTIMIZACIÓN: BATCH INSERTS para detalles y comisiones ===
    const detailRows: Array<Record<string, unknown>> = [];
    const commissionMainRows: ComisionVenta[] = [];
    const commissionDetailRows: DetalleComisionVenta[] = [];

    for (const d of validated.detalles) {
      const requestedHostesses = d.hostesses?.length
        ? d.hostesses
        : d.hostess_id
          ? [d.hostess_id]
          : [];
      const hostesses =
        requestedHostesses.length > 0
          ? requestedHostesses.filter((id: string) => validatedHostessSet.has(id))
          : [];

      const totalComm = Math.round(d.comision || 0);
      const totalQty = Math.max(1, Number(d.cantidad || 1));
      const isChampagne = Boolean(d.isChampagne);
      const effectiveHostesses =
        hostesses.length === 0 ? [null] : isChampagne ? hostesses : hostesses.slice(0, totalQty);
      const hostessCount = Math.max(1, effectiveHostesses.length);

      const commissionByIndex = new Array(hostessCount).fill(0);
      const quantityByIndex = new Array(hostessCount).fill(0);
      const subtotalByIndex = new Array(hostessCount).fill(0);

      if (isChampagne) {
        const commBase = Math.floor(totalComm / hostessCount);
        const remainder = totalComm % hostessCount;

        for (let i = 0; i < hostessCount; i++) {
          commissionByIndex[i] = commBase + (i === 0 ? remainder : 0);
          quantityByIndex[i] = i === 0 ? totalQty : 0;
          subtotalByIndex[i] = i === 0 ? d.sub_total || d.precio * totalQty : 0;
        }
      } else {
        const unitBaseCommission = Math.floor(totalComm / totalQty);
        let remainingCommissionRemainder = totalComm % totalQty;
        const baseQty = Math.floor(totalQty / hostessCount);
        let remainingQty = totalQty;

        for (let i = 0; i < hostessCount; i++) {
          const qtyPart = i === hostessCount - 1 ? remainingQty : baseQty === 0 ? 1 : baseQty;
          remainingQty -= qtyPart;
          quantityByIndex[i] = qtyPart;
          subtotalByIndex[i] = d.precio * qtyPart;

          let commPart = unitBaseCommission * qtyPart;
          const remainderForThisHostess = Math.min(remainingCommissionRemainder, qtyPart);
          commPart += remainderForThisHostess;
          remainingCommissionRemainder -= remainderForThisHostess;
          commissionByIndex[i] = commPart;
        }
      }

      for (let i = 0; i < hostessCount; i++) {
        const hostessId = effectiveHostesses[i];
        const commPart = commissionByIndex[i];
        const qtyPart = quantityByIndex[i];
        const subPart = subtotalByIndex[i];

        const detailId = generateUUID();
        // Cómo se vendió queda en el detalle: un shot puede ser a precio de cliente o
        // de anfitriona y eso no se deduce después (el precio solo no basta).
        const tipoVenta = d.tipo_venta === 'shot' ? 'shot' : 'botella';
        detailRows.push({
          id_detalle_venta: detailId,
          venta_id: ventaId,
          producto_id: d.producto_id,
          presentacion_id: (d as any).presentacion_id ?? null,
          tipo_venta: tipoVenta,
          shot_anfitriona: tipoVenta === 'shot' && Boolean(d.shot_anfitriona),
          precio: d.precio,
          comision: commPart,
          cantidad: qtyPart,
          sub_total: subPart,
          hostess_id: hostessId,
          fecha_crea: now
        });

        if (hostessId && commPart > 0) {
          const commissionId = generateUUID();
          commissionMainRows.push({
            id_comision: commissionId,
            venta_id: ventaId,
            usuario_id: hostessId,
            monto: commPart,
            estado: 1,
            fecha_crea: now
          });
          commissionDetailRows.push({
            id_detalle_comision: generateUUID(),
            comision_id: commissionId,
            usuario_id: hostessId,
            comision: commPart,
            estado: 1,
            fecha_crea: now
          });
        }
      }
    }

    // BATCH INSERT detalles
    if (detailRows.length > 0) {
      await RegistroVenta.batchInsertDetails(contexto, detailRows);
    }

    // === INVENTARIO DEL BAR ===
    // Descuenta las botellas de las presentaciones vinculadas. Los detalles con
    // tipo_venta 'shot' descuentan ml de la botella abierta (y la abren si hace falta)
    // en lugar de gastar una unidad completa. Si no alcanza,
    // INSUFFICIENT_BAR_STOCK revierte la transacción entera: venta, caja, comisiones y
    // detalles. Cubre también el cobro de cuenta, que entra por este mismo método con
    // origen 'cuenta'. Los detalles sin presentación (catálogo anterior) no se tocan.
    alertasShots = await consumirStockBar(
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
      // La venta registrada es el total menos la propina (la propina va a su
      // bucket y se reparte entre cajeros/garzones activos).
      if (esMixto) {
        const deltas = calcularDeltasCaja(pagosMixtos);

        await registrarMovimientoCobro(
          cajaId,
          {
            venta: validated.total - validated.propina,
            propina: validated.propina,
            efectivo: deltas.efectivo,
            tarjeta: deltas.tarjeta,
            transferencia: deltas.transferencia,
            prepago: prepagoMonto,
            comision: totalComision
          },
          contexto
        );
      } else {
        const montoMetodoPrincipal = Number(validated.total) - prepagoMonto;
        await registrarMovimientoCobro(
          cajaId,
          {
            venta: validated.total - validated.propina,
            propina: validated.propina,
            efectivo: validated.metodo_pago === 'efectivo' ? montoMetodoPrincipal : 0,
            tarjeta: validated.metodo_pago === 'tarjeta' ? montoMetodoPrincipal : 0,
            transferencia: validated.metodo_pago === 'transferencia' ? montoMetodoPrincipal : 0,
            prepago: prepagoMonto,
            comision: totalComision
          },
          contexto
        );
      }
    }

    // === AUDITORÍA ===
    await registrarAuditoriaVenta(
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

    return {
      id_venta: ventaId,
      id: ventaId,
      codigo,
      total: validated.total,
      estado,
      fecha_crea: now
    };
  };

  const result = await ejecutar();

  const notificar = async () => {
    // SSE notification (no bloquea — broadcast es síncrono en memoria)
    sendNotificationToAll('timers_updated', { timestamp: now });

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
