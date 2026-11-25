import { query, generateUUID, type TransactionQuery } from '@/lib/database/db';
import { RetiroCajaSchema, type RetiroCajaType } from '@/lib/business/schemas/withdrawal';
import { BaseRepository } from '@/lib/database/base-repository';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';

export class WithdrawalRepository {
  static async getOpenCajaId(trx: TransactionQuery): Promise<string | null> {
    const rows = await trx<Array<{ id_caja: string }>>(
      'SELECT id_caja FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1'
    );
    return rows[0]?.id_caja ?? null;
  }

  static async getOpenCajaForUpdate(
    trx: TransactionQuery,
    cajaId: string
  ): Promise<Array<{ monto_apertura: number | string | null; efectivo: number | string | null }>> {
    return trx(
      'SELECT monto_apertura, efectivo FROM cajas WHERE id_caja = ? AND estado = 1 FOR UPDATE',
      [cajaId]
    );
  }

  static async subtractCajaCash(trx: TransactionQuery, cajaId: string, monto: number) {
    await trx('UPDATE cajas SET efectivo = efectivo - ? WHERE id_caja = ? AND estado = 1', [
      monto,
      cajaId
    ]);
  }

  static async getByCajaId(caja_id: string): Promise<RetiroCajaType[]> {
    const results = await query<any[]>(
      `
      SELECT r.*, (CAST(u.nombre AS text) || CAST(' ' AS text) || CAST(u.apellido AS text)) as usuario_nombre
      FROM retiros_caja r
      LEFT JOIN usuarios u ON r.usuario_id = u.id_usuario
      WHERE r.caja_id = ?
      ORDER BY r.fecha_retiro DESC
    `,
      [caja_id]
    );

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

  static async create(
    data: RetiroCajaType,
    trx: TransactionQuery | typeof query = query
  ): Promise<string> {
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
