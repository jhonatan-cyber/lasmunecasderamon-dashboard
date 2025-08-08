import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import jwt from 'jsonwebtoken';
import Cookies from 'cookies';
import bcrypt from 'bcryptjs';
import { setSecureCookie } from '@/lib/middleware/cookieUtils';

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
  // logs removidos
  
  // Validar método HTTP
  if (req.method !== 'POST') {
    console.log('❌ Invalid method:', req.method);
    return res.status(405).json({ 
      message: 'Method not allowed',
      allowedMethods: ['POST']
    });
  }

  

  const cookies = new Cookies(req, res);
  const clientIP = Array.isArray(req.headers['x-forwarded-for'])
    ? req.headers['x-forwarded-for'][0]
    : req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';

  

  const { email, password, codigo } = req.body;
  

  if (!email || !password) {
    console.log('❌ Missing credentials');
    return res
      .status(400)
      .json({ success: false, message: 'Faltan credenciales', code: 'MISSING_CREDENTIALS' });
  }

  

  // Validar formato de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.log('❌ Invalid email format:', email);
    return res
      .status(400)
      .json({ success: false, message: 'Formato de email inválido', code: 'INVALID_EMAIL_FORMAT' });
  }

  

  // Si viene código, validar código en la base de datos
  if (codigo !== undefined) {
    
    try {
      const codeRes = (await query('SELECT codigo FROM codigos WHERE codigo = ?', [
        codigo
      ])) as any[];
      if (!Array.isArray(codeRes) || codeRes.length === 0) {
        
        return res
          .status(400)
          .json({ success: false, message: 'Código inválido', code: 'INVALID_CODE' });
      }
       
    } catch (error) {
      console.error('❌ Error validating code:', error);
      return res
        .status(500)
        .json({ success: false, message: 'Error interno del servidor', code: 'INTERNAL_ERROR' });
    }
  }

  try {
    
    // Buscar usuario por email con información del rol
    const users = (await query(
      `SELECT u.*, r.nombre as rol_nombre 
       FROM usuarios u 
       LEFT JOIN roles r ON u.rol_id = r.id_rol 
       WHERE u.email = ? AND u.estado = 1`,
      [email]
    )) as any[];

    

    if (!Array.isArray(users) || users.length === 0) {
      
      return res
        .status(401)
        .json({ success: false, message: 'Credenciales inválidas', code: 'INVALID_CREDENTIALS' });
    }

    const user = users[0] as any;
    

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      
      return res
        .status(401)
        .json({ success: false, message: 'Credenciales inválidas', code: 'INVALID_CREDENTIALS' });
    }

    

    if (requiereCodigoVerificacion(user.rol_nombre)) {
      
      if (!codigo) {
        
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
          
          // Código válido, continuar
        } else {
          
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

    

    // Configurar cookie usando las nuevas utilidades
    const cookieSet = setSecureCookie(req, res, 'token', token);

    // Registrar login exitoso
    try {
      await registrarLogin(user.id_usuario, token, req);
    } catch (loginError) {
      
      // Continuar sin registrar el login para debugging
    }

    // Registrar asistencia si corresponde
    if (isHoraAsistencia()) {
      await registrarAsistencia(user.id_usuario, user.rol_nombre);
    }

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
    console.error('Error en login:', error);
    return res
      .status(500)
      .json({ success: false, message: 'Error interno del servidor', code: 'INTERNAL_ERROR' });
  }
}

// Exportar sin middleware para evitar problemas
export default loginHandler;
