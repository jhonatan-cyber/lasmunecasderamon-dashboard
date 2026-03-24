import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, getCurrentUser } from '@/lib/middleware/auth';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Método no permitido' });
    }

    try {
        const user = getCurrentUser(req);
        if (!user) {
            return res.status(401).json({ success: false, message: 'No autorizado' });
        }

        const { token } = req.body as { token?: string };
        if (!token) {
            return res.status(400).json({ success: false, message: 'Token requerido' });
        }

        // Actualizar el token del usuario en la base de datos
        await query('UPDATE usuarios SET push_token = ? WHERE id_usuario = ?', [token, user.id]);

        return res.status(200).json({
            success: true,
            message: 'Push token registrado correctamente'
        });

    } catch (error) {
        const exception = error instanceof Error ? error : new Error('Error desconocido al registrar push token');
        logger.error('Error al registrar push token', {
            error: exception.message,
            stack: exception.stack,
        });
        return res.status(500).json({
            success: false,
            message: 'Error al registrar el token',
            error: exception.message
        });
    }
};

export default withAuth(handler);

