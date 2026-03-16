import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import jwt from 'jsonwebtoken';
import Cookies from 'cookies';
import bcrypt from 'bcryptjs';
import { setSecureCookie } from '@/lib/middleware/cookieUtils';
import { regenerateAttendanceCode } from '@/lib/codigoService';

const SYSTEM_TIMEZONE = 'America/La_Paz';

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

// Función para registrar asistencia
const registrarAsistencia = async (usuarioId: string, rol: string): Promise<void> => {
  try {
    const { timeString: horaActual, hora, minutos, dateString } = getSystemTime();
    const rolesAsistencia = ['cajero', 'garzon', 'anfitriona'];
    const rolLower = rol.toLowerCase();
    if (!rolesAsistencia.includes(rolLower)) {
      return;
    }
    // Verificar si ya existe una asistencia para hoy
    const asistenciaExistente = await query(
      'SELECT id_asistencia FROM asistencias WHERE usuario_id = ? AND fecha = ?',
      [usuarioId, dateString]
    );
    if (Array.isArray(asistenciaExistente) && asistenciaExistente.length > 0) {
      return; // Ya existe asistencia para hoy
    }
    // Determinar el estado basado en la hora
    let estado = 'presente';
    const horaActualMinutos = hora * 60 + minutos;

    // Horario de madrugada (23:00-06:00) - no registrar asistencia
    const esMadrugada = horaActualMinutos >= 23 * 60 || horaActualMinutos <= 6 * 60;
    if (esMadrugada) {
      return;
    } else if (horaActualMinutos > 20 * 60) {
      // Entre 20:00 y 23:00, es tardanza
      estado = 'tardanza';
    }
    // Solo registra usuario_id, fecha y hora
    // El estado lo pone la tabla automáticamente
    await query('INSERT INTO asistencias (usuario_id, fecha, hora) VALUES (?, ?, ?)', [
      usuarioId,
      dateString,
      horaActual
    ]);
  } catch (error) {
    console.error('Error al registrar asistencia:', error);
  }
};

