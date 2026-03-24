import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { withSecurity, validateMethod } from '@/lib/middleware/security';
import { jwtVerify } from 'jose';

type CodeRow = {
  codigo?: string | null;
};

async function getCodigoHandler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token =
      req.headers.authorization?.replace('Bearer ', '') ||
      req.headers.cookie?.split(';').find(cookie => cookie.trim().startsWith('token='))?.split('=')[1];

    if (!token) {
      return res.status(401).json({ success: false, message: 'No autenticado' });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'default_secret');
    const { payload } = await jwtVerify(token, secret).catch(() => ({ payload: null }));
    const roleLower = (payload?.role as string | undefined)?.toLowerCase();

    if (!roleLower || (roleLower !== 'administrador' && roleLower !== 'cajero')) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Solo administradores y cajeros pueden ver el codigo.',
      });
    }

    const codeRes = (await query('SELECT codigo FROM codigos ORDER BY fecha_crea DESC LIMIT 1')) as CodeRow[];

    if (!Array.isArray(codeRes) || codeRes.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Error al obtener el codigo',
      });
    }

    const codigo = codeRes[0].codigo;

    return res.status(200).json({
      success: true,
      codigo,
      message: 'Codigo obtenido exitosamente',
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
}

export default validateMethod(['GET'])(withSecurity(getCodigoHandler));
