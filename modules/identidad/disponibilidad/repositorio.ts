import type { ContextoOperacion } from '@/lib/transaccion/contrato';
import { resolverTransaccion } from '@/lib/transaccion/infraestructura';
export async function actualizarDisponibilidadAnfitrionas(
  contexto: ContextoOperacion,
  hostessIds: string[],
  excludeServiceId?: string,
  excludeVentaId?: string
) {
  const trx = resolverTransaccion(contexto);
  if (!hostessIds || hostessIds.length === 0) return;

  const uniqueIds = [...new Set(hostessIds)];
  const ph = uniqueIds.map(() => '?').join(',');
  const params = [
    ...uniqueIds,
    ...(excludeServiceId ? [excludeServiceId] : []),
    ...(excludeVentaId ? [excludeVentaId] : [])
  ];
  const idle = await trx<{ id_usuario: string }[]>(
    `
      SELECT u.id_usuario
      FROM usuarios u
      WHERE u.id_usuario IN (${ph})
        AND NOT EXISTS (
          SELECT 1
          FROM servicios s
          JOIN detalle_servicios ds ON s.id_servicio = ds.servicio_id
          WHERE ds.usuario_id = u.id_usuario AND s.estado = 2
            ${excludeServiceId ? 'AND s.id_servicio != ?' : ''}
        )
        AND NOT EXISTS (
          SELECT 1
          FROM ventas v
          JOIN ventas_usuarios vu ON v.id_venta = vu.venta_id
          WHERE vu.usuario_id = u.id_usuario AND v.estado = 2 AND v.tiempo > 0
            ${excludeVentaId ? 'AND v.id_venta != ?' : ''}
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
