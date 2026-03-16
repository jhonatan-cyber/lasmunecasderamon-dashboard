import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { withTransaction } from '@/lib/transactionUtils';
const PAYROLL_SQL = `
SELECT 
  U.id_usuario, 
  R.nombre AS rol,
  CONCAT(U.nombre, ' ', U.apellido) AS usuario,

  -- Sueldos y aportes individuales
  IFNULL(ASIS.asistencias * U.sueldo, 0) AS sueldos,
  IFNULL(ASIS.asistencias * U.aporte, 0) AS aportes, 

  -- Totales por concepto
  IFNULL(VEN.total_venta,      0) AS ventas,
  IFNULL(SERV.total_servicios, 0) AS servicios,
  IFNULL(ANT.total_anticipos,  0) AS anticipos,
  IFNULL(PROP.total_propinas,  0) AS propinas,

  -- Horas extras
  IFNULL(HR.total_horas,       0) AS total_horas,
  IFNULL(HR.total_monto_horas, 0) AS total_monto_horas,

  -- Gratificaciones
  IFNULL(GRAT.total_gratificaciones, 0) AS gratificaciones,

  -- Descuento semanal por alojamiento (descuento fijo por semana)
  IFNULL(SEM.semanas * U.descuento, 0) AS descuentos,

  -- TOTAL FINAL
  (
    IFNULL(ASIS.asistencias * U.sueldo, 0) +
    IFNULL(VEN.total_venta,             0) +
    IFNULL(SERV.total_servicios,        0) +
    IFNULL(PROP.total_propinas,          0) +
    IFNULL(HR.total_monto_horas,        0) +
    IFNULL(GRAT.total_gratificaciones,  0) -
    IFNULL(ANT.total_anticipos,         0) -
    IFNULL(ASIS.asistencias * U.aporte, 0) -
    IFNULL(SEM.semanas * U.descuento,   0)
  ) AS total

FROM usuarios U
INNER JOIN roles R ON R.id_rol = U.rol_id
LEFT JOIN (
  SELECT usuario_id, COUNT(*) AS asistencias
  FROM asistencias 
  WHERE estado = 1
  GROUP BY usuario_id
) AS ASIS ON ASIS.usuario_id = U.id_usuario

LEFT JOIN (
  SELECT DC.usuario_id, SUM(DC.comision) AS total_venta
  FROM detalle_comisiones DC
  INNER JOIN comisiones C ON C.id_comision = DC.comision_id
  WHERE C.venta_id <> 0 AND C.estado = 1 AND DC.estado = 1
  GROUP BY DC.usuario_id
) AS VEN ON VEN.usuario_id = U.id_usuario

LEFT JOIN (
  SELECT DC.usuario_id, SUM(DC.comision) AS total_servicios
  FROM detalle_comisiones DC
  INNER JOIN comisiones C ON C.id_comision = DC.comision_id
  WHERE C.servicio_id <> 0 AND C.estado = 1 AND DC.estado = 1
  GROUP BY DC.usuario_id
) AS SERV ON SERV.usuario_id = U.id_usuario

LEFT JOIN (
  SELECT usuario_id, SUM(monto) AS total_anticipos
  FROM anticipos 
  WHERE estado = 1
  GROUP BY usuario_id
) AS ANT ON ANT.usuario_id = U.id_usuario

LEFT JOIN (
  SELECT usuario_id, SUM(monto) AS total_propinas
  FROM detalle_propinas  
  WHERE estado = 1
  GROUP BY usuario_id
) AS PROP ON PROP.usuario_id = U.id_usuario

LEFT JOIN (
  SELECT usuario_id, SUM(hora) AS total_horas, SUM(total) AS total_monto_horas 
  FROM horas_extras
  WHERE estado = 1 
  GROUP BY usuario_id
) AS HR ON HR.usuario_id = U.id_usuario

LEFT JOIN (
  SELECT usuario_id, SUM(monto) AS total_gratificaciones
  FROM gratificaciones
  WHERE estado = 1 
  GROUP BY usuario_id
) AS GRAT ON GRAT.usuario_id = U.id_usuario

-- Semanas trabajadas para aplicar descuento semanal por usuario
LEFT JOIN (
  SELECT usuario_id, COUNT(DISTINCT YEARWEEK(fecha, 1)) AS semanas
  FROM asistencias 
  WHERE estado = 1
  GROUP BY usuario_id
) AS SEM ON SEM.usuario_id = U.id_usuario

GROUP BY U.id_usuario
HAVING total > 0`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const rows = (await query(PAYROLL_SQL, [])) as any[];
      return res.status(200).json({ success: true, data: rows });
    }

    if (req.method === 'POST') {
      const { usuario_id } = req.body || {};
      const userId = usuario_id as string;
      if (!userId) {
        return res
          .status(400)
          .json({ success: false, message: 'usuario_id es requerido' });
      }

      try {
        const result = await withTransaction(async trx => {
          // 1) Asistencias: estado 1 -> 0
          const asistencias = (await trx(
            'UPDATE asistencias SET estado = 0, fecha_pago = NOW() WHERE usuario_id = ? AND estado = 1',
            [userId]
          )) as any;

          // 2) Detalle Comisiones: estado 1 -> 0 (solo las del usuario)
          const detalleComisiones = (await trx(
            'UPDATE detalle_comisiones SET estado = 0, fecha_mod = NOW() WHERE usuario_id = ? AND estado = 1',
            [userId]
          )) as any;

          // 3) Ventas del usuario (vía comisiones): estado 1 -> 3
          const ventas = (await trx(
            `UPDATE ventas 
             SET estado = 3, fecha_mod = NOW()
             WHERE estado = 1 AND id_venta IN (
               SELECT c.venta_id FROM comisiones c 
               INNER JOIN detalle_comisiones dc ON dc.comision_id = c.id_comision 
               WHERE dc.usuario_id = ? AND c.venta_id <> 0
             )`,
            [userId]
          )) as any;

          // 4) Servicios del usuario (vía detalle_servicios): estado 1 (Finalizado) -> 4 (Pagado/Planilla)
          const servicios = (await trx(
            `UPDATE servicios 
             SET estado = 4, fecha_mod = NOW()
             WHERE estado = 1 AND id_servicio IN (
               SELECT ds.servicio_id FROM detalle_servicios ds WHERE ds.usuario_id = ?
             )`,
            [userId]
          )) as any;

          // 5) Detalle Propinas: estado 1 -> 0
          const detallePropinas = (await trx(
            'UPDATE detalle_propinas SET estado = 0, fecha_mod = NOW() WHERE usuario_id = ? AND estado = 1',
            [userId]
          )) as any;

          // 5.1) Actualizar propinas principales cuando todas las propinas de detalle están pagadas
          const propinas = (await trx(
            `UPDATE propinas 
             SET estado = 0, fecha_mod = NOW()
             WHERE estado = 1 AND id_propina IN (
               SELECT DISTINCT dp.propina_id 
               FROM detalle_propinas dp 
               WHERE dp.propina_id IN (
                 SELECT DISTINCT propina_id FROM detalle_propinas WHERE usuario_id = ?
               )
               AND NOT EXISTS (
                 SELECT 1 FROM detalle_propinas dp2 
                 WHERE dp2.propina_id = dp.propina_id AND dp2.estado = 1
               )
             )`,
            [userId]
          )) as any;

          // 6) Anticipos: estado 1 -> 0
          const anticipos = (await trx(
            'UPDATE anticipos SET estado = 0, fecha_mod = NOW() WHERE usuario_id = ? AND estado = 1',
            [userId]
          )) as any;

          // 7) Horas Extras: estado 1 -> 0
          const horasExtras = (await trx(
            'UPDATE horas_extras SET estado = 0, fecha_mod = NOW() WHERE usuario_id = ? AND estado = 1',
            [userId]
          )) as any;

          // 8) Gratificaciones: estado 1 -> 0
          const gratificaciones = (await trx(
            'UPDATE gratificaciones SET estado = 0, fecha_mod = NOW() WHERE usuario_id = ? AND estado = 1',
            [userId]
          )) as any;

          return {
            affected: {
              asistencias,
              detalleComisiones,
              ventas,
              servicios,
              detallePropinas,
              propinas,
              anticipos,
              horasExtras,
              gratificaciones
            }
          };
        });

        return res
          .status(200)
          .json({ success: true, message: 'Pago procesado correctamente', ...result });
      } catch (err) {
        return res
          .status(500)
          .json({ success: false, message: 'Error al procesar el pago', error: err });
      }
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ success: false, message: `Método ${req.method} no permitido` });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error en planilla', error });
  }
}
