import 'server-only';

export { consumirStockBar } from './bar/servicio';
export { revertirStockAnulacion } from './anulaciones/servicio';
export {
  actualizarProducto,
  buscarProductos,
  crearProducto,
  eliminarProducto,
  guardarNivelesChampagne,
  listarProductos,
  obtenerNivelesChampagne,
  obtenerProductoPorCodigoONombre,
  obtenerProductoPorId,
  reordenarProductos,
  type CodigoGenerado,
  type NuevaPresentacionProducto
} from './productos/servicio';
export { listar as listarCompras, registrarCompra } from './compras/servicio';
export { listar as listarCatalogoCompras } from './compras/catalogo';
export {
  aceptarTransferencia,
  listarTransferencias,
  rechazarTransferencia,
  traspasarAlBar
} from './transferencias/servicio';
export {
  confirmarRecepcionEnvase,
  HORAS_ENVASE_SIN_CONFIRMAR,
  listarDevoluciones,
  obtenerResumenEnvases,
  verificarEnvase,
  verificarEnvases
} from './envases/servicio';
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
export {
  ESTADO_UNIDAD_ACTIVA,
  ESTADO_UNIDAD_INACTIVA,
  ESTADO_UNIDAD_VENDIDA,
  ESTADOS_UNIDAD_VALIDOS,
  esEstadoUnidadValido
} from './estados';
export { listarStockBar, obtenerResumenShots } from './bar/servicio';
export { listarParaVenta } from './catalogo/servicio';
export { listarMovimientos, listarMovimientosRecientes } from './movimientos/servicio';

export { CategoryService } from './categorias/servicio';

export { ProductService } from './productos/fachada';
