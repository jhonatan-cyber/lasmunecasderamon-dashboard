import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { withSecurity, validateMethod } from '@/lib/middleware/security';
import { auditLogger } from '@/lib/logger';

/**
 * @swagger
 * /api/codigo/actual:
 *   get:
 *     summary: Obtener código actual de verificación
 *     description: Endpoint para obtener el código actual de verificación (solo administradores)
 *     tags: [Código]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Código obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 codigo:
 *                   type: string
 *                   example: "1234"
 *                 message:
 *                   type: string
 *                   example: Código obtenido exitosamente
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Acceso denegado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

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
