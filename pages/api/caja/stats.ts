import { NextApiRequest, NextApiResponse } from "next";
import { query } from "@/lib/db";
import { RowDataPacket } from "mysql2/promise";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ 
      success: false,
      message: "Método no permitido" 
    });
  }

  try {
    // Obtener estadísticas de cajas
    const cajasStats = await query(`
      SELECT 
        COUNT(CASE WHEN estado = 1 THEN 1 END) as cajas_abiertas,
        COUNT(CASE WHEN estado = 0 THEN 1 END) as cajas_cerradas,
        COUNT(*) as total_cajas
      FROM cajas
      WHERE DATE(fecha_apertura) = CURDATE()
    `) as RowDataPacket[];

    // Obtener estadísticas de ventas desde la apertura de caja
    const ventasStats = await query(`
      SELECT 
        COALESCE(SUM(total), 0) as total_ventas,
        COALESCE(COUNT(*), 0) as cantidad_ventas,
        COALESCE(AVG(total), 0) as promedio_venta,
        COALESCE(SUM(efectivo), 0) as total_efectivo,
        COALESCE(SUM(tarjeta), 0) as total_tarjeta,
        COALESCE(SUM(transferencia), 0) as total_transferencia,
        COALESCE(SUM(devolucion), 0) as total_devoluciones
      FROM ventas v
      INNER JOIN cajas c ON c.estado = 1
      WHERE v.fecha_crea >= c.fecha_apertura
    `) as RowDataPacket[];

    // Obtener estadísticas de servicios
    const serviciosStats = await query(`
      SELECT 
        COALESCE(SUM(total), 0) as total_servicios,
        COALESCE(COUNT(*), 0) as cantidad_servicios,
        COALESCE(AVG(total), 0) as promedio_servicio
      FROM servicios s
      INNER JOIN cajas c ON c.estado = 1
      WHERE s.fecha_crea >= c.fecha_apertura
    `) as RowDataPacket[];

    // Calcular balance total de cajas abiertas
    const balanceStats = await query(`
      SELECT 
        COALESCE(SUM(monto_apertura + efectivo + tarjeta + transferencia - COALESCE(devoluciones, 0)), 0) as balance_total
      FROM cajas
      WHERE estado = 1
    `) as RowDataPacket[];

    // Obtener información de la caja abierta más reciente
    const cajaInfo = await query(`
      SELECT 
        fecha_apertura,
        usuario_id_apertura,
        TIMESTAMPDIFF(HOUR, fecha_apertura, NOW()) as horas_abierta,
        TIMESTAMPDIFF(MINUTE, fecha_apertura, NOW()) % 60 as minutos_abierta
      FROM cajas
      WHERE estado = 1
      ORDER BY fecha_apertura DESC
      LIMIT 1
    `) as RowDataPacket[];

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

      // Debug logs para el balance total
      debug_balance: {
        raw_balance: balanceStats[0]?.balance_total,
        parsed_balance: parseFloat(balanceStats[0]?.balance_total || 0),
        ventas_stats: ventasStats[0],
        servicios_stats: serviciosStats[0]
      },

      // Información de tiempo
      tiempo_abierta: cajaInfo.length > 0 
        ? `${cajaInfo[0].horas_abierta}h ${cajaInfo[0].minutos_abierta}m`
        : "0h 0m",
      fecha_apertura: cajaInfo.length > 0 
        ? new Date(cajaInfo[0].fecha_apertura).toLocaleDateString('es-ES')
        : "N/A",
      usuario_apertura: cajaInfo.length > 0 
        ? cajaInfo[0].usuario_id_apertura?.toString() || "N/A"
        : "N/A",

      // Total de ingresos (ventas + servicios)
      total_ingresos: parseFloat(ventasStats[0]?.total_ventas || 0) + parseFloat(serviciosStats[0]?.total_servicios || 0)
    };

    return res.status(200).json(stats);
  } catch (error) {
    console.error("Error al obtener estadísticas de caja:", error);
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error instanceof Error ? error.message : String(error)
    });
  }
} 