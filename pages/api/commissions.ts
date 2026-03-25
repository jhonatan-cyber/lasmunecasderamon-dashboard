/* eslint-disable @typescript-eslint/no-unused-vars, no-console */
import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/lib/middleware/auth';
import { query, generateUUID, withTransaction } from '@/lib/db';
import { getCommissionStats, getCommissionsList } from '@/lib/procedures';
import { apiWrapper } from '@/lib/api-wrapper';
import { CommissionCreateSchema, CommissionUpdateSchema } from '@/lib/schemas';
import { toDateKey } from '@/lib/calendarUtils';
import { getNowInBusinessTimezone } from '@/lib/timezoneService';

export const config = {
  api: {
    bodyParser: true
  }
};

const handleGet = async (req: NextApiRequest, res: NextApiResponse) => {
  const { stats, status, employeeId, search, page = '1', limit = '10' } = req.query;

  if (stats === 'true') {
    const cajaActiva = await query<any[]>(`
      SELECT fecha_apertura FROM cajas WHERE estado = 1 
      ORDER BY fecha_apertura DESC LIMIT 1
    `);
    
    let fechaApertura = toDateKey(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    if (cajaActiva.length > 0) fechaApertura = cajaActiva[0].fecha_apertura;

    const statsData = await getCommissionStats(fechaApertura);
    return res.status(200).json({
      total_comisiones: parseFloat(statsData.total_comisiones || 0),
      comision_ventas: parseFloat(statsData.total_ventas || 0),
      comision_servicios: parseFloat(statsData.total_servicios || 0),
      promedio_comision: parseFloat(statsData.promedio_comision || 0),
      cantidad_comisiones: parseInt(statsData.cantidad_comisiones || 0),
      comision_minima: parseFloat(statsData.comision_minima || 0),
      comision_maxima: parseFloat(statsData.comision_maxima || 0),
      porcentaje_ventas: parseInt(statsData.porcentaje_ventas || 0),
      porcentaje_servicios: parseInt(statsData.porcentaje_servicios || 0)
    });
  }

  let whereClauses = ['C.estado IN (0, 1)'];
  let params: any[] = [];

  if (status && status !== 'all') {
    const statusMap: any = { por_pagar: 1, pagado: 0, anulado: 2 };
    whereClauses.push('C.estado = ?');
    params.push(statusMap[status as string] ?? 1);
  }
  if (employeeId && employeeId !== 'all') {
    whereClauses.push('U.id_usuario = ?');
    params.push(employeeId);
  }
  if (search) {
    whereClauses.push('(U.nick LIKE ? OR U.nombre LIKE ? OR U.apellido LIKE ?)');
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  const data = await getCommissionsList(`WHERE ${whereClauses.join(' AND ')}`, params);
  
  return res.status(200).json({
    success: true,
    data: data.map(row => ({
      ...row,
      employeeId: row.id_usuario,
      employeeName: row.anfitriona,
      status: row.estado === 1 ? 'por_pagar' : row.estado === 0 ? 'pagado' : 'anulado',
      date: new Date(),
    }))
  });
};

const handlePost = async (req: NextApiRequest, res: NextApiResponse) => {
  const validated = CommissionCreateSchema.parse(req.body);

  const id = generateUUID();
  const now = getNowInBusinessTimezone();

  await withTransaction(async (trx) => {
    await trx(`
      INSERT INTO comisiones (id_comision, venta_id, servicio_id, monto, fecha_crea) 
      VALUES (?, ?, ?, ?, ?)
    `, [id, validated.venta_id || null, validated.servicio_id || null, validated.monto, now]);

    await trx(`
      INSERT INTO detalle_comisiones (comision_id, usuario_id, comision, fecha_crea) 
      VALUES (?, ?, ?, ?)
    `, [id, validated.usuario_id, validated.monto, now]);
  });

  return res.status(201).json({ success: true, message: 'Comisión creada', id });
};

const handlePut = async (req: NextApiRequest, res: NextApiResponse) => {
  const { id } = req.query;
  const validated = CommissionUpdateSchema.parse({ ...req.body, id });

  const now = getNowInBusinessTimezone();
  const statusMap: any = { por_pagar: 1, pagado: 0, anulado: 2 };

  await withTransaction(async (trx) => {
    if (validated.status) {
      const statusValue = statusMap[validated.status];
      await trx('UPDATE comisiones SET estado = ?, fecha_mod = ? WHERE id_comision = ?', [statusValue, now, id]);
      if (validated.status === 'pagado') {
        await trx('UPDATE detalle_comisiones SET fecha_mod = ? WHERE comision_id = ?', [now, id]);
      }
    }
    if (validated.monto !== undefined) {
      await trx('UPDATE comisiones SET monto = ?, fecha_mod = ? WHERE id_comision = ?', [validated.monto, now, id]);
      await trx('UPDATE detalle_comisiones SET comision = ?, fecha_mod = ? WHERE comision_id = ?', [validated.monto, now, id]);
    }
  });

  return res.status(200).json({ success: true, message: 'Comisión actualizada' });
};

const handleDelete = async (req: NextApiRequest, res: NextApiResponse) => {
  const { id } = req.query;
  const now = getNowInBusinessTimezone();

  await withTransaction(async (trx) => {
    await trx('UPDATE comisiones SET estado = 0, fecha_baja = ? WHERE id_comision = ?', [now, id]);
    await trx('UPDATE detalle_comisiones SET estado = 0, fecha_baja = ? WHERE comision_id = ?', [now, id]);
  });

  return res.status(200).json({ success: true, message: 'Comisión eliminada' });
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case 'GET': return handleGet(req, res);
    case 'POST': return handlePost(req, res);
    case 'PUT': return handlePut(req, res);
    case 'DELETE': return handleDelete(req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      return res.status(405).end();
  }
}

export default withAuth(apiWrapper(handler));
