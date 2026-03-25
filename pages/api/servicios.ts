/* eslint-disable @typescript-eslint/no-unused-vars, no-console */
import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, getCurrentUser } from '@/lib/middleware/auth';
import { query, generateUUID, withTransaction } from '@/lib/db';
import { apiWrapper } from '@/lib/api-wrapper';
import { ServiceCreateSchema } from '@/lib/schemas';
import { getServiciosList, pauseConflictingServices } from '@/lib/procedures';
import { getNowInBusinessTimezone } from '@/lib/timezoneService';
import { sendNotificationToAll } from '@/pages/api/notifications/sse';
import { Client } from '@/types/client';

export const config = {
  api: {
    bodyParser: true
  }
};

const handleGet = async (req: NextApiRequest, res: NextApiResponse) => {
  const { all, caja_id, limit = '50', page = '1' } = req.query;
  const lNum = parseInt(limit as string);
  const pNum = parseInt(page as string);
  const offset = (pNum - 1) * lNum;

  let where = 'WHERE 1=1';
  let params: any[] = [];
  if (all === 'true') where = 'WHERE s.estado = 1';
  else if (all === 'false') where = 'WHERE s.estado IN (2, 3, 4)';
  
  if (caja_id) {
    where += ' AND s.caja_id = ?';
    params.push(caja_id);
  }

  const data = await getServiciosList(where, params, lNum, offset);
  return res.status(200).json({ success: true, data });
};

const handlePost = async (req: NextApiRequest, res: NextApiResponse) => {
  const currentUser = getCurrentUser(req);
  const createdBy = currentUser?.id || 'default-user';
  const v = ServiceCreateSchema.parse(req.body);

  const servicioId = generateUUID();
  const codigo = Math.random().toString(36).substring(2, 10).toUpperCase();
  const now = getNowInBusinessTimezone();
  const cajaResult = await query<any[]>('SELECT id_caja FROM cajas WHERE estado = 1 LIMIT 1');
  const cajaId = cajaResult[0]?.id_caja;

  // Rule: Check room commission
  const hResult = await query<any[]>('SELECT comision_anfitriona FROM habitaciones WHERE id_habitacion = ?', [v.habitacion_id]);
  const roomComision = Number(hResult[0]?.comision_anfitriona || 0);
  const hasRoomComision = roomComision > 0;

  await withTransaction(async (trx) => {
    // 1. Prepago deduction
    if (v.metodo_pago === 'prepago') {
      const client = await trx<Client[]>('SELECT saldo FROM clientes WHERE id_cliente = ? FOR UPDATE', [v.cliente_id]);
      if (client.length === 0 || (client[0].saldo || 0) < v.total) throw new Error('Saldo insuficiente');
      await trx('UPDATE clientes SET saldo = saldo - ? WHERE id_cliente = ?', [v.total, v.cliente_id]);
    }

    // 2. Insert Service
    await trx(`
      INSERT INTO servicios (id_servicio, codigo, cliente_id, habitacion_id, precio_habitacion, precio_servicio, iva, sub_total, total, tiempo, metodo_pago, caja_id, created_by, estado, fecha_crea)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 2, ?)
    `, [servicioId, codigo, v.cliente_id, v.habitacion_id, v.precio_habitacion, v.precio_servicio, v.iva, v.sub_total, v.total, v.tiempo, v.metodo_pago, cajaId, createdBy, now]);

    // 3. Pause conflicts
    await pauseConflictingServices(trx, servicioId, v.usuarios);

    // 4. Commissions & Details
    const numAnfitrionas = v.usuarios.length;
    let comisionPerAnfitriona = hasRoomComision 
      ? Math.floor(roomComision / numAnfitrionas)
      : Math.floor((v.sub_total - v.precio_habitacion) / numAnfitrionas);

    for (const uId of v.usuarios) {
      if (comisionPerAnfitriona > 0) {
        const commId = generateUUID();
        await trx('INSERT INTO comisiones (id_comision, servicio_id, monto, estado) VALUES (?, ?, ?, 1)', [commId, servicioId, comisionPerAnfitriona]);
        await trx('INSERT INTO detalle_comisiones (id_detalle_comision, comision_id, usuario_id, comision, estado) VALUES (?, ?, ?, ?, 1)', [generateUUID(), commId, uId, comisionPerAnfitriona]);
      }
      await trx('INSERT INTO detalle_servicios (id_detalle_servicio, usuario_id, servicio_id, comision) VALUES (?, ?, ?, ?)', [generateUUID(), uId, servicioId, comisionPerAnfitriona]);
      await trx('UPDATE usuarios SET estado_servicio = 1 WHERE id_usuario = ?', [uId]);
    }

    // 5. Update Caja
    if (cajaId) {
      await trx(`
        UPDATE cajas SET 
          servicio = servicio + ?, efectivo = efectivo + ?, tarjeta = tarjeta + ?, transferencia = transferencia + ?, 
          prepago = prepago + ?, iva = iva + ?, comision = comision + ? 
        WHERE id_caja = ?
      `, [
        v.total - v.iva, 
        v.metodo_pago === 'efectivo' ? v.total : 0, 
        v.metodo_pago === 'tarjeta' ? v.total : 0, 
        v.metodo_pago === 'transferencia' ? v.total : 0, 
        v.metodo_pago === 'prepago' ? v.total : 0, 
        v.iva, 
        hasRoomComision ? roomComision : (comisionPerAnfitriona * numAnfitrionas),
        cajaId
      ]);
    }
  });

  // SSE Notifications (Background)
  sendNotificationToAll('timer_started', {
    id_servicio: servicioId,
    codigo,
    roomName: 'Habitación',
    duration: v.tiempo,
    total: v.total,
    tipoTransaccion: 'servicio'
  });

  return res.status(201).json({ success: true, message: 'Servicio creado', id: servicioId });
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
