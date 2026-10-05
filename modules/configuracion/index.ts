import 'server-only';

/**
 * API pública del módulo Configuración — servidor.
 *
 * Único punto de entrada para rutas HTTP y otros módulos (§5). Los repositorios y
 * el registro son privados: la puerta `modulo-solo-api-publica` de
 * `scripts/arquitectura/limites.mjs` falla ante cualquier import que apunte al
 * interior por otra vía. El registro se reexporta por `./contracts` porque la UI
 * también necesita las categorías y los defaults.
 */
export {
  guardarClave,
  listarConfiguracionesAgrupadas,
  obtenerValorConfiguracion
} from './claves/servicio';
export {
  crearRespaldo,
  listarRespaldos,
  obtenerRespaldoParaDescarga,
  restaurarRespaldo
} from './respaldos/servicio';
