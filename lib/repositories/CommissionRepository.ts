import { query, generateUUID, type TransactionQuery } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { BaseRepository } from './BaseRepository';

export class CommissionRepository {

  static async createWithDetail(
    trx: TransactionQuery,
    data: {
      venta_id: string;
      usuario_id: string;
      monto: number;
    }
  ): Promise<void> {
    const commissionId = generateUUID();

    const now = getNowInBusinessTimezone();
    await BaseRepository.insert(trx, 'comisiones', {
      id_comision: commissionId,
      venta_id: data.venta_id,
      monto: data.monto,
      estado: 1,
      fecha_crea: now
    });

    await BaseRepository.insert(trx, 'detalle_comisiones', {
      id_detalle_comision: generateUUID(),
      comision_id: commissionId,
      usuario_id: data.usuario_id,
      comision: data.monto,
      estado: 1,
      fecha_crea: now
    });
  }

  static async summary(): Promise<any> {
    const summary = await query<any[]>(`
      SELECT 
        SUM(monto) as total_comisiones,
        COUNT(*) as cantidad_comisiones
      FROM comisiones
      WHERE estado = 1
    `);
    return summary[0];
  }

  static async list(params: { status?: string, employeeId?: string, search?: string }): Promise<any[]> {
    let where = 'WHERE c.estado = 1';
    let sqlParams: any[] = [];

    if (params.employeeId) {
      where += ' AND dc.usuario_id = ?';
      sqlParams.push(params.employeeId);
    }

    const sql = `
      SELECT c.*, dc.usuario_id, u.nick as usuario_nick, v.codigo as venta_codigo
      FROM comisiones c
      INNER JOIN detalle_comisiones dc ON c.id_comision = dc.comision_id
      INNER JOIN usuarios u ON dc.usuario_id = u.id_usuario
      LEFT JOIN ventas v ON c.venta_id = v.id_venta
      ${where}
      ORDER BY c.fecha_crea DESC
    `;
    return await query<any[]>(sql, sqlParams);
  }

  static async create(data: any): Promise<string> {
    const id = generateUUID();
    await BaseRepository.insert(query, 'comisiones', {
      id_comision: id,
      ...data,
      estado: 1,
      fecha_crea: getNowInBusinessTimezone()
    });
    return id;
  }

  static async getDetails(usuarioId: string) {
    return await query(`
      SELECT 
        c.*, 
        v.codigo as venta_codigo,
        u.nick as usuario_nick
      FROM comisiones c
      INNER JOIN detalle_comisiones dc ON c.id_comision = dc.comision_id
      INNER JOIN usuarios u ON dc.usuario_id = u.id_usuario
      LEFT JOIN ventas v ON c.venta_id = v.id_venta
      WHERE dc.usuario_id = ? AND c.estado = 1
      ORDER BY c.fecha_crea DESC
    `, [usuarioId]);
  }

  static async delete(id: string) {
    await BaseRepository.update(query, 'comisiones', 'id_comision', id, { estado: 0 });
  }

  static async update(id: string, data: any) {
    await BaseRepository.update(query, 'comisiones', 'id_comision', id, data);
  }
}
