import 'server-only';
import * as repositorio from './repositorio';

export function listarUsuariosActivosPorRoles(roles: readonly string[]) {
  return repositorio.listarUsuariosActivosPorRoles(roles);
}
