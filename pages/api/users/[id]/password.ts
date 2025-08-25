import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { withAuth } from '@/lib/middleware/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ success: false, message: 'Método no permitido' });
  }

  try {
    const { id } = req.query;
    const { password } = req.body;

    // Validar que se proporcione una contraseña
    if (!password || typeof password !== 'string' || password.trim().length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'La contraseña debe tener al menos 6 caracteres' 
      });
    }

    // Verificar que el usuario existe
    const [existingUser] = (await query(
      'SELECT id_usuario, email FROM usuarios WHERE id_usuario = ?',
      [id]
    )) as any[];

    if (!existingUser) {
      return res.status(404).json({ 
        success: false, 
        message: 'Usuario no encontrado' 
      });
    }

    // Hashear la nueva contraseña
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Actualizar solo la contraseña y la fecha de modificación
    await query(
      'UPDATE usuarios SET password = ?, fecha_mod = NOW() WHERE id_usuario = ?',
      [hashedPassword, id]
    );

    return res.status(200).json({
      success: true,
      message: 'Contraseña actualizada exitosamente',
      changes: {
        passwordUpdated: true
      }
    });

  } catch (error) {

    return res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor al actualizar la contraseña' 
    });
  }
}

export default withAuth(handler);
