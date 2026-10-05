import 'server-only';

export { consumirStockBar } from './bar/servicio';
export {
  aceptarTransferencia,
  listarTransferencias,
  rechazarTransferencia,
  traspasarAlBar
} from './transferencias/servicio';
export { confirmarRecepcionEnvase, listarDevoluciones, verificarEnvase } from './envases/servicio';
export {
  actualizarFotoPresentacion,
  actualizarPresentacion,
  buscarPresentacionPorCodigo,
  crearPresentacion,
  eliminarPresentacion,
  listarPresentaciones,
  listarPresentacionesPorProductos,
  obtenerPresentacion
} from './presentaciones/servicio';
export {
  cambiarEstadoUnidades,
  generarUnidades,
  listarUnidades,
  marcarUnidadesImpresas,
  registrarUnidades,
  sincronizarStockTotal
} from './unidades/servicio';
export {
  DEFAULT_BOTTLE_ML,
  DEFAULT_SHOT_ML,
  DEFAULT_SHOTS_ALERTA,
  getBarMlConfig,
  getTopeSimple
} from './bar/configuracion';
export { listarStockBar, obtenerResumenShots } from './bar/servicio';
export { listarParaVenta } from './catalogo/servicio';
export { listarMovimientos, listarMovimientosRecientes } from './movimientos/servicio';
