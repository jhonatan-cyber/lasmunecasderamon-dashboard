import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import jwt from 'jsonwebtoken';
import Cookies from 'cookies';
import bcrypt from 'bcryptjs';

// Función para verificar si la hora está en el rango permitido para asistencia
const isHoraAsistencia = (): boolean => {
  const ahora = new Date();
  const hora = ahora.getHours();
  const minutos = ahora.getMinutes();
  const horaActual = hora * 60 + minutos;

  // Hora límite: 20:00 (1200 minutos)
  const horaLimite = 20 * 60;
  // Hora máxima para tardanza: 23:00 (1380 minutos)
  const horaMaxima = 23 * 60;

  return horaActual >= horaLimite && horaActual <= horaMaxima;
};

// Función para verificar si requiere código de verificación
const requiereCodigoVerificacion = (rol: string): boolean => {
  const ahora = new Date();
  const hora = ahora.getHours();
  const minutos = ahora.getMinutes();
  const horaActual = hora * 60 + minutos;

  // Hora inicio: 20:00 (1200 minutos)
  const horaInicio = 20 * 60;
  // Hora fin: 23:00 (1380 minutos)
  const horaFin = 23 * 60;

  // Roles que requieren código en horario específico
  const rolesConCodigo = ['cajero', 'garzon', 'anfitriona'];
  const rolLower = rol.toLowerCase();

  // Verificar si requiere código basado en rol y horario
  const requiereCodigo =
    rolesConCodigo.includes(rolLower) && horaActual >= horaInicio && horaActual <= horaFin;

  return requiereCodigo;
};

// Función para registrar asistencia
const registrarAsistencia = async (usuarioId: number, rol: string): Promise<void> => {
  try {
    const ahora = new Date();
    const horaActual = ahora.toTimeString().slice(0, 8);
    const rolesAsistencia = ['cajero', 'garzon', 'anfitriona'];
    const rolLower = rol.toLowerCase();
    if (!rolesAsistencia.includes(rolLower)) {
      return;
    }
    // Verificar si ya existe una asistencia para hoy
    const asistenciaExistente = await query(
      'SELECT id_asistencia FROM asistencias WHERE usuario_id = ? AND fecha = CURDATE()',
      [usuarioId]
    );
    if (Array.isArray(asistenciaExistente) && asistenciaExistente.length > 0) {
      return; // Ya existe asistencia para hoy
    }
    // Determinar el estado basado en la hora
    let estado = 'presente';
    const hora = ahora.getHours();
    const minutos = ahora.getMinutes();
    const horaActualMinutos = hora * 60 + minutos;
    if (horaActualMinutos > 23 * 60) {
      // Después de las 23:00, no registrar asistencia
      return;
    } else if (horaActualMinutos > 20 * 60) {
      // Entre 20:00 y 23:00, es tardanza
      estado = 'tardanza';
    }
    // Solo registra usuario_id, fecha y hora
    // El estado lo pone la tabla automáticamente
    await query('INSERT INTO asistencias (usuario_id, fecha, hora) VALUES (?, CURDATE(), ?)', [
      usuarioId,
      horaActual
    ]);
  } catch (error) {
    console.error('Error al registrar asistencia:', error);
  }
};

// Función para registrar login - solo registra usuario_id
const registrarLogin = async (
  usuarioId: number,
  token: string,
  req: NextApiRequest
): Promise<void> => {
  try {
    // Solo registra usuario_id
    // Los demás campos se manejan automáticamente en la tabla
    await query('INSERT INTO logins (usuario_id) VALUES (?)', [usuarioId]);
  } catch (error) {
    console.error('Error al registrar login:', error);
  }
};

