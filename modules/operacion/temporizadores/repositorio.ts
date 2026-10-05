/**
 * Infraestructura del módulo Operación para los temporizadores de servicio, venta y
 * cuenta. SQL privado: nadie fuera de `modules/operacion` importa este archivo (§5).
 *
 * Este SQL vivía dentro de `/api/cron/check-timers`, que mezclaba la consulta, la
 * transacción, la liberación de habitación y las notificaciones.
 *
 * Excepción de lectura, explícita y revisable (fase 7): el UNION trae
 * `habitaciones` (Operación) y `ventas` (Ventas) para poder avisar "terminó en la
 * habitación 3". El cierre de ventas y servicios pasa por sus propietarios.
 */
import { query, type TransactionQuery } from '@/lib/database/db';
import type { ContextoOperacion } from '@/lib/transaccion/contrato';
import { resolverTransaccion } from '@/lib/transaccion/infraestructura';
import { finalizarVentaTemporizada } from '@/modules/ventas';
import { finalizarCuentaTemporizada } from '../cuentas/repositorio';

/** Temporizador en curso, con la habitación en la que corre. */
export interface TemporizadorActivo {
  id: string;
  codigo: string;
  tiempo: number;
  fecha_crea: string;
  created_by: string | null;
  push_notified_5m: boolean | null;
  push_notified_end: boolean | null;
  habitacion_id: string | null;
  room_name: string | null;
  type: 'servicio' | 'venta' | 'cuenta';
}

/**
 * Tabla y columna primary de cada tipo. Se arman en el módulo y no en la ruta para
 * que el nombre de la tabla nunca se concatene a mano en un manejador HTTP.
 */
const TABLA_POR_TIPO: Record<TemporizadorActivo['type'], { tabla: string; id: string }> = {
  servicio: { tabla: 'servicios', id: 'id_servicio' },
  venta: { tabla: 'ventas', id: 'id_venta' },
  cuenta: { tabla: 'cuentas', id: 'id_cuenta' }
};

/** Servicio de temporary, venta o cuenta que todavía tiene tiempo por correr. */
export async function listarTemporizadoresActivos(): Promise<TemporizadorActivo[]> {
  return await query<TemporizadorActivo[]>(`
      SELECT s.id_servicio as id, s.codigo, s.tiempo, s.fecha_crea, s.created_by, s.push_notified_5m, s.push_notified_end, s.habitacion_id, h.nombre as room_name, 'servicio' as type
      FROM servicios s LEFT JOIN habitaciones h ON s.habitacion_id = h.id_habitacion WHERE s.estado = 2 AND s.paused_at IS NULL AND s.tiempo > 0
      UNION ALL
      SELECT v.id_venta as id, v.codigo, v.tiempo, v.fecha_crea, v.created_by, v.push_notified_5m, v.push_notified_end, v.habitacion_id, h.nombre as room_name, 'venta' as type
      FROM ventas v LEFT JOIN habitaciones h ON v.habitacion_id = h.id_habitacion WHERE v.estado = 2 AND v.paused_at IS NULL AND v.tiempo > 0
      UNION ALL
      SELECT c.id_cuenta as id, c.codigo, c.tiempo, c.fecha_crea, c.created_by, c.push_notified_5m, c.push_notified_end, c.habitacion_id, h.nombre as room_name, 'cuenta' as type
      FROM cuentas c LEFT JOIN habitaciones h ON c.habitacion_id = h.id_habitacion WHERE c.estado = 1 AND c.tiempo > 0
    `);
}

/** Marca que ya se avisó el aviso de 5 minutos, para no repetirlo. */
export async function marcarAviso5m(tipo: TemporizadorActivo['type'], id: string): Promise<void> {
  const { tabla, id: idCol } = TABLA_POR_TIPO[tipo];
  await query(`UPDATE ${tabla} SET push_notified_5m = 1 WHERE ${idCol} = ?`, [id]);
}

/** Marca que ya se avisó que terminó. */
export async function marcarAvisoFin(tipo: TemporizadorActivo['type'], id: string): Promise<void> {
  const { tabla, id: idCol } = TABLA_POR_TIPO[tipo];
  await query(`UPDATE ${tabla} SET push_notified_end = 1 WHERE ${idCol} = ?`, [id]);
}

/**
 * Cierre del temporizador en la unidad del llamador: se actualiza la tabla
 * por su propietario y se libera la habitación, cada una con su estado final
 * (1 = terminado, 0 = cerrado). La liberación vive en quien la llama para
 * que este archivo no coordine otros dominios.
 */
export async function cerrarTemporizador(
  tipo: TemporizadorActivo['type'],
  id: string,
  contexto: ContextoOperacion
): Promise<void> {
  const trx = resolverTransaccion(contexto);
  if (tipo === 'servicio') {
    await trx('UPDATE servicios SET estado = 1 WHERE id_servicio = ?', [id]);
  } else if (tipo === 'venta') {
    await finalizarVentaTemporizada(id, contexto);
  } else if (tipo === 'cuenta') {
    await finalizarCuentaTemporizada(id, contexto);
  }
}

/** Habitación a liberar al cerrar, si el temporizador tiene una. */
export async function leerHabitacionTemporizador(
  tipo: TemporizadorActivo['type'],
  id: string,
  contexto: ContextoOperacion
): Promise<string | null> {
  const { tabla, id: idCol } = TABLA_POR_TIPO[tipo];
  const rows = await resolverTransaccion(contexto)<{ habitacion_id: string | null }[]>(
    `SELECT habitacion_id FROM ${tabla} WHERE ${idCol} = ?`,
    [id]
  );
  return rows[0]?.habitacion_id ?? null;
}

/** Anfitrionas asignadas a un servicio, para la liberación de la habitación. */
export async function obtenerAnfitrionasDeServicio(
  contexto: ContextoOperacion,
  servicioId: string
): Promise<{ usuario_id: string }[]> {
  return await resolverTransaccion(contexto)<{ usuario_id: string }[]>(
    'SELECT usuario_id FROM detalle_servicios WHERE servicio_id = ?',
    [servicioId]
  );
}
