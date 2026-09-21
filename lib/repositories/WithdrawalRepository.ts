import { query, generateUUID, type TransactionQuery } from '@/lib/database/db';
import { RetiroCajaSchema, type RetiroCajaType } from '@/lib/business/schemas/withdrawal';
import { BaseRepository } from './BaseRepository';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';

export class WithdrawalRepository {
  static async getByCajaId(caja_id: string): Promise<RetiroCajaType[]> {
    const results = await query<any[]>(`
      SELECT r.*, (CAST(u.nombre AS text) || CAST(' ' AS text) || CAST(u.apellido AS text)) as usuario_nombre
      FROM retiros_caja r
      LEFT JOIN usuarios u ON r.usuario_id = u.id_usuario
      WHERE r.caja_id = ?
      ORDER BY r.fecha_retiro DESC
    `, [caja_id]);

    return results.map(row => ({
      id_retiro: row.id_retiro,
      caja_id: row.caja_id,
      monto: Number(row.monto),
      motivo: row.motivo,
      usuario_id: row.usuario_id,
      fecha_retiro: row.fecha_retiro,
      usuario_nombre: row.usuario_nombre
    }));
  }

  static async create(data: RetiroCajaType, trx: TransactionQuery | typeof query = query): Promise<string> {
    const id = generateUUID();
    const now = getNowInBusinessTimezone();

    await BaseRepository.insert(trx, 'retiros_caja', {
      id_retiro: id,
      caja_id: data.caja_id,
      monto: data.monto,
      motivo: data.motivo,
      usuario_id: data.usuario_id,
      fecha_retiro: now
    });

    return id;
  }
}
