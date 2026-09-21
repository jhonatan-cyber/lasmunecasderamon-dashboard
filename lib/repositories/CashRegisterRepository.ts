import { query, generateUUID, withTransaction, type TransactionQuery } from '@/lib/database/db';
import { CajaSchema, type CajaType } from '@/lib/business/schemas';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { BaseRepository } from './BaseRepository';
import { logger } from '@/lib/utils/logger';
import { ConflictError, NotFoundError, BusinessError, DatabaseError } from '@/lib/errors/errors';

export class CashRegisterRepository {
  private static async getPrepagoMetrics(
    fechaApertura?: string | Date | null,
    fechaCierre?: string | Date | null
  ): Promise<{
    prepago_cargado: number;
    prepago_consumido: number;
    prepago_pendiente_clientes: number;
  }> {
    try {
      if (!fechaApertura) {
      const [saldoRow] = await query<any[]>(
        'SELECT COALESCE(SUM(saldo), 0) as saldo_pendiente FROM clientes'
      );

      return {
        prepago_cargado: 0,
        prepago_consumido: 0,
        prepago_pendiente_clientes: Number(saldoRow?.saldo_pendiente || 0)
      };
    }

    const fechaInicio = fechaApertura instanceof Date ? fechaApertura.toISOString() : fechaApertura;
    const fechaFin =
      fechaCierre instanceof Date
        ? fechaCierre.toISOString()
        : fechaCierre || getNowInBusinessTimezone();

    const [movimientosRow] = await query<any[]>(
      `SELECT
         COALESCE(SUM(CASE WHEN tipo = 'CARGA' THEN monto ELSE 0 END), 0) as prepago_cargado,
         COALESCE(SUM(CASE WHEN tipo = 'CONSUMO' THEN monto ELSE 0 END), 0) as prepago_consumido
       FROM clientes_prepago_movimientos
       WHERE fecha_crea >= ? AND fecha_crea <= ?`,
      [fechaInicio, fechaFin]
    );

    const [saldoRow] = await query<any[]>(
      'SELECT COALESCE(SUM(saldo), 0) as saldo_pendiente FROM clientes'
    );

    return {
      prepago_cargado: Number(movimientosRow?.prepago_cargado || 0),
      prepago_consumido: Number(movimientosRow?.prepago_consumido || 0),
      prepago_pendiente_clientes: Number(saldoRow?.saldo_pendiente || 0)
    };
    } catch (err) {
      logger.error('[CashRegisterRepository] Error en getPrepagoMetrics:', { err });
      throw new DatabaseError('Error al obtener métricas de prepago', err);
    }
  }

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
      prepago_cargado: row.prepago_cargado ?? 0,
      prepago_consumido: row.prepago_consumido ?? 0,
      prepago_pendiente_clientes: row.prepago_pendiente_clientes ?? 0,
      propina: row.propina ?? 0,
      cuenta: row.cuenta ?? 0,
      anticipo: row.anticipo ?? 0,
      retiro_total: Number(row.retiro_total ?? 0),
      iva: row.iva ?? 0,
      comision: row.comision ?? 0,
      usuario_apertura: row.usuario_apertura,
      cajero_nombre: row.cajero_nombre,
      cajero_foto: row.cajero_foto,
      cajero_cierre_nombre: row.cajero_cierre_nombre,
      cajero_cierre_foto: row.cajero_cierre_foto
    });
  }

  static async getCurrentCajaId(trx?: TransactionQuery): Promise<string | null> {
    try {
      const qFunc = trx || query;
    const res = await qFunc<any[]>(
      'SELECT id_caja FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1'
    );
    return res[0]?.id_caja || null;
    } catch (err) {
      logger.error('[CashRegisterRepository] Error en getCurrentCajaId:', { err });
      throw new DatabaseError('Error al obtener caja activa', err);
    }
  }

  static async updateBalances(
    trx: TransactionQuery,
    id_caja: string,
    deltas: {
      venta?: number;
      cargo_tarjeta?: number;
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

    const columnMap: Record<string, string> = {
      venta: 'venta',
      cargo_tarjeta: 'cargo_tarjeta',
      servicio: 'servicio',
      efectivo: 'efectivo',
      tarjeta: 'tarjeta',
      transferencia: 'transferencia',
      prepago: 'prepago',
      anticipo: 'anticipo',
      iva: 'iva',
      comision: 'comision',
      propina: 'propina',

      cuenta: 'venta',
      devolucion: 'devolucion'
    };

    const knownEntries = entries.filter(([k]) => k in columnMap);
    if (knownEntries.length === 0) return;

    const colTotals: Record<string, number> = {};
    for (const [k, v] of knownEntries) {
      const col = columnMap[k];
      colTotals[col] = (colTotals[col] ?? 0) + (v as number);
    }

    const dedupedEntries = Object.entries(colTotals).filter(([_, v]) => v !== 0);
    if (dedupedEntries.length === 0) return;

    const setClause = dedupedEntries.map(([col]) => `${col} = ${col} + ?`).join(', ');
    const values = dedupedEntries.map(([_, v]) => v);

    logger.debug('[CashRegisterRepository] updateBalances:', { id_caja, setClause, values });
    try {
      await trx(`UPDATE cajas SET ${setClause} WHERE id_caja = ? AND estado = 1`, [
        ...values,
        id_caja
      ]);
    } catch (err) {
      logger.error('[CashRegisterRepository] Error en updateBalances:', { id_caja, err });
      throw new DatabaseError(`Error al actualizar balances de caja ${id_caja}`, err);
    }
  }

  static async summary(): Promise<any> {
    try {
      const row = await query<any[]>(`
      SELECT c.*, (CAST(u.nombre AS text) || CAST(' ' AS text) || CAST(u.apellido AS text)) as usuario_apertura
      FROM cajas c
      LEFT JOIN usuarios u ON c.usuario_id_apertura = u.id_usuario
      WHERE c.estado = 1
      ORDER BY c.fecha_apertura DESC LIMIT 1
    `);

    if (row.length === 0) return { balance_total: 0, cajas_abiertas: 0 };
    const cajaRow = row[0];

    const stats = {
      ventas: (
        await query<any[]>(
          'SELECT COUNT(*) AS cantidad, COALESCE(AVG(total), 0) AS promedio FROM ventas WHERE estado = 1 AND fecha_crea >= ?',
          [cajaRow.fecha_apertura]
        )
      )[0],
      servicios: (
        await query<any[]>(
          'SELECT COUNT(*) AS cantidad, COALESCE(AVG(total), 0) AS promedio FROM servicios WHERE estado = 1 AND fecha_crea >= ?',
          [cajaRow.fecha_apertura]
        )
      )[0]
    };

    const balanceTotal =
      Number(cajaRow.efectivo || 0) +
      Number(cajaRow.tarjeta || 0) +
      Number(cajaRow.transferencia || 0) +
      Number(cajaRow.monto_apertura || 0) -
      Number(cajaRow.devolucion || 0);

    const prepagoMetrics = await this.getPrepagoMetrics(
      cajaRow.fecha_apertura,
      cajaRow.fecha_cierre
    );

    return {
      ...this.mapCajaFromDB({ ...cajaRow, ...prepagoMetrics }),
      balance_total: balanceTotal,
      total_ventas: Number(cajaRow.venta || 0),
      cantidad_ventas: stats.ventas.cantidad,
      promedio_venta: stats.ventas.promedio,
      total_servicios: Number(cajaRow.servicio || 0),
      cantidad_servicios: stats.servicios.cantidad,
      promedio_servicio: stats.servicios.promedio,

      total_tarjeta: Number(cajaRow.tarjeta || 0),
      total_transferencia: Number(cajaRow.transferencia || 0),
      total_anticipo: cajaRow.anticipo || 0,
      total_devoluciones: Number(cajaRow.devolucion || 0),
      total_iva: Number(cajaRow.iva || 0),
      total_propina: Number(cajaRow.propina || 0),
      total_comisiones: Number(cajaRow.comision || 0),
      efectivo_en_caja: Number(cajaRow.efectivo || 0) + Number(cajaRow.monto_apertura || 0),
      total_efectivo: Number(cajaRow.efectivo || 0) + Number(cajaRow.monto_apertura || 0)
    };
    } catch (err) {
      logger.error('[CashRegisterRepository] Error en summary:', { err });
      throw new DatabaseError('Error al obtener resumen de caja', err);
    }
  }

  static async getAll(): Promise<CajaType[]> {
    try {
      const results = await query<any[]>(`
      SELECT c.*,
             (CAST(u1.nombre AS text) || CAST(' ' AS text) || CAST(u1.apellido AS text)) as cajero_nombre,
             COALESCE((
               SELECT SUM(r.monto)
               FROM retiros_caja r
               WHERE r.caja_id = c.id_caja
             ), 0) as retiro_total
      FROM cajas c
      LEFT JOIN usuarios u1 ON c.usuario_id_apertura = u1.id_usuario
      WHERE c.estado IN (0, 1) ORDER BY c.fecha_apertura DESC
    `);
    return results.map(row => this.mapCajaFromDB(row));
    } catch (err) {
      logger.error('[CashRegisterRepository] Error en getAll:', { err });
      throw new DatabaseError('Error al obtener lista de cajas', err);
    }
  }

  static async getById(id: string): Promise<CajaType | null> {
    try {
      const res = await query<any[]>(
      `
      SELECT c.*,
             (CAST(u1.nombre AS text) || CAST(' ' AS text) || CAST(u1.apellido AS text)) as cajero_nombre,
             u1.foto as cajero_foto,
             (CAST(u2.nombre AS text) || CAST(' ' AS text) || CAST(u2.apellido AS text)) as cajero_cierre_nombre,
             u2.foto as cajero_cierre_foto,
             COALESCE((
               SELECT SUM(r.monto)
               FROM retiros_caja r
               WHERE r.caja_id = c.id_caja
             ), 0) as retiro_total
      FROM cajas c
      LEFT JOIN usuarios u1 ON c.usuario_id_apertura = u1.id_usuario
      LEFT JOIN usuarios u2 ON c.usuario_id_cierre = u2.id_usuario
      WHERE c.id_caja = ?
    `,
      [id]
    );
    if (res.length === 0) return null;

    const prepagoMetrics = await this.getPrepagoMetrics(res[0].fecha_apertura, res[0].fecha_cierre);
    return this.mapCajaFromDB({ ...res[0], ...prepagoMetrics });
    } catch (err) {
      logger.error('[CashRegisterRepository] Error en getById:', { id, err });
      throw new DatabaseError(`Error al obtener caja ${id}`, err);
    }
  }

  static async open(usuario_id: string, monto_apertura: number): Promise<CajaType | null> {
    try {
      const open = await query<any[]>(
      'SELECT id_caja, usuario_id_apertura FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1'
    );
    if (open.length > 0) {
      const currentOpenUserId = String(open[0].usuario_id_apertura || '');
      if (currentOpenUserId === String(usuario_id)) {
        throw new ConflictError('Usuario ya tiene una caja abierta');
      }
      throw new ConflictError('Ya existe una caja abierta');
    }

    const id = generateUUID();
    const now = getNowInBusinessTimezone();
    await BaseRepository.insert(query, 'cajas', {
      id_caja: id,
      fecha_apertura: now,
      usuario_id_apertura: usuario_id,
      monto_apertura,
      efectivo: 0,
      tarjeta: 0,
      transferencia: 0,
      monto_cierre: 0,
      estado: 1
    });
    return await this.getById(id);
    } catch (err) {
      logger.error('[CashRegisterRepository] Error en open:', { usuario_id, err });
      if (err instanceof ConflictError || err instanceof NotFoundError) throw err;
      throw new DatabaseError(`Error al abrir caja para usuario ${usuario_id}`, err);
    }
  }

  static async update(id: string, data: any): Promise<CajaType | null> {
    try {
      await BaseRepository.update(query, 'cajas', 'id_caja', id, data);
    return await this.getById(id);
    } catch (err) {
      logger.error('[CashRegisterRepository] Error en update:', { id, err });
      if (err instanceof NotFoundError) throw err;
      throw new DatabaseError(`Error al actualizar caja ${id}`, err);
    }
  }

  static async close(id: string, usuario_id_cierre: string): Promise<CajaType | null> {
    try {
      const caja = await BaseRepository.findOne<any>(query, 'cajas', 'id_caja', id);
    if (!caja || caja.estado !== 1) throw new NotFoundError('Caja abierta');

    const montoCierre =
      Number(caja.monto_apertura || 0) +
      Number(caja.efectivo || 0) +
      Number(caja.tarjeta || 0) +
      Number(caja.transferencia || 0) -
      Number(caja.devolucion || 0);

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
    } catch (err) {
      logger.error('[CashRegisterRepository] Error en close:', { id, err });
      if (err instanceof NotFoundError) throw err;
      throw new DatabaseError(`Error al cerrar caja ${id}`, err);
    }
  }

  static async delete(id: string): Promise<void> {
    try {
      await BaseRepository.update(query, 'cajas', 'id_caja', id, { estado: -1 });
    } catch (err) {
      logger.error('[CashRegisterRepository] Error en delete:', { id, err });
      throw new DatabaseError(`Error al eliminar caja ${id}`, err);
    }
  }
}
