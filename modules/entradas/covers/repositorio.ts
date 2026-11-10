import 'server-only';
import { generateUUID, query } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';

export interface NuevaSolicitudCover {
  grupoRegistroId: string | null;
  clienteNombre: string | null;
  entradaIds: string[];
  unidades: Record<string, any>[];
  montoTotal: number;
}

export async function listarSolicitudesCover(estado: string): Promise<any[]> {
  return query<any[]>(
    `SELECT s.*, u.nick AS solicitado_por_nick
       FROM solicitudes_entrega_covers s
       LEFT JOIN usuarios u ON u.id_usuario::text = s.solicitado_por::text
      WHERE s.estado = ?
      ORDER BY s.fecha_solicitud DESC`,
    [estado]
  );
}

export async function crearSolicitudCover(solicitud: NuevaSolicitudCover, usuarioId: string) {
  const id = generateUUID();
  await query(
    `INSERT INTO solicitudes_entrega_covers
     (id, grupo_registro_id, cliente_nombre, entrada_ids, unidades, monto_total, solicitado_por, estado, fecha_solicitud)
     VALUES (?, ?, ?, ?::jsonb, ?::jsonb, ?, ?, 'pendiente', ?)`,
    [
      id,
      solicitud.grupoRegistroId,
      solicitud.clienteNombre,
      JSON.stringify(solicitud.entradaIds),
      JSON.stringify(solicitud.unidades),
      solicitud.montoTotal,
      usuarioId,
      getNowInBusinessTimezone()
    ]
  );
  return id;
}

export async function obtenerSolicitudCover(id: string): Promise<any | null> {
  const filas = await query<any[]>(
    `SELECT * FROM solicitudes_entrega_covers WHERE id = ? FOR UPDATE`,
    [id]
  );
  return filas[0] ?? null;
}

export async function aprobarSolicitudCover(id: string, usuarioId: string) {
  await query(
    `UPDATE solicitudes_entrega_covers
        SET estado = 'aprobada', autorizado_por = ?, fecha_respuesta = ?
      WHERE id = ?`,
    [usuarioId, getNowInBusinessTimezone(), id]
  );
}

export async function rechazarSolicitudCover(id: string, usuarioId: string, motivo: string) {
  await query(
    `UPDATE solicitudes_entrega_covers
        SET estado = 'rechazada', autorizado_por = ?, motivo_rechazo = ?, fecha_respuesta = ?
      WHERE id = ?`,
    [usuarioId, motivo, getNowInBusinessTimezone(), id]
  );
}
