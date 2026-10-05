import 'server-only';

/**
 * API pública del módulo Clientes — servidor.
 *
 * Único punto de entrada para rutas HTTP y otros módulos (§5). El repositorio es
 * privado: la puerta `modulo-solo-api-publica` de `scripts/arquitectura/limites.mjs`
 * falla ante cualquier import que apunte al interior por otra vía. Los tipos que
 * consumen los clientes viven en `./contracts`.
 */
export {
  aprobarSolicitud,
  listarSolicitudes,
  obtenerSolicitud,
  rechazarSolicitud,
  registrarRecordatorio
} from './devoluciones/servicio';
