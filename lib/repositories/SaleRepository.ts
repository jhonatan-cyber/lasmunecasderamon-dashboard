import { query, generateUUID, withTransaction } from '@/lib/db';
import { SaleCreateSchema } from '@/lib/schemas';
import { getSalesList, getSalesResumen } from '@/lib/procedures';
import { getNowInBusinessTimezone } from '@/lib/timezoneService';
import { Client } from '@/types/client';

export class SaleRepository {
  static async getAll(params: { tipo?: string; page?: string; limit?: string; estado?: string; caja_id?: string; search?: string }) {
    if (params.tipo === 'resumen') {
      const cajaResult = await query<any[]>('SELECT id_caja FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1');
      const cajaId = cajaResult[0]?.id_caja;
      let where = 'WHERE v.estado IN (1, 2, 3)';
      let sqlParams: any[] = [];
      if (cajaId) {
        where += ' AND v.caja_id = ?';
        sqlParams.push(cajaId);
      }
      const resumen = await getSalesResumen(where, sqlParams);
      return { resumen_general: resumen };
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

    return await getSalesList(where, sqlParams, lNum, offset);
  }

  static async create(body: any, createdBy: string) {
    const validated = SaleCreateSchema.parse(body);
    const ventaId = generateUUID();
    const codigo = Math.random().toString(36).substring(2, 10).toUpperCase();
    const now = getNowInBusinessTimezone();

    const cajaResult = await query<any[]>('SELECT id_caja FROM cajas WHERE estado = 1 LIMIT 1');
    const cajaId = cajaResult[0]?.id_caja;

    await withTransaction(async (trx) => {
      // 1. Prepago deduction
      if (validated.metodo_pago === 'prepago') {
        const client = await trx<Client[]>('SELECT saldo FROM clientes WHERE id_cliente = ? FOR UPDATE', [validated.cliente_id]);
        if (client.length === 0 || (client[0].saldo || 0) < validated.total) throw new Error('Saldo insuficiente');
        await trx('UPDATE clientes SET saldo = saldo - ? WHERE id_cliente = ?', [validated.total, validated.cliente_id]);
      }

      // 2. Insert Sale
      const estado = validated.habitacion_id && validated.tiempo > 0 ? 2 : 1;
      await trx(`
        INSERT INTO ventas (id_venta, codigo, cliente_id, pedido_id, habitacion_id, metodo_pago, propina, sub_total, total, tiempo, caja_id, created_by, estado, fecha_crea)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [ventaId, codigo, validated.cliente_id, validated.pedido_id, validated.habitacion_id, validated.metodo_pago, validated.propina, validated.sub_total || 0, validated.total, validated.tiempo, cajaId, createdBy, estado, now]);

      // 3. Details & Commissions
      for (const d of validated.detalles) {
        await trx(`
          INSERT INTO detalle_ventas (id_detalle_venta, venta_id, producto_id, precio, comision, cantidad, sub_total, hostess_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [generateUUID(), ventaId, d.producto_id, d.precio, d.comision, d.cantidad, d.sub_total || (d.precio * d.cantidad), d.hostess_id]);
      }

      // 4. Update Caja
      if (cajaId) {
        await trx(`
          UPDATE cajas SET 
            venta = venta + ?, propina = propina + ?,
            efectivo = efectivo + ?, tarjeta = tarjeta + ?, transferencia = transferencia + ?,
            prepago = prepago + ?
          WHERE id_caja = ?
        `, [
          validated.total - validated.propina, validated.propina,
          validated.metodo_pago === 'efectivo' ? validated.total : 0,
          validated.metodo_pago === 'tarjeta' ? validated.total : 0,
          validated.metodo_pago === 'transferencia' ? validated.total : 0,
          validated.metodo_pago === 'prepago' ? validated.total : 0,
          cajaId
        ]);
      }
    });

    return { id: ventaId, codigo };
  }

  static async getById(id: string) {
    const res = await query<any[]>(`
      SELECT v.*, c.nombre as cliente_nombre, h.nombre as habitacion_nombre,
             GROUP_CONCAT(CONCAT(p.nombre, ' x', dv.cantidad) SEPARATOR ', ') as productos_detalle
      FROM ventas v
      LEFT JOIN clientes c ON c.id_cliente = v.cliente_id
      LEFT JOIN habitaciones h ON h.id_habitacion = v.habitacion_id
      LEFT JOIN detalle_ventas dv ON dv.venta_id = v.id_venta
      LEFT JOIN productos p ON p.id_producto = dv.producto_id
      WHERE v.id_venta = ?
      GROUP BY v.id_venta
    `, [id]);
    return res.length > 0 ? res[0] : null;
  }

  static async updateStatus(id: string, estado: number, userId?: string) {
    const [prev] = await query<any[]>('SELECT estado, habitacion_id FROM ventas WHERE id_venta = ?', [id]);
    const estadoAnterior = prev?.estado;
    const habitacionId = prev?.habitacion_id;

    await withTransaction(async (trx) => {
      if (estado === 1 || estado === 0) {
        if (habitacionId) {
          await trx('UPDATE habitaciones SET estado = 1 WHERE id_habitacion = ?', [habitacionId]);
        }
      }

      await trx('UPDATE ventas SET estado = ? WHERE id_venta = ?', [estado, id]);
    });
  }

  static async requestAnulacion(id: string, reason: string, requestedBy: string) {
    const idAnul = generateUUID();
    await query(`
      INSERT INTO solicitudes_anulacion_ventas (id, venta_id, motivo, requested_by, estado, fecha_crea)
      VALUES (?, ?, ?, ?, 'pendiente', ?)
    `, [idAnul, id, reason, requestedBy, getNowInBusinessTimezone()]);
    return idAnul;
  }

  static async processAnulacion(requestId: string, approvedBy: string, status: 'aprobado' | 'rechazado') {
    const now = getNowInBusinessTimezone();
    await withTransaction(async (trx) => {
      await trx('UPDATE solicitudes_anulacion_ventas SET estado = ?, approved_by = ?, fecha_mod = ? WHERE id = ?', [status, approvedBy, now, requestId]);
      if (status === 'aprobado') {
        const req = await trx<any[]>('SELECT venta_id FROM solicitudes_anulacion_ventas WHERE id = ?', [requestId]);
        if (req.length > 0) {
          const vId = req[0].venta_id;
          await trx('UPDATE ventas SET estado = 0, fecha_mod = ? WHERE id_venta = ?', [now, vId]);
          // Restituir saldo if prepago
          const v = await trx<any[]>('SELECT cliente_id, total, metodo_pago FROM ventas WHERE id_venta = ?', [vId]);
          if (v.length > 0 && v[0].metodo_pago === 'prepago') {
            await trx('UPDATE clientes SET saldo = saldo + ? WHERE id_cliente = ?', [v[0].total, v[0].cliente_id]);
          }
        }
      }
    });
  }

  static async delete(id: string) {
    await withTransaction(async (trx) => {
      await trx('DELETE FROM detalle_ventas WHERE venta_id = ?', [id]);
      await trx('DELETE FROM ventas WHERE id_venta = ?', [id]);
    });
  }
}
