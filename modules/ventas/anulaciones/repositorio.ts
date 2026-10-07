/**
 * Lecturas de solicitudes de anulación de ventas. Infraestructura privada del
 * módulo: nadie fuera de `modules/ventas` importa este archivo (§5).
 *
 * Este SQL vivía dentro de tres rutas HTTP (`/api/ventas/anulacion`,
 * `/api/ventas/solicitud-anulacion` y `/api/ventas/procesar-anulacion`), que
 * mezclaban adaptación, consulta y validación. La primera casilla de la fase 5
 * pide sacarlo de ahí: una ruta autenticada, valida el transporte, llama a un
 * caso de uso y traduce la respuesta.
 *
 * Mismo SQL y misma selección que tenían las rutas. La escritura de la
 * solicitud (crear y procesar) ya estaba en `SaleQueries`, que se migrará más
 * adelante en la fase.
 */
import { query } from '@/lib/database/db';
import type { ContextoOperacion } from '@/lib/transaccion/contrato';
import { resolverTransaccion } from '@/lib/transaccion/infraestructura';
import { generateUUID } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { BusinessError } from '@/lib/errors/errors';
import {
  allocateProportionally,
  parseMixedPayments,
  normalizeSolicitudStatus,
  type MixedPayment,
  type VentaRefundDetailRow
} from '@/modules/ventas/lecturas/mapeo';
import type { SolicitudAnulacion, VentaParaAnulacion } from '../contracts';

export type { MixedPayment, VentaRefundDetailRow };
export { parseMixedPayments, normalizeSolicitudStatus, allocateProportionally };

/**
 * La venta y su cliente con el nombre ya resuelto. Se usa para validar el monto
 * solicitado contra el total y para el aviso de WhatsApp.
 */
export async function obtenerVentaParaAnulacion(
  ventaId: string
): Promise<VentaParaAnulacion | null> {
  const rows = await query<VentaParaAnulacion[]>(
    `SELECT v.codigo, v.total,
            COALESCE((CAST(c.nombre AS text) || CAST(' ' AS text) || CAST(c.apellido AS text)), 'Sin cliente registrado') as cliente_nombre
     FROM ventas v
     LEFT JOIN clientes c ON v.cliente_id = c.id_cliente
     WHERE v.id_venta = ?
     LIMIT 1`,
    [ventaId]
  );
  return rows[0] ?? null;
}

/** Una venta no admite dos solicitudes: la segunda debe rechazarse. */
export async function existeSolicitudAnulacion(ventaId: string): Promise<boolean> {
  const rows = await query<{ id: string }[]>(
    `SELECT id
     FROM solicitudes_anulacion_ventas
     WHERE venta_id = ?
     LIMIT 1`,
    [ventaId]
  );
  return rows.length > 0;
}

const SELECCION_SOLICITUD = `SELECT sav.id, sav.token, sav.estado, sav.motivo, sav.monto, sav.solicitado_por, sav.fecha_solicitud,
              v.id_venta as venta_id, v.codigo, v.total,
              COALESCE((CAST(c.nombre AS text) || CAST(' ' AS text) || CAST(c.apellido AS text)), 'Sin cliente registrado') as cliente_nombre
       FROM solicitudes_anulacion_ventas sav
       INNER JOIN ventas v ON v.id_venta = sav.venta_id
       LEFT JOIN clientes c ON c.id_cliente = v.cliente_id`;

/** Bandeja de solicitudes pendientes: la primera ruta, o la caja sin token. */
export async function listarSolicitudesPendientes(): Promise<SolicitudAnulacion[]> {
  return await query<SolicitudAnulacion[]>(
    `${SELECCION_SOLICITUD}
       WHERE sav.estado = 'pendiente'
       ORDER BY sav.fecha_solicitud DESC`
  );
}

/** Solicitud por token, sin filtro de estado: la vista de confirmación. */
export async function obtenerSolicitudPorToken(token: string): Promise<SolicitudAnulacion[]> {
  return await query<SolicitudAnulacion[]>(
    `${SELECCION_SOLICITUD}
      WHERE sav.token = ? AND sav.estado = 'pendiente'
      LIMIT 1`,
    [token]
  );
}

/**
 * Escrituras sobre tablas propias de Ventas (`ventas`, `detalle_ventas`,
 * `devoluciones_ventas`, `detalle_devoluciones_ventas`,
 * `solicitudes_anulacion_ventas`, `ventas_usuarios`). Reciben
 * `ContextoOperacion`: la anulación confirma o revierte junto con caja,
 * prepago, comisiones, propinas, stock y habitación. Mismo SQL heredado.
 */

export interface VentaAnulacion {
  id_venta: string;
  estado: number;
  habitacion_id: string | null;
  cliente_id: string | null;
  caja_id: string | null;
  pedido_id: string | null;
  metodo_pago: string | null;
  total: number;
  sub_total: number;
  propina: number;
  total_comision: number;
  pagos_mixtos: unknown;
}

