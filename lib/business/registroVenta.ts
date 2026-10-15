import type { z } from 'zod';
import type { SaleCreateSchema } from '@/lib/business/schemas';
import type { ComisionVenta, DetalleComisionVenta } from '@/modules/personal/contracts';
import { BusinessError } from '@/lib/errors/errors';
import { calcularDeltasCaja, calcularDeltasPagoSimple, type MixedPayment } from './pagosMixtos';
import { esHabitacionLibreIngreso, type HabitacionRegistro } from './registroOperacion';

export type VentaValidada = z.output<typeof SaleCreateSchema>;
type DetalleVenta = VentaValidada['detalles'][number];

export function validarCambioAnfitrionasVenta(venta: VentaValidada): void {
  if (venta.servicio_anfitrionas !== undefined && !venta.servicio_id)
    throw new BusinessError('El cambio de anfitrionas requiere un servicio activo');
}

export function validarCajaVenta(
  cajaId: string | null | undefined,
  omitirPostulacion: boolean
): void {
  if (!cajaId && !omitirPostulacion)
    throw new BusinessError('No hay una caja abierta para registrar la venta', 'NO_CAJA_ABIERTA');
}

export function calcularTotalComisionVenta(venta: VentaValidada): number {
  const calculada = venta.detalles.reduce((sum, detalle) => sum + Number(detalle.comision || 0), 0);
  return Number(venta.total_comision || 0) > 0 ? Number(venta.total_comision || 0) : calculada;
}

export function validarHabitacionVenta(
  habitacion: HabitacionRegistro | undefined,
  tiempo: number,
  conServicio: boolean
): boolean {
  if (!habitacion) throw new BusinessError('La habitación no existe', 'ROOM_NOT_FOUND');
  const libreIngreso = esHabitacionLibreIngreso(habitacion);
  if (!conServicio && !libreIngreso) {
    if (Number(habitacion.estado) !== 1 || habitacion.actividad)
      throw new BusinessError('La habitación ya está ocupada', 'ROOM_OCCUPIED');
    if (!Number.isInteger(tiempo) || tiempo <= 0)
      throw new BusinessError(
        'Selecciona un tiempo válido para la habitación',
        'INVALID_ROOM_TIME'
      );
  }
  return libreIngreso;
}

export function obtenerAnfitrionasVenta(venta: VentaValidada): string[] {
  return [
    ...new Set(
      [
        ...(venta.usuarios || []),
        ...venta.detalles.flatMap(d =>
          d.hostesses?.length ? d.hostesses : d.hostess_id ? [d.hostess_id] : []
        )
      ].filter(Boolean)
    )
  ];
}

/** Conserva cantidades, redondeo y asignación del resto a las primeras anfitrionas. */
export function repartirDetalleVenta(d: DetalleVenta, validatedHostessSet: ReadonlySet<string>) {
  const requestedHostesses = d.hostesses?.length ? d.hostesses : d.hostess_id ? [d.hostess_id] : [];
  const hostesses =
    requestedHostesses.length > 0
      ? requestedHostesses.filter((id: string) => validatedHostessSet.has(id))
      : [];

  const totalComm = d.tipo_venta === 'shot' && !d.shot_anfitriona ? 0 : Math.round(d.comision || 0);
  const totalQty = Math.max(1, Number(d.cantidad || 1));
  const isChampagne = d.tipo_venta !== 'shot' && Boolean(d.isChampagne);
  const effectiveHostesses =
    hostesses.length === 0 ? [null] : isChampagne ? hostesses : hostesses.slice(0, totalQty);
  const hostessCount = Math.max(1, effectiveHostesses.length);

  const commissionByIndex: number[] = new Array(hostessCount).fill(0);
  const quantityByIndex: number[] = new Array(hostessCount).fill(0);
  const subtotalByIndex: number[] = new Array(hostessCount).fill(0);

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

  return effectiveHostesses.map((hostessId, i) => ({
    hostessId,
    commPart: commissionByIndex[i],
    qtyPart: quantityByIndex[i],
    subPart: subtotalByIndex[i]
  }));
}

/** La fábrica conserva el orden de UUID de detalles y sus comisiones. */
export function prepararDetallesVenta(
  detalles: VentaValidada['detalles'],
  validatedHostessSet: ReadonlySet<string>,
  ventaId: string,
  now: string,
  generarId: () => string
) {
  const detailRows: Array<Record<string, unknown>> = [];
  const commissionMainRows: ComisionVenta[] = [];
  const commissionDetailRows: DetalleComisionVenta[] = [];
  for (const d of detalles) {
    for (const { hostessId, commPart, qtyPart, subPart } of repartirDetalleVenta(
      d,
      validatedHostessSet
    )) {
      const detailId = generarId();
      // Cómo se vendió queda en el detalle: un shot puede ser a precio de cliente o
      // de anfitriona y eso no se deduce después (el precio solo no basta).
      const tipoVenta = d.tipo_venta === 'shot' ? 'shot' : 'botella';
      detailRows.push({
        id_detalle_venta: detailId,
        venta_id: ventaId,
        producto_id: d.producto_id,
        presentacion_id: d.presentacion_id ?? null,
        tipo_venta: tipoVenta,
        shot_anfitriona: tipoVenta === 'shot' && Boolean(d.shot_anfitriona),
        precio: d.precio,
        comision: commPart,
        cantidad: qtyPart,
        sub_total: subPart,
        hostess_id: hostessId,
        acompanamiento: JSON.stringify(
          (tipoVenta === 'shot' ? d.acompanamiento_corto : d.acompanamiento_botella) ?? null
        ),
        fecha_crea: now
      });

      if (hostessId && commPart > 0) {
        const commissionId = generarId();
        commissionMainRows.push({
          id_comision: commissionId,
          venta_id: ventaId,
          usuario_id: hostessId,
          monto: commPart,
          estado: 1,
          fecha_crea: now
        });
        commissionDetailRows.push({
          id_detalle_comision: generarId(),
          comision_id: commissionId,
          usuario_id: hostessId,
          comision: commPart,
          estado: 1,
          fecha_crea: now
        });
      }
    }
  }
  return { detailRows, commissionMainRows, commissionDetailRows };
}

export function calcularMovimientoCajaVenta(
  venta: VentaValidada,
  pagos: MixedPayment[],
  prepago: number,
  comision: number
) {
  const deltas =
    venta.metodo_pago === 'mixto'
      ? calcularDeltasCaja(pagos)
      : calcularDeltasPagoSimple(venta.metodo_pago, Number(venta.total) - prepago);
  return {
    venta: venta.total - venta.propina,
    propina: venta.propina,
    ...deltas,
    prepago,
    comision
  };
}
