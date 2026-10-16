import { query } from '@/lib/database/db';

/** La versión se incrementa al revocar sesiones; no depende del vencimiento del JWT. */
export async function obtenerEstadoSesionToken(usuarioId: string) {
  const rows = await query<
    Array<{
      id: string;
      username: string;
      name: string;
      lastName: string;
      nick: string | null;
      email: string;
      role: string;
      sessionVersion: number;
    }>
  >(
    `SELECT u.id_usuario AS id, COALESCE(u.nick, u.nombre) AS username,
      u.nombre AS name, u.apellido AS "lastName", u.nick, u.email,
      r.nombre AS role, u.session_version AS "sessionVersion"
    FROM usuarios u JOIN roles r ON r.id_rol = u.rol_id
    WHERE u.id_usuario = ? AND u.estado = 1 AND r.estado = 1`,
    [usuarioId]
  );
  return rows[0] ?? null;
}

export async function revocarSesionesUsuario(usuarioId: string) {
  await query('UPDATE usuarios SET session_version = session_version + 1 WHERE id_usuario = ?', [
    usuarioId
  ]);
}
