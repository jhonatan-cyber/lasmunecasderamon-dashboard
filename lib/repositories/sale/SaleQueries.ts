import { query, generateUUID, withTransaction, type TransactionQuery } from '@/lib/database/db';
import { sendNotificationToAll } from '@/lib/api/sseService';
import { type SaleType } from '@/lib/business/schemas';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { RoomManager } from '@/lib/services/RoomManager';
import { CashRegisterRepository } from '../CashRegisterRepository';
import { BaseRepository } from '../BaseRepository';
import { logger } from '@/lib/utils/logger';
import { NotFoundError, DatabaseError, BusinessError } from '@/lib/errors/errors';
import type {
  VentaStateRow,
  VentaAnulacionRow,
  PrepagoRow,
  ComisionAnulacionRow,
  PropinaHeaderRow,
  PropinaDetailAnulacionRow,
  VentaRawRow,
  VentaGetByIdRow,
  DetalleVentaWithProductRow,
  VentaUsuarioDetailRow,
  VentaComisionGroupRow,
  VentaPropinaGroupRow,
  CajaIdRow,
  VentaResumenRow,
  VentaCountRow,
  SolicitudAnulacionVentaReqRow,
  SolicitudAnulacionMontoRow,
  VentaAnfsRow
} from '../types';
import {
  parseMixedPayments,
  normalizeSolicitudStatus,
  allocateProportionally,
  mapSaleFromDB,
  type MixedPayment,
  type AllocationRow,
  type VentaRefundDetailRow,
  type VentaGetByIdResponse
} from './saleHelpers';

export class SaleQueries {
  private static readonly TABLE = 'ventas';
  private static readonly ID_COL = 'id_venta';

  static parseMixedPayments(raw: unknown): MixedPayment[] {
    return parseMixedPayments(raw);
  }

  static normalizeSolicitudStatus(status: string): 'confirmada' | 'rechazada' {
    return normalizeSolicitudStatus(status);
  }

  static allocateProportionally<T>(
    rows: T[],
    getAmount: (row: T) => number,
    targetTotal: number
  ): AllocationRow<T>[] {
    return allocateProportionally(rows, getAmount, targetTotal);
  }

  static async getVentaStateAfterRequest(trx: TransactionQuery, ventaId: string): Promise<number> {
    try {
      const ventaRows = await trx<VentaStateRow[]>(
        'SELECT habitacion_id, tiempo FROM ventas WHERE id_venta = ? LIMIT 1',
        [ventaId]
      );

      return ventaRows.length && ventaRows[0].habitacion_id && Number(ventaRows[0].tiempo || 0) > 0
        ? 2
        : 1;
    } catch (err) {
      logger.error('[SaleQueries] Error al obtener estado de venta:', { ventaId, err });
      throw new DatabaseError(`Error al obtener estado de venta ${ventaId}`, err);
    }
  }

