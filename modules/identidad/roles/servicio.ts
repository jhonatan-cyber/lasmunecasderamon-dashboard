/**
 * Casos de uso de roles — aplicación del módulo Identidad.
 *
 * No toca SQL ni el driver: eso vive en `./repositorio`, que es privado del módulo.
 * La creación de un rol sigue en `RoleService`, que siembra además la matriz inicial
 * de permisos; moverla aquí cambiaría comportamiento, no sólo dónde vive el SQL.
 */
import * as repositorio from './repositorio';

/** ¿La tabla de roles tiene algo? Los seeds sólo escriben cuando está vacía. */
export async function contarRoles(): Promise<number> {
  return repositorio.contarRoles();
}

/** Id del rol con ese nombre, o `null`. */
export async function obtenerRolPorNombre(nombre: string): Promise<string | null> {
  const [rol] = await repositorio.obtenerRolPorNombre(nombre);
  return rol?.id_rol ?? null;
}
