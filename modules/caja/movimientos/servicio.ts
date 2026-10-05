import {
  obtenerCajaActiva as obtenerCajaActivaInterno,
  registrarMovimientoCobro as registrarMovimientoCobroInterno,
  ajustarIvaCaja as ajustarIvaCajaInterno,
  leerFondoCaja as leerFondoCajaInterno
} from './repositorio';

export function obtenerCajaActiva(...args: Parameters<typeof obtenerCajaActivaInterno>) {
  return obtenerCajaActivaInterno(...args);
}

export function registrarMovimientoCobro(
  ...args: Parameters<typeof registrarMovimientoCobroInterno>
) {
  return registrarMovimientoCobroInterno(...args);
}

export function ajustarIvaCaja(...args: Parameters<typeof ajustarIvaCajaInterno>) {
  return ajustarIvaCajaInterno(...args);
}

export function leerFondoCaja(...args: Parameters<typeof leerFondoCajaInterno>) {
  return leerFondoCajaInterno(...args);
}
