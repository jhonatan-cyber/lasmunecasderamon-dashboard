import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Cookies from 'cookies';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const debugInfo = {
    step: 'start',
    error: null as string | null,
    env: {
      DB_HOST: process.env.DB_HOST,
      DB_USER: process.env.DB_USER,
      DB_NAME: process.env.DB_NAME,
      DB_PORT: process.env.DB_PORT,
      NODE_ENV: process.env.NODE_ENV
    }
  };

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      debugInfo.step = 'validation_failed';
      debugInfo.error = 'Missing credentials';
      return res.status(400).json({ 
        success: false, 
        message: 'Faltan credenciales',
        debug: debugInfo
      });
    }

    debugInfo.step = 'credentials_received';

    // Buscar usuario
    try {
      debugInfo.step = 'querying_user';
      const users = await query(
        `SELECT u.*, r.nombre as rol_nombre 
         FROM usuarios u 
         LEFT JOIN roles r ON u.rol_id = r.id_rol 
         WHERE u.email = ? AND u.estado = 1`,
        [email]
      ) as any[];

      debugInfo.step = 'user_query_completed';
      debugInfo.userCount = Array.isArray(users) ? users.length : 0;

      if (!Array.isArray(users) || users.length === 0) {
        debugInfo.step = 'user_not_found';
        return res.status(401).json({ 
          success: false, 
          message: 'Credenciales inválidas',
          debug: debugInfo
        });
      }

      const user = users[0];
      debugInfo.step = 'user_found';
      debugInfo.userId = user.id_usuario;

      // Verificar contraseña
      try {
        debugInfo.step = 'verifying_password';
        const isValidPassword = await bcrypt.compare(password, user.password);
        debugInfo.step = 'password_verification_completed';
        debugInfo.passwordValid = isValidPassword;

        if (!isValidPassword) {
          debugInfo.step = 'password_invalid';
          return res.status(401).json({ 
            success: false, 
            message: 'Credenciales inválidas',
            debug: debugInfo
          });
        }

        // Generar token JWT
        debugInfo.step = 'generating_jwt';
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

        debugInfo.step = 'jwt_generated';

        // Configurar cookie
        try {
          debugInfo.step = 'setting_cookie';
          const cookies = new Cookies(req, res);
          cookies.set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000, // 24 horas
            path: '/'
          });
          debugInfo.step = 'cookie_set';
        } catch (cookieError) {
          debugInfo.step = 'cookie_error';
          debugInfo.error = cookieError instanceof Error ? cookieError.message : 'Cookie error';
          console.error('Cookie error:', cookieError);
        }

        debugInfo.step = 'success';
        return res.status(200).json({
          success: true,
          message: 'Login exitoso',
          user: {
            id: user.id_usuario,
            username: user.username,
            email: user.email,
            role: user.rol_nombre
          },
          debug: debugInfo
        });

      } catch (passwordError) {
        debugInfo.step = 'password_error';
        debugInfo.error = passwordError instanceof Error ? passwordError.message : 'Password error';
        console.error('Password error:', passwordError);
        return res.status(500).json({
          success: false,
          message: 'Error al verificar contraseña',
          debug: debugInfo
        });
      }

    } catch (dbError) {
      debugInfo.step = 'database_error';
      debugInfo.error = dbError instanceof Error ? dbError.message : 'Database error';
      console.error('Database error:', dbError);
      return res.status(500).json({
        success: false,
        message: 'Error de base de datos',
        debug: debugInfo
      });
    }

  } catch (error) {
    debugInfo.step = 'general_error';
    debugInfo.error = error instanceof Error ? error.message : 'Unknown error';
    console.error('General error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      debug: debugInfo
    });
  }
}
