import * as repositorio from './repositorio';

export function verificarPermisoUsuario(usuarioId: string, modulo: string, accion: string) {
  return repositorio.verificarPermisoUsuario(usuarioId, modulo, accion);
}
