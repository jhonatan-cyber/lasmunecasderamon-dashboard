/**
 * Contratos del módulo de Caja — §5: «DTO y esquemas aptos para consumidores».
 *
 * Caja es dueño de `cajas`, `movimientos_caja`, `retiros`, `solicitudes_cierre_caja`
 * y del impacto de los medios de pago en caja. Clientes administra el saldo prepago. Nace en el corte 12 con lo mínimo que
 * hace falta para que ninguna ruta escriba en sus tablas.
 */

/** Solicitud de cierre de caja esperando confirmación del administrador. */
export interface SolicitudCierrePendiente {
  id: string;
  token: string;
  caja_id: string;
  solicitado_por: string | null;
  monto_cierre_calculado: number | string | null;
  saldo_clientes_descontado: number | string | null;
  fecha_mod: string;
}

/** Importes que un cobro postula a la caja; no permite SQL ni columnas arbitrarias. */
export interface MovimientoCobro {
  venta?: number;
  propina?: number;
  efectivo?: number;
  tarjeta?: number;
  transferencia?: number;
  prepago?: number;
  comision?: number;
  cargo_tarjeta?: number;
  servicio?: number;
  anticipo?: number;
  egreso?: number;
  iva?: number;
  cuenta?: number;
  devolucion?: number;
}
export const AVISO_CIERRE_ENFRIAMIENTO_MS = 60_000;
