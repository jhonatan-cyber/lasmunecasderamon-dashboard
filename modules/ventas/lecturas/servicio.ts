/**
 * Casos de uso de lecturas de venta — aplicación del módulo Ventas.
 *
 * No toca SQL ni el driver: eso vive en `./repositorio`, que es privado del módulo.
 * Son lecturas puras: la reexportación basta como capa de aplicación.
 */
import {
  listarVentasEnCurso as listarVentasEnCursoInterno,
  obtenerHabitacionActivaDeAnfitrionas as obtenerHabitacionActivaDeAnfitrionasInterno,
  listarVentas as listarVentasInterno,
  obtenerVenta as obtenerVentaInterno
} from './repositorio';

export function listarVentasEnCurso(...args: Parameters<typeof listarVentasEnCursoInterno>) {
  return listarVentasEnCursoInterno(...args);
}

export function obtenerHabitacionActivaDeAnfitrionas(
  ...args: Parameters<typeof obtenerHabitacionActivaDeAnfitrionasInterno>
) {
  return obtenerHabitacionActivaDeAnfitrionasInterno(...args);
}

export function listarVentas(...args: Parameters<typeof listarVentasInterno>) {
  return listarVentasInterno(...args);
}

export function obtenerVenta(...args: Parameters<typeof obtenerVentaInterno>) {
  return obtenerVentaInterno(...args);
}
import { obtenerVentaParaAlerta as obtenerVentaParaAlertaInterna } from './repositorio';
export function obtenerVentaParaAlerta(solicitudId: string) {
  return obtenerVentaParaAlertaInterna(solicitudId);
}
