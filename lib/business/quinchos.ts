/**
 * Reglas puras de la reserva de quincho, compartidas por el formulario y el
 * servidor para que el total que se ve sea el que se cobra.
 */

/** Tope de las columnas `integer` de PostgreSQL para montos y totales. */
export const MAX_TOTAL_RESERVA = 2147483647;

/**
 * Total de la reserva: personas × monto por persona, en pesos enteros.
 * Devuelve 0 mientras los datos no alcancen para calcularlo (el formulario lo
 * usa para mostrar el total en vivo).
 */
export function calcularTotalReserva(
  cantidadPersonas: number | string,
  montoPorPersona: number | string
): number {
  const personas = Math.trunc(Number(cantidadPersonas));
  const monto = Math.trunc(Number(montoPorPersona));
  if (!Number.isFinite(personas) || !Number.isFinite(monto)) return 0;
  if (personas <= 0 || monto <= 0) return 0;
  return personas * monto;
}
