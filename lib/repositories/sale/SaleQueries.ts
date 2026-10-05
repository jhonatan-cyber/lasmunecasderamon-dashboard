import { query, generateUUID, withTransaction, type TransactionQuery } from '@/lib/database/db';
import { BaseRepository } from '../BaseRepository';
import { logger } from '@/lib/utils/logger';
import { type SaleType } from '@/lib/business/schemas';
import {
  actualizarEstadoVenta,
  aprobarAnulacionVenta,
  solicitarAnulacionVenta,
  procesarAnulacionVenta
} from '@/modules/ventas';
import { DatabaseError, NotFoundError } from '@/lib/errors/errors';
import type {
  VentaRawRow,
  VentaGetByIdRow,
  DetalleVentaWithProductRow,
  VentaUsuarioDetailRow,
  VentaComisionGroupRow,
  VentaPropinaGroupRow,
  CajaIdRow,
  VentaResumenRow,
  VentaCountRow
} from '../types';
import { mapSaleFromDB, type VentaGetByIdResponse } from './saleHelpers';

export class SaleQueries {
  private static readonly TABLE = 'ventas';
  private static readonly ID_COL = 'id_venta';

  static async approveAnulacion(
    ventaId: string,
    approvedBy: string,
    requestedAmount: number
  ): Promise<SaleType | null> {
    await aprobarAnulacionVenta(ventaId, approvedBy, requestedAmount);
    return this.getById(ventaId);
  }

  static mapSaleFromDB(row: VentaRawRow | VentaGetByIdRow | null): SaleType | null {
    return mapSaleFromDB(row);
  }

