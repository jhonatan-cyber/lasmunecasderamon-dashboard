/**
 * El cajón, en una sola función.
 *
 * Tres superficies tienen que dar el mismo número —la tarjeta de la lista, el detalle del
 * turno y el monto de cierre—, y antes cada una armaba su propia resta: la tarjeta y el
 * detalle descontaban retiros y anticipos que `cajas.efectivo` **ya trae descontados**,
 * porque `WithdrawalService.addRetiro` y `grantAnticipo` lo restan al registrarlos.
 *
 * La regla de oro: `efectivo` es el movimiento del turno ya neta de lo que salió del
 * cajón (retiros y anticipos). Lo único que todavía falta descontar es:
 *
 *   - las **devoluciones**, que se registran en su propia columna y no restan `efectivo`, y
 *   - los **saldos prepago** que los clientes todavía tienen cargados: plata cobrada en un
 *     turno anterior que nunca entró a esta caja (se descuentan al autorizar el cierre).
 */

/** Lo que una caja necesita para calcular su efectivo. Sirve fila cruda y dominio. */
export interface CajaEfectivo {
  monto_apertura?: number | null;
  efectivo?: number | null;
  tarjeta?: number | null;
  transferencia?: number | null;
  /** Como lo expone el dominio (`CajaType`). */
  devoluciones?: number | null;
  /** Como viene en la fila cruda de `cajas` (la columna se llama `devolucion`). */
  devolucion?: number | null;
  /** Lo descontado al autorizar el cierre (0 mientras la caja sigue abierta). */
  saldo_clientes_descontado?: number | null;
}

const num = (valor: unknown): number => Number(valor || 0);

/** Devoluciones: lo devuelto todavía no está restado de `efectivo`. */
export function devolucionesDe(caja: CajaEfectivo | null): number {
  return num(caja?.devoluciones ?? caja?.devolucion);
}

/** Saldos prepago que los clientes todavía tienen cargados (0 con la caja abierta). */
export function saldosClientesDe(caja: CajaEfectivo | null): number {
  return num(caja?.saldo_clientes_descontado);
}

/** Lo que falta por descontar del cajón. */
export function egresosPendientesCaja(caja: CajaEfectivo | null): number {
  return devolucionesDe(caja) + saldosClientesDe(caja);
}

/** Apertura + efectivo del turno: el cajón antes de descontar lo pendiente. */
export function efectivoBaseCaja(caja: CajaEfectivo | null): number {
  return num(caja?.monto_apertura) + num(caja?.efectivo);
}

/** Efectivo real que hay en el cajón. */
export function efectivoNetoCaja(caja: CajaEfectivo | null): number {
  return efectivoBaseCaja(caja) - egresosPendientesCaja(caja);
}

/**
 * Efectivo neto + tarjeta + transferencia: lo que queda en la caja en todos los métodos
 * de pago. Es el número que muestran la tarjeta (`Balance Actual`), el detalle
 * (`Total real`) y el que usa `calcularMontoCierre`.
 */
export function totalCaja(caja: CajaEfectivo | null): number {
  return efectivoNetoCaja(caja) + num(caja?.tarjeta) + num(caja?.transferencia);
}

/**
 * Cuánto se puede retirar ahora mismo.
 *
 * Los saldos prepago **no** se descuentan acá: no son plata de este cajón, el retiro no
 * puede tocarlos (los descuenta el cierre). Sí se descuentan las devoluciones, porque
 * esa plata ya salió y sigue contando dentro de `efectivo`.
 */
export function disponibleParaRetiro(caja: CajaEfectivo | null): number {
  return efectivoBaseCaja(caja) - devolucionesDe(caja);
}

/**
 * Monto de cierre, con los saldos prepago calculados **fuera** de la fila.
 *
 * Los saldos no vienen en `cajas` hasta que el cierre se autoriza: mientras tanto
 * se leen de `clientes.saldo` (`saldosPendientesClientes`), así que van como dato.
 * Sustituye `saldo_clientes_descontado` de la fila: es el mismo número, visto desde
 * el cálculo (fila con caja abierta) o desde la autorización (saldos recién leídos).
 */
export function montoCierreCaja(
  caja: CajaEfectivo | null,
  saldosClientes: number | null | undefined
): number {
  return totalCaja({ ...(caja ?? {}), saldo_clientes_descontado: saldosClientes ?? 0 });
}
