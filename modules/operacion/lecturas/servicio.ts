/**
 * Casos de uso de lecturas de operación — aplicación del módulo Operación.
 *
 * No toca SQL ni el driver: eso vive en `./repositorio`, que es privado del módulo.
 * Son lecturas puras: la reexportación basta como capa de aplicación.
 */
import {
  contarPedidosPendientes as contarPedidosPendientesInterno,
  listarServiciosEnCurso as listarServiciosEnCursoInterno,
  listarSolicitudesCuentasPendientes as listarSolicitudesCuentasPendientesInterno
} from './repositorio';

export function contarPedidosPendientes(
  ...args: Parameters<typeof contarPedidosPendientesInterno>
) {
  return contarPedidosPendientesInterno(...args);
}

export function listarServiciosEnCurso(...args: Parameters<typeof listarServiciosEnCursoInterno>) {
  return listarServiciosEnCursoInterno(...args);
}

export function listarSolicitudesCuentasPendientes(
  ...args: Parameters<typeof listarSolicitudesCuentasPendientesInterno>
) {
  return listarSolicitudesCuentasPendientesInterno(...args);
}
