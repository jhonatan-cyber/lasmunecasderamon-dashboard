import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Método no permitido' });
  }

  try {
    // Obtener información de la caja abierta
    const cajaResult = (await query(
      'SELECT id_caja, usuario_id_apertura, fecha_apertura, fecha_cierre FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1'
    )) as any[];

    const hasOpenCaja = cajaResult.length > 0;
    const cajaInfo = hasOpenCaja ? cajaResult[0] : null;

    if (!hasOpenCaja || !cajaInfo) {
      return res.status(200).json({
        success: true,
        data: {
          total: 0,
          presentes: 0,
          ausentes: 0,
          porcentajeAsistencia: 0,
          fechaApertura: null,
          fechaCierre: null
        }
      });
    }

    const fechaApertura = cajaInfo.fecha_apertura;
    const fechaCierre = cajaInfo.fecha_cierre || new Date().toISOString().split('T')[0]; // Si no hay cierre, usar fecha actual

    // Obtener total de usuarios (excepto administrador)
    const [totalUsuariosResult] = (await query(
      "SELECT COUNT(*) as total FROM usuarios u INNER JOIN roles r ON r.id_rol = u.rol_id WHERE r.nombre != 'administrador';"
    )) as any[];

    const totalUsuarios = Number(totalUsuariosResult?.total || 0);

    // Obtener usuarios con asistencias en el período de la caja
    const usuariosConAsistencias = (await query(
      `SELECT DISTINCT usuario_id 
       FROM asistencias 
       WHERE fecha >= ? AND fecha <= ?`,
      [fechaApertura, fechaCierre]
    )) as any[];

    const presentes = usuariosConAsistencias.length;
    const ausentes = totalUsuarios - presentes;
    const porcentajeAsistencia =
      totalUsuarios > 0 ? Math.round((presentes / totalUsuarios) * 100) : 0;

    return res.status(200).json({
      success: true,
      data: {
        total: totalUsuarios,
        presentes,
        ausentes,
        porcentajeAsistencia,
        fechaApertura,
        fechaCierre
      }
    });
  } catch (error) {
  
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
}
