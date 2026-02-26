import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, getCurrentUser } from '@/lib/middleware/auth';
import { query } from '@/lib/db';
import { RowDataPacket } from 'mysql2/promise';

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ success: false, message: 'Método no permitido' });
    }

    try {
        const userData = getCurrentUser(req);
        if (!userData) {
            return res.status(401).json({ success: false, message: 'No autorizado' });
        }

        if (req.method === 'GET') {
            const rows = await query('SELECT estado FROM usuarios WHERE id_usuario = ?', [userData.id]) as RowDataPacket[];
            if (rows && rows.length > 0) {
                return res.status(200).json({ success: true, status: rows[0].estado });
            }
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }

        const { status } = req.body;

        // Status should be 1 (Disponible), 2 (Ocupada), or 3 (En Descanso)
        if (![1, 2, 3].includes(status)) {
            return res.status(400).json({ success: false, message: 'Estado no válido' });
        }

        await query(
            'UPDATE usuarios SET estado = ?, fecha_mod = NOW() WHERE id_usuario = ?',
            [status, userData.id]
        );

        return res.status(200).json({
            success: true,
            message: 'Estado actualizado correctamente',
            status
        });
    } catch (error) {
        console.error('Error in user status API:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
}

export default withAuth(handler);
