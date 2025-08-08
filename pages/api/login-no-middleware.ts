import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Cookies from 'cookies';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { email, password, codigo } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Faltan credenciales' 
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
        message: 'Credenciales inválidas' 
      });
    }

    const user = users[0];

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false, 
        message: 'Credenciales inválidas' 
      });
    }

    // Verificar si requiere código de verificación
    const requiereCodigoVerificacion = (rol: string): boolean => {
      const ahora = new Date();
      const hora = ahora.getHours();
      const minutos = ahora.getMinutes();
      const horaActual = hora * 60 + minutos;

      const horaInicio = 20 * 60; // 20:00
      const horaFin = 23 * 60; // 23:00

      const rolesConCodigo = ['cajero', 'garzon', 'anfitriona'];
      const rolLower = rol.toLowerCase();

      return rolesConCodigo.includes(rolLower) && horaActual >= horaInicio && horaActual <= horaFin;
    };

    if (requiereCodigoVerificacion(user.rol_nombre)) {
      if (!codigo) {
        return res.status(200).json({
          success: false,
          requiereCodigo: true,
          message: 'Se requiere código de verificación para este horario',
          user: {
            id: user.id_usuario,
            username: user.username,
            email: user.email,
            role: user.rol_nombre
          }
        });
      }

      // Validar código si se proporcionó
      const codeRes = await query('SELECT codigo FROM codigos WHERE codigo = ?', [codigo]) as any[];
      if (!Array.isArray(codeRes) || codeRes.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Código de verificación incorrecto'
        });
      }
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
      }
    });

  } catch (error) {
    console.error('Error en login-no-middleware:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
