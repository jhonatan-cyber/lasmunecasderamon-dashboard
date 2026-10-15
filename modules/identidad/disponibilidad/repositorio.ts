import type { ContextoOperacion } from '@/lib/transaccion/contrato';
import { resolverTransaccion } from '@/lib/transaccion/infraestructura';
import { BusinessError } from '@/lib/errors/errors';
export async function actualizarDisponibilidadAnfitrionas(
  contexto: ContextoOperacion,
  hostessIds: string[],
  excludeServiceId?: string,
  _excludeVentaId?: string
) {
  const trx = resolverTransaccion(contexto);
  if (!hostessIds || hostessIds.length === 0) return;

  const uniqueIds = [...new Set(hostessIds)];
  const ph = uniqueIds.map(() => '?').join(',');
  const params = [...uniqueIds, ...(excludeServiceId ? [excludeServiceId] : [])];
  const idle = await trx<{ id_usuario: string }[]>(
    `
      SELECT u.id_usuario
      FROM usuarios u
      WHERE u.id_usuario IN (${ph})
        AND NOT EXISTS (
          SELECT 1
          FROM servicios s
          JOIN detalle_servicios ds ON s.id_servicio = ds.servicio_id AND ds.liberado_en IS NULL
          WHERE ds.usuario_id = u.id_usuario AND s.estado IN (2, 3)
            ${excludeServiceId ? 'AND s.id_servicio != ?' : ''}
        )
      `,
    params
  );
  if (idle.length > 0) {
    const ids = idle.map(r => r.id_usuario);
    await trx(
      `UPDATE usuarios SET estado_servicio = 0 WHERE id_usuario IN (${ids.map(() => '?').join(',')})`,
      ids
    );
  }
}

export async function comprobarAnfitrionasLibresParaServicio(
  ids: string[],
  contexto: ContextoOperacion,
  servicioPropioId?: string
) {
  if (!ids.length) return;
  const trx = resolverTransaccion(contexto);
  const unicas = [...new Set(ids)].sort();
  const ph = unicas.map(() => '?').join(',');
  await trx(
    `SELECT id_usuario FROM usuarios WHERE id_usuario IN (${ph}) ORDER BY id_usuario FOR UPDATE`,
    unicas
  );
  const ocupadas = await trx<{ id_usuario: string }[]>(
    `SELECT u.id_usuario FROM usuarios u WHERE u.id_usuario IN (${ph}) AND (
      (u.estado_servicio = 1 ${
        servicioPropioId
          ? `AND NOT EXISTS (
        SELECT 1 FROM detalle_servicios propio WHERE propio.usuario_id = u.id_usuario
          AND (propio.servicio_id = ? OR propio.servicio_id IN (
            SELECT id_servicio FROM servicios WHERE servicio_original_id = ?
          )) AND propio.liberado_en IS NULL
      )`
          : ''
      })
      OR EXISTS (
        SELECT 1 FROM detalle_servicios ds JOIN servicios s ON s.id_servicio = ds.servicio_id
        WHERE ds.usuario_id = u.id_usuario AND ds.liberado_en IS NULL AND s.estado IN (2, 3)
          ${servicioPropioId ? 'AND s.id_servicio <> ? AND (s.servicio_original_id IS NULL OR s.servicio_original_id <> ?)' : ''}
      )
    )`,
    [
      ...unicas,
      ...(servicioPropioId
        ? [servicioPropioId, servicioPropioId, servicioPropioId, servicioPropioId]
        : [])
    ]
  );
  if (ocupadas.length)
    throw new BusinessError(
      'Una anfitriona seleccionada está ocupada o ya tiene un servicio activo. Actualiza la lista y elige una libre.',
      'HOSTESS_OCCUPIED'
    );
}

/**
 * Anfitrionas del pedido que están logueadas en el local. Mismo SQL que el
 * `getLoggedInHostessIds` heredado de `ServiceService`: rol anfitriona,
 * usuario activo y sesión abierta en el local.
 */
export async function listarAnfitrionasEnLocal(
  usuarioIds: string[],
  contexto: ContextoOperacion
): Promise<string[]> {
  if (usuarioIds.length === 0) return [];
  const trx = resolverTransaccion(contexto);
  const rows = await trx<{ id_usuario: string }[]>(
    `SELECT DISTINCT u.id_usuario
       FROM usuarios u
       INNER JOIN roles r ON r.id_rol = u.rol_id
       INNER JOIN logins l ON l.usuario_id = u.id_usuario
      WHERE u.id_usuario IN (${usuarioIds.map(() => '?').join(', ')})
        AND u.estado = 1
        AND l.estado = 1
        AND l.en_local = 1
        AND LOWER(r.nombre) = 'anfitriona'`,
    usuarioIds
  );
  return rows.map(row => row.id_usuario);
}

export async function ocuparAnfitrionasServicio(ids: string[], contexto: ContextoOperacion) {
  if (!ids.length) return;
  await resolverTransaccion(contexto)(
    `UPDATE usuarios SET estado_servicio = 1 WHERE id_usuario IN (${ids.map(() => '?').join(',')})`,
    ids
  );
}
