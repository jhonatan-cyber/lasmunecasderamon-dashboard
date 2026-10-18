import { query, generateUUID } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { DatabaseError } from '@/lib/errors/errors';
import { logger } from '@/lib/utils/logger';

/** Personal activo (no administrador) con su estado de presencia en el local. */
export interface PersonalPresencia {
  id_usuario: string;
  nombre: string;
  apellido: string;
  nick: string;
  foto: string | null;
  rol: string;
  en_local: boolean;
}

/**
 * Una persona está «en el local» cuando tiene una fila de `logins` con
 * `estado = 1 AND en_local = 1`; es el mismo estado que valida ventas y servicios
 * (`listarAnfitrionasEnLocal`). Esta herramienta lo fuerza a mano para pruebas.
 */
export async function listarPersonalConPresencia(): Promise<PersonalPresencia[]> {
  try {
    const rows = await query<any[]>(
      `SELECT u.id_usuario, u.nombre, u.apellido, u.nick, u.foto, r.nombre AS rol,
              CASE WHEN EXISTS (
                SELECT 1 FROM logins l
                 WHERE l.usuario_id = u.id_usuario AND l.estado = 1 AND l.en_local = 1
              ) THEN 1 ELSE 0 END AS en_local
         FROM usuarios u
         INNER JOIN roles r ON r.id_rol = u.rol_id
        WHERE u.estado = 1
          AND LOWER(BTRIM(r.nombre)) <> 'administrador'
        ORDER BY r.nombre ASC, u.nombre ASC`
    );
    return rows.map(row => ({
      id_usuario: row.id_usuario,
      nombre: row.nombre,
      apellido: row.apellido,
      nick: row.nick,
      foto: row.foto ?? null,
      rol: row.rol,
      en_local: Number(row.en_local) === 1
    }));
  } catch (err) {
    logger.error('[PresenciaRepositorio] Error al listar personal', { err });
    throw new DatabaseError('Error al listar el personal con presencia', err);
  }
}

/**
 * Fuerza la presencia de un usuario. Al marcar presente crea (o reactiva) su
 * fila de `logins` con `en_local = 1`; al quitarla la desactiva. No registra
 * asistencia: solo el flag que habilita ventas y servicios.
 */
export async function fijarPresenciaLocal(usuarioId: string, presente: boolean): Promise<void> {
  try {
    if (presente) {
      const filas = await query<any[]>('SELECT id_login FROM logins WHERE usuario_id = ? LIMIT 1', [
        usuarioId
      ]);
      if (filas.length) {
        await query('UPDATE logins SET estado = 1, en_local = 1 WHERE usuario_id = ?', [usuarioId]);
        return;
      }
      await query(
        'INSERT INTO logins (id_login, usuario_id, last_login, estado, en_local) VALUES (?, ?, ?, 1, 1)',
        [generateUUID(), usuarioId, getNowInBusinessTimezone()]
      );
      return;
    }
    await query('UPDATE logins SET estado = 0, en_local = 0 WHERE usuario_id = ?', [usuarioId]);
  } catch (err) {
    logger.error('[PresenciaRepositorio] Error al fijar presencia', { usuarioId, presente, err });
    throw new DatabaseError('Error al cambiar la presencia del usuario', err);
  }
}

/**
 * Aplica la presencia a todo el personal activo (excepto administradores).
 * Devuelve cuántas personas cambiaron de estado.
 */
export async function fijarPresenciaDeTodoElPersonal(presente: boolean): Promise<number> {
  try {
    const filas = await query<any[]>(
      `SELECT u.id_usuario FROM usuarios u
        INNER JOIN roles r ON r.id_rol = u.rol_id
       WHERE u.estado = 1 AND LOWER(BTRIM(r.nombre)) <> 'administrador'`
    );
    let cambios = 0;
    for (const fila of filas) {
      await fijarPresenciaLocal(fila.id_usuario, presente);
      cambios++;
    }
    return cambios;
  } catch (err) {
    logger.error('[PresenciaRepositorio] Error al fijar presencia masiva', { presente, err });
    throw new DatabaseError('Error al cambiar la presencia del personal', err);
  }
}
