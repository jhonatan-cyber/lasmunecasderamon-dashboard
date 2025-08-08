import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Cookies from 'cookies';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('🚀 Login debug GET handler started');
  console.log('📊 Request method:', req.method);
  
  if (req.method !== 'GET') {
    console.log('❌ Invalid method:', req.method);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  console.log('✅ Method validation passed');

  try {
    // Usar credenciales de prueba hardcodeadas para debugging
    const email = 'admin@lasmuñecasderamon.com';
    const password = 'admin123'; // Asegúrate de que esta contraseña existe en tu BD
    
    console.log('📊 Using test credentials:', { email, password: '***' });

    // Buscar usuario
    console.log('🔍 Searching for user in database...');
    const users = await query(
      `SELECT u.*, r.nombre as rol_nombre 
       FROM usuarios u 
       LEFT JOIN roles r ON u.rol_id = r.id_rol 
       WHERE u.email = ? AND u.estado = 1`,
      [email]
    ) as any[];

    console.log('📊 Database query completed');
    console.log('📊 Users found:', Array.isArray(users) ? users.length : 'Not an array');

    if (!Array.isArray(users) || users.length === 0) {
      console.log('❌ No user found with email:', email);
      return res.status(401).json({ 
        success: false, 
        message: 'Usuario no encontrado',
        debug: { email, userCount: 0 }
      });
    }

    const user = users[0];
    console.log('✅ User found:', { id: user.id_usuario, email: user.email, role: user.rol_nombre });

    // Verificar contraseña
    console.log('🔍 Verifying password...');
    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log('📊 Password verification result:', isValidPassword);
    
    if (!isValidPassword) {
      console.log('❌ Invalid password for user:', user.id_usuario);
      return res.status(401).json({ 
        success: false, 
        message: 'Contraseña incorrecta',
        debug: { email, userId: user.id_usuario, passwordValid: false }
      });
    }

    console.log('✅ Password verification passed');

    // Generar token JWT
    console.log('🔍 Generating JWT token...');
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

    console.log('✅ JWT token generated');

    // Configurar cookie
    console.log('🔍 Setting cookie...');
    const cookies = new Cookies(req, res);
    
    // En producción, siempre usar secure: false para evitar problemas de proxy
    const isSecure = process.env.NODE_ENV === 'production' ? false : true;
    
    console.log('📊 Cookie configuration:', {
      nodeEnv: process.env.NODE_ENV,
      isSecure: isSecure,
      note: 'Using secure: false in production to avoid proxy issues'
    });
    
    cookies.set('token', token, {
      httpOnly: true,
      secure: isSecure, // false en producción para evitar problemas de proxy
      sameSite: 'lax', // Cambiar a 'lax' para mejor compatibilidad
      maxAge: 24 * 60 * 60 * 1000, // 24 horas
      path: '/'
    });

    console.log('✅ Cookie set successfully');

    // Registrar login exitoso
    console.log('🔍 Recording login in database...');
    await query('INSERT INTO logins (usuario_id) VALUES (?)', [user.id_usuario]);
    console.log('✅ Login recorded successfully');

    console.log('🎉 Login process completed successfully');

    return res.status(200).json({
      success: true,
      message: 'Login exitoso (GET)',
      user: {
        id: user.id_usuario,
        username: user.username,
        email: user.email,
        role: user.rol_nombre
      },
      token: token, // Incluir token en respuesta
      debug: {
        method: 'GET',
        email,
        userId: user.id_usuario,
        passwordValid: true,
        tokenGenerated: true,
        cookieSet: true,
        note: 'Login exitoso usando GET para debugging'
      }
    });

  } catch (error) {
    console.error('❌ Error in login process:', error);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
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
