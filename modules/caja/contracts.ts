/**
 * Contratos del módulo de Caja — §5: «DTO y esquemas aptos para consumidores».
 *
 * Caja es dueño de `cajas`, `movimientos_caja`, `retiros`, `solicitudes_cierre_caja`
 * y de las decisiones sobre el saldo prepago. Nace en el corte 12 con lo mínimo que
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
