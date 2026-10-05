import 'server-only';

/**
 * API pública del módulo Personal — servidor.
 *
 * Único punto de entrada para rutas HTTP, otros módulos y futuros workflows
 * (§5). El repositorio es privado: la puerta `modulo-solo-api-publica` de
 * `scripts/arquitectura/limites.mjs` falla ante cualquier import que apunte al
 * interior del módulo por otra vía. Los tipos que consumen los clientes viven
 * en `./contracts` y se importan directamente de allí.
 */
export {
  listarHorasExtras,
  listarHorasExtrasDeUsuario,
  listarHorasExtrasPorFechas,
  registrarHoraExtra,
  actualizarHoraExtra,
  eliminarHoraExtra
} from './horas-extras/servicio';
export {
  solicitarAnticipo,
  solicitarAnticipoSimple,
  otorgarAnticipo,
  listarAnticipos,
  listarAnticiposPorFechas,
  listarAnticiposDeUsuario,
  listarSolicitudesDeUsuario,
  procesarSolicitud,
  procesarSolicitudDeTexto,
  entregarAnticipo,
  actualizarEstadoAnticipo,
  procesarAnticipoDesdeComando,
  tieneSolicitudPendiente,
  obtenerSolicitudAnticipoPorId,
  listarAnticiposPendientes
} from './anticipos/servicio';
export { getAnticipoBalances } from './balances/servicio';
