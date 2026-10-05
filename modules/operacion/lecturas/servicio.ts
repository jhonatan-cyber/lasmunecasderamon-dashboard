/**
 * Casos de uso de lecturas de operación — aplicación del módulo Operación.
 *
 * No toca SQL ni el driver: eso vive en `./repositorio`, que es privado del módulo.
 * Son lecturas puras: la reexportación basta como capa de aplicación.
 */
export {
  contarPedidosPendientes,
  listarServiciosEnCurso,
  listarSolicitudesCuentasPendientes
} from './repositorio';
