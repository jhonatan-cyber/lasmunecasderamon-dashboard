import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método no permitido' });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email y contraseña son requeridos'
      });
    }

    // Buscar usuario por email o username con información del rol
    const users = (await query(
      `SELECT u.*, r.nombre as rol_nombre 
       FROM usuarios u 
       LEFT JOIN roles r ON u.rol_id = r.id_rol 
       WHERE (u.email = ? OR u.username = ?) AND u.estado = 1`,
      [email, email]
    )) as any[];

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    const user = users[0];
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }
    try {
      await query(
        `UPDATE logins 
         SET estado = 0 WHERE usuario_id = ? AND estado = 1`,
        [user.id_usuario]
      );
    } catch (error) {
      throw error instanceof Error
        ? error
        : new Error('Error al cerrar sesiones activas del usuario');
    }
    const token = jwt.sign(
      {
        id: user.id_usuario,
        username: user.nombre || user.username,
        email: user.email,
        role: user.rol_nombre || 'garzon'
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    try {
      await query(
        `INSERT INTO logins (
          usuario_id, 
          last_login,
          estado 
          ) VALUES (?, NOW(), 1)`,
        [user.id_usuario]
      );
    } catch (error) {
      throw error instanceof Error
        ? error
        : new Error('Error al registrar el nuevo login del usuario');
    }

    // Configurar cookie
    const isSecure = process.env.NEXT_PUBLIC_BASE_URL?.startsWith('https');
    res.setHeader(
      'Set-Cookie',
      `token=${token}; HttpOnly; Path=/; Max-Age=86400; SameSite=Lax${isSecure ? '; Secure' : ''}`
    );

    return res.status(200).json({
      success: true,
      user: {
        id: user.id_usuario,
        name: user.nombre || user.username || '',
        lastName: user.apellido || '',
        email: user.email,
        role: user.rol_nombre || 'garzon',
        foto: user.foto || 'default.png',
        status: user.estado,
        username: user.username || user.nombre || '',
        nick: user.nick || '',
        phone: user.telefono || '',
        address: user.direccion || '',
        estado_civil: user.estado_civil || ''
      },
      token: token,
      estado: 'ok',
      codigo: 200
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}
