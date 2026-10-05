/**
 * Infraestructura del módulo Identidad para la matriz de permisos. SQL privado:
 * nadie fuera de `modules/identidad` importa este archivo (§5).
 *
 * Estas consultas vivían dentro de rutas HTTP (`/api/roles/[id]/permissions`,
 * `/api/users/[id]/permissions` y `/api/permissions/setup-cajero`), que mezclaban
 * adaptación, consulta, transacción y efectos. Mismo SQL y misma selección que tenían
 * las rutas.
 */
import { generateUUID, query, withTransaction } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';

/** Permisos asignados al rol, en el orden que consume la matriz de la UI. */
export async function listarPermisosDeRol(rolId: string): Promise<Permiso[]> {
  return await query<Permiso[]>(
    `
      SELECT
        p.id,
        p.name,
        p.description,
        p.module,
        p.action
      FROM permissions p
      INNER JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = ? AND p.deleted_at IS NULL
    `,
    [rolId]
  );
}

/** Todos los permisos vivos, marcando cuáles tiene el rol. */
export async function listarPermisosConAsignacion(rolId: string): Promise<PermisoDeRol[]> {
  return await query<PermisoDeRol[]>(
    `SELECT
        p.id,
        p.name,
        p.description,
        p.module,
        p.action,
        p.created_at,
        p.updated_at,
        CASE WHEN rp.role_id IS NOT NULL THEN true ELSE false END AS assigned
      FROM permissions p
      LEFT JOIN role_permissions rp
        ON rp.permission_id = p.id
       AND rp.role_id = ?
      WHERE p.deleted_at IS NULL
      ORDER BY p.module ASC, p.action ASC`,
    [rolId]
  );
}

/**
 * Reemplaza la matriz del rol. Borra y reinserta dentro de una transacción para que
 * un fallo intermedio no deje al rol sin permisos.
 */
export async function reemplazarPermisosDeRol(
  rolId: string,
  permissionIds: string[]
): Promise<void> {
  await withTransaction(async trx => {
    await trx('DELETE FROM role_permissions WHERE role_id = ?', [rolId]);

    for (const permissionId of permissionIds) {
      // role_permissions no tiene defaults: id y created_at son NOT NULL y hay que
      // enviarlos explícitamente.
      await trx(
        `INSERT INTO role_permissions (id, role_id, permission_id, created_at)
           VALUES (?, ?, ?, ?)`,
        [generateUUID(), rolId, permissionId, getNowInBusinessTimezone()]
      );
    }
  });
}

/** Rol por nombre normalizado en minúsculas; los seeds lo buscan así. */
export async function obtenerRolPorNombre(nombre: string): Promise<{ id_rol: string }[]> {
  return await query<{ id_rol: string }[]>(
    `SELECT id_rol FROM roles WHERE LOWER(nombre) = ? LIMIT 1`,
    [nombre]
  );
}

/** ¿Hay ya roles? Los seeds sólo escriben cuando la tabla está vacía. */
export async function contarRoles(): Promise<number> {
  const rows = await query<{ count: number }[]>(`SELECT COUNT(*)::int AS count FROM roles`);
  return rows?.[0]?.count ?? 0;
}

/** Permiso vivo con ese par módulo/acción, si existe. */
export async function buscarPermiso(modulo: string, accion: string): Promise<{ id: string }[]> {
  return await query<{ id: string }[]>(
    `SELECT id FROM permissions WHERE module = ? AND action = ? AND deleted_at IS NULL LIMIT 1`,
    [modulo, accion]
  );
}

/** Crea el permiso faltante. El timestamp se genera aquí, como antes, en UTC. */
export async function crearPermiso(p: {
  module: string;
  action: string;
  name: string;
}): Promise<string> {
  const permId = generateUUID();
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  await query(
    `INSERT INTO permissions (id, name, description, module, action, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [permId, p.name, p.name, p.module, p.action, now, now]
  );
  return permId;
}

/** ¿El par rol/permiso ya está en la matriz? */
export async function existePermisoEnRol(rolId: string, permisoId: string): Promise<boolean> {
  const rows = await query<{ existe: number }[]>(
    `SELECT 1 FROM role_permissions WHERE role_id = ? AND permission_id = ? LIMIT 1`,
    [rolId, permisoId]
  );
  return rows.length > 0;
}

/** Inserta el par en la matriz del rol. */
export async function asignarPermiso(rolId: string, permisoId: string): Promise<void> {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  await query(
    `INSERT INTO role_permissions (id, role_id, permission_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
    [generateUUID(), rolId, permisoId, now, now]
  );
}

interface Permiso {
  id: string;
  name: string;
  description: string | null;
  module: string;
  action: string;
}

interface PermisoDeRol extends Permiso {
  created_at: string | null;
  updated_at: string | null;
  assigned: boolean;
}
