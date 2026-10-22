/**
 * Origen de una venta: de dónde nació el cobro.
 *
 * Se guarda en `ventas.origen` al crear la venta (migración 098) y el backfill
 * del histórico usa esta misma prioridad en SQL. Si cambia el orden acá, hay
 * que cambiarlo también en la migración, o el histórico y las ventas nuevas
 * quedan clasificados distinto.
 *
 * La prioridad es la misma que ya usa `OrigenCorto` en el bar, sin `cuenta`: el
 * módulo de cuentas pospago se reemplazó por prepago y ya no genera ventas. Un
 * corto consumido en un servicio se cobra a la habitación pero su origen es el
 * servicio, y por eso `servicio` gana sobre `habitacion`.
 */
export const ORIGENES_VENTA = ['entrada', 'servicio', 'habitacion', 'pedido', 'barra'] as const;

export type OrigenVenta = (typeof ORIGENES_VENTA)[number];

export const ORIGEN_VENTA_POR_DEFECTO: OrigenVenta = 'barra';

export interface SenalesOrigenVenta {
  /** `options.entradaId`: la venta nace de entregar la bebida de una entrada. */
  entradaId?: string | null;
  /** `ventas.servicio_id`: consumo dentro de un servicio. */
  servicioId?: string | null;
  /** `ventas.habitacion_id`: venta cargada a una habitación. */
  habitacionId?: string | null;
  /** `ventas.pedido_id`: la venta cierra un pedido. */
  pedidoId?: string | null;
}

/**
 * Resuelve el origen con la prioridad documentada. Un id vacío no cuenta: las
 * rutas mandan `''` cuando el campo no vino, y una cadena vacía no es una señal.
 */
export function resolverOrigenVenta(senales: SenalesOrigenVenta): OrigenVenta {
  if (senales.entradaId) return 'entrada';
  if (senales.servicioId) return 'servicio';
  if (senales.habitacionId) return 'habitacion';
  if (senales.pedidoId) return 'pedido';
  return ORIGEN_VENTA_POR_DEFECTO;
}
