/* eslint-disable */
import { NextApiRequest, NextApiResponse } from "next";
import { query } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    // Obtener la caja actual (estado = 1)
    const cajaActualSql = `
      SELECT id_caja, fecha_apertura
      FROM cajas
      WHERE estado = 1
      ORDER BY fecha_apertura DESC
      LIMIT 1
    `;
    const cajaActualResult = await query(cajaActualSql);
    const cajaRow = Array.isArray(cajaActualResult) ? cajaActualResult[0] : cajaActualResult as any;

    // Obtener estadísticas de ventas y servicios para la caja actual
    const [ventasStatsResult, serviciosStatsResult] = await Promise.all([
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
          `, [cajaRow.id_caja])
        : Promise.resolve([{ total_ventas: 0, cantidad_ventas: 0, promedio_venta: 0, total_efectivo: 0, total_tarjeta: 0, total_transferencia: 0, total_devoluciones: 0 }]),

      cajaRow?.id_caja
        ? query(`
            SELECT
              COALESCE(SUM(total), 0) as total_servicios,
              COALESCE(COUNT(*), 0) as cantidad_servicios,
              COALESCE(AVG(total), 0) as promedio_servicio
            FROM servicios
            WHERE caja_id = ? AND estado IN (1, 2)
          `, [cajaRow.id_caja])
        : Promise.resolve([{ total_servicios: 0, cantidad_servicios: 0, promedio_servicio: 0 }]),
    ]);

    const ventasStats = (Array.isArray(ventasStatsResult) ? ventasStatsResult[0] : ventasStatsResult) as any;
    const serviciosStats = (Array.isArray(serviciosStatsResult) ? serviciosStatsResult[0] : serviciosStatsResult) as any;

    const responseData = {
      success: true,
      data: {
        total_ventas: Number(ventasStats?.total_ventas) || 0,
        cantidad_ventas: Number(ventasStats?.cantidad_ventas) || 0,
        promedio_venta: Number(ventasStats?.promedio_venta) || 0,
        total_efectivo: Number(ventasStats?.total_efectivo) || 0,
        total_tarjeta: Number(ventasStats?.total_tarjeta) || 0,
        total_transferencia: Number(ventasStats?.total_transferencia) || 0,
        total_devoluciones: Number(ventasStats?.total_devoluciones) || 0, // Asumiendo que las devoluciones se manejan aparte o son 0 por ahora

        total_servicios: Number(serviciosStats?.total_servicios) || 0,
        cantidad_servicios: Number(serviciosStats?.cantidad_servicios) || 0,
        promedio_servicio: Number(serviciosStats?.promedio_servicio) || 0,

        total_ingresos_caja: (Number(ventasStats?.total_ventas) || 0) + (Number(serviciosStats?.total_servicios) || 0),
      }
    };

    res.status(200).json(responseData);

  } catch (error) {

    res.status(500).json({
      success: false,
      error: "Error interno del servidor"
    });
  }
}
