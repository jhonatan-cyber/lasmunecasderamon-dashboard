import 'server-only';
import { generateUUID, query } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { ValidationError } from '@/lib/errors/errors';
import type { UnidadCover } from '../repositorio';

export interface NuevaSolicitudCover {
  grupoRegistroId: string | null;
  clienteNombre: string | null;
  entradaIds: string[];
  unidades: UnidadCover[];
  montoTotal: number;
}

interface SolicitudCover {
  id: string;
  grupo_registro_id: string | null;
  cliente_nombre: string | null;
  entrada_ids: string[] | string;
  unidades: UnidadCover[] | string;
  monto_total: number | string;
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  solicitado_por_nick?: string | null;
}

export async function listarSolicitudesCover(estado: string): Promise<SolicitudCover[]> {
  return query<SolicitudCover[]>(
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

export async function obtenerSolicitudCover(id: string): Promise<SolicitudCover | null> {
  const filas = await query<SolicitudCover[]>(
    'SELECT * FROM solicitudes_entrega_covers WHERE id = ?',
    [id]
  );
  return filas[0] ?? null;
}

export async function aprobarSolicitudCover(id: string, usuarioId: string) {
  const filas = await query<{ id: string }[]>(
    `UPDATE solicitudes_entrega_covers
        SET estado = 'aprobada', autorizado_por = ?, fecha_respuesta = ?
      WHERE id = ? AND estado = 'pendiente' RETURNING id`,
    [usuarioId, getNowInBusinessTimezone(), id]
  );
  if (!filas.length) throw new ValidationError('La solicitud ya fue respondida');
}

export async function rechazarSolicitudCover(id: string, usuarioId: string, motivo: string) {
  const filas = await query<{ id: string }[]>(
    `UPDATE solicitudes_entrega_covers
        SET estado = 'rechazada', autorizado_por = ?, motivo_rechazo = ?, fecha_respuesta = ?
      WHERE id = ? AND estado = 'pendiente' RETURNING id`,
    [usuarioId, motivo, getNowInBusinessTimezone(), id]
  );
  if (!filas.length) throw new ValidationError('La solicitud ya fue respondida');
}
