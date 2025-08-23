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

    // Buscar usuario por email con información del rol
    const users = (await query(
      `SELECT u.*, r.nombre as rol_nombre 
       FROM usuarios u 
       LEFT JOIN roles r ON u.rol_id = r.id_rol 
       WHERE u.email = ? AND u.estado = 1`,
      [email]
    )) as any[];

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    const user = users[0];

    // Debug logs
    console.log('🔍 [LOGIN] Datos del usuario obtenidos de la BD:');
    console.log('   ID:', user.id_usuario);
    console.log('   Nombre:', user.nombre);
    console.log('   Apellido:', user.apellido);
    console.log('   Email:', user.email);
    console.log('   Rol:', user.rol_nombre);
    console.log('   Foto:', user.foto);
    console.log('   Estado:', user.estado);

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // 1. Verificar y cerrar sesiones activas del usuario
    console.log('🔍 [LOGIN] Verificando sesiones activas del usuario:', user.id_usuario);

    try {
      // Cerrar todas las sesiones activas del usuario (estado 1 -> 0)
      await query(
        `UPDATE logins 
         SET estado = 0 WHERE usuario_id = ? AND estado = 1`,
        [user.id_usuario]
      );

      console.log('✅ [LOGIN] Sesiones activas cerradas para el usuario:', user.id_usuario);
    } catch (error) {
      console.error('❌ [LOGIN] Error al cerrar sesiones activas:', error);
    }

    // 2. Generar token JWT con la estructura que espera el middleware
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

    // 3. Registrar el nuevo login
    console.log('📝 [LOGIN] Registrando nuevo login para el usuario:', user.id_usuario);

    try {
      await query(
        `INSERT INTO logins (
          usuario_id, 
          last_login,
          estado 
          ) VALUES (?, NOW(), 1)`,
        [user.id_usuario]
      );

      console.log('✅ [LOGIN] Nuevo login registrado exitosamente');
    } catch (error) {
      console.error('❌ [LOGIN] Error al registrar nuevo login:', error);
    }

    // Configurar cookie
    res.setHeader('Set-Cookie', `token=${token}; HttpOnly; Path=/; Max-Age=86400; SameSite=Strict`);

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
        username: user.username || user.nombre || ''
      },
      token: token,
      estado: 'ok',
      codigo: 200
    });
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}
