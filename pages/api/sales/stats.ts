import { NextApiRequest, NextApiResponse } from "next";
import { query } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    // Obtener la caja actual (estado = 1)
    const cajaActualSql = `
      SELECT fecha_apertura 
      FROM cajas 
      WHERE estado = 1 
      ORDER BY fecha_apertura DESC 
      LIMIT 1
    `;
    const cajaActualResult = await query(cajaActualSql);
    const cajaActual = Array.isArray(cajaActualResult) ? cajaActualResult[0] : cajaActualResult as any;

    let whereClause = "WHERE v.estado = 1"; // Solo ventas completadas
    const params: any[] = [];

    // Si hay una caja abierta, usar su fecha de apertura como filtro
    if (cajaActual && cajaActual.fecha_apertura) {
      whereClause += " AND v.fecha_crea >= ?";
      params.push(cajaActual.fecha_apertura);
    }

    // Estadísticas simplificadas: solo total y promedio
    const statsSql = `
      SELECT 
        SUM(v.total) as total_ventas,
        AVG(v.total) as promedio_venta
      FROM ventas v
      ${whereClause}
    `;

    const stats = await query(statsSql, params);

    // Obtener el resultado como objeto
    const statsResult = (Array.isArray(stats) ? stats[0] : stats) as any;

    const responseData = {
      success: true,
      data: {
        total_ventas: Number(statsResult?.total_ventas) || 0,
        promedio_venta: Number(statsResult?.promedio_venta) || 0,
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