import { query, generateUUID } from '@/lib/database/db';

/** Duración de una sesión: la misma ventana que el refresh token. */
const SESION_INTERVAL = "interval '7 days'";

/**
 * Estado de la cuenta más la vigencia de una sesión concreta.
 *
 * La versión (`session_version`) se incrementa al revocar sesiones y no depende
 * del vencimiento del JWT. Cuando se pasa `sesionId` se resuelve además si esa
 * fila de `sesiones` sigue viva, todo en una sola consulta: la validación del
 * token corre en cada petición y no conviene pagar dos viajes al motor.
 */
export async function obtenerEstadoSesionToken(usuarioId: string, sesionId?: string) {
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
      sesionVigente: boolean;
    }>
  >(
    `SELECT u.id_usuario AS id, COALESCE(u.nick, u.nombre) AS username,
      u.nombre AS name, u.apellido AS "lastName", u.nick, u.email,
      r.nombre AS role, u.session_version AS "sessionVersion",
      EXISTS (
        SELECT 1 FROM sesiones s
        WHERE s.id = ? AND s.usuario_id = u.id_usuario
          AND s.revocada_en IS NULL AND s.expira_en > now()
      ) AS "sesionVigente"
    FROM usuarios u JOIN roles r ON r.id_rol = u.rol_id
    WHERE u.id_usuario = ? AND u.estado = 1 AND r.estado = 1`,
    [sesionId ?? '', usuarioId]
  );
  return rows[0] ?? null;
}

/** Abre una sesión nueva y devuelve su id, el `sid` que viaja en el token. */
export async function crearSesion(usuarioId: string, ip?: string | null): Promise<string> {
  const id = generateUUID();
  await query(
    `INSERT INTO sesiones (id, usuario_id, expira_en, ip_address)
     VALUES (?, ?, now() + ${SESION_INTERVAL}, ?)`,
    [id, usuarioId, ip ?? null]
  );
  return id;
}

/**
 * Corre la ventana de la sesión para que acompañe al refresh token rotado. Sin
 * esto la fila vencería antes que el token que la representa y el usuario sería
 * expulsado con un refresh todavía vigente.
 */
export async function extenderSesion(sesionId: string): Promise<void> {
  await query(
    `UPDATE sesiones SET expira_en = now() + ${SESION_INTERVAL}
      WHERE id = ? AND revocada_en IS NULL`,
    [sesionId]
  );
}

/** Cierra la sesión de un dispositivo concreto, sin tocar las demás. */
export async function revocarSesion(sesionId: string): Promise<void> {
  await query('UPDATE sesiones SET revocada_en = now() WHERE id = ? AND revocada_en IS NULL', [
    sesionId
  ]);
}

export async function revocarSesionesDeUsuario(usuarioId: string): Promise<void> {
  await query(
    'UPDATE sesiones SET revocada_en = now() WHERE usuario_id = ? AND revocada_en IS NULL',
    [usuarioId]
  );
}

export async function revocarTodasLasSesiones(): Promise<void> {
  await query('UPDATE sesiones SET revocada_en = now() WHERE revocada_en IS NULL');
}

/** Revocación global de las sesiones de una cuenta (rol, baja, contraseña). */
export async function revocarSesionesUsuario(usuarioId: string) {
  await query('UPDATE usuarios SET session_version = session_version + 1 WHERE id_usuario = ?', [
    usuarioId
  ]);
  await revocarSesionesDeUsuario(usuarioId);
}
