/**
 * Casos de uso de usuarios — aplicación del módulo Identidad.
 *
 * No toca SQL ni el driver: eso vive en `./repositorio`, que es privado del módulo.
 * El hash de la contraseña se calcula aquí porque es una regla de identidad, no una
 * adaptación de transporte: la ruta sólo valida el cuerpo con el esquema.
 */
import * as argon2 from 'argon2';
import type { PersonalActivo, ResumenUsuario, UsuarioPublico } from '../contracts';
import * as repositorio from './repositorio';

/** Nombre, apellido y nick del actor; la ruta los mete en su respuesta. */
export async function obtenerResumenUsuario(usuarioId: string): Promise<ResumenUsuario | null> {
  const [fila] = await repositorio.obtenerResumenUsuario(usuarioId);
  return fila ?? null;
}

/** Padrón del personal activo que se publica sin autenticación. */
export async function listarUsuariosPublicos(): Promise<UsuarioPublico[]> {
  const filas = await repositorio.listarUsuariosPublicos();
  return filas.map(fila => ({
    id: fila.id,
    name: `${fila.nombre} ${fila.apellido}`,
    nick: fila.nick,
    foto: fila.foto || 'default.png',
    role: fila.role || 'Sin Rol'
  }));
}

/** ¿Existe y está activo? Lo consulta quien emite desafíos de asistencia. */
export async function usuarioEstaActivo(usuarioId: string): Promise<boolean> {
  return repositorio.usuarioEstaActivo(usuarioId);
}

/** Personal activo sin administradores, con su rol. */
export async function listarPersonalActivo(): Promise<PersonalActivo[]> {
  return repositorio.listarPersonalActivo();
}

/** Hash y escritura. El actor se toma del token, nunca del cuerpo. */
export async function cambiarPassword(usuarioId: string, password: string): Promise<void> {
  const hashedPassword = await argon2.hash(password);
  await repositorio.actualizarPassword(usuarioId, hashedPassword);
}
