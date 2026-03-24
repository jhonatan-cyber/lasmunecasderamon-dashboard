/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextApiRequest, NextApiResponse } from "next";
import { query } from "@/lib/db";
import { withAuth } from "@/lib/middleware/auth";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Método no permitido" });
  }

  try {
    const userData = (req as any).user;
    if (!userData || !userData.id) {
      return res.status(401).json({ success: false, message: "No autorizado" });
    }

    const usuario_id = userData.id;

    // 1. Obtener componentes de asistencia
    const asistenciaResult = await query(
      `SELECT 
        COALESCE(U.sueldo, 0) as sueldo, 
        COALESCE(U.aporte, 0) as aporte, 
        COALESCE(U.descuento, 0) as descuento,
        COALESCE(A.total, 0) as total_asistencias,
        COALESCE(D.semanas, 0) as semanas_con_descuento
      FROM usuarios U
      LEFT JOIN (
        SELECT usuario_id, COUNT(*) as total FROM asistencias WHERE estado = 1 AND usuario_id = ? GROUP BY usuario_id
      ) A ON U.id_usuario = A.usuario_id
      LEFT JOIN (
        SELECT usuario_id, COUNT(DISTINCT YEARWEEK(fecha, 1)) as semanas FROM asistencias WHERE estado = 1 AND usuario_id = ? GROUP BY usuario_id
      ) D ON U.id_usuario = D.usuario_id
      WHERE U.id_usuario = ?`,
      [usuario_id, usuario_id, usuario_id]
    ) as any[];
    
    const resAsistencia = asistenciaResult[0];
    const montoAsistencia = Math.max(0, (resAsistencia.total_asistencias * resAsistencia.sueldo) - 
                            (resAsistencia.total_asistencias * resAsistencia.aporte) - 
                            (resAsistencia.semanas_con_descuento * resAsistencia.descuento));

    // 2. Obtener monto de comisiones (pendientes de pago - estado = 1)
    const comisionesResult = await query(
      `SELECT COALESCE(SUM(DC.comision), 0) AS total
       FROM detalle_comisiones DC
       INNER JOIN comisiones C ON C.id_comision = DC.comision_id
       WHERE DC.usuario_id = ? AND C.estado = 1`,
      [usuario_id]
    ) as any[];
    const montoComision = Math.max(0, Number(comisionesResult[0]?.total || 0));

    // 3. Obtener monto de propinas (pendientes de pago - estado = 1)
    const propinasResult = await query(
      `SELECT COALESCE(SUM(DP.monto), 0) AS total
       FROM detalle_propinas DP
       INNER JOIN propinas P ON P.id_propina = DP.propina_id
       WHERE DP.usuario_id = ? AND P.estado = 1`,
      [usuario_id]
    ) as any[];
    const montoPropina = Math.max(0, Number(propinasResult[0]?.total || 0));

    // 4. Verificar si ya tiene solicitud pendiente en la nueva tabla de solicitudes (Estado 2)
    const anticiposPendientes = await query(
      `SELECT COUNT(*) as count FROM solicitudes_anticipos WHERE usuario_id = ? AND estado = 'pendiente'`,
      [usuario_id]
    ) as any[];
    const tieneSolicitudPendiente = anticiposPendientes[0].count > 0;

    const montoMaximo = Math.max(0, montoAsistencia + montoComision + montoPropina);

    return res.status(200).json({
      success: true,
      data: {
        monto_asistencia: montoAsistencia,
        monto_comisiones: montoComision,
        monto_propinas: montoPropina,
        monto_maximo: montoMaximo,
        tiene_solicitud_pendiente: tieneSolicitudPendiente
      }
    });
  } catch (error: any) {
    console.error("Error al obtener monto máximo:", error);
    return res.status(500).json({ success: false, message: "Error interno del servidor" });
  }
}

export default withAuth(handler);