export async function leerVentaParaAnular(
  ventaId: string,
  contexto: ContextoOperacion
): Promise<VentaAnulacion | null> {
  const trx = resolverTransaccion(contexto);
  const rows = await trx<VentaAnulacion[]>(
    `SELECT id_venta, estado, habitacion_id, cliente_id, caja_id, pedido_id, metodo_pago, total, sub_total,
            propina, total_comision, pagos_mixtos
       FROM ventas WHERE id_venta = ? LIMIT 1`,
    [ventaId]
  );
  return rows[0] ?? null;
}

export async function estadoTrasSolicitud(
  ventaId: string,
  contexto: ContextoOperacion
): Promise<number> {
  const trx = resolverTransaccion(contexto);
  const rows = await trx<{ habitacion_id: string | null; tiempo: number }[]>(
    'SELECT habitacion_id, tiempo FROM ventas WHERE id_venta = ? LIMIT 1',
    [ventaId]
  );
  return rows.length && rows[0].habitacion_id && Number(rows[0].tiempo || 0) > 0 ? 2 : 1;
}

export async function marcarEstadoVenta(
  ventaId: string,
  estado: number,
  contexto: ContextoOperacion
): Promise<void> {
  await resolverTransaccion(contexto)(
    'UPDATE ventas SET estado = ?, fecha_mod = ? WHERE id_venta = ?',
    [estado, getNowInBusinessTimezone(), ventaId]
  );
}

export async function leerDetallesParaDevolucion(
  ventaId: string,
  contexto: ContextoOperacion
): Promise<VentaRefundDetailRow[]> {
  return await resolverTransaccion(contexto)<VentaRefundDetailRow[]>(
    `SELECT id_detalle_venta, producto_id, cantidad, precio, sub_total, comision
       FROM detalle_ventas WHERE venta_id = ? ORDER BY id_detalle_venta ASC`,
    [ventaId]
  );
}