  static async getAll(params: {
    tipo?: string;
    page?: string;
    limit?: string;
    estado?: string;
    caja_id?: string;
    search?: string;
  }): Promise<
    | { resumen_general?: VentaResumenRow }
    | { data: (SaleType & { has_anulacion_solicitada: boolean })[]; total: number }
  > {
    try {
      if (params.tipo === 'resumen') {
        const cajaResult = await query<CajaIdRow[]>(
          'SELECT id_caja FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1'
        );
        const cajaId = cajaResult[0]?.id_caja;
        let where = 'WHERE v.estado IN (1, 2, 3)';
        let sqlParams: (string | number)[] = [];
        if (cajaId) {
          where += ' AND v.caja_id = ?';
          sqlParams.push(cajaId);
        }

        const sql = `
          SELECT
            SUM(total - COALESCE(cargo_tarjeta, 0)) as total_ventas,
            SUM(COALESCE(cargo_tarjeta, 0)) as cargo_tarjeta,
            SUM(CASE WHEN metodo_pago = 'efectivo' THEN total ELSE 0 END) as efectivo,
            SUM(CASE WHEN metodo_pago = 'tarjeta' THEN total ELSE 0 END) as tarjeta,
            SUM(CASE WHEN metodo_pago = 'transferencia' THEN total ELSE 0 END) as transferencia,
            SUM(CASE WHEN metodo_pago = 'prepago' THEN total ELSE 0 END) as prepago,
            SUM(propina) as total_propinas
          FROM ventas v
          ${where}
        `;
        const result = await query<VentaResumenRow[]>(sql, sqlParams);
        return { resumen_general: result[0] };
      }

      const pNum = parseInt(params.page || '1');
      const lNum = parseInt(params.limit || '10');
      const offset = (pNum - 1) * lNum;

      let where = 'WHERE 1=1';
      let sqlParams: (string | number)[] = [];
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
          (CAST(c.nombre AS text) || CAST(' ' AS text) || CAST(c.apellido AS text)) as cliente_nombre,
          u.nick as staff_nick,
          u.nombre as cajero_nombre,
          h.nombre as habitacion_numero,
          EXISTS(
            SELECT 1
            FROM solicitudes_anulacion_ventas sav
            WHERE sav.venta_id = v.id_venta
          ) as has_anulacion_solicitada,
          (SELECT COUNT(*) FROM detalle_ventas dv WHERE dv.venta_id = v.id_venta) as item_count,
          (SELECT STRING_AGG(u2.nick, ',')
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
      const data = await query<VentaRawRow[]>(sql, [...sqlParams, lNum, offset]);
      const count = await query<VentaCountRow[]>(countSql, sqlParams);

      return {
        data: data
          .map(row => {
            const sale = this.mapSaleFromDB(row);
            if (!sale) return null;
            return {
              ...sale,
              has_anulacion_solicitada: Boolean(Number(row.has_anulacion_solicitada || 0))
            };
          })
          .filter(
            (item): item is SaleType & { has_anulacion_solicitada: boolean } => item !== null
          ),
        total: count[0]?.count || 0
      };
    } catch (err) {
      logger.error('[SaleQueries] Error en getAll:', { params, err });
      throw new DatabaseError('Error al obtener lista de ventas', err);
    }
  }

  static async rawInsert(
    trx: TransactionQuery | typeof query,
    data: Record<string, unknown>
  ): Promise<void> {
    await BaseRepository.insert(trx, this.TABLE, data);
  }

  static async insertDetail(
    trx: TransactionQuery | typeof query,
    data: Record<string, unknown>
  ): Promise<void> {
    await BaseRepository.insert(trx, 'detalle_ventas', data);
  }

  static async insertUserRelation(
    trx: TransactionQuery,
    ventaId: string,
    usuarioId: string
  ): Promise<void> {
    try {
      await trx(
        'INSERT INTO ventas_usuarios (id_usuario_venta, venta_id, usuario_id, fecha_crea) VALUES (?, ?, ?, NOW())',
        [generateUUID(), ventaId, usuarioId]
      );
    } catch (err) {
      logger.error('[SaleQueries] Error al insertar relación usuario-venta:', {
        ventaId,
        usuarioId,
        err
      });
      throw new DatabaseError(`Error al asociar usuario a venta ${ventaId}`, err);
    }
  }

  static async getById(id: string): Promise<VentaGetByIdResponse | null> {
    try {
      const res = await query<VentaGetByIdRow[]>(
        `SELECT v.*, (CAST(c.nombre AS text) || CAST(' ' AS text) || CAST(c.apellido AS text)) as cliente_nombre, h.nombre as habitacion_numero,
                u.nick as cajero_nick, u.nombre as cajero_nombre, u.apellido as cajero_apellido,
                (CAST(ug.nombre AS text) || CAST(' ' AS text) || CAST(ug.apellido AS text)) as garzon_nombre,
                (SELECT STRING_AGG(u2.nick, ',')
                 FROM ventas_usuarios vu
                 JOIN usuarios u2 ON u2.id_usuario = vu.usuario_id
                 WHERE vu.venta_id = v.id_venta) as anfitrionas_nicks,
                STRING_AGG((CAST(p.nombre AS text) || CAST(' x' AS text) || CAST(dv.cantidad AS text)), ', ') as productos_detalle
         FROM ventas v
         LEFT JOIN clientes c ON c.id_cliente = v.cliente_id
         LEFT JOIN habitaciones h ON h.id_habitacion = v.habitacion_id
         LEFT JOIN usuarios u ON u.id_usuario = v.created_by
         LEFT JOIN pedidos pe ON pe.id_pedido = v.pedido_id
         LEFT JOIN usuarios ug ON ug.id_usuario = pe.mesero_id
         LEFT JOIN detalle_ventas dv ON dv.venta_id = v.id_venta
         LEFT JOIN productos p ON p.id_producto = dv.producto_id
         WHERE v.id_venta = ?
         GROUP BY v.id_venta, c.id_cliente, h.id_habitacion, u.id_usuario, ug.id_usuario`,
        [id]
      );

      if (res.length === 0) return null;

      const venta = this.mapSaleFromDB(res[0]);
      if (!venta) return null;

      const [detalles, usuarios, comisiones, propinas] = await Promise.all([
        query<DetalleVentaWithProductRow[]>(
          `SELECT dv.id_detalle_venta as id, dv.venta_id, dv.producto_id, dv.precio, dv.comision, dv.cantidad, dv.sub_total,
                  dv.tipo_venta, dv.shot_anfitriona,
                  p.nombre as producto_nombre, p.precio as producto_precio
           FROM detalle_ventas dv
           LEFT JOIN productos p ON p.id_producto = dv.producto_id
           WHERE dv.venta_id = ?
           ORDER BY dv.id_detalle_venta ASC`,
          [id]
        ),
        query<VentaUsuarioDetailRow[]>(
          `SELECT vu.usuario_id, u.nick, u.nombre as usuario_nombre
           FROM ventas_usuarios vu
           LEFT JOIN usuarios u ON u.id_usuario = vu.usuario_id
           WHERE vu.venta_id = ?`,
          [id]
        ),
        query<VentaComisionGroupRow[]>(
          `SELECT u.nick, u.foto, SUM(dv.comision) as monto
           FROM detalle_ventas dv
           JOIN ventas_usuarios vu ON vu.venta_id = dv.venta_id AND vu.usuario_id = dv.hostess_id
           JOIN usuarios u ON u.id_usuario = dv.hostess_id
           WHERE dv.venta_id = ? AND dv.comision > 0
           GROUP BY dv.hostess_id, u.nick, u.foto`,
          [id]
        ),
        query<VentaPropinaGroupRow[]>(
          `SELECT dp.usuario_id, u.nick, u.nombre, u.apellido, u.foto, SUM(dp.monto) as monto
           FROM propinas p
           INNER JOIN detalle_propinas dp ON dp.propina_id = p.id_propina
           LEFT JOIN usuarios u ON u.id_usuario = dp.usuario_id
           WHERE p.venta_id = ?
           GROUP BY dp.usuario_id, u.nick, u.nombre, u.apellido, u.foto
           ORDER BY monto DESC`,
          [id]
        )
      ]);

      const totalComision = comisiones.reduce((sum, c) => sum + Number(c.monto || 0), 0);

      return {
        ...venta,
        cajero_nick: res[0].cajero_nick,
        cajero_nombre: res[0].cajero_nombre,
        cajero_apellido: res[0].cajero_apellido,
        garzon_nombre: res[0].garzon_nombre,
        habitacion_nombre: res[0].habitacion_nombre,
        total_comision: totalComision,
        comisiones_detalle: comisiones.map(c => ({
          nick: c.nick,
          foto: c.foto,
          monto: Number(c.monto || 0)
        })),
        propinas_detalle: propinas.map(p => ({
          usuario_id: p.usuario_id,
          nick: p.nick,
          nombre: p.nombre,
          apellido: p.apellido,
          foto: p.foto,
          monto: Number(p.monto || 0)
        })),
        detalles: detalles.map(d => ({
          id: d.id,
          venta_id: d.venta_id,
          producto_id: d.producto_id,
          precio: Number(d.precio || 0),
          comision: Number(d.comision || 0),
          cantidad: Number(d.cantidad || 0),
          sub_total: Number(d.sub_total || 0),
          producto_nombre: d.producto_nombre,
          producto_precio: d.producto_precio ? Number(d.producto_precio) : undefined
        })),
        usuarios: usuarios.map(u => ({
          id: u.usuario_id,
          usuario_id: u.usuario_id,
          nick: u.nick,
          usuario_nombre: u.usuario_nombre
        }))
      };
    } catch (err) {
      logger.error('[SaleQueries] Error en getById:', { ventaId: id, err });
      if (err instanceof NotFoundError) throw err;
      throw new DatabaseError(`Error al obtener venta ${id}`, err);
    }
  }

  static async updateStatus(id: string, estado: number, userId?: string): Promise<SaleType | null> {
    await actualizarEstadoVenta(id, estado, userId);
    return await this.getById(id);
  }

  static async requestAnulacion(
    id: string,
    reason: string,
    requestedBy: string,
    amount: number
  ): Promise<string> {
    return solicitarAnulacionVenta(id, reason, requestedBy, amount);
  }

  static async processAnulacion(
    requestId: string,
    approvedBy: string,
    status: string
  ): Promise<SaleType | null> {
    const ventaId = await procesarAnulacionVenta(requestId, approvedBy, status);
    if (!ventaId) return null;
    return await this.getById(ventaId);
  }

  static async delete(id: string): Promise<void> {
    try {
      await withTransaction(async trx => {
        await trx('DELETE FROM detalle_ventas WHERE venta_id = ?', [id]);
        await trx('DELETE FROM ventas WHERE id_venta = ?', [id]);
      });
    } catch (err) {
      logger.error('[SaleQueries] Error en delete:', { ventaId: id, err });
      throw new DatabaseError(`Error al eliminar venta ${id}`, err);
    }
  }
}