  static async registerVentaRefund(
    trx: TransactionQuery,
    params: {
      ventaId: string;
      clienteId?: string | null;
      refundTotal: number;
      refundSubTotal: number;
      refundComision: number;
      detailRows: VentaRefundDetailRow[];
    }
  ): Promise<void> {
    try {
      const refundTotal = Math.max(0, Math.round(Number(params.refundTotal || 0)));
      if (refundTotal <= 0) return;

      const refundSubTotal = Math.max(0, Math.round(Number(params.refundSubTotal || 0)));
      const refundComision = Math.max(0, Math.round(Number(params.refundComision || 0)));
      const now = getNowInBusinessTimezone();
      const devolucionVentaId = generateUUID();

      await trx(
        `INSERT INTO devoluciones_ventas
         (id_devolucion_venta, cliente_id, venta_id, total, fecha_crea, estado)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [devolucionVentaId, params.clienteId || null, params.ventaId, refundTotal, now]
      );

      if (!params.detailRows.length || refundSubTotal <= 0) return;

      const refundedSubtotals = this.allocateProportionally(
        params.detailRows,
        row => row.sub_total,
        refundSubTotal
      );
      const refundedComisiones = this.allocateProportionally(
        params.detailRows,
        row => row.comision,
        refundComision
      );
      const refundComisionByDetailId = new Map(
        refundedComisiones.map(row => [row.id_detalle_venta, Number(row.nextAmount || 0)])
      );

      for (const row of refundedSubtotals) {
        const refundedLineSubTotal = Number(row.nextAmount || 0);
        const refundedLineComision = refundComisionByDetailId.get(row.id_detalle_venta) || 0;

        if (refundedLineSubTotal <= 0 && refundedLineComision <= 0) continue;

        const originalQuantity = Math.max(0, Math.round(Number(row.cantidad || 0)));
        const canPreserveOriginalQuantity =
          originalQuantity > 0 &&
          refundedLineSubTotal > 0 &&
          refundedLineSubTotal % originalQuantity === 0;

        const quantity = canPreserveOriginalQuantity
          ? originalQuantity
          : refundedLineSubTotal > 0
            ? 1
            : Math.max(originalQuantity, 1);
        const price = canPreserveOriginalQuantity
          ? Math.round(refundedLineSubTotal / originalQuantity)
          : refundedLineSubTotal;

        await trx(
          `INSERT INTO detalle_devoluciones_ventas
           (id_detalle_devolucion, devolucion_venta_id, producto_id, cantidad, precio, comision, fecha_crea, estado)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
          [
            generateUUID(),
            devolucionVentaId,
            row.producto_id || null,
            quantity,
            price,
            refundedLineComision,
            now
          ]
        );
      }
    } catch (err) {
      logger.error('[SaleQueries] Error al registrar devolución:', {
        ventaId: params.ventaId,
        err
      });
      throw new DatabaseError(`Error al registrar devolución para venta ${params.ventaId}`, err);
    }
  }

  static async approveAnulacion(
    ventaId: string,
    approvedBy: string,
    requestedAmount: number
  ): Promise<SaleType | null> {
    try {
      const ventaRows = await query<VentaAnulacionRow[]>(
        `SELECT id_venta, estado, habitacion_id, cliente_id, caja_id, pedido_id, metodo_pago, total, sub_total,
                propina, total_comision, pagos_mixtos
         FROM ventas
         WHERE id_venta = ?
         LIMIT 1`,
        [ventaId]
      );

      if (!ventaRows.length) {
        throw new NotFoundError('Venta', ventaId);
      }

      const venta = ventaRows[0];
      const currentTotal = Math.max(0, Math.round(Number(venta.total || 0)));
      const currentSubTotal = Math.max(0, Math.round(Number(venta.sub_total || 0)));
      const approvedAmount = Math.max(0, Math.round(Number(requestedAmount || 0)));

      if (approvedAmount <= 0 || approvedAmount >= currentTotal) {
        return this.updateStatus(ventaId, 0, approvedBy);
      }

      const currentPropina = Math.max(0, Math.round(Number(venta.propina || 0)));
      const currentComision = Math.max(0, Math.round(Number(venta.total_comision || 0)));
      const clienteId = venta.cliente_id;
      const cajaId = venta.caja_id;
      const pedidoId = venta.pedido_id;
      const metodoPago = String(venta.metodo_pago || '').toLowerCase();
      const pagosMixtos = this.parseMixedPayments(venta.pagos_mixtos);

      await withTransaction(async trx => {
        const prepagoRows = clienteId
          ? await trx<PrepagoRow[]>(
              `SELECT COALESCE(SUM(monto), 0) as total_prepago
               FROM clientes_prepago_movimientos
               WHERE cliente_id = ?
                 AND UPPER(tipo) = 'CONSUMO'
                 AND (
                   venta_id = ?
                   OR (metadatos::jsonb ->> 'venta_id') = ?
                 )`,
              [clienteId, ventaId, ventaId]
            )
          : [];

        const currentPrepago = Math.max(0, Math.round(Number(prepagoRows[0]?.total_prepago || 0)));
        const newTotal = Math.max(0, currentTotal - approvedAmount);
        const newPropina =
          currentTotal > 0
            ? Math.max(0, Math.round((currentPropina * newTotal) / currentTotal))
            : 0;
        const newComision =
          currentTotal > 0
            ? Math.max(0, Math.round((currentComision * newTotal) / currentTotal))
            : 0;
        const newSubTotal = Math.max(0, newTotal - newPropina);

        const prepagoAllocation = this.allocateProportionally(
          currentPrepago > 0 ? [{ key: 'prepago', amount: currentPrepago }] : [],
          row => row.amount,
          currentTotal > 0 ? Math.round((currentPrepago * newTotal) / currentTotal) : 0
        );
        const newPrepago = Number(prepagoAllocation[0]?.nextAmount || 0);
        const prepagoRefund = Math.max(0, currentPrepago - newPrepago);

        const mixedSourceRows =
          metodoPago === 'mixto'
            ? pagosMixtos.map((payment, index) => ({
                key: `${payment.metodo}_${index}`,
                metodo: payment.metodo,
                amount: Math.max(0, Math.round(Number(payment.monto || 0)))
              }))
            : [
                {
                  key: `${metodoPago || 'efectivo'}_principal`,
                  metodo: metodoPago || 'efectivo',
                  amount: Math.max(0, currentTotal - currentPrepago)
                }
              ];

        const targetMixedTotal = Math.max(0, newTotal - newPrepago);
        const updatedMixedRows = this.allocateProportionally(
          mixedSourceRows,
          row => row.amount,
          targetMixedTotal
        );

        const methodRefunds = { efectivo: 0, tarjeta: 0, transferencia: 0 };

        for (const row of updatedMixedRows) {
          const refundAmount = Math.max(0, row.currentAmount - Number(row.nextAmount || 0));
          if (row.metodo === 'efectivo') methodRefunds.efectivo += refundAmount;
          if (row.metodo === 'tarjeta') methodRefunds.tarjeta += refundAmount;
          if (row.metodo === 'transferencia') methodRefunds.transferencia += refundAmount;
        }

        if (clienteId && prepagoRefund > 0) {
          await trx('UPDATE clientes SET saldo = saldo + ? WHERE id_cliente = ?', [
            prepagoRefund,
            clienteId
          ]);
          await trx(
            `INSERT INTO clientes_prepago_movimientos
             (id_movimiento, cliente_id, tipo, monto, metodo_pago, venta_id, usuario_id, fecha_crea, metadatos)
             VALUES (?, ?, 'DEVOLUCION', ?, 'prepago', ?, ?, ?, ?)`,
            [
              generateUUID(),
              clienteId,
              prepagoRefund,
              ventaId,
              approvedBy || null,
              getNowInBusinessTimezone(),
              JSON.stringify({ concepto: `Anulacion parcial venta ${ventaId}` })
            ]
          );
        }

        if (cajaId) {
          await CashRegisterRepository.updateBalances(trx, cajaId, {
            venta: -(approvedAmount - Math.max(0, currentPropina - newPropina)),
            efectivo: -methodRefunds.efectivo,
            tarjeta: -methodRefunds.tarjeta,
            transferencia: -methodRefunds.transferencia,
            prepago: -prepagoRefund,
            propina: -(currentPropina - newPropina),
            comision: -(currentComision - newComision),
            devolucion: approvedAmount
          });
        }

        await trx(
          `UPDATE ventas SET total = ?, sub_total = ?, propina = ?, total_comision = ?, pagos_mixtos = ?, estado = ?, fecha_mod = ? WHERE id_venta = ?`,
          [
            newTotal,
            newSubTotal,
            newPropina,
            newComision,
            JSON.stringify(
              updatedMixedRows
                .filter(row => Number(row.nextAmount || 0) > 0)
                .map(row => ({ metodo: row.metodo, monto: Number(row.nextAmount || 0) }))
            ),
            await this.getVentaStateAfterRequest(trx, ventaId),
            getNowInBusinessTimezone(),
            ventaId
          ]
        );

        const detailRows = await trx<VentaRefundDetailRow[]>(
          `SELECT id_detalle_venta, producto_id, cantidad, precio, sub_total, comision
           FROM detalle_ventas WHERE venta_id = ? ORDER BY id_detalle_venta ASC`,
          [ventaId]
        );

        await this.registerVentaRefund(trx, {
          ventaId,
          clienteId,
          refundTotal: approvedAmount,
          refundSubTotal: Math.max(0, currentSubTotal - newSubTotal),
          refundComision: Math.max(0, currentComision - newComision),
          detailRows
        });

        const updatedDetailSubtotals = this.allocateProportionally(
          detailRows,
          row => row.sub_total,
          newSubTotal
        );
        const updatedDetailComisiones = this.allocateProportionally(
          detailRows,
          row => row.comision,
          newComision
        );
        const comisionByDetailId = new Map(
          updatedDetailComisiones.map(row => [row.id_detalle_venta, Number(row.nextAmount || 0)])
        );

        for (const row of updatedDetailSubtotals) {
          await trx(
            'UPDATE detalle_ventas SET sub_total = ?, comision = ? WHERE id_detalle_venta = ?',
            [
              Number(row.nextAmount || 0),
              comisionByDetailId.get(row.id_detalle_venta) || 0,
              row.id_detalle_venta
            ]
          );
        }

        const comisionRows = await trx<ComisionAnulacionRow[]>(
          `SELECT c.id_comision, c.monto, dc.id_detalle_comision, dc.comision
           FROM comisiones c INNER JOIN detalle_comisiones dc ON dc.comision_id = c.id_comision
           WHERE c.venta_id = ? AND c.estado = 1 AND dc.estado = 1 ORDER BY c.id_comision ASC`,
          [ventaId]
        );

        const updatedComisiones = this.allocateProportionally(
          comisionRows,
          row => row.comision,
          newComision
        );

        for (const row of updatedComisiones) {
          await trx('UPDATE detalle_comisiones SET comision = ? WHERE id_detalle_comision = ?', [
            Number(row.nextAmount || 0),
            row.id_detalle_comision
          ]);
          await trx('UPDATE comisiones SET monto = ? WHERE id_comision = ?', [
            Number(row.nextAmount || 0),
            row.id_comision
          ]);
        }

        const propinaHeaderRows = await trx<PropinaHeaderRow[]>(
          'SELECT id_propina, propina FROM propinas WHERE venta_id = ? AND estado = 1 ORDER BY id_propina ASC',
          [ventaId]
        );
        const propinaDetailRows = await trx<PropinaDetailAnulacionRow[]>(
          `SELECT dp.id_detalle_propina, dp.propina_id, dp.monto
           FROM detalle_propinas dp INNER JOIN propinas p ON p.id_propina = dp.propina_id
           WHERE p.venta_id = ? AND COALESCE(dp.estado, 1) = 1 ORDER BY dp.id_detalle_propina ASC`,
          [ventaId]
        );

        const updatedPropinas = this.allocateProportionally(
          propinaDetailRows,
          row => row.monto,
          newPropina
        );
        const propinaByHeaderId = new Map<string, number>();

        for (const row of updatedPropinas) {
          await trx('UPDATE detalle_propinas SET monto = ? WHERE id_detalle_propina = ?', [
            Number(row.nextAmount || 0),
            row.id_detalle_propina
          ]);
          propinaByHeaderId.set(
            row.propina_id,
            (propinaByHeaderId.get(row.propina_id) || 0) + Number(row.nextAmount || 0)
          );
        }

        for (const header of propinaHeaderRows) {
          await trx('UPDATE propinas SET propina = ?, fecha_mod = ? WHERE id_propina = ?', [
            propinaByHeaderId.get(header.id_propina) || 0,
            getNowInBusinessTimezone(),
            header.id_propina
          ]);
        }

        if (pedidoId) {
          await trx('UPDATE pedidos SET estado = 2 WHERE id_pedido = ?', [pedidoId]);
        }

        const { addVentaLog } = await import('@/lib/utils/logUtils');
        await addVentaLog(
          ventaId,
          'ANULACION_PARCIAL',
          `Venta ajustada por anulacion parcial de ${approvedAmount}.`,
          approvedBy
        );
      });

      return this.getById(ventaId);
    } catch (err) {
      logger.error('[SaleQueries] Error en approveAnulacion:', { ventaId, err });
      if (err instanceof NotFoundError) throw err;
      throw new DatabaseError(`Error al aprobar anulación de venta ${ventaId}`, err);
    }
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
    try {
      const prev = await query<VentaAnulacionRow[]>(
        `SELECT estado, habitacion_id, cliente_id, caja_id, pedido_id, metodo_pago, total, sub_total,
                propina, total_comision, pagos_mixtos
         FROM ventas
         WHERE id_venta = ?`,
        [id]
      );
      if (prev.length === 0) throw new NotFoundError('Venta', id);
      const estadoAnterior = prev[0].estado;
      const habitacionId = prev[0].habitacion_id;
      const clienteId = prev[0].cliente_id;
      const cajaId = prev[0].caja_id;
      const pedidoId = prev[0].pedido_id;
      const metodoPago = String(prev[0].metodo_pago || '').toLowerCase();
      const total = Number(prev[0].total || 0);
      const subTotal = Number(prev[0].sub_total || 0);
      const propina = Number(prev[0].propina || 0);
      const totalComision = Number(prev[0].total_comision || 0);
      const pagosMixtos = this.parseMixedPayments(prev[0].pagos_mixtos);

      await withTransaction(async trx => {
        await BaseRepository.update(trx, this.TABLE, this.ID_COL, id, {
          estado,
          fecha_mod: getNowInBusinessTimezone()
        });

        if (estado === 1 || estado === 0) {
          if (habitacionId) await RoomManager.resumeRoomLogic(trx, habitacionId, undefined, id);
          const anfsResult = await trx<VentaAnfsRow[]>(
            'SELECT usuario_id FROM ventas_usuarios WHERE venta_id = ?',
            [id]
          );
          const hostessIds = anfsResult.map(a => a.usuario_id);
          await RoomManager.updateHostessServiceStatus(trx, hostessIds, undefined, id);
        }

        const { addVentaLog } = await import('@/lib/utils/logUtils');
        if (estado === 1 && estadoAnterior !== 1)
          await addVentaLog(id, 'FINALIZADO', 'Venta finalizada manualmente.', userId);
        else if (estado === 0 && estadoAnterior !== 0) {
          const detailRows = await trx<VentaRefundDetailRow[]>(
            `SELECT id_detalle_venta, producto_id, cantidad, precio, sub_total, comision
             FROM detalle_ventas WHERE venta_id = ? ORDER BY id_detalle_venta ASC`,
            [id]
          );

          const prepagoMonto = clienteId
            ? Number(
                (
                  await trx<PrepagoRow[]>(
                    `SELECT COALESCE(SUM(monto), 0) as total_prepago
                 FROM clientes_prepago_movimientos
                 WHERE cliente_id = ? AND UPPER(tipo) = 'CONSUMO'
                   AND (venta_id = ? OR (metadatos::jsonb ->> 'venta_id') = ?)`,
                    [clienteId, id, id]
                  )
                )[0]?.total_prepago || 0
              )
            : 0;

          if (clienteId && prepagoMonto > 0) {
            await trx('UPDATE clientes SET saldo = saldo + ? WHERE id_cliente = ?', [
              prepagoMonto,
              clienteId
            ]);
            await trx(
              `INSERT INTO clientes_prepago_movimientos
               (id_movimiento, cliente_id, tipo, monto, metodo_pago, venta_id, usuario_id, fecha_crea, metadatos)
               VALUES (?, ?, 'DEVOLUCION', ?, 'prepago', ?, ?, ?, ?)`,
              [
                generateUUID(),
                clienteId,
                prepagoMonto,
                id,
                userId || null,
                getNowInBusinessTimezone(),
                JSON.stringify({ concepto: `Anulacion venta ${id}` })
              ]
            );
          }

          if (cajaId) {
            let efectivo = 0,
              tarjeta = 0,
              transferencia = 0;
            if (metodoPago === 'mixto') {
              for (const pago of pagosMixtos) {
                if (pago.metodo === 'efectivo') efectivo += pago.monto;
                if (pago.metodo === 'tarjeta') tarjeta += pago.monto;
                if (pago.metodo === 'transferencia') transferencia += pago.monto;
              }
            } else {
              const montoMetodoPrincipal = Math.max(0, total - prepagoMonto);
              if (metodoPago === 'efectivo') efectivo = montoMetodoPrincipal;
              if (metodoPago === 'tarjeta') tarjeta = montoMetodoPrincipal;
              if (metodoPago === 'transferencia') transferencia = montoMetodoPrincipal;
            }
            await CashRegisterRepository.updateBalances(trx, cajaId, {
              venta: -(total - propina),
              efectivo: -efectivo,
              tarjeta: -tarjeta,
              transferencia: -transferencia,
              prepago: -prepagoMonto,
              propina: -propina,
              comision: -totalComision,
              devolucion: total
            });
          }

          await this.registerVentaRefund(trx, {
            ventaId: id,
            clienteId,
            refundTotal: total,
            refundSubTotal: subTotal,
            refundComision: totalComision,
            detailRows
          });

          await addVentaLog(id, 'ANULADO', 'Venta anulada manualmente.', userId);
          // Fuera de la transacción, para no extenderla con I/O de red: si el stream
          // falla, la anulación ya está confirmada y el evento se pierde sin efecto.
          // La caja refresca con el monto devuelto ya aplicado.
          setTimeout(() => {
            try {
              sendNotificationToAll('sale_cancelled', {
                ventaId: id,
                total,
                cajaId: cajaId ?? null
              });
            } catch (e) {
              logger.warn('[SaleQueries] No se pudo emitir sale_cancelled', { ventaId: id, e });
            }
          }, 0);
          await trx('UPDATE comisiones SET estado = 0 WHERE venta_id = ?', [id]);
          await trx(
            `UPDATE detalle_comisiones dc SET estado = 0 FROM comisiones c WHERE c.id_comision = dc.comision_id AND c.venta_id = ?`,
            [id]
          );
          await trx(
            'DELETE FROM detalle_propinas WHERE propina_id IN (SELECT id_propina FROM propinas WHERE venta_id = ?)',
            [id]
          );
          await trx('DELETE FROM propinas WHERE venta_id = ?', [id]);
          if (pedidoId) await trx('UPDATE pedidos SET estado = 1 WHERE id_pedido = ?', [pedidoId]);
        }
      });

      return await this.getById(id);
    } catch (err) {
      logger.error('[SaleQueries] Error en updateStatus:', { ventaId: id, estado, err });
      if (err instanceof NotFoundError) throw err;
      throw new DatabaseError(`Error al actualizar estado de venta ${id}`, err);
    }
  }

  static async requestAnulacion(
    id: string,
    reason: string,
    requestedBy: string,
    amount: number
  ): Promise<string> {
    try {
      const idAnul = generateUUID();
      const token = generateUUID();
      const now = getNowInBusinessTimezone();
      await withTransaction(async trx => {
        await trx(
          `INSERT INTO solicitudes_anulacion_ventas (id, venta_id, token, estado, fecha_solicitud, solicitado_por, motivo, monto)
           VALUES (?, ?, ?, 'pendiente', ?, ?, ?, ?)`,
          [idAnul, id, token, now, requestedBy, reason, amount]
        );
        await trx('UPDATE ventas SET estado = 3, fecha_mod = ? WHERE id_venta = ?', [now, id]);
      });
      return token;
    } catch (err) {
      logger.error('[SaleQueries] Error en requestAnulacion:', { ventaId: id, err });
      throw new DatabaseError(`Error al solicitar anulación de venta ${id}`, err);
    }
  }

  static async processAnulacion(
    requestId: string,
    approvedBy: string,
    status: string
  ): Promise<SaleType | null> {
    try {
      const now = getNowInBusinessTimezone();
      const nextStatus = this.normalizeSolicitudStatus(status);
      const shouldApprove = nextStatus === 'confirmada';
      let ventaId: string | null = null;

      await withTransaction(async trx => {
        await trx('UPDATE solicitudes_anulacion_ventas SET estado = ? WHERE id = ?', [
          nextStatus,
          requestId
        ]);
        const req = await trx<SolicitudAnulacionVentaReqRow[]>(
          'SELECT venta_id FROM solicitudes_anulacion_ventas WHERE id = ?',
          [requestId]
        );
        if (req.length > 0) {
          ventaId = req[0].venta_id;
          if (!shouldApprove) {
            const ventaRows = await trx<VentaStateRow[]>(
              'SELECT habitacion_id, tiempo FROM ventas WHERE id_venta = ?',
              [ventaId]
            );
            const nextState =
              ventaRows.length && ventaRows[0].habitacion_id && Number(ventaRows[0].tiempo || 0) > 0
                ? 2
                : 1;
            await trx('UPDATE ventas SET estado = ?, fecha_mod = ? WHERE id_venta = ?', [
              nextState,
              now,
              ventaId
            ]);
          }
        }
      });

      if (!ventaId) {
        logger.warn('[SaleQueries] processAnulacion: no se encontró solicitud', { requestId });
        return null;
      }
      if (shouldApprove) {
        const requestRows = await query<SolicitudAnulacionMontoRow[]>(
          'SELECT monto FROM solicitudes_anulacion_ventas WHERE id = ? LIMIT 1',
          [requestId]
        );
        const approvedAmount = Number(requestRows[0]?.monto || 0);
        await this.approveAnulacion(ventaId, approvedBy, approvedAmount);
      }
      return await this.getById(ventaId);
    } catch (err) {
      logger.error('[SaleQueries] Error en processAnulacion:', { requestId, err });
      throw new DatabaseError(`Error al procesar anulación ${requestId}`, err);
    }
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
