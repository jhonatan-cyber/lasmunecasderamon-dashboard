/**
 * Configuración económica de una habitación.
 *
 * El dashboard transporta los campos como `price`/`time` y la base de datos y la
 * app móvil como `precio`/`tiempo`; ambas formas se aceptan para que la misma
 * regla corra en servidor y en cliente.
 */
export interface HabitacionConfigurable {
  precio?: unknown;
  price?: unknown;
  comision_anfitriona?: unknown;
  tiempo?: unknown;
  time?: unknown;
}

function numero(valor: unknown): number {
  return Number(valor ?? 0);
}

/**
 * Una habitación es "solo ventas" cuando no tiene precio, ni comisión, ni
 * duración: no puede abrirse como privado/servicio y nunca queda ocupada.
 *
 * La comparación es con AND porque la habitación no tiene ninguna prestación
 * configurada. `esHabitacionLibreIngreso` responde otra pregunta con OR: si la
 * venta debe saltarse la validación de ocupación y de tiempo.
 */
export function esHabitacionSoloVentas(
  habitacion: HabitacionConfigurable | null | undefined
): boolean {
  if (!habitacion) return false;
  return (
    numero(habitacion.precio ?? habitacion.price) <= 0 &&
    numero(habitacion.comision_anfitriona) <= 0 &&
    numero(habitacion.tiempo ?? habitacion.time) <= 0
  );
}

/**
 * Habitaciones que sí pueden abrir un privado/servicio. La misma lista alimenta
 * la pantalla de privados y la de solicitudes de servicio; dejar fuera a las de
 * "solo ventas" evita ofrecer una opción que el servidor va a rechazar.
 */
export function habitacionesParaServicio<T extends HabitacionConfigurable>(habitaciones: T[]): T[] {
  return habitaciones.filter(habitacion => !esHabitacionSoloVentas(habitacion));
}
