import type { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Cookies from 'cookies';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('🚀 Login test handler started');
  
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

    // Configuración de conexión directa (igual que test-connection)
    const config = {
      host: process.env.DB_HOST || 'lasmunecasderamoncom-lasmunecasderamondb-jfteo0',
      user: process.env.DB_USER || 'nuwe',
      password: process.env.DB_PASSWORD || 'Ancasi96nuwe+',
      database: process.env.DB_NAME || 'lasmunecasderamon',
      port: parseInt(process.env.DB_PORT || '3306'),
      waitForConnections: true,
      connectionLimit: 1,
      queueLimit: 0
    };

    console.log('🔍 Using connection config:', {
      host: config.host,
      user: config.user,
      database: config.database,
      port: config.port
    });

    // Crear conexión directa
    console.log('📡 Creating direct connection...');
    const connection = await mysql.createConnection(config);
    console.log('✅ Connection created successfully');

    // Buscar usuario
    console.log('🔍 Searching for user with email:', email);
    const [users] = await connection.execute(
      `SELECT u.*, r.nombre as rol_nombre 
       FROM usuarios u 
       LEFT JOIN roles r ON u.rol_id = r.id_rol 
       WHERE u.email = ? AND u.estado = 1`,
      [email]
    );

    console.log('📊 Users found:', Array.isArray(users) ? users.length : 'Not an array');

    if (!Array.isArray(users) || users.length === 0) {
      console.log('❌ No user found');
      await connection.end();
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
      console.log('❌ Invalid password');
      await connection.end();
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

    // Configurar cookie
    console.log('🔍 Setting cookie...');
    const cookies = new Cookies(req, res);
    cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 horas
      path: '/'
    });

    console.log('✅ Cookie set successfully');

    // Registrar login exitoso
    console.log('🔍 Recording login...');
    await connection.execute('INSERT INTO logins (usuario_id) VALUES (?)', [user.id_usuario]);
    console.log('✅ Login recorded successfully');

    // Cerrar conexión
    await connection.end();
    console.log('✅ Connection closed');

    console.log('🎉 Login test completed successfully');

    return res.status(200).json({
      success: true,
      message: 'Login exitoso',
      user: {
        id: user.id_usuario,
        username: user.username,
        email: user.email,
        role: user.rol_nombre
      },
      token: token, // Incluir token para debugging
      debug: {
        email,
        userId: user.id_usuario,
        passwordValid: true,
        tokenGenerated: true
      }
    });

  } catch (error) {
    console.error('❌ Error in login test:', error);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      code: (error as any)?.code,
      errno: (error as any)?.errno,
      sqlState: (error as any)?.sqlState,
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
