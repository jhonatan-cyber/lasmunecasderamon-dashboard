import 'server-only';

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
  obtenerServicioParaAnulacion,
  registrarSolicitudAnulacionServicio
} from './servicios/servicio';
export { obtenerCuentaParaAnulacion, obtenerSolicitudAnulacionCuenta } from './cuentas/servicio';
export {
  contarPedidosPendientes,
  listarServiciosEnCurso,
  listarSolicitudesCuentasPendientes
} from './lecturas/servicio';
export { revisarTemporizadores } from './temporizadores/servicio';
export type { ResultadoTemporizadores } from './temporizadores/servicio';
