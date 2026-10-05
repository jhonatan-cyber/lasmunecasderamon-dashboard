/**
 * Casos de uso de la matriz de permisos — aplicación del módulo Identidad.
 *
 * No toca SQL ni el driver: eso vive en `./repositorio`, que es privado del módulo.
 *
 * `actualizarPermisosDeRol` conserva el orden de efectos que tenía la ruta: la
 * transacción se confirma antes de invalidar caché y de avisar por SSE. Invalidar
 * antes de confirmar dejaría que otro request repoblara la caché con la matriz
 * anterior y la mantuviera viva 60s.
 */
import { PermissionsCache } from '@/lib/auth/permissions-cache';
import { sendNotificationToAll } from '@/lib/api/sseService';
import type { Permiso, PermisoCatalogo, PermisoDeRol } from '../contracts';
import * as repositorio from './repositorio';
import { listarUsuariosPorRol, obtenerRolIdUsuario } from '../usuarios/repositorio';
import { obtenerRolPorNombre } from '../roles/servicio';

/** Permisos del usuario, vía su rol. Sin rol o sin usuario: lista vacía. */
export async function listarPermisosDeUsuario(usuarioId: string): Promise<Permiso[]> {
  const [usuario] = await obtenerRolIdUsuario(usuarioId);
  if (!usuario?.rol_id) return [];
  return repositorio.listarPermisosDeRol(usuario.rol_id);
}

/** Matriz completa con la marca de lo asignado al rol. */
export async function listarMatrizDeRol(rolId: string): Promise<PermisoDeRol[]> {
  return repositorio.listarPermisosConAsignacion(rolId);
}

/**
 * Reemplaza la matriz del rol. El índice único (role_id, permission_id) convierte un
 * id repetido en un 500, así que se deduplican antes de escribir.
 */
export async function actualizarPermisosDeRol(
  rolId: string,
  permissionIds: string[]
): Promise<void> {
  const unicos = [...new Set(permissionIds.map(id => String(id)))];

  // Los usuarios del rol son los que quedan con la matriz vieja en caché.
  const roleUsers = await listarUsuariosPorRol(rolId);

  await repositorio.reemplazarPermisosDeRol(rolId, unicos);

  // Después del commit: caché primero, aviso después.
  await Promise.all(
    (roleUsers ?? []).map(user => PermissionsCache.invalidate(String(user.id_usuario)))
  );

  sendNotificationToAll('permissions-updated', { roleId: rolId });
}

/** Resultado del seed del rol cajero. */
export interface ResultadoSeedCajero {
  permisosCreados: number;
  permisosAsignados: number;
  permisosYaExistentes: number;
}

/**
 * Seed de permisos del rol cajero: crea los que falten y asigna los que no estén en
 * la matriz. Devuelve `null` si el rol cajero no existe, que es como la ruta
 * respondía 404.
 */
export async function sembrarPermisosCajero(
  catalogo: PermisoCatalogo[]
): Promise<ResultadoSeedCajero | null> {
  const rolId = await obtenerRolPorNombre('cajero');
  if (!rolId) return null;

  let creados = 0;
  let asignados = 0;
  let yaExistentes = 0;

  for (const perm of catalogo) {
    const [existente] = await repositorio.buscarPermiso(perm.module, perm.action);
    let permId: string;

    if (existente) {
      permId = existente.id;
    } else {
      permId = await repositorio.crearPermiso(perm);
      creados++;
    }

    if (await repositorio.existePermisoEnRol(rolId, permId)) {
      yaExistentes++;
    } else {
      await repositorio.asignarPermiso(rolId, permId);
      asignados++;
    }
  }

  return {
    permisosCreados: creados,
    permisosAsignados: asignados,
    permisosYaExistentes: yaExistentes
  };
}
