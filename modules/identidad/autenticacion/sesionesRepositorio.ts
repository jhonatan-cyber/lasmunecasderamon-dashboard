import { query, generateUUID } from '@/lib/database/db';
import { logger } from '@/lib/utils/logger';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import type { ContextoOperacion } from '@/lib/transaccion/contrato';
import { resolverTransaccion } from '@/lib/transaccion/infraestructura';
import { BaseRepository } from '@/lib/database/base-repository';

export async function marcarPresenciaLocal(
  usuarioId: string,
  ip?: string | null,
  contexto?: ContextoOperacion
) {
  await BaseRepository.update(
    contexto ? resolverTransaccion(contexto) : query,
    'logins',
    'usuario_id',
    usuarioId,
    {
      en_local: 1,
      ...(ip && { ip_address: ip })
    }
  );
}

export async function asegurarSesionPresente(
  usuarioId: string,
  fecha: string,
  ip: string | null,
  contexto: ContextoOperacion
) {
  const trx = resolverTransaccion(contexto);
  const filas = await trx<{ id_login: string }[]>(
    'SELECT id_login FROM logins WHERE usuario_id = ? LIMIT 1',
    [usuarioId]
  );
  if (filas.length) return marcarPresenciaLocal(usuarioId, ip, contexto);
  await BaseRepository.insert(trx, 'logins', {
    id_login: generateUUID(),
    usuario_id: usuarioId,
    last_login: fecha,
    estado: 1,
    ...(ip && { ip_address: ip }),
    en_local: 1
  });
}

export async function cerrarSesionesPorCierreCaja(contexto: ContextoOperacion) {
  // El administrador que autoriza el cierre debe conservar su sesión; todos los
  // registros de login del personal no administrador se invalidan atómicamente
  // con el cierre de caja. También se incluyen sesiones de usuarios desactivados.
  await resolverTransaccion(contexto)(
    `
      UPDATE logins l
      SET estado = 0
      WHERE l.estado = 1
        AND NOT EXISTS (
          SELECT 1
          FROM usuarios u
          INNER JOIN roles r ON r.id_rol = u.rol_id
          WHERE u.id_usuario = l.usuario_id
            AND LOWER(BTRIM(r.nombre)) = 'administrador'
        )
    `
  );
}
const ROLES_PARA_REGISTRAR = ['cajero', 'garzon', 'anfitriona'];

export async function registrarLogin(
  usuarioId: string | number,
  rolNombre?: string
): Promise<void> {
  try {
    let rol: string;
    if (rolNombre) {
      rol = rolNombre.toLowerCase();
    } else {
      const userRole = await query<any[]>(
        `SELECT r.nombre as rol_nombre 
         FROM usuarios u 
         INNER JOIN roles r ON u.rol_id = r.id_rol 
         WHERE u.id_usuario = ?`,
        [usuarioId]
      );
      rol = userRole[0]?.rol_nombre?.toLowerCase() || '';
    }
    if (!ROLES_PARA_REGISTRAR.includes(rol)) {
      return;
    }

    const now = getNowInBusinessTimezone();
    const today = now.substring(0, 10);

    const existingLogin = await query<any[]>(
      `SELECT id_login, last_login FROM logins WHERE usuario_id = ? AND estado = 1`,
      [usuarioId]
    );

    if (existingLogin.length > 0) {
      const lastLoginDate = existingLogin[0].last_login.toString().substring(0, 10);

      if (lastLoginDate === today) {
        return;
      }

      await query(`UPDATE logins SET estado = 0 WHERE usuario_id = ? AND estado = 1`, [usuarioId]);
    }

    await query(
      'INSERT INTO logins (id_login, usuario_id, last_login, estado) VALUES (?, ?, ?, 1)',
      [generateUUID(), usuarioId, now]
    );
  } catch (error) {
    const exception =
      error instanceof Error ? error.message : 'Error desconocido al registrar login';
    logger.error('Error al registrar login', {
      error: exception,
      usuarioId
    });
  }
}
