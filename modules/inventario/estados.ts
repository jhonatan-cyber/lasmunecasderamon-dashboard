/**
 * Estados de una unidad de inventario.
 *
 * Nota: `estado` indica si la unidad está vigente ('almacen' = activa,
 * 'inactivo' = dada de baja, 'vendida' = salió del bar con una venta) y
 * `ubicacion` dónde está físicamente ('almacen' | 'bar' | ...). El conteo de
 * stock solo suma activas.
 *
 * Este archivo es parte de la API pública del módulo: el SQL de cada
 * subdominio interpola estas constantes y `ProductService` valida contra ellas
 * al dar de baja unidades.
 */
export const ESTADO_UNIDAD_ACTIVA = 'almacen';
export const ESTADO_UNIDAD_INACTIVA = 'inactivo';
export const ESTADO_UNIDAD_VENDIDA = 'vendida';

// 'vendida' queda fuera a propósito: no se puede reactivar una botella vendida
// desde el alta/baja manual de unidades.
export const ESTADOS_UNIDAD_VALIDOS: readonly string[] = [
  ESTADO_UNIDAD_ACTIVA,
  ESTADO_UNIDAD_INACTIVA
];

export function esEstadoUnidadValido(estado: unknown): estado is string {
  return typeof estado === 'string' && ESTADOS_UNIDAD_VALIDOS.includes(estado);
}
