/**
 * Infraestructura del módulo Identidad para usuarios. SQL privado: nadie fuera de
 * `modules/identidad` importa este archivo (§5).
 *
 * Estas consultas vivían dentro de rutas HTTP (`/api/users/[id]/permissions`,
 * `/api/users/me/stats`, `/api/public/users` y `/api/auth/change-password`), que
 * mezclaban adaptación, consulta y validación. Mismo SQL y misma selección que
 * tenían las rutas.
 */
import { query } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import type { ContextoOperacion } from '@/lib/transaccion/contrato';
import { resolverTransaccion } from '@/lib/transaccion/infraestructura';

export function listarDestinatariosAnulaciones() {
  return query<{ id_usuario: string; rol_nombre: string }[]>(
    `SELECT u.id_usuario, LOWER(r.nombre) as rol_nombre
     FROM usuarios u INNER JOIN roles r ON u.rol_id = r.id_rol
     WHERE LOWER(r.nombre) IN ('administrador', 'cajero')`
  );
}

export async function quitarModalidadesBiometricas(usuarioId: string, contexto: ContextoOperacion) {
  await resolverTransaccion(contexto)(
    'UPDATE usuarios SET biometrico_facial = 0, biometrico_huella = 0 WHERE id_usuario = ?',
    [usuarioId]
  );
}

/** Rol asignado al usuario, o `null` si no tiene. */
export async function obtenerRolIdUsuario(usuarioId: string): Promise<{ rol_id: string | null }[]> {
  return await query<{ rol_id: string | null }[]>(
    `
      SELECT rol_id FROM usuarios WHERE id_usuario = ?
    `,
    [usuarioId]
  );
}

/** Nombre, apellido y nick: lo que muestra la pantalla de la persona. */
export async function obtenerResumenUsuario(usuarioId: string): Promise<ResumenUsuario[]> {
  return await query<ResumenUsuario[]>(
    'SELECT nombre, apellido, nick FROM usuarios WHERE id_usuario = ?',
    [usuarioId]
  );
}

/** Padrón público del personal activo, sin administradores. */
export async function listarUsuariosPublicos(): Promise<UsuarioPublicoCrudo[]> {
  return await query<UsuarioPublicoCrudo[]>(`
      SELECT u.id_usuario as id, u.nombre, u.apellido, u.nick, u.foto, r.nombre as role
      FROM usuarios u
      LEFT JOIN roles r ON u.rol_id = r.id_rol
      WHERE u.estado = 1 AND (r.nombre IS NULL OR LOWER(r.nombre) <> 'administrador')
      ORDER BY u.nombre ASC, u.apellido ASC
    `);
}

/** Usuarios que tienen el rol indicado: son los que hay que refrescar en caché. */
export async function listarUsuariosPorRol(rolId: string): Promise<{ id_usuario: string }[]> {
  return await query<{ id_usuario: string }[]>('SELECT id_usuario FROM usuarios WHERE rol_id = ?', [
    rolId
  ]);
}

/**
 * ¿El usuario existe y está activo? Las pantallas de asistencia lo comprueban antes
 * de emitir un desafío: emitir uno para alguien dado de baja dejaría una credencial
 * viva en la puerta.
 */
export async function usuarioEstaActivo(usuarioId: string): Promise<boolean> {
  const rows = await query<{ id_usuario: string }[]>(
    'SELECT id_usuario FROM usuarios WHERE id_usuario = ? AND estado = 1',
    [usuarioId]
  );
  return rows.length > 0;
}

/** Personal activo con su rol, para el tablero de la pantalla del kiosko. */
export async function listarPersonalActivo(): Promise<PersonalActivo[]> {
  return await query<PersonalActivo[]>(`
    SELECT u.id_usuario AS id, u.nombre, u.apellido, u.nick, u.foto, r.nombre AS rol
    FROM usuarios u
    LEFT JOIN roles r ON u.rol_id = r.id_rol
    WHERE u.estado = 1 AND (r.nombre IS NULL OR LOWER(r.nombre) <> 'administrador')
    ORDER BY u.nombre ASC, u.apellido ASC
  `);
}

/** Actualiza la contraseña y limpia la marca de cambio forzado. */
export async function actualizarPassword(usuarioId: string, hash: string): Promise<void> {
  await query(
    'UPDATE usuarios SET password = ?, force_password_change = 0, fecha_mod = ? WHERE id_usuario = ?',
    [hash, getNowInBusinessTimezone(), usuarioId]
  );
}

export async function activarModalidadFacial(usuarioId: string, contexto: ContextoOperacion) {
  await resolverTransaccion(contexto)(
    'UPDATE usuarios SET biometrico_facial = 1 WHERE id_usuario = ?',
    [usuarioId]
  );
}

export async function guardarFotoPerfil(usuarioId: string, foto: string) {
  await query('UPDATE usuarios SET foto = ? WHERE id_usuario = ?', [foto, usuarioId]);
}

interface ResumenUsuario {
  nombre: string;
  apellido: string;
  nick: string | null;
}

interface PersonalActivo {
  id: string;
  nombre: string;
  apellido: string;
  nick: string | null;
  foto: string | null;
  rol: string | null;
}

interface UsuarioPublicoCrudo {
  id: string;
  nombre: string;
  apellido: string;
  nick: string | null;
  foto: string | null;
  role: string | null;
}
