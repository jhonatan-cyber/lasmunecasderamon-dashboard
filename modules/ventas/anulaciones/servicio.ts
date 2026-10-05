/**
 * Casos de uso de anulación de ventas — API pública de servidor del módulo
 * ventas.
 *
 * Sólo lecturas: no abren unidad de trabajo ni emiten efectos, por eso el
 * servicio las reexporta de la infraestructura. La escritura de la solicitud
 * (crear, confirmar y rechazar) sigue en `SaleQueries` y se moverá cuando la
 * transacción de ventas migre al contexto opaco, en la fase 5.
 */
export {
  existeSolicitudAnulacion,
  listarSolicitudesPendientes,
  obtenerSolicitudPorToken,
  obtenerVentaParaAnulacion
} from './repositorio';
