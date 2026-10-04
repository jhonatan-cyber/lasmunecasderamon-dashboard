/**
 * Infraestructura del módulo Personal para horas extras — SQL privado.
 *
 * Este archivo sólo se importa dentro del módulo: la puerta
 * `modulo-solo-api-publica` de `scripts/arquitectura/limites.mjs` falla ante
 * cualquier import externo que apunte acá. Es, además, la «infraestructura
 * autorizada» del §6: cuando el módulo participa de una operación atómica,
 * resuelve el contexto opaco al ejecutor de esa transacción; cuando la
 * operación es aislada, consulta por el pool, igual que siempre.
 */
import { query, generateUUID } from '@/lib/database/db';
import type { TransactionQuery } from '@/lib/database/db';
import { BaseRepository } from '@/lib/repositories/BaseRepository';
import { resolverTransaccion } from '@/lib/transaccion/infraestructura';
import type { ContextoOperacion } from '@/lib/transaccion/contrato';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import type {
  CambiosHoraExtra,
  EntradaHoraExtra,
  HoraExtra,
  HoraExtraRegistrada
} from '../contracts';

/** El pool si la operación va aislada; la transacción de la unidad si participa. */
function ejecutor(contexto?: ContextoOperacion): TransactionQuery {
  if (!contexto) return query;
  return resolverTransaccion(contexto);
}

export async function buscarTodas(
  filtros: { usuarioId?: string; desde?: string; hasta?: string },
  contexto?: ContextoOperacion
): Promise<HoraExtra[]> {
  const trx = ejecutor(contexto);
  let sql = `
      SELECT HR.*, U.id_usuario, (CAST(U.nombre AS text) || CAST(' ' AS text) || CAST(U.apellido AS text)) AS usuario, U.foto AS usuario_foto
      FROM horas_extras HR
      INNER JOIN usuarios U ON U.id_usuario = HR.usuario_id
      WHERE 1=1
    `;
  const params: any[] = [];
  if (filtros.usuarioId) {
    sql += ' AND HR.usuario_id = ?';
    params.push(filtros.usuarioId);
  }
  if (filtros.desde && filtros.hasta) {
    sql += ' AND DATE(HR.fecha_crea) BETWEEN ? AND ?';
    params.push(filtros.desde, filtros.hasta);
  }
  sql += ' ORDER BY HR.fecha_crea DESC';

  const rows = await trx<any[]>(sql, params);
  return rows.map(row => ({
    id_hora_extra: row.id_hora_extra,
    id_usuario: row.id_usuario,
    usuario: String(row.usuario),
    usuario_foto: String(row.usuario_foto || ''),
    hora: Number(row.hora),
    monto: Number(row.monto),
    total: Number(row.total),
    fecha_crea: String(row.fecha_crea),
    fecha_mod: String(row.fecha_mod || ''),
    estado: Number(row.estado)
  }));
}

export async function buscarPorFechas(
  usuarioId: string,
  fechas: string[],
  contexto?: ContextoOperacion
): Promise<HoraExtra[]> {
  if (fechas.length === 0) return [];
  const trx = ejecutor(contexto);
  const sql = `
      SELECT HR.*, U.id_usuario, (CAST(U.nombre AS text) || CAST(' ' AS text) || CAST(U.apellido AS text)) AS usuario, U.foto AS usuario_foto, HR.fecha_crea, HR.estado
      FROM horas_extras HR
      INNER JOIN usuarios U ON U.id_usuario = HR.usuario_id
      WHERE HR.usuario_id = ? AND DATE(HR.fecha_crea) IN (?)
      ORDER BY HR.fecha_crea DESC
    `;
  const rows = await trx<any[]>(sql, [usuarioId, fechas]);
  return rows.map(row => ({
    id_hora_extra: row.id_hora_extra,
    id_usuario: row.id_usuario,
    usuario: String(row.usuario),
    usuario_foto: String(row.usuario_foto || ''),
    hora: Number(row.hora),
    monto: Number(row.monto),
    total: Number(row.total),
    fecha_crea: String(row.fecha_crea),
    fecha_mod: String(row.fecha_mod || ''),
    estado: Number(row.estado)
  }));
}

export async function insertar(
  data: EntradaHoraExtra,
  contexto?: ContextoOperacion
): Promise<HoraExtraRegistrada | null> {
  const trx = ejecutor(contexto);
  const id = generateUUID();
  const total = data.hora * data.monto;
  const now = getNowInBusinessTimezone(data.device_date);
  await BaseRepository.insert(trx, 'horas_extras', {
    id_hora_extra: id,
    usuario_id: data.usuario_id,
    hora: data.hora,
    monto: data.monto,
    total,
    fecha_crea: now,
    estado: 1
  });
  const res = await trx<any[]>('SELECT * FROM horas_extras WHERE id_hora_extra = ?', [id]);
  return res.length > 0 ? (res[0] as HoraExtraRegistrada) : null;
}

export async function actualizar(
  id: string,
  data: CambiosHoraExtra,
  contexto?: ContextoOperacion
): Promise<HoraExtraRegistrada | null> {
  const trx = ejecutor(contexto);
  const now = getNowInBusinessTimezone();
  await BaseRepository.update(trx, 'horas_extras', 'id_hora_extra', id, {
    ...data,
    fecha_mod: now
  });
  const res = await trx<any[]>('SELECT * FROM horas_extras WHERE id_hora_extra = ?', [id]);
  return res.length > 0 ? (res[0] as HoraExtraRegistrada) : null;
}

export async function eliminar(id: string, contexto?: ContextoOperacion): Promise<void> {
  const trx = ejecutor(contexto);
  await BaseRepository.delete(trx, 'horas_extras', 'id_hora_extra', id);
}
