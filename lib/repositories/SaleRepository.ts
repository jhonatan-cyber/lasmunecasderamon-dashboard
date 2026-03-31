import { query, generateUUID, withTransaction, type TransactionQuery } from '@/lib/database/db';
import { SaleSchema, type SaleType } from '@/lib/business/schemas';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { RoomManager } from '@/lib/services/RoomManager';
import { BaseRepository } from './BaseRepository';

export class SaleRepository {
  private static readonly TABLE = 'ventas';
  private static readonly ID_COL = 'id_venta';

  private static mapSaleFromDB(row: any): SaleType | null {
    if (!row) return null;
    try {
      return SaleSchema.parse({
        id: row.id_venta,
        codigo: row.codigo,
        cliente_id: row.cliente_id,
        pedido_id: row.pedido_id,
        habitacion_id: row.habitacion_id,
        metodo_pago: row.metodo_pago,
        metodologia_pago: row.metodo_pago_adicional,
        monto_prepago: row.monto_prepago,
        monto_adicional: row.monto_adicional,
        propina: Number(row.propina || 0),
        sub_total: Number(row.sub_total || 0),
        total: Number(row.total || 0),
        total_comision: Number(row.total_comision || 0),
        tiempo: Number(row.tiempo || 0),
        caja_id: row.caja_id,
        created_by: row.created_by,
        cajero_nick: row.staff_nick,
        estado: Number(row.estado ?? 1),
        fecha_crea: row.fecha_crea,
        fecha_mod: row.fecha_mod,
        cliente_nombre: row.cliente_nombre,
        habitacion_nombre: row.habitacion_nombre,
        item_count: Number(row.item_count || 0),
        anfitrionas_nicks: row.anfitrionas_nicks || null,
      });
    } catch (err) {
      console.warn('[SaleRepository] Skipping invalid sale row:', row.id_venta, err);
      return null;
    }
  }

  static async getAll(params: { tipo?: string; page?: string; limit?: string; estado?: string; caja_id?: string; search?: string }): Promise<any> {
    if (params.tipo === 'resumen') {
      const cajaResult = await query<any[]>('SELECT id_caja FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1');
      const cajaId = cajaResult[0]?.id_caja;
      let where = 'WHERE v.estado IN (1, 2, 3)';
      let sqlParams: any[] = [];
      if (cajaId) {
        where += ' AND v.caja_id = ?';
        sqlParams.push(cajaId);
      }
      
      const sql = `
        SELECT 
          SUM(total) as total_ventas,
          SUM(CASE WHEN metodo_pago = 'efectivo' THEN total ELSE 0 END) as efectivo,
          SUM(CASE WHEN metodo_pago = 'tarjeta' THEN total ELSE 0 END) as tarjeta,
          SUM(CASE WHEN metodo_pago = 'transferencia' THEN total ELSE 0 END) as transferencia,
          SUM(CASE WHEN metodo_pago = 'prepago' THEN total ELSE 0 END) as prepago,
          SUM(propina) as total_propinas
        FROM ventas v
        ${where}
      `;
      const result = await query<any[]>(sql, sqlParams);
      return { resumen_general: result[0] };
    }

    const pNum = parseInt(params.page || '1');
    const lNum = parseInt(params.limit || '10');
    const offset = (pNum - 1) * lNum;

    let where = 'WHERE 1=1';
    let sqlParams: any[] = [];
    if (params.estado) {
      where += ' AND v.estado = ?';
      sqlParams.push(params.estado);
    }
    if (params.caja_id) {
      where += ' AND v.caja_id = ?';
      sqlParams.push(params.caja_id);
    }
    
    const sql = `
      SELECT v.*,
        c.nombre as cliente_nombre,
        u.nick as staff_nick,
        u.nombre as cajero_nombre,
        h.nombre as habitacion_nombre,
        (SELECT COUNT(*) FROM detalle_ventas dv WHERE dv.venta_id = v.id_venta) as item_count,
        (SELECT GROUP_CONCAT(u2.nick SEPARATOR ',')
         FROM ventas_usuarios vu
         JOIN usuarios u2 ON u2.id_usuario = vu.usuario_id
         WHERE vu.venta_id = v.id_venta) as anfitrionas_nicks
      FROM ventas v
      LEFT JOIN clientes c ON v.cliente_id = c.id_cliente
      LEFT JOIN usuarios u ON v.created_by = u.id_usuario
      LEFT JOIN habitaciones h ON h.id_habitacion = v.habitacion_id
      ${where}
      ORDER BY v.fecha_crea DESC
      LIMIT ? OFFSET ?
    `;
    const countSql = `SELECT COUNT(*) as count FROM ventas v ${where}`;
    const data = await query<any[]>(sql, [...sqlParams, lNum, offset]);
    const count = await query<any[]>(countSql, sqlParams);

    return { 
      data: data.map(row => this.mapSaleFromDB(row)).filter((item): item is SaleType => item !== null), 
      total: count[0]?.count || 0 
    };
  }

