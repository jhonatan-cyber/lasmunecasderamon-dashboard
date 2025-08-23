import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Método no permitido' });
  }

  try {
    const { period, startDate, endDate } = req.query;

    let dateFilter = '';
    let params: any[] = [];

    const start = (startDate as string) || '';
    const end = (endDate as string) || '';
    if (start && end) {
      dateFilter = 'DATE(c.fecha_apertura) BETWEEN ? AND ?';
      params = [start, end];
    } else {
      switch (period) {
        case 'today':
          dateFilter = 'DATE(c.fecha_apertura) = CURDATE()';
          break;
        case 'yesterday':
          dateFilter = 'DATE(c.fecha_apertura) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)';
          break;
        case 'week':
          dateFilter = "c.fecha_apertura >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)";
          break;
        case 'month':
          dateFilter = 'YEAR(c.fecha_apertura) = YEAR(CURDATE()) AND MONTH(c.fecha_apertura) = MONTH(CURDATE())';
          break;
        case 'custom':
        default:
          dateFilter = 'DATE(c.fecha_apertura) = CURDATE()';
      }
    }

    // Resumen por rango
    const summary = await query(
      `SELECT 
         COUNT(*) AS cajas,
         COALESCE(SUM(c.monto_apertura), 0) AS apertura_total,
         COALESCE(SUM(c.monto_apertura + c.efectivo + c.tarjeta + c.transferencia - c.devolucion), 0) AS cierre_total,
         COALESCE(SUM(c.venta), 0) AS total_venta,
         COALESCE(SUM(c.servicio), 0) AS total_servicio,
         COALESCE(SUM(c.efectivo), 0) AS total_efectivo,
         COALESCE(SUM(c.tarjeta), 0) AS total_tarjeta,
         COALESCE(SUM(c.transferencia), 0) AS total_transferencia,
         COALESCE(SUM(c.propina), 0) AS total_propina,
         COALESCE(SUM(c.comision), 0) AS total_comision,
         COALESCE(SUM(c.iva), 0) AS total_iva,
         COALESCE(SUM(c.devolucion), 0) AS total_devoluciones
       FROM cajas c
       WHERE ${dateFilter}`,
      params
    ) as any[];

    const s = summary[0] || {};
    // La diferencia total ahora es 0 ya que el cierre_total se calcula como apertura + ingresos - devoluciones
    const diferencia_total = 0;

    // Detalle por caja (sirve para cierre por turno)
    const cajas = await query(
      `SELECT 
         c.id_caja,
         c.fecha_apertura,
         c.fecha_cierre,
         c.monto_apertura,
         (c.monto_apertura + c.efectivo + c.tarjeta + c.transferencia - c.devolucion) AS monto_cierre,
         c.estado,
         c.venta,
         c.servicio,
         c.efectivo,
         c.tarjeta,
         c.transferencia,
         c.propina,
         c.comision,
         c.iva,
                   c.devolucion AS devoluciones,
         CASE WHEN HOUR(c.fecha_apertura) BETWEEN 8 AND 19 THEN 'Día' ELSE 'Noche' END AS turno
       FROM cajas c
       WHERE ${dateFilter}
       ORDER BY c.fecha_apertura DESC`,
      params
    ) as any[];

    const cajasDetalladas = cajas.map((c: any) => {
      // La diferencia por caja también es 0 ya que el monto_cierre se calcula como apertura + ingresos - devoluciones
      const diferencia = 0;
      return { ...c, diferencia };
    });

    // Movimientos (derivados): ingresos/egresos/devoluciones
    const movimientos = {
      ingresos: {
        total: Number(s.total_efectivo || 0) + Number(s.total_tarjeta || 0) + Number(s.total_transferencia || 0),
        detalle: [
          { tipo: 'efectivo', monto: Number(s.total_efectivo || 0) },
          { tipo: 'tarjeta', monto: Number(s.total_tarjeta || 0) },
          { tipo: 'transferencia', monto: Number(s.total_transferencia || 0) },
        ]
      },
      egresos: {
        total: Number(s.total_devoluciones || 0),
        detalle: [
          { tipo: 'devoluciones', monto: Number(s.total_devoluciones || 0) }
        ]
      }
    };

    // Flujo de efectivo (solo cash)
    const flujoEfectivo = {
      entradas: Number(s.apertura_total || 0) + Number(s.total_efectivo || 0),
      salidas: Number(s.total_devoluciones || 0),
    };
    const flujoEfectivoNeto = flujoEfectivo.entradas - flujoEfectivo.salidas;

    return res.status(200).json({
      success: true,
      data: {
        period: period || (start && end ? 'custom' : 'today'),
        range: { start: start || null, end: end || null },
        summary: {
          cajas: Number(s.cajas || 0),
          apertura_total: Number(s.apertura_total || 0),
          cierre_total: Number(s.cierre_total || 0),
          diferencia_total,
          ventas: Number(s.total_venta || 0),
          servicios: Number(s.total_servicio || 0),
          efectivo: Number(s.total_efectivo || 0),
          tarjeta: Number(s.total_tarjeta || 0),
          transferencia: Number(s.total_transferencia || 0),
          propina: Number(s.total_propina || 0),
          comision: Number(s.total_comision || 0),
          iva: Number(s.total_iva || 0),
          devoluciones: Number(s.total_devoluciones || 0),
        },
        cajas: cajasDetalladas,
        movimientos,
        flujoEfectivo: {
          ...flujoEfectivo,
          neto: flujoEfectivoNeto,
        }
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
}


