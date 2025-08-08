import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Cookies from 'cookies';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Permitir tanto GET como POST para testing
  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      message: 'Login endpoint está funcionando',
      method: 'GET',
      timestamp: new Date().toISOString()
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      message: 'Method not allowed',
      allowedMethods: ['GET', 'POST']
    });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Faltan credenciales',
        received: { email: !!email, password: !!password }
      });
    }

    // Buscar usuario
    const users = await query(
      `SELECT u.*, r.nombre as rol_nombre 
       FROM usuarios u 
       LEFT JOIN roles r ON u.rol_id = r.id_rol 
       WHERE u.email = ? AND u.estado = 1`,
      [email]
    ) as any[];

    if (!Array.isArray(users) || users.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Credenciales inválidas',
        debug: { email, userCount: 0 }
      });
    }

    const user = users[0];

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false, 
        message: 'Credenciales inválidas',
        debug: { email, userId: user.id_usuario, passwordValid: false }
      });
    }

    // Generar token JWT
    const token = jwt.sign(
      {
        id: user.id_usuario,
        username: user.username,
        email: user.email,
        role: user.rol_nombre
      },
      process.env.JWT_SECRET || 'default_secret',
      { expiresIn: '24h' }
    );

    // Configurar cookie
    const cookies = new Cookies(req, res);
    cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 horas
      path: '/'
    });

    // Registrar login exitoso
    await query('INSERT INTO logins (usuario_id) VALUES (?)', [user.id_usuario]);

    return res.status(200).json({
      success: true,
      message: 'Login exitoso',
      user: {
        id: user.id_usuario,
        username: user.username,
        email: user.email,
        role: user.rol_nombre
      },
      token: token, // Incluir token en respuesta para debugging
      debug: {
        email,
        userId: user.id_usuario,
        passwordValid: true,
        tokenGenerated: true
      }
    });

  } catch (error) {
    console.error('Error en login-public:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
      debug: {
        step: 'error',
        error: error instanceof Error ? error.stack : 'Unknown error'
      }
    });
  }
}
