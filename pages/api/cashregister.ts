/* eslint-disable @typescript-eslint/no-unused-vars, no-console */
import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, getCurrentUser } from '@/lib/middleware/auth';
import { query, generateUUID } from '@/lib/db';
import { getActiveCaja, getCajaStats, closeNonAdminSessions } from '@/lib/procedures';
import { apiWrapper } from '@/lib/api-wrapper';
import { CajaOpenSchema, CajaUpdateSchema, CajaCloseSchema } from '@/lib/schemas';
import { getNowInBusinessTimezone } from '@/lib/timezoneService';

export const config = {
  api: {
    bodyParser: true
  }
};

const handleGet = async (req: NextApiRequest, res: NextApiResponse) => {
  const { id, resumen } = req.query;

  if (resumen === '1') {
    const cajaRow = await getActiveCaja();
    if (!cajaRow) {
      return res.status(200).json({ success: true, data: { balance_total: 0, cajas_abiertas: 0 } });
    }

    const { ventas, servicios } = await getCajaStats(cajaRow.fecha_apertura);
    
    const montoApertura = Number(cajaRow.monto_apertura || 0);
    const balanceTotal = Number(cajaRow.efectivo || 0) + Number(cajaRow.tarjeta || 0) + 
                       Number(cajaRow.transferencia || 0) + montoApertura - Number(cajaRow.devolucion || 0);

    return res.status(200).json({
      success: true,
      data: {
        ...cajaRow,
        monto_apertura: montoApertura,
        balance_total: balanceTotal,
        cantidad_ventas: ventas.cantidad,
        promedio_venta: ventas.promedio,
        cantidad_servicios: servicios.cantidad,
        promedio_servicio: servicios.promedio
      }
    });
  }

  if (id) {
    const result = await query<any[]>(`
      SELECT c.*, CONCAT(u1.nombre, ' ', u1.apellido) as cajero_nombre
      FROM cajas c
      LEFT JOIN usuarios u1 ON c.usuario_id_apertura = u1.id_usuario
      WHERE c.id_caja = ?
    `, [id]);
    return res.status(200).json({ success: true, data: result[0] });
  }

  const results = await query<any[]>(`
    SELECT c.*, CONCAT(u1.nombre, ' ', u1.apellido) as cajero_nombre
    FROM cajas c
    LEFT JOIN usuarios u1 ON c.usuario_id_apertura = u1.id_usuario
    WHERE c.estado IN (0, 1)
    ORDER BY c.fecha_apertura DESC
  `);
  return res.status(200).json({ success: true, data: results });
};

const handlePost = async (req: NextApiRequest, res: NextApiResponse) => {
  const validated = CajaOpenSchema.parse(req.body);
  
  // Rule: Check if user already has an open caja
  const open = await query<any[]>('SELECT id_caja FROM cajas WHERE usuario_id_apertura = ? AND estado = 1', [validated.usuario_id_apertura]);
  if (open.length > 0) return res.status(409).json({ success: false, message: 'Usuario ya tiene una caja abierta' });

  const id = generateUUID();
  const now = getNowInBusinessTimezone();
  
  await query(`
    INSERT INTO cajas (id_caja, fecha_apertura, usuario_id_apertura, monto_apertura, estado) 
    VALUES (?, ?, ?, ?, 1)
  `, [id, now, validated.usuario_id_apertura, validated.monto_apertura]);

  return res.status(201).json({ success: true, message: 'Caja abierta', id });
};

const handlePut = async (req: NextApiRequest, res: NextApiResponse) => {
  const validated = CajaUpdateSchema.parse(req.body);
  const { id, ...data } = validated;

  const setClauses = Object.keys(data).map(key => `${key} = ?`).join(', ');
  if (!setClauses) return res.status(400).json({ success: false, message: 'Nada que actualizar' });

  await query(`UPDATE cajas SET ${setClauses} WHERE id_caja = ? AND estado = 1`, [...Object.values(data), id]);
  return res.status(200).json({ success: true, message: 'Caja actualizada' });
};

const handlePatch = async (req: NextApiRequest, res: NextApiResponse) => {
  const validated = CajaCloseSchema.parse(req.body);
  
  const caja = await query<any[]>('SELECT * FROM cajas WHERE id_caja = ? AND estado = 1', [validated.id_caja]);
  if (caja.length === 0) return res.status(404).json({ success: false, message: 'Caja no encontrada o ya cerrada' });

  // Calculate closure amount: base + cash + card + transfer - returns
  const c = caja[0];
  const montoCierre = Number(c.monto_apertura || 0) + Number(c.efectivo || 0) + 
                      Number(c.tarjeta || 0) + Number(c.transferencia || 0) - Number(c.devolucion || 0);

  // 1. Close sessions of non-admins
  await closeNonAdminSessions();

  // 2. Close caja
  const now = getNowInBusinessTimezone();
  await query(`
    UPDATE cajas SET usuario_id_cierre = ?, fecha_cierre = ?, monto_cierre = ?, estado = 0 
    WHERE id_caja = ?
  `, [validated.usuario_id_cierre, now, montoCierre, validated.id_caja]);

  return res.status(200).json({ success: true, message: 'Caja cerrada exitosamente' });
};

const handleDelete = async (req: NextApiRequest, res: NextApiResponse) => {
  const { id } = req.query;
  await query('UPDATE cajas SET estado = -1 WHERE id_caja = ? AND estado = 0', [id]);
  return res.status(200).json({ success: true, message: 'Caja eliminada' });
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case 'GET': return handleGet(req, res);
    case 'POST': return handlePost(req, res);
    case 'PUT': return handlePut(req, res);
    case 'PATCH': return handlePatch(req, res);
    case 'DELETE': return handleDelete(req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
      return res.status(405).end();
  }
}

export default withAuth(apiWrapper(handler));
