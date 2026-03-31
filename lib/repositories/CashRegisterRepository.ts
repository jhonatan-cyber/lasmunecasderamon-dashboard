import { query, generateUUID, withTransaction, type TransactionQuery } from '@/lib/database/db';
import { CajaSchema, type CajaType } from '@/lib/business/schemas';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { BaseRepository } from './BaseRepository';

export class CashRegisterRepository {
  private static mapCajaFromDB(row: any): CajaType {
    return CajaSchema.parse({
      id_caja: row.id_caja,
      fecha_apertura: row.fecha_apertura,
      usuario_id_apertura: row.usuario_id_apertura,
      monto_apertura: row.monto_apertura,
      estado: row.estado,
      fecha_cierre: row.fecha_cierre,
      usuario_id_cierre: row.usuario_id_cierre,
      monto_cierre: row.monto_cierre,
      ventas: row.venta ?? 0,
      servicios: row.servicio ?? 0,
      efectivo: row.efectivo ?? 0,
      tarjeta: row.tarjeta ?? 0,
      transferencia: row.transferencia ?? 0,
      devoluciones: row.devolucion ?? 0,
      prepago: row.prepago ?? 0,
      propina: row.propina ?? 0,
      cuenta: row.cuenta ?? 0,
      anticipo: row.anticipo ?? 0,
      iva: row.iva ?? 0,
      comision: row.comision ?? 0,
      usuario_apertura: row.usuario_apertura,
      cajero_nombre: row.cajero_nombre
    });
  }

  static async getCurrentCajaId(trx?: TransactionQuery): Promise<string | null> {
    const qFunc = trx || query;
    const res = await qFunc<any[]>('SELECT id_caja FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1');
    return res[0]?.id_caja || null;
  }

  static async updateBalances(
    trx: TransactionQuery, 
    id_caja: string, 
    deltas: {
      venta?: number;
      servicio?: number;
      efectivo?: number;
      tarjeta?: number;
      transferencia?: number;
      prepago?: number;
      anticipo?: number;
      egreso?: number;
      iva?: number;
      comision?: number;
      propina?: number;
      cuenta?: number;
      devolucion?: number;
    }
  ): Promise<void> {
    const entries = Object.entries(deltas).filter(([_, v]) => v !== 0 && v !== undefined);
    if (entries.length === 0) return;

    // Map business fields to DB columns
    const columnMap: Record<string, string> = {
      venta: 'venta',
      servicio: 'servicio',
      efectivo: 'efectivo',
      tarjeta: 'tarjeta',
      transferencia: 'transferencia',
      prepago: 'prepago',
      anticipo: 'anticipo',
      iva: 'iva',
      comision: 'comision',
      propina: 'propina',
      // La tabla `cajas` no expone una columna `cuenta`; ese importe se contabiliza en `venta`
      cuenta: 'venta',
      devolucion: 'devolucion'
    };

    // Only include entries that have a known column mapping; skip unknowns to avoid SQL errors
    const knownEntries = entries.filter(([k]) => k in columnMap);
    if (knownEntries.length === 0) return;

    // Deduplicate by mapped column name (e.g. both 'venta' and 'cuenta' → 'venta'), summing their values
    const colTotals: Record<string, number> = {};
    for (const [k, v] of knownEntries) {
      const col = columnMap[k];
      colTotals[col] = (colTotals[col] ?? 0) + (v as number);
    }

    const dedupedEntries = Object.entries(colTotals).filter(([_, v]) => v !== 0);
    if (dedupedEntries.length === 0) return;

    const setClause = dedupedEntries.map(([col]) => `${col} = ${col} + ?`).join(', ');
    const values = dedupedEntries.map(([_, v]) => v);

    await trx(`UPDATE cajas SET ${setClause} WHERE id_caja = ? AND estado = 1`, [...values, id_caja]);
  }

