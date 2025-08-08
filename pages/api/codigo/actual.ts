import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { withSecurity, validateMethod } from '@/lib/middleware/security';
import { auditLogger } from '@/lib/logger';


async function getCodigoHandler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Verificar que el usuario sea administrador
    const userRole = req.headers['x-user-role'] as string;
    if (!userRole || userRole.toLowerCase() !== 'administrador') {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Solo administradores pueden ver el código.'
      });
    }

    // Obtener el código actual
    const codeRes = (await query('SELECT codigo FROM codigos ORDER BY fecha_crea DESC LIMIT 1')) as any[];

    if (!Array.isArray(codeRes) || codeRes.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Error al obtener el código'
      });
    }

    const codigo = codeRes[0].codigo;

    // Log de acceso al código
    auditLogger.dataAccess(0, 'CÓDIGO_ACCEDIDO', '/api/codigo/actual', {
      userRole,
      clientIP: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      timestamp: new Date().toISOString()
    });

    return res.status(200).json({
      success: true,
      codigo,
      message: 'Código obtenido exitosamente'
    });
  } catch (error) {
    console.error('Error al obtener código:', error);
    auditLogger.error(error as Error, {
      action: 'GET_CODIGO',
      clientIP: req.headers['x-forwarded-for'] || req.connection.remoteAddress
    });
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

// Exportar con validación de método y seguridad
export default validateMethod(['GET'])(withSecurity(getCodigoHandler));
