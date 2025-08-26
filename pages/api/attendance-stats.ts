import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Método no permitido' });
  }

  try {
    const fechaHoy = new Date().toISOString().split('T')[0];

    // Obtener información de la caja abierta
    const cajaResult = (await query(
      'SELECT id_caja, usuario_id_apertura, fecha_apertura, fecha_cierre FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1'
    )) as any[];

    const hasOpenCaja = cajaResult.length > 0;
    const cajaInfo = hasOpenCaja ? cajaResult[0] : null;

    // Obtener total de usuarios (excepto administrador)
    const [totalUsuariosResult] = (await query(
      "SELECT COUNT(*) as total FROM usuarios u INNER JOIN roles r ON r.id_rol = u.rol_id WHERE r.nombre != 'administrador';"
    )) as any[];

    const totalUsuarios = Number(totalUsuariosResult?.total || 0);

    // Estadísticas del día actual
    const asistenciasHoy = (await query(
      `SELECT DISTINCT usuario_id 
       FROM asistencias 
       WHERE fecha = ? AND estado = 1`,
      [fechaHoy]
    )) as any[];

    const presentesHoy = asistenciasHoy.length;
    const ausentesHoy = totalUsuarios - presentesHoy;
    const porcentajeHoy = totalUsuarios > 0 ? Math.round((presentesHoy / totalUsuarios) * 100) : 0;

    // Estadísticas del período de la caja (si existe)
    let statsCaja = {
      presentes: 0,
      ausentes: 0,
      porcentajeAsistencia: 0,
      fechaApertura: null,
      fechaCierre: null
    };

    if (hasOpenCaja && cajaInfo) {
      const fechaApertura = cajaInfo.fecha_apertura;
      // Siempre usar fecha actual si no hay fecha de cierre
      const fechaCierre = cajaInfo.fecha_cierre || fechaHoy;

      const usuariosConAsistenciasCaja = (await query(
        `SELECT DISTINCT usuario_id 
         FROM asistencias 
         WHERE fecha >= ? AND fecha <= ? AND estado = 1`,
        [fechaApertura, fechaCierre]
      )) as any[];

      const presentesCaja = usuariosConAsistenciasCaja.length;
      const ausentesCaja = totalUsuarios - presentesCaja;
      const porcentajeCaja =
        totalUsuarios > 0 ? Math.round((presentesCaja / totalUsuarios) * 100) : 0;

      statsCaja = {
        presentes: presentesCaja,
        ausentes: ausentesCaja,
        porcentajeAsistencia: porcentajeCaja,
        fechaApertura,
        fechaCierre
      };
    }

    // Lógica mejorada: Siempre priorizar estadísticas del día actual
    let stats;
    if (presentesHoy > 0) {
      // Si hay asistencias hoy, usar estadísticas del día actual
      stats = {
        presentes: presentesHoy,
        ausentes: ausentesHoy,
        porcentajeAsistencia: porcentajeHoy,
        fechaApertura: fechaHoy,
        fechaCierre: fechaHoy
      };
    } else {
      // Si no hay asistencias hoy, usar estadísticas del período de la caja (que incluye hasta hoy)
      stats = statsCaja.presentes > 0 ? statsCaja : {
        presentes: presentesHoy,
        ausentes: ausentesHoy,
        porcentajeAsistencia: porcentajeHoy,
        fechaApertura: fechaHoy,
        fechaCierre: fechaHoy
      };
    }

    return res.status(200).json({
      success: true,
      data: {
        total: totalUsuarios,
        presentes: stats.presentes,
        ausentes: stats.ausentes,
        porcentajeAsistencia: stats.porcentajeAsistencia,
        fechaApertura: stats.fechaApertura,
        fechaCierre: stats.fechaCierre
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
}
