import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/lib/middleware/auth';
import { query } from '@/lib/db';
import crypto from 'crypto';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método no permitido' });
  }

  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'ID de usuario es requerido' });
    }

    // Generar un token único
    const qrToken = crypto.randomBytes(32).toString('hex');

    // Actualizar el token en la base de datos
    await query(
      'UPDATE usuarios SET qr_token = ? WHERE id_usuario = ?',
      [qrToken, userId]
    );

    return res.status(200).json({
      success: true,
      message: 'Token QR generado exitosamente',
      qr_token: qrToken
    });
  } catch (error) {
    console.error('[Generate QR Token API] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al generar el token QR',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

export default withAuth(handler);
