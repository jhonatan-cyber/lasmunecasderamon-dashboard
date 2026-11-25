import { query } from '@/lib/database/db';

export interface PushUserRow {
  push_token: string | null;
}

export async function listarTokensDeUsuarios(userIds: string[]): Promise<PushUserRow[]> {
  if (userIds.length === 0) return [];
  return query<PushUserRow[]>(
    `SELECT DISTINCT token AS push_token FROM push_tokens WHERE usuario_id IN (${userIds.map(() => '?').join(',')}) AND token IS NOT NULL`,
    userIds
  );
}

export async function listarTokensConPermiso(
  module: string,
  action: string
): Promise<PushUserRow[]> {
  return query<PushUserRow[]>(
    `SELECT DISTINCT p.token AS push_token
           FROM push_tokens p INNER JOIN usuarios u ON u.id_usuario = p.usuario_id
           INNER JOIN roles r ON u.rol_id = r.id_rol
          WHERE p.token IS NOT NULL
            AND (LOWER(r.nombre) = 'administrador'
                 OR EXISTS (
                   SELECT 1 FROM role_permissions rp
                    INNER JOIN permissions perm ON perm.id = rp.permission_id
                    WHERE rp.role_id = r.id_rol
                      AND perm.module = ? AND perm.action = ? AND perm.deleted_at IS NULL
                 ))`,
    [module, action]
  );
}

export async function listarTokensDeRol(role: string): Promise<PushUserRow[]> {
  return query<PushUserRow[]>(
    `SELECT DISTINCT p.token AS push_token
           FROM push_tokens p INNER JOIN usuarios u ON u.id_usuario = p.usuario_id
           INNER JOIN roles r ON u.rol_id = r.id_rol
           WHERE LOWER(r.nombre) = LOWER(?) AND p.token IS NOT NULL`,
    [role]
  );
}

export async function eliminarTokenPush(token: string): Promise<void> {
  await query('DELETE FROM push_tokens WHERE token = ?', [token]);
}
