import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import jwt from 'jsonwebtoken';
import Cookies from 'cookies';
import bcrypt from 'bcryptjs';
import { registrarLogin } from '@/lib/auth';
import { regenerateAttendanceCode } from '@/lib/codigoService';
import { setSecureCookie } from '@/lib/middleware/cookieUtils';
import { getSystemTimezone } from '@/lib/timezoneService';

const SYSTEM_TIMEZONE = getSystemTimezone();

const getSystemTime = () => {
  const ahora = new Date();
  const options = { timeZone: SYSTEM_TIMEZONE, hour12: false };
  const formatter = new Intl.DateTimeFormat('en-GB', {
    ...options,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric'
  });
  const parts = formatter.formatToParts(ahora);
  
  const getVal = (type: string) => parts.find(p => p.type === type)?.value || '0';
  const h = parseInt(getVal('hour'));
  const m = parseInt(getVal('minute'));
  const s = parseInt(getVal('second'));
  
  return {
    hora: h,
    minutos: m,
    segundos: s,
    timeString: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`,
    dateString: `${getVal('year')}-${getVal('month')}-${getVal('day')}`
  };
};

// Función para verificar si la hora está en el rango permitido para asistencia
const isHoraAsistencia = (): boolean => {
  const { hora, minutos } = getSystemTime();
  const horaActual = hora * 60 + minutos;

  // Hora límite: 20:00 (1200 minutos)
  const horaLimite = 20 * 60;
  // Hora máxima para tardanza: 23:00 (1380 minutos)
  const horaMaxima = 23 * 60;

  return horaActual >= horaLimite && horaActual <= horaMaxima;
};

// Función para verificar si requiere código de verificación
const requiereCodigoVerificacion = async (rol: string, usuarioId: string): Promise<boolean> => {
  const { hora, minutos } = getSystemTime();
  const horaActual = hora * 60 + minutos;

  // Hora inicio trabajo: 20:00 (1200 minutos)
  const horaInicio = 20 * 60;
  // Hora fin trabajo: 23:00 (1380 minutos)
  const horaFin = 23 * 60;
  // Hora inicio madrugada: 23:00 (1380 minutos)
  const horaMadrugadaInicio = 23 * 60;
  // Hora fin madrugada: 06:00 (360 minutos)
  const horaMadrugadaFin = 6 * 60;
  // Hora inicio libre diurno: 06:00 (360 minutos)
  const horaLibreInicio = 6 * 60;
  // Hora fin libre diurno: 20:00 (1200 minutos)
  const horaLibreFin = 20 * 60;

  // Roles que requieren código en horario específico
  const rolesConCodigo = ['cajero', 'garzon', 'anfitriona'];
  const rolLower = rol.toLowerCase();

  // Si no es un rol que requiere código, no pedir código
  if (!rolesConCodigo.includes(rolLower)) {
    return false;
  }

  // Si está en horario libre diurno (06:00-20:00), no pedir código
  if (horaActual >= horaLibreInicio && horaActual < horaLibreFin) {
    return false;
  }

  // Si está en horario de madrugada (23:00-06:00), no pedir código
  // Manejar el caso que cruza la medianoche
  const esMadrugada = horaActual >= horaMadrugadaInicio || horaActual <= horaMadrugadaFin;
  if (esMadrugada) {
    return false;
  }

  // Si está en el horario de trabajo (20:00-23:00), verificar si ya tiene asistencia registrada
  if (horaActual >= horaInicio && horaActual <= horaFin) {
    try {
      const { dateString } = getSystemTime();
      const asistenciaExistente = await query(
        'SELECT id_asistencia FROM asistencias WHERE usuario_id = ? AND fecha = ?',
        [usuarioId, dateString]
      );

      // Si ya tiene asistencia registrada, no pedir código
      if (Array.isArray(asistenciaExistente) && asistenciaExistente.length > 0) {
        return false;
      }

      // Si no tiene asistencia y está en horario, requiere código
      return true;
    } catch (error) {
      // En caso de error, pedir código por seguridad
      return true;
    }
  }

  // Si está fuera del horario de trabajo, no pedir código
  return false;
};

// Función para registrar asistencia del cajero al hacer login entre 21:00 y 23:00
const registrarAsistenciaCajero = async (usuarioId: string, dateString: string, timeString: string): Promise<void> => {
  const asistenciaExistente = await query(
    'SELECT id_asistencia FROM asistencias WHERE usuario_id = ? AND fecha = ?',
    [usuarioId, dateString]
  ) as any[];
  if (Array.isArray(asistenciaExistente) && asistenciaExistente.length > 0) return;
  await query('INSERT INTO asistencias (usuario_id, fecha, hora) VALUES (?, ?, ?)', [
    usuarioId, dateString, timeString
  ]);
};

// Función principal del handler
async function loginHandler(req: NextApiRequest, res: NextApiResponse) {
  // logs removidos

  // Validar método HTTP
  if (req.method !== 'POST') {
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
    return res
      .status(400)
      .json({ success: false, message: 'Faltan credenciales', code: 'MISSING_CREDENTIALS' });
  }

  // Validar formato de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
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

    const requiereCodigo = await requiereCodigoVerificacion(user.rol_nombre, user.id_usuario);

    if (requiereCodigo) {
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

      try {
        const codeRes = (await query('SELECT codigo FROM codigos WHERE codigo = ?', [
          codigo
        ])) as any[];

        if (Array.isArray(codeRes) && codeRes.length > 0) {
          // Código válido, continuar
        } else {
          // Código no existe
          return res.status(401).json({
            success: false,
            message: 'Código de verificación incorrecto',
            code: 'INVALID_CODE'
          });
        }
      } catch (error) {
        
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

    const clientIP = (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress || '';
    const { hora, dateString, timeString } = getSystemTime();
    const esCajero = user.rol_nombre?.toLowerCase() === 'cajero';

    // Registrar login (en_local se maneja en registrarLogin según la hora)
    await registrarLogin(user.id_usuario, clientIP);

    // Cajero entre 21:00 y 23:00 → registrar asistencia + en_local = 1
    if (esCajero && hora >= 21 && hora < 23) {
      await registrarAsistenciaCajero(user.id_usuario, dateString, timeString);
      await query('UPDATE logins SET en_local = 1 WHERE usuario_id = ? AND estado = 1', [user.id_usuario]);
    }
    // Cajero después de las 23:00 → en_local = 1 ya lo pone registrarLogin automáticamente

    if (requiereCodigo && codigo) {
      await regenerateAttendanceCode();
    }

    return res.status(200).json({
      success: true,
      message: 'Login exitoso',
      token: token, // Agregar el token al body para React Native
      user: {
        id: user.id_usuario,
        name: user.nombre || '',
        lastName: user.apellido || '',
        email: user.email,
        role: user.rol_nombre,
        foto: user.foto || 'default.png',
        status: user.estado,
        username: user.username || user.nombre || '',
        qr_token: user.qr_token
      }
    });
  } catch (error) {
  
    return res
      .status(500)
      .json({ success: false, message: 'Error interno del servidor', code: 'INTERNAL_ERROR' });
  }
}

// Exportar sin middleware para evitar problemas
export default loginHandler;