  static async rawInsert(trx: TransactionQuery | typeof query, data: any): Promise<void> {
    await BaseRepository.insert(trx, this.TABLE, data);
  }

  static async insertDetail(trx: TransactionQuery | typeof query, data: any): Promise<void> {
    await BaseRepository.insert(trx, 'detalle_ventas', data);
  }

  /**
   * Registra la relación entre una venta y el personal involucrado.
   */
  static async insertUserRelation(trx: TransactionQuery, ventaId: string, usuarioId: string): Promise<void> {
    await trx(
      'INSERT INTO ventas_usuarios (id_usuario_venta, venta_id, usuario_id, fecha_crea) VALUES (?, ?, ?, NOW())',
      [generateUUID(), ventaId, usuarioId]
    );
  }

  static async getById(id: string): Promise<any | null> {
    // 1. Fetch main venta data
    const res = await query<any[]>(`
      SELECT v.*, c.nombre as cliente_nombre, h.nombre as habitacion_nombre,
             u.nick as cajero_nick, u.nombre as cajero_nombre,
             CONCAT(ug.nombre, ' ', ug.apellido) as garzon_nombre,
             GROUP_CONCAT(CONCAT(p.nombre, ' x', dv.cantidad) SEPARATOR ', ') as productos_detalle
      FROM ventas v
      LEFT JOIN clientes c ON c.id_cliente = v.cliente_id
      LEFT JOIN habitaciones h ON h.id_habitacion = v.habitacion_id
      LEFT JOIN usuarios u ON u.id_usuario = v.created_by
      LEFT JOIN pedidos pe ON pe.id_pedido = v.pedido_id
      LEFT JOIN usuarios ug ON ug.id_usuario = pe.mesero_id
      LEFT JOIN detalle_ventas dv ON dv.venta_id = v.id_venta
      LEFT JOIN productos p ON p.id_producto = dv.producto_id
      WHERE v.id_venta = ?
      GROUP BY v.id_venta
    `, [id]);

    if (res.length === 0) return null;

    const venta = this.mapSaleFromDB(res[0]);
    if (!venta) return null;

    // 2. Fetch detalle items with product info
    const detalles = await query<any[]>(`
      SELECT dv.id_detalle_venta as id, dv.venta_id, dv.producto_id, dv.precio, dv.comision, dv.cantidad, dv.sub_total,
             p.nombre as producto_nombre, p.precio as producto_precio
      FROM detalle_ventas dv
      LEFT JOIN productos p ON p.id_producto = dv.producto_id
      WHERE dv.venta_id = ?
      ORDER BY dv.id_detalle_venta ASC
    `, [id]);

    // 3. Fetch anfitrionas/users assigned to this venta
    const usuarios = await query<any[]>(`
      SELECT vu.usuario_id, u.nick, u.nombre as usuario_nombre
      FROM ventas_usuarios vu
      LEFT JOIN usuarios u ON u.id_usuario = vu.usuario_id
      WHERE vu.venta_id = ?
    `, [id]);

    return {
      ...venta,
      cajero_nick: res[0].cajero_nick,
      cajero_nombre: res[0].cajero_nombre,
      garzon_nombre: res[0].garzon_nombre,
      detalles: detalles.map(d => ({
        id: d.id,
        venta_id: d.venta_id,
        producto_id: d.producto_id,
        precio: Number(d.precio || 0),
        comision: Number(d.comision || 0),
        cantidad: Number(d.cantidad || 0),
        sub_total: Number(d.sub_total || 0),
        producto_nombre: d.producto_nombre,
        producto_precio: d.producto_precio ? Number(d.producto_precio) : undefined,
      })),
      usuarios: usuarios.map(u => ({
        id: u.usuario_id,
        usuario_id: u.usuario_id,
        nick: u.nick,
        usuario_nombre: u.usuario_nombre,
      })),
    };
  }

