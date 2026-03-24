/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Método no permitido' });
    }

    const { identifier } = req.body;

    if (!identifier) {
        return res.status(400).json({
            success: false,
            message: 'Email o nombre de usuario es requerido'
        });
    }

    try {
        // 1. Buscar usuario por email o nick
        const users = (await query(
            `SELECT id_usuario, run, telefono, nombre, email, nick as username 
       FROM usuarios 
       WHERE (email = ? OR nick = ?) AND estado = 1`,
            [identifier, identifier]
        )) as any[];

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        const user = users[0];

        if (!user.run) {
            return res.status(400).json({
                success: false,
                message: 'El usuario no tiene un RUN asociado para resetear la contraseña'
            });
        }

        // 2. Hashear el RUN para la nueva contraseña
        const hashedRun = await bcrypt.hash(user.run, 10);

        // 3. Actualizar la contraseña en la base de datos
        await query(
            'UPDATE usuarios SET password = ? WHERE id_usuario = ?',
            [hashedRun, user.id_usuario]
        );

        return res.status(200).json({
            success: true,
            message: 'Tu contraseña ha sido reseteada a tu número de RUN exitosamente.'
        });

    } catch (error: any) {
        console.error('[ResetPassword API] Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno al resetear la contraseña'
        });
    }
}