// Función para registrar login - maneja estado del login
const registrarLogin = async (
  usuarioId: string,
  token: string,
  req: NextApiRequest,
  rol: string
): Promise<void> => {
  try {
    const { hora, minutos } = getSystemTime();
    const horaActual = hora * 60 + minutos;

    // Hora inicio madrugada: 23:00 (1380 minutos)
    const horaMadrugadaInicio = 23 * 60;
    // Hora fin madrugada: 06:00 (360 minutos)
    const horaMadrugadaFin = 6 * 60;
    // Hora inicio trabajo: 20:00 (1200 minutos)
    const horaTrabajoInicio = 20 * 60;
    // Hora fin trabajo: 23:00 (1380 minutos)
    const horaTrabajoFin = 23 * 60;
    // Hora inicio libre diurno: 06:00 (360 minutos)
    const horaLibreInicio = 6 * 60;
    // Hora fin libre diurno: 20:00 (1200 minutos)
    const horaLibreFin = 20 * 60;

    // Roles que requieren lógica especial de login
    const rolesEspeciales = ['anfitriona', 'garzon'];
    const rolLower = rol.toLowerCase();

    // Verificar si está en horario libre diurno (06:00-20:00) - no registrar login
    if (horaActual >= horaLibreInicio && horaActual < horaLibreFin) {
      return; // No registrar login
    }

    // Verificar si está en horario de madrugada (23:00-06:00)
    const esMadrugada = horaActual >= horaMadrugadaInicio || horaActual <= horaMadrugadaFin;

    // Verificar si está en horario de trabajo (20:00-23:00)
    const esHorarioTrabajo = horaActual >= horaTrabajoInicio && horaActual <= horaTrabajoFin;

    if (esMadrugada) {
      // En horario de madrugada, primero poner en estado 0 todos los logins anteriores del usuario
      await query('UPDATE logins SET estado = 0 WHERE usuario_id = ?', [usuarioId]);

      // Verificar si ya existe un login con estado 0
      const loginExistente = await query(
        'SELECT id_login FROM logins WHERE usuario_id = ? AND estado = 0 ORDER BY last_login DESC LIMIT 1',
        [usuarioId]
      );

      if (Array.isArray(loginExistente) && loginExistente.length > 0) {
        // Actualizar el login existente de estado 0 a 1
        const login = loginExistente[0] as any;
        await query('UPDATE logins SET estado = 1, last_login = NOW() WHERE id_login = ?', [
          login.id_login
        ]);
      } else {
        // Crear nuevo login con estado 1
        await query('INSERT INTO logins (usuario_id,last_login, estado) VALUES (?, NOW(), 1)', [
          usuarioId
        ]);
      }
    } else if (rolesEspeciales.includes(rolLower) && esHorarioTrabajo) {
      // Lógica especial para Anfitriona y Garzón en horario de trabajo (20:00-23:00)

      // Verificar si ya existe un login para hoy (activo o inactivo)
      const loginExistente = await query(
        `SELECT id_login, estado FROM logins 
         WHERE usuario_id = ? 
         AND DATE(last_login) = CURDATE() 
         AND HOUR(last_login) >= 20 
         AND HOUR(last_login) <= 23 
         ORDER BY last_login DESC LIMIT 1`,
        [usuarioId]
      );

      if (Array.isArray(loginExistente) && loginExistente.length > 0) {
        const login = loginExistente[0] as any;

        if (login.estado === 1) {
          return; // No hacer nada
        } else {
          await query('UPDATE logins SET estado = 1, last_login = NOW() WHERE id_login = ?', [
            login.id_login
          ]);
        }
      } else {
        // Poner en estado 0 todos los demás logins del usuario
        await query('UPDATE logins SET estado = 0 WHERE usuario_id = ?', [usuarioId]);

        // Crear nuevo login
        await query('INSERT INTO logins (usuario_id, estado, last_login) VALUES (?, 1, NOW())', [
          usuarioId
        ]);
      }
    } else if (horaActual > horaMadrugadaFin) {
      // Horario libre (después de 06:00), no registrar login
      return;
    } else {
      // Fuera de horario de madrugada pero antes de 06:00, crear login normal

      // Primero poner en estado 0 todos los logins anteriores del usuario
      await query('UPDATE logins SET estado = 0 WHERE usuario_id = ? ', [usuarioId]);

      // Crear nuevo login
      await query('INSERT INTO logins (usuario_id, estado, last_login) VALUES (?, 1, NOW())', [
        usuarioId
      ]);
    }
  } catch (error) {
    console.error('❌ [LOGIN] Error al registrar login:', error);
  }
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

    // Registrar login exitoso
    try {
      await registrarLogin(user.id_usuario, token, req, user.rol_nombre);
      
      // Si se requería código de verificación y se proporcionó con éxito, 
      // regeneramos el código para que sea de un solo uso.
      if (requiereCodigo && codigo) {
        await regenerateAttendanceCode();
      }
    } catch (loginError) {
      // Continuar sin registrar el login para debugging
    }

    // Registrar asistencia solo si:
    // 1. Está en horario de asistencia (20:00-23:00)
    // 2. No tiene asistencia registrada para hoy
    // 3. Se proporcionó código de verificación (si se requiere)
    // 4. NO está en horario de madrugada (23:00-06:00)
    // 5. NO está en horario libre diurno (07:00-20:00)
    const { hora, minutos } = getSystemTime();
    const horaActual = hora * 60 + minutos;

    // Hora inicio madrugada: 23:00 (1380 minutos)
    const horaMadrugadaInicio = 23 * 60;
    // Hora fin madrugada: 06:00 (360 minutos)
    const horaMadrugadaFin = 6 * 60;
    // Hora inicio libre diurno: 06:00 (360 minutos)
    const horaLibreInicio = 6 * 60;
    // Hora fin libre diurno: 20:00 (1200 minutos)
    const horaLibreFin = 20 * 60;

    // Horario de madrugada (23:00-06:00) - no registrar asistencia
    const esMadrugada = horaActual >= horaMadrugadaInicio || horaActual <= horaMadrugadaFin;
    // Horario libre diurno (06:00-20:00) - no registrar asistencia
    const esLibreDiurno = horaActual >= horaLibreInicio && horaActual < horaLibreFin;

    if (esMadrugada) {
    } else if (esLibreDiurno) {
    } else if (isHoraAsistencia()) {
      try {
        const asistenciaExistente = await query(
          'SELECT id_asistencia FROM asistencias WHERE usuario_id = ? AND fecha = CURDATE()',
          [user.id_usuario]
        );

        if (!Array.isArray(asistenciaExistente) || asistenciaExistente.length === 0) {
          await registrarAsistencia(user.id_usuario, user.rol_nombre);
        }
      } catch (error) {
        console.error('❌ [LOGIN] Error verificando/registrando asistencia:', error);
      }
    } else {
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