  static async updateStatus(id: string, estado: number, userId?: string): Promise<SaleType | null> {
    const prev = await query<any[]>('SELECT estado, habitacion_id FROM ventas WHERE id_venta = ?', [id]);
    if (prev.length === 0) throw new Error('Venta no encontrada');
    const estadoAnterior = prev[0].estado;
    const habitacionId = prev[0].habitacion_id;

    await withTransaction(async (trx) => {
      await BaseRepository.update(trx, this.TABLE, this.ID_COL, id, { estado, fecha_mod: getNowInBusinessTimezone() });

      if ((estado === 1 || estado === 0)) {
        if (habitacionId) await RoomManager.resumeRoomLogic(trx, habitacionId, undefined, id);

        const anfsResult = await trx<any[]>('SELECT usuario_id FROM ventas_usuarios WHERE venta_id = ?', [id]);
        const hostessIds = anfsResult.map(a => a.usuario_id);
        await RoomManager.updateHostessServiceStatus(trx, hostessIds, undefined, id);
      }
      
      const { addVentaLog } = await import('@/lib/utils/logUtils');
      if (estado === 1 && estadoAnterior !== 1) await addVentaLog(id, 'FINALIZADO', 'Venta finalizada manualmente.', userId);
      else if (estado === 0 && estadoAnterior !== 0) {
        await addVentaLog(id, 'ANULADO', 'Venta anulada manualmente.', userId);
        await trx('UPDATE comisiones SET estado = 0 WHERE venta_id = ?', [id]);
      }
    });

    return await this.getById(id);
  }

  static async requestAnulacion(id: string, reason: string, requestedBy: string): Promise<string> {
    const idAnul = generateUUID();
    await query(`
      INSERT INTO solicitudes_anulacion_ventas (id, venta_id, motivo, requested_by, estado, fecha_crea)
      VALUES (?, ?, ?, ?, 'pendiente', ?)
    `, [idAnul, id, reason, requestedBy, getNowInBusinessTimezone()]);
    return idAnul;
  }

  static async processAnulacion(requestId: string, approvedBy: string, status: 'aprobado' | 'rechazado'): Promise<SaleType | null> {
    const now = getNowInBusinessTimezone();
    let ventaId: string | null = null;

    await withTransaction(async (trx) => {
      await trx('UPDATE solicitudes_anulacion_ventas SET estado = ?, approved_by = ?, fecha_mod = ? WHERE id = ?', [status, approvedBy, now, requestId]);
      if (status === 'aprobado') {
        const req = await trx<any[]>('SELECT venta_id FROM solicitudes_anulacion_ventas WHERE id = ?', [requestId]);
        if (req.length > 0) {
          ventaId = req[0].venta_id;
          await trx('UPDATE ventas SET estado = 0, fecha_mod = ? WHERE id_venta = ?', [now, ventaId]);
          // Restituir saldo if prepago
          const v = await trx<any[]>('SELECT cliente_id, total, metodo_pago FROM ventas WHERE id_venta = ?', [ventaId]);
          if (v.length > 0 && v[0].metodo_pago === 'prepago' && v[0].cliente_id) {
            await trx('UPDATE clientes SET saldo = saldo + ? WHERE id_cliente = ?', [v[0].total, v[0].cliente_id]);
          }
        }
      }
    });

    return ventaId ? await this.getById(ventaId) : null;
  }

  static async delete(id: string): Promise<void> {
    await withTransaction(async (trx) => {
      await trx('DELETE FROM detalle_ventas WHERE venta_id = ?', [id]);
      await trx('DELETE FROM ventas WHERE id_venta = ?', [id]);
    });
  }
}
