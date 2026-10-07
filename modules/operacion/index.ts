import 'server-only';
export { obtenerServicioParaAlerta } from './servicios/servicio';

/**
 * API pública del módulo Operación — servidor.
 *
 * Único punto de entrada para rutas HTTP y otros módulos (§5). Los
 * repositorios son privados: la puerta `modulo-solo-api-publica` de
 * `scripts/arquitectura/limites.mjs` falla ante cualquier import que apunte al
 * interior del módulo por otra vía. Los tipos que consumen los clientes viven
 * en `./contracts` y se importan directamente de allí.
 */
export {
  obtenerSolicitudAnulacionServicioPorToken,
  listarSolicitudesAnulacionServiciosPendientes,
  obtenerServicioParaAnulacion,
  registrarSolicitudAnulacionServicio,
  listarServicios,
  listarServiciosPorFechas,
  listarServiciosDeUsuario,
  obtenerServicioDetallado,
  eliminarServicio
} from './servicios/servicio';
export {
  anularServicioEnUnidad,
  aprobarAnulacionServicio,
  actualizarEstadoServicio,
  solicitarAnulacionServicio,
  procesarAnulacionServicio
} from './servicios/anulaciones';
export {
  crearServicioEnUnidad,
  crearServicio,
  actualizarServicio,
  actualizarServicioCasoUso
} from './servicios/creacion';
export { obtenerCuentaParaAnulacion, obtenerSolicitudAnulacionCuenta } from './cuentas/servicio';
export { crearCuentaPrepagoRecarga, cerrarCuentasPrepagoSaldadas } from './cuentas/servicio';
export { detenerTemporizadorCuenta, solicitarAnulacionCuenta } from './cuentas/servicio';
export { actualizarCuenta, type EntradaActualizacionCuenta } from './cuentas/servicio';
export { crearCuenta, type EntradaAltaCuenta } from './cuentas/servicio';
export { listarCuentas, finalizarSesionHabitacion, eliminarCuenta } from './cuentas/servicio';
export {
  contarPedidosPendientes,
  listarServiciosEnCurso,
  listarSolicitudesCuentasPendientes
} from './lecturas/servicio';
export { revisarTemporizadores } from './temporizadores/servicio';
export type { ResultadoTemporizadores } from './temporizadores/servicio';

export { cobrarYPrepararVenta, consultarCuentaCobrada } from './cobro/servicio';

export {
  ocuparHabitacionVenta,
  cerrarPedidoFacturado,
  pausarConflictosVenta,
  pausarConflictosServicio,
  ocuparHabitacionSiCorresponde,
  liberarHabitacionPorAnulacion,
  reabrirPedidoPorAnulacion,
  marcarPedidoPorAnulacion
} from './facturacion/servicio';

export { cobrarCuenta } from './cobro/servicio';

export { consultarHabitacion } from './facturacion/servicio';

export { ServiceService } from './servicios/fachada';
export { procesarAnulacionCuentaCanal } from './cuentas/anulacionesServicio';

export { AccountService } from './cuentas/fachada';

export { RoomService } from './habitaciones/servicio';

export { OrderService } from './pedidos/servicio';

export { TimerService } from './temporizadores/fachada';

export { ServiceRequestService } from './solicitudes/servicio';
