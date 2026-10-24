import { permiteAnfitrionaConComision } from '@/lib/sales/hostessShortPrices';
import type { VentaCreate } from '@/types/venta';

export function buildSaleDetail(p: any) {
  const selectedHostesses =
    (p.tipo_venta === 'shot' || p.botella_anfitriona !== false) &&
    permiteAnfitrionaConComision(
      p.tipo_venta === 'shot' ? 'shot' : 'botella',
      p.comision ?? p.commission,
      Boolean(p.shot_anfitriona)
    ) &&
    Array.isArray(p.selectedHostesses)
      ? p.selectedHostesses
          .filter((h: unknown) => h !== null && h !== undefined)
          .map((h: string | number) => String(h))
      : [];

  const normalizedDetail = {
    producto_id: p.producto_id || p.id,
    presentacion_id: p.presentacion_id || null,
    ...(p.tipo_venta === 'shot'
      ? {
          tipo_venta: 'shot' as const,
          shot_anfitriona: Boolean(p.shot_anfitriona),
          acompanamiento_corto: p.acompanamiento_corto
        }
      : {}),
    ...(p.tipo_venta !== 'shot' ? { botella_anfitriona: p.botella_anfitriona !== false } : {}),
    acompanamiento_botella: p.tipo_venta !== 'shot' ? p.acompanamiento_botella : undefined,
    precio: p.precio,
    comision: selectedHostesses.length > 0 ? (p.comision || 0) * p.cantidad : 0,
    cantidad: p.cantidad,
    sub_total: p.subtotal,
    isChampagne: Boolean(p.isChampagne)
  };

  if (selectedHostesses.length === 0) return normalizedDetail;
  if (p.isChampagne) return { ...normalizedDetail, hostesses: selectedHostesses };
  if (selectedHostesses.length === 1)
    return { ...normalizedDetail, hostess_id: selectedHostesses[0] };
  return { ...normalizedDetail, hostesses: selectedHostesses };
}

export interface VentaPayloadInput {
  selectedCliente: string;
  metodoPago: string;
  totals: { subtotal: number; propina: number; total: number };
  productos: any[];
  todasAnf: string[];
  servicioId: string | null;
  servicioAnfitrionas: string[];
  servicioAnfitrionasIniciales: string[];
  requiresRoom: boolean;
  selectedHabitacion: string;
  manualTime: string;
  selectedRoomInfo: any;
  prepagoDestinos?: { cliente_id: string; monto: number }[];
}

export function buildVentaPayload({
  selectedCliente,
  metodoPago,
  totals,
  productos,
  todasAnf,
  servicioId,
  servicioAnfitrionas,
  servicioAnfitrionasIniciales,
  requiresRoom,
  selectedHabitacion,
  manualTime,
  selectedRoomInfo,
  prepagoDestinos
}: VentaPayloadInput): VentaCreate {
  return {
    cliente_id: selectedCliente !== 'none' ? selectedCliente : null,
    metodo_pago: metodoPago as 'efectivo' | 'tarjeta' | 'transferencia' | 'prepago',
    propina: totals.propina,
    sub_total: totals.subtotal,
    total: totals.total,
    detalles: productos.map(buildSaleDetail),
    usuarios: todasAnf,
    ...(servicioId && { servicio_id: servicioId }),
    ...(servicioId &&
      [...servicioAnfitrionas].sort().join(',') !==
        [...servicioAnfitrionasIniciales].sort().join(',') && {
        servicio_anfitrionas: servicioAnfitrionas
      }),
    ...((servicioId || requiresRoom) &&
      selectedHabitacion && { habitacion_id: selectedHabitacion }),
    ...((servicioId || requiresRoom) &&
      selectedHabitacion && {
        tiempo: servicioId ? 0 : requiresRoom ? parseInt(manualTime) : selectedRoomInfo?.time || 60
      }),
    ...(metodoPago === 'prepago' && prepagoDestinos?.length
      ? { prepago_destinos: prepagoDestinos }
      : {})
  };
}