  static async summary(): Promise<any> {
    const row = await query<any[]>(`
      SELECT c.*, CONCAT(u.nombre, ' ', u.apellido) as usuario_apertura
      FROM cajas c
      LEFT JOIN usuarios u ON c.usuario_id_apertura = u.id_usuario
      WHERE c.estado = 1
      ORDER BY c.fecha_apertura DESC LIMIT 1
    `);
    
    if (row.length === 0) return { balance_total: 0, cajas_abiertas: 0 };
    const cajaRow = row[0];

    const stats = {
      ventas: (await query<any[]>('SELECT COUNT(*) AS cantidad, COALESCE(AVG(total), 0) AS promedio FROM ventas WHERE estado = 1 AND fecha_crea >= ?', [cajaRow.fecha_apertura]))[0],
      servicios: (await query<any[]>('SELECT COUNT(*) AS cantidad, COALESCE(AVG(total), 0) AS promedio FROM servicios WHERE estado = 1 AND fecha_crea >= ?', [cajaRow.fecha_apertura]))[0]
    };

    const balanceTotal = Number(cajaRow.efectivo || 0) + Number(cajaRow.tarjeta || 0) + Number(cajaRow.transferencia || 0) + Number(cajaRow.monto_apertura || 0) - Number(cajaRow.devolucion || 0);

    return {
      ...this.mapCajaFromDB(cajaRow),
      balance_total: balanceTotal,
      cantidad_ventas: stats.ventas.cantidad,
      promedio_venta: stats.ventas.promedio,
      cantidad_servicios: stats.servicios.cantidad,
      promedio_servicio: stats.servicios.promedio
    };
  }

  static async getAll(): Promise<CajaType[]> {
    const results = await query<any[]>(`
      SELECT c.*, CONCAT(u1.nombre, ' ', u1.apellido) as cajero_nombre
      FROM cajas c
      LEFT JOIN usuarios u1 ON c.usuario_id_apertura = u1.id_usuario
      WHERE c.estado IN (0, 1) ORDER BY c.fecha_apertura DESC
    `);
    return results.map(row => this.mapCajaFromDB(row));
  }

  static async getById(id: string): Promise<CajaType | null> {
    const res = await query<any[]>(`
      SELECT c.*, CONCAT(u1.nombre, ' ', u1.apellido) as cajero_nombre
      FROM cajas c
      LEFT JOIN usuarios u1 ON c.usuario_id_apertura = u1.id_usuario
      WHERE c.id_caja = ?
    `, [id]);
    return res.length > 0 ? this.mapCajaFromDB(res[0]) : null;
  }

  static async open(usuario_id: string, monto_apertura: number): Promise<CajaType | null> {
    const open = await query<any[]>('SELECT id_caja FROM cajas WHERE usuario_id_apertura = ? AND estado = 1', [usuario_id]);
    if (open.length > 0) throw new Error('Usuario ya tiene una caja abierta');

    const id = generateUUID();
    const now = getNowInBusinessTimezone();
    await BaseRepository.insert(query, 'cajas', {
      id_caja: id,
      fecha_apertura: now,
      usuario_id_apertura: usuario_id,
      monto_apertura,
      estado: 1
    });
    return await this.getById(id);
  }

  static async update(id: string, data: any): Promise<CajaType | null> {
    await BaseRepository.update(query, 'cajas', 'id_caja', id, data);
    return await this.getById(id);
  }

  static async close(id: string, usuario_id_cierre: string): Promise<CajaType | null> {
    const caja = await BaseRepository.findOne<any>(query, 'cajas', 'id_caja', id);
    if (!caja || caja.estado !== 1) throw new Error('Caja no encontrada o ya cerrada');

    const montoCierre = Number(caja.monto_apertura || 0) + Number(caja.efectivo || 0) + 
                        Number(caja.tarjeta || 0) + Number(caja.transferencia || 0) - Number(caja.devolucion || 0);

    // Cerrar sesiones de todos los usuarios al cerrar caja
    await query(`
      UPDATE logins SET estado = 0 WHERE estado = 1
    `);

    const now = getNowInBusinessTimezone();
    await BaseRepository.update(query, 'cajas', 'id_caja', id, {
      usuario_id_cierre,
      fecha_cierre: now,
      monto_cierre: montoCierre,
      estado: 0
    });
    return await this.getById(id);
  }

  static async delete(id: string): Promise<void> {
    await BaseRepository.update(query, 'cajas', 'id_caja', id, { estado: -1 });
  }
}