export async function registrarDevolucionVenta(
  params: {
    ventaId: string;
    clienteId?: string | null;
    refundTotal: number;
    refundSubTotal: number;
    refundComision: number;
    detailRows: VentaRefundDetailRow[];
  },
  contexto: ContextoOperacion
): Promise<void> {
  const refundTotal = Math.max(0, Math.round(Number(params.refundTotal || 0)));
  if (refundTotal <= 0) return;
  const refundSubTotal = Math.max(0, Math.round(Number(params.refundSubTotal || 0)));
  const refundComision = Math.max(0, Math.round(Number(params.refundComision || 0)));
  const now = getNowInBusinessTimezone();
  const trx = resolverTransaccion(contexto);
  const devolucionVentaId = generateUUID();

  await trx(
    `INSERT INTO devoluciones_ventas
       (id_devolucion_venta, cliente_id, venta_id, total, fecha_crea, estado)
     VALUES (?, ?, ?, ?, ?, 1)`,
    [devolucionVentaId, params.clienteId || null, params.ventaId, refundTotal, now]
  );

  if (!params.detailRows.length || refundSubTotal <= 0) return;

  const refundedSubtotals = allocateProportionally(
    params.detailRows,
    row => row.sub_total,
    refundSubTotal
  );
  const refundedComisiones = allocateProportionally(
    params.detailRows,
    row => row.comision,
    refundComision
  );
  const refundComisionByDetailId = new Map(
    refundedComisiones.map(row => [row.id_detalle_venta, Number(row.nextAmount || 0)])
  );

  for (const row of refundedSubtotals) {
    const refundedLineSubTotal = Number(row.nextAmount || 0);
    const refundedLineComision = refundComisionByDetailId.get(row.id_detalle_venta) || 0;
    if (refundedLineSubTotal <= 0 && refundedLineComision <= 0) continue;

    const originalQuantity = Math.max(0, Math.round(Number(row.cantidad || 0)));
    const canPreserveOriginalQuantity =
      originalQuantity > 0 &&
      refundedLineSubTotal > 0 &&
      refundedLineSubTotal % originalQuantity === 0;
    const quantity = canPreserveOriginalQuantity
      ? originalQuantity
      : refundedLineSubTotal > 0
        ? 1
        : Math.max(originalQuantity, 1);
    const price = canPreserveOriginalQuantity
      ? Math.round(refundedLineSubTotal / originalQuantity)
      : refundedLineSubTotal;

    await trx(
      `INSERT INTO detalle_devoluciones_ventas
         (id_detalle_devolucion, devolucion_venta_id, producto_id, cantidad, precio, comision, fecha_crea, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        generateUUID(),
        devolucionVentaId,
        row.producto_id || null,
        quantity,
        price,
        refundedLineComision,
        now
      ]
    );
  }
}

export async function ajustarDetallesVenta(
  detailRows: VentaRefundDetailRow[],
  newSubTotal: number,
  newComision: number,
  contexto: ContextoOperacion
): Promise<void> {
  const trx = resolverTransaccion(contexto);
  const updatedSubtotals = allocateProportionally(detailRows, row => row.sub_total, newSubTotal);
  const updatedComisiones = allocateProportionally(detailRows, row => row.comision, newComision);
  const comisionByDetailId = new Map(
    updatedComisiones.map(row => [row.id_detalle_venta, Number(row.nextAmount || 0)])
  );
  for (const row of updatedSubtotals) {
    await trx('UPDATE detalle_ventas SET sub_total = ?, comision = ? WHERE id_detalle_venta = ?', [
      Number(row.nextAmount || 0),
      comisionByDetailId.get(row.id_detalle_venta) || 0,
      row.id_detalle_venta
    ]);
  }
}

export async function actualizarVentaParcial(
  ventaId: string,
  valores: {
    newTotal: number;
    newSubTotal: number;
    newPropina: number;
    newComision: number;
    pagosMixtosJson: string;
    nextState: number;
  },
  contexto: ContextoOperacion
): Promise<void> {
  await resolverTransaccion(contexto)(
    `UPDATE ventas SET total = ?, sub_total = ?, propina = ?, total_comision = ?, pagos_mixtos = ?, estado = ?, fecha_mod = ? WHERE id_venta = ?`,
    [
      valores.newTotal,
      valores.newSubTotal,
      valores.newPropina,
      valores.newComision,
      valores.pagosMixtosJson,
      valores.nextState,
      getNowInBusinessTimezone(),
      ventaId
    ]
  );
}

export async function crearSolicitudAnulacion(
  ventaId: string,
  motivo: string,
  solicitadoPor: string,
  monto: number,
  contexto: ContextoOperacion
): Promise<string> {
  const idAnul = generateUUID();
  const token = generateUUID();
  const trx = resolverTransaccion(contexto);
  await trx(
    `INSERT INTO solicitudes_anulacion_ventas (id, venta_id, token, estado, fecha_solicitud, solicitado_por, motivo, monto)
     VALUES (?, ?, ?, 'pendiente', ?, ?, ?, ?)`,
    [idAnul, ventaId, token, getNowInBusinessTimezone(), solicitadoPor, motivo, monto]
  );
  return token;
}

export async function actualizarEstadoSolicitud(
  requestId: string,
  status: string,
  contexto: ContextoOperacion
): Promise<'confirmada' | 'rechazada'> {
  const nextStatus = normalizeSolicitudStatus(status);
  const trx = resolverTransaccion(contexto);
  const rows = await trx<Array<{estado: string}>>('SELECT estado FROM solicitudes_anulacion_ventas WHERE id = ? FOR UPDATE', [requestId]);
  if (!rows[0] || rows[0].estado !== 'pendiente') throw new BusinessError('La solicitud ya fue procesada');
  await resolverTransaccion(contexto)(
    'UPDATE solicitudes_anulacion_ventas SET estado = ? WHERE id = ?',
    [nextStatus, requestId]
  );
  return nextStatus;
}

export async function leerVentaDeSolicitud(
  requestId: string,
  contexto: ContextoOperacion
): Promise<string | null> {
  const rows = await resolverTransaccion(contexto)<{ venta_id: string }[]>(
    'SELECT venta_id FROM solicitudes_anulacion_ventas WHERE id = ?',
    [requestId]
  );
  return rows[0]?.venta_id ?? null;
}

export async function leerMontoSolicitud(
  requestId: string,
  contexto: ContextoOperacion
): Promise<number> {
  const rows = await resolverTransaccion(contexto)<{ monto: number }[]>(
    'SELECT monto FROM solicitudes_anulacion_ventas WHERE id = ? LIMIT 1',
    [requestId]
  );
  return Number(rows[0]?.monto || 0);
}

export async function leerAnfitrionasVenta(
  ventaId: string,
  contexto: ContextoOperacion
): Promise<string[]> {
  const rows = await resolverTransaccion(contexto)<{ usuario_id: string }[]>(
    'SELECT usuario_id FROM ventas_usuarios WHERE venta_id = ?',
    [ventaId]
  );
  return rows.map(row => row.usuario_id);
}

/**
 * Cierre de una venta temporizada. La escribe Operación (temporizadores) a
 * través de esta operación del propietario, en la misma unidad donde se
 * libera la habitación.
 */
export async function finalizarVentaTemporizada(
  ventaId: string,
  contexto: ContextoOperacion
): Promise<void> {
  await resolverTransaccion(contexto)('UPDATE ventas SET estado = 1 WHERE id_venta = ?', [ventaId]);
}

/**
 * Borrado físico de una venta. Sin llamadores en producción (la ruta DELETE
 * está deshabilitada y el flujo es la anulación); se conserva para los tests
 * de integración heredados.
 */
export async function eliminarVentaFisica(
  ventaId: string,
  contexto: ContextoOperacion
): Promise<void> {
  const trx = resolverTransaccion(contexto);
  await trx('DELETE FROM detalle_ventas WHERE venta_id = ?', [ventaId]);
  await trx('DELETE FROM ventas WHERE id_venta = ?', [ventaId]);
}
