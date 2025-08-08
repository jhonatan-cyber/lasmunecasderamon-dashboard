import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { setSecureCookie } from '@/lib/middleware/cookieUtils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('🚀 Test redirect handler started');
  console.log('📊 Request method:', req.method);
  
  if (req.method !== 'POST') {
    console.log('❌ Invalid method:', req.method);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  console.log('✅ Method validation passed');

  try {
    const { email, password } = req.body;
    console.log('📊 Request body:', { email: email ? 'provided' : 'missing', password: password ? 'provided' : 'missing' });

    if (!email || !password) {
      console.log('❌ Missing credentials');
      return res.status(400).json({ 
        success: false, 
        message: 'Faltan credenciales' 
      });
    }

    console.log('✅ Credentials validation passed');

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
        message: 'Credenciales inválidas',
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
        message: 'Credenciales inválidas',
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

    // Configurar cookie usando las utilidades
    console.log('🔍 Setting cookie...');
    const cookieSet = setSecureCookie(req, res, 'token', token);
    
    if (!cookieSet) {
      console.log('⚠️ Cookie setting failed, but continuing with token in response');
    }

    console.log('✅ Cookie set successfully');

    // Registrar login exitoso (temporalmente comentado para debugging)
    console.log('🔍 Recording login in database...');
    try {
      await query('INSERT INTO logins (usuario_id) VALUES (?)', [user.id_usuario]);
      console.log('✅ Login recorded successfully');
    } catch (loginError) {
      console.log('⚠️ Login recording failed, but continuing:', loginError);
      // Continuar sin registrar el login para debugging
    }

    console.log('🎉 Login process completed successfully');

    return res.status(200).json({
      success: true,
      message: 'Login exitoso (test redirect)',
      user: {
        id: user.id_usuario,
        username: user.username,
        email: user.email,
        role: user.rol_nombre
      },
      token: token, // Incluir token en respuesta
      redirectUrl: '/', // URL a la que debe redirigir
      debug: {
        email,
        userId: user.id_usuario,
        passwordValid: true,
        tokenGenerated: true,
        cookieSet: cookieSet,
        note: 'Token incluido en respuesta. El frontend debe redirigir a /'
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
