/**
 * Infraestructura del módulo Identidad para roles. SQL privado: nadie fuera de
 * `modules/identidad` importa este archivo (§5).
 *
 * El conteo venía de la ruta `/api/roles/setup`, que decidía con él si la tabla
 * estaba vacía antes de sembrar los roles por defecto.
 */
import { query } from '@/lib/database/db';

/** ¿Hay ya roles? Los seeds sólo escriben cuando la tabla está vacía. */
export async function contarRoles(): Promise<number> {
  const rows = await query<{ count: number }[]>(`SELECT COUNT(*)::int AS count FROM roles`);
  return rows?.[0]?.count ?? 0;
}

/** Rol por nombre normalizado en minúsculas; los seeds lo buscan así. */
export async function obtenerRolPorNombre(nombre: string): Promise<{ id_rol: string }[]> {
  return await query<{ id_rol: string }[]>(
    `SELECT id_rol FROM roles WHERE LOWER(nombre) = ? LIMIT 1`,
    [nombre]
  );
}