// Función principal del handler
async function loginHandler(req: NextApiRequest, res: NextApiResponse) {
  console.log('🚀 Login handler started');
  console.log('📊 Request method:', req.method);
  console.log('📊 Request headers:', req.headers);
  
  // Validar método HTTP
  if (req.method !== 'POST') {
    console.log('❌ Invalid method:', req.method);
    return res.status(405).json({ 
      message: 'Method not allowed',
      allowedMethods: ['POST']
    });
  }

  console.log('✅ Method validation passed');

  const cookies = new Cookies(req, res);
  const clientIP = Array.isArray(req.headers['x-forwarded-for'])
    ? req.headers['x-forwarded-for'][0]
    : req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';

  console.log('📊 Client IP:', clientIP);

  const { email, password, codigo } = req.body;
  console.log('📊 Request body received:', { 
    email: email ? 'provided' : 'missing', 
    password: password ? 'provided' : 'missing',
    codigo: codigo ? 'provided' : 'missing'
  });

  if (!email || !password) {
    console.log('❌ Missing credentials');
    return res
      .status(400)
      .json({ success: false, message: 'Faltan credenciales', code: 'MISSING_CREDENTIALS' });
  }

  console.log('✅ Credentials validation passed');

  // Validar formato de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.log('❌ Invalid email format:', email);
    return res
      .status(400)
      .json({ success: false, message: 'Formato de email inválido', code: 'INVALID_EMAIL_FORMAT' });
  }

  console.log('✅ Email format validation passed');

  // Si viene código, validar código en la base de datos
  if (codigo !== undefined) {
    console.log('🔍 Validating code:', codigo);
    try {
      const codeRes = (await query('SELECT codigo FROM codigos WHERE codigo = ?', [
        codigo
      ])) as any[];
      if (!Array.isArray(codeRes) || codeRes.length === 0) {
        console.log('❌ Invalid code provided');
        return res
          .status(400)
          .json({ success: false, message: 'Código inválido', code: 'INVALID_CODE' });
      }
      console.log('✅ Code validation passed');
    } catch (error) {
      console.error('❌ Error validating code:', error);
      return res
        .status(500)
        .json({ success: false, message: 'Error interno del servidor', code: 'INTERNAL_ERROR' });
    }
  }

  try {
    console.log('🔍 Searching for user in database...');
    // Buscar usuario por email con información del rol
    const users = (await query(
      `SELECT u.*, r.nombre as rol_nombre 
       FROM usuarios u 
       LEFT JOIN roles r ON u.rol_id = r.id_rol 
       WHERE u.email = ? AND u.estado = 1`,
      [email]
    )) as any[];

    console.log('📊 Database query completed');
    console.log('📊 Users found:', Array.isArray(users) ? users.length : 'Not an array');

    if (!Array.isArray(users) || users.length === 0) {
      console.log('❌ No user found with email:', email);
      return res
        .status(401)
        .json({ success: false, message: 'Credenciales inválidas', code: 'INVALID_CREDENTIALS' });
    }

    const user = users[0] as any;
    console.log('✅ User found:', { id: user.id_usuario, email: user.email, role: user.rol_nombre });

    // Verificar contraseña
    console.log('🔍 Verifying password...');
    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log('📊 Password verification result:', isValidPassword);
    
    if (!isValidPassword) {
      console.log('❌ Invalid password for user:', user.id_usuario);
      return res
        .status(401)
        .json({ success: false, message: 'Credenciales inválidas', code: 'INVALID_CREDENTIALS' });
    }

    console.log('✅ Password verification passed');

    if (requiereCodigoVerificacion(user.rol_nombre)) {
      console.log('🔍 Role requires verification code:', user.rol_nombre);
      if (!codigo) {
        console.log('❌ Code required but not provided');
        const response = {
          success: false,
          requiereCodigo: true,
          message: 'Se requiere código de verificación para este horario',
          user: {
            id: user.id_usuario,
            username: user.username,
            email: user.email,
            role: user.rol_nombre
          }
        };

        return res.status(200).json(response);
      }

      // Validar código si se proporcionó
      console.log('🔍 Validating provided code...');
      try {
        const codeRes = (await query('SELECT codigo FROM codigos WHERE codigo = ?', [
          codigo
        ])) as any[];
        if (Array.isArray(codeRes) && codeRes.length > 0) {
          console.log('✅ Code validation passed');
          // Código válido, continuar
        } else {
          console.log('❌ Invalid code provided');
          // Código no existe
          return res
            .status(401)
            .json({
              success: false,
              message: 'Código de verificación incorrecto',
              code: 'INVALID_CODE'
            });
        }
      } catch (error) {
        console.error('❌ Error validating code:', error);
        return res
          .status(500)
          .json({ success: false, message: 'Error interno del servidor', code: 'INTERNAL_ERROR' });
      }
    }

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
    
    // Detectar si estamos en HTTPS
    const isHttps = req.headers['x-forwarded-proto'] === 'https' || 
                    req.headers['x-forwarded-proto'] === 'https' ||
                    process.env.NODE_ENV === 'production';
    
    console.log('📊 HTTPS detection:', {
      xForwardedProto: req.headers['x-forwarded-proto'],
      nodeEnv: process.env.NODE_ENV,
      isHttps: isHttps
    });
    
    cookies.set('token', token, {
      httpOnly: true,
      secure: isHttps, // Solo usar secure si estamos en HTTPS
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 horas
      path: '/'
    });

    console.log('✅ Cookie set successfully');

    // Registrar login exitoso
    console.log('🔍 Recording login in database...');
    await registrarLogin(user.id_usuario, token, req);
    console.log('✅ Login recorded successfully');

    // Registrar asistencia si corresponde
    if (isHoraAsistencia()) {
      console.log('🔍 Recording attendance...');
      await registrarAsistencia(user.id_usuario, user.rol_nombre);
      console.log('✅ Attendance recorded successfully');
    }

    console.log('🎉 Login process completed successfully');
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
    console.error('❌ Error in login process:', error);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    return res
      .status(500)
      .json({ success: false, message: 'Error interno del servidor', code: 'INTERNAL_ERROR' });
  }
}

// Exportar sin middleware para evitar problemas
export default loginHandler;
