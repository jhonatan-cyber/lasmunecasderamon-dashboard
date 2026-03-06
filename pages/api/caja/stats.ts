import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { RowDataPacket } from 'mysql2/promise';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Método no permitido'
    });
  }

  try {
    // 1. Obtener la caja abierta primero (query liviana)
    const cajaAbierta = (await query(`
      SELECT id_caja, fecha_apertura, usuario_id_apertura, monto_apertura,
        TIMESTAMPDIFF(HOUR, fecha_apertura, NOW()) as horas_abierta,
        TIMESTAMPDIFF(MINUTE, fecha_apertura, NOW()) % 60 as minutos_abierta
      FROM cajas
      WHERE estado = 1
      ORDER BY fecha_apertura DESC
      LIMIT 1
    `)) as RowDataPacket[];

    const cajaRow = cajaAbierta[0] || null;
    const fechaApertura = cajaRow?.fecha_apertura || null;

    // 2. Ejecutar queries en paralelo (más eficiente)
    const [cajasStats, ventasStats, serviciosStats, balanceStats] = await Promise.all([
      query(`
        SELECT 
          COUNT(CASE WHEN estado = 1 THEN 1 END) as cajas_abiertas,
          COUNT(CASE WHEN estado = 0 THEN 1 END) as cajas_cerradas,
          COUNT(*) as total_cajas
        FROM cajas
      `) as Promise<RowDataPacket[]>,

      cajaRow?.id_caja
        ? query(`
            SELECT 
              COALESCE(SUM(total), 0) as total_ventas,
              COALESCE(COUNT(*), 0) as cantidad_ventas,
              COALESCE(AVG(total), 0) as promedio_venta,
              COALESCE(SUM(CASE WHEN metodo_pago = 'efectivo' THEN total ELSE 0 END), 0) as total_efectivo,
              COALESCE(SUM(CASE WHEN metodo_pago = 'tarjeta' THEN total ELSE 0 END), 0) as total_tarjeta,
              COALESCE(SUM(CASE WHEN metodo_pago = 'transferencia' THEN total ELSE 0 END), 0) as total_transferencia,
              0 as total_devoluciones
            FROM ventas
            WHERE caja_id = ? AND estado IN (1, 2)
          `, [cajaRow.id_caja]) as Promise<RowDataPacket[]>
        : Promise.resolve([{ total_ventas: 0, cantidad_ventas: 0, promedio_venta: 0, total_efectivo: 0, total_tarjeta: 0, total_transferencia: 0, total_devoluciones: 0 }] as RowDataPacket[]),

      cajaRow?.id_caja
        ? query(`
            SELECT 
              COALESCE(SUM(total), 0) as total_servicios,
              COALESCE(COUNT(*), 0) as cantidad_servicios,
              COALESCE(AVG(total), 0) as promedio_servicio
            FROM servicios
            WHERE caja_id = ? AND estado IN (1, 2)
          `, [cajaRow.id_caja]) as Promise<RowDataPacket[]>
        : Promise.resolve([{ total_servicios: 0, cantidad_servicios: 0, promedio_servicio: 0 }] as RowDataPacket[]),

      query(`
        SELECT 
          COALESCE(SUM(monto_apertura + efectivo + tarjeta + transferencia - COALESCE(devolucion, 0)), 0) as balance_total
        FROM cajas
        WHERE estado = 1
      `) as Promise<RowDataPacket[]>
    ]);

    const stats = {
      // Estadísticas de cajas
      cajas_abiertas: cajasStats[0]?.cajas_abiertas || 0,
      cajas_cerradas: cajasStats[0]?.cajas_cerradas || 0,
      total_cajas: cajasStats[0]?.total_cajas || 0,

      // Estadísticas de ventas
      total_ventas: parseFloat(ventasStats[0]?.total_ventas || 0),
      cantidad_ventas: parseInt(ventasStats[0]?.cantidad_ventas || 0),
      promedio_venta: parseFloat(ventasStats[0]?.promedio_venta || 0),
      total_efectivo: parseFloat(ventasStats[0]?.total_efectivo || 0),
      total_tarjeta: parseFloat(ventasStats[0]?.total_tarjeta || 0),
      total_transferencia: parseFloat(ventasStats[0]?.total_transferencia || 0),
      total_devoluciones: parseFloat(ventasStats[0]?.total_devoluciones || 0),

      // Estadísticas de servicios
      total_servicios: parseFloat(serviciosStats[0]?.total_servicios || 0),
      cantidad_servicios: parseInt(serviciosStats[0]?.cantidad_servicios || 0),
      promedio_servicio: parseFloat(serviciosStats[0]?.promedio_servicio || 0),

      // Balance total
      balance_total: parseFloat(balanceStats[0]?.balance_total || 0),

      // Información de tiempo
      tiempo_abierta: cajaRow
        ? `${cajaRow.horas_abierta}h ${cajaRow.minutos_abierta}m`
        : '0h 0m',
      fecha_apertura: cajaRow
        ? new Date(cajaRow.fecha_apertura).toLocaleDateString('es-ES')
        : 'N/A',
      usuario_apertura: cajaRow?.usuario_id_apertura
        ? cajaRow.usuario_id_apertura.toString()
        : 'N/A',

      // Total de ingresos (ventas + servicios)
      total_ingresos:
        parseFloat(ventasStats[0]?.total_ventas || 0) +
        parseFloat(serviciosStats[0]?.total_servicios || 0)
    };

    return res.status(200).json(stats);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
