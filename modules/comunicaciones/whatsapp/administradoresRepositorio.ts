/**
 * SQL privado de la configuración de WhatsApp por administrador
 * (`whatsapp_administradores`). Nadie fuera de este módulo toca la tabla.
 */
import { query } from '@/lib/database/db';

export interface FilaAdminWhatsApp {
  usuarioId: string;
  nombre: string;
  apellido: string;
  nick: string | null;
  destino: string;
  accountSid: string | null;
  authToken: string | null;
  whatsappNumber: string | null;
  activo: number;
}

export interface UsuarioAdministrador {
  id: string;
  nombre: string;
  apellido: string;
  nick: string | null;
}

const COLUMNAS = `
  w.usuario_id AS "usuarioId",
  u.nombre,
  u.apellido,
  u.nick,
  w.whatsapp_destino AS "destino",
  w.twilio_account_sid AS "accountSid",
  w.twilio_auth_token AS "authToken",
  w.twilio_whatsapp_number AS "whatsappNumber",
  w.activo`;

/** Configuración guardada de cada administrador, con su nombre para la pantalla. */
export async function listarAdministradoresWhatsApp(): Promise<FilaAdminWhatsApp[]> {
  return await query<FilaAdminWhatsApp[]>(`
    SELECT ${COLUMNAS}
      FROM whatsapp_administradores w
      JOIN usuarios u ON u.id_usuario = w.usuario_id
     ORDER BY u.nombre, u.apellido
  `);
}

/** Administradores activos y con número: son los destinatarios de los avisos. */
export async function listarAdministradoresActivos(): Promise<FilaAdminWhatsApp[]> {
  return await query<FilaAdminWhatsApp[]>(`
    SELECT ${COLUMNAS}
      FROM whatsapp_administradores w
      JOIN usuarios u ON u.id_usuario = w.usuario_id
     WHERE w.activo = 1
       AND COALESCE(w.whatsapp_destino, '') <> ''
     ORDER BY u.nombre, u.apellido
  `);
}

/** Usuarios con rol administrador y activos: los únicos que pueden configurarse. */
export async function listarUsuariosAdministradores(): Promise<UsuarioAdministrador[]> {
  return await query<UsuarioAdministrador[]>(`
    SELECT u.id_usuario AS id, u.nombre, u.apellido, u.nick
      FROM usuarios u
      JOIN roles r ON r.id_rol = u.rol_id
     WHERE u.estado = 1 AND LOWER(r.nombre) = 'administrador'
     ORDER BY u.nombre, u.apellido
  `);
}

/** `true` si el usuario existe, está activo y su rol es administrador. */
export async function esUsuarioAdministrador(usuarioId: string): Promise<boolean> {
  const rows = await query<{ ok: boolean }[]>(
    `SELECT TRUE AS ok
       FROM usuarios u
       JOIN roles r ON r.id_rol = u.rol_id
      WHERE u.id_usuario = ? AND u.estado = 1 AND LOWER(r.nombre) = 'administrador'
      LIMIT 1`,
    [usuarioId]
  );
  return rows.length > 0;
}

export interface FilaCrudaAdminWhatsApp {
  destino: string;
  accountSid: string | null;
  authToken: string | null;
  whatsappNumber: string | null;
  activo: number;
}

/** Fila cruda de un administrador, o `null` si no tiene configuración guardada. */
export async function obtenerAdministradorWhatsApp(
  usuarioId: string
): Promise<FilaCrudaAdminWhatsApp | null> {
  const rows = await query<FilaCrudaAdminWhatsApp[]>(
    `SELECT whatsapp_destino AS "destino",
            twilio_account_sid AS "accountSid",
            twilio_auth_token AS "authToken",
            twilio_whatsapp_number AS "whatsappNumber",
            activo
       FROM whatsapp_administradores
      WHERE usuario_id = ?
      LIMIT 1`,
    [usuarioId]
  );
  return rows[0] ?? null;
}

export interface DatosAdminWhatsApp {
  destino: string;
  accountSid: string | null;
  authToken: string | null;
  whatsappNumber: string | null;
  activo: boolean;
}

/** Inserta o actualiza la configuración de un administrador. */
export async function guardarAdministradorWhatsApp(
  usuarioId: string,
  datos: DatosAdminWhatsApp
): Promise<void> {
  await query(
    `INSERT INTO whatsapp_administradores
       (usuario_id, whatsapp_destino, twilio_account_sid, twilio_auth_token,
        twilio_whatsapp_number, activo, fecha_crea, fecha_mod)
     VALUES (?, ?, ?, ?, ?, ?, NOW(), NULL)
     ON CONFLICT (usuario_id) DO UPDATE SET
       whatsapp_destino = EXCLUDED.whatsapp_destino,
       twilio_account_sid = EXCLUDED.twilio_account_sid,
       twilio_auth_token = EXCLUDED.twilio_auth_token,
       twilio_whatsapp_number = EXCLUDED.twilio_whatsapp_number,
       activo = EXCLUDED.activo,
       fecha_mod = NOW()`,
    [
      usuarioId,
      datos.destino,
      datos.accountSid,
      datos.authToken,
      datos.whatsappNumber,
      datos.activo ? 1 : 0
    ]
  );
}

export async function eliminarAdministradorWhatsApp(usuarioId: string): Promise<void> {
  await query('DELETE FROM whatsapp_administradores WHERE usuario_id = ?', [usuarioId]);
}
