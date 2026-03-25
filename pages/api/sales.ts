/* eslint-disable @typescript-eslint/no-unused-vars, no-console */
import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, getCurrentUser } from '@/lib/middleware/auth';
import { query, generateUUID, withTransaction } from '@/lib/db';
import { apiWrapper } from '@/lib/api-wrapper';
import { SaleCreateSchema } from '@/lib/schemas';
import { getSalesList, getSalesResumen } from '@/lib/procedures';
import { getNowInBusinessTimezone } from '@/lib/timezoneService';
import { Client } from '@/types/client';

export const config = {
  api: {
    bodyParser: true
  }
};

const handleGet = async (req: NextApiRequest, res: NextApiResponse) => {
  const { tipo, page = '1', limit = '10', estado, caja_id, search } = req.query;

  if (tipo === 'resumen') {
    const cajaResult = await query<any[]>('SELECT id_caja FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1');
    const cajaId = cajaResult[0]?.id_caja;
    let where = 'WHERE v.estado IN (1, 2, 3)';
    let params: any[] = [];
    if (cajaId) {
      where += ' AND v.caja_id = ?';
      params.push(cajaId);
    }
    const resumen = await getSalesResumen(where, params);
    return res.status(200).json({ success: true, data: { resumen_general: resumen } });
  }

  const pNum = parseInt(page as string);
  const lNum = parseInt(limit as string);
  const offset = (pNum - 1) * lNum;

  let where = 'WHERE 1=1';
  let params: any[] = [];
  if (estado) {
    where += ' AND v.estado = ?';
    params.push(estado);
  }
  if (caja_id) {
    where += ' AND v.caja_id = ?';
    params.push(caja_id);
  }

  const data = await getSalesList(where, params, lNum, offset);
  return res.status(200).json({ success: true, data });
};

const handlePost = async (req: NextApiRequest, res: NextApiResponse) => {
  const currentUser = getCurrentUser(req);
  const createdBy = currentUser?.id || 'default-user';
  const validated = SaleCreateSchema.parse(req.body);

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

    // 3. Details & Commissions (simplified logic)
    for (const d of validated.detalles) {
      await trx(`
        INSERT INTO detalle_ventas (id_detalle_venta, venta_id, producto_id, precio, comision, cantidad, sub_total, hostess_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [generateUUID(), ventaId, d.producto_id, d.precio, d.comision, d.cantidad, d.sub_total || (d.precio * d.cantidad), d.hostess_id]);
    }

    // 4. Update Caja financial info
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

  return res.status(201).json({ success: true, message: 'Venta procesada', id: ventaId, codigo });
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case 'GET': return handleGet(req, res);
    case 'POST': return handlePost(req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).end();
  }
}

export default withAuth(apiWrapper(handler));
