import 'server-only';

/**
 * API pública del módulo Identidad — servidor.
 *
 * Antes este módulo sólo tenía `contracts.ts` porque las rutas de usuarios, roles y
 * permisos ejecutaban su propio SQL. Ahora hay una API: los repositorios son
 * privados y la puerta `modulo-solo-api-publica` de
 * `scripts/arquitectura/limites.mjs` falla ante cualquier import que apunte al
 * interior por otra vía. Los tipos que consumen los clientes viven en `./contracts`.
 */
export {
  cambiarPassword,
  listarPersonalActivo,
  listarUsuariosPublicos,
  obtenerResumenUsuario,
  usuarioEstaActivo
} from './usuarios/servicio';
export {
  actualizarPermisosDeRol,
  listarMatrizDeRol,
  listarPermisosDeUsuario,
  sembrarPermisosCajero
} from './permisos/servicio';
export type { ResultadoSeedCajero } from './permisos/servicio';
export { contarRoles, obtenerRolPorNombre } from './roles/servicio';

export { actualizarDisponibilidadTrasVenta } from './disponibilidad/servicio';

export { actualizarDisponibilidad, validarAnfitrionasEnLocal } from './disponibilidad/servicio';
