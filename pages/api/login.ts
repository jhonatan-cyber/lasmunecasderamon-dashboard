import type { NextApiRequest, NextApiResponse } from "next";
import { query } from "@/lib/db";
import jwt from "jsonwebtoken";
import Cookies from "cookies";
import bcrypt from "bcryptjs";
import { loginLimiter, withRateLimit } from "@/lib/middleware/rateLimit";
import { withSecurity, validateMethod } from "@/lib/middleware/security";
import { auditLogger } from "@/lib/logger";


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
  
  console.log('🔍 Debug - Hora actual:', hora + ':' + minutos);
  console.log('🔍 Debug - Hora en minutos:', horaActual);
  console.log('🔍 Debug - Rol original:', rol);
  console.log('🔍 Debug - Rol lowercase:', rolLower);
  console.log('🔍 Debug - Roles con código:', rolesConCodigo);
  console.log('🔍 Debug - Rol incluido:', rolesConCodigo.includes(rolLower));
  console.log('🔍 Debug - En horario:', horaActual >= horaInicio && horaActual <= horaFin);
  
  // Verificar si requiere código basado en rol y horario
  const requiereCodigo = rolesConCodigo.includes(rolLower) && 
         horaActual >= horaInicio && 
         horaActual <= horaFin;
  console.log('🔍 Debug - Requiere código:', requiereCodigo);
  
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
      "SELECT id_asistencia FROM asistencias WHERE usuario_id = ? AND fecha = CURDATE()",
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
    await query(
      "INSERT INTO asistencias (usuario_id, fecha, hora) VALUES (?, CURDATE(), ?)",
      [usuarioId, horaActual]
    );
  } catch (error) {
    console.error('Error al registrar asistencia:', error);
  }
};

// Función para registrar login - solo registra usuario_id
const registrarLogin = async (usuarioId: number, token: string, req: NextApiRequest): Promise<void> => {
  try {
    // Solo registra usuario_id
    // Los demás campos se manejan automáticamente en la tabla
    await query(
      "INSERT INTO logins (usuario_id) VALUES (?)",
      [usuarioId]
    );
  } catch (error) {
    console.error('Error al registrar login:', error);
  }
};

// Función principal del handler
async function loginHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const cookies = new Cookies(req, res);
  const clientIP = Array.isArray(req.headers['x-forwarded-for']) 
    ? req.headers['x-forwarded-for'][0] 
    : req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
  
  const { email, password, codigo } = req.body;
  
  if (!email || !password) {
    auditLogger.login(0, clientIP, false);
    return res
      .status(400)
      .json({ success: false, message: "Faltan credenciales", code: 'MISSING_CREDENTIALS' });
  }

  // Validar formato de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    auditLogger.login(0, clientIP, false);
    return res
      .status(400)
      .json({ success: false, message: "Formato de email inválido", code: 'INVALID_EMAIL_FORMAT' });
  }

  // Si viene código, validar código en la base de datos
  if (codigo !== undefined) {
    try {
      const codeRes = await query(
        "SELECT codigo FROM codigos WHERE codigo = ?",
        [codigo]
      ) as any[];
      if (!Array.isArray(codeRes) || codeRes.length === 0) {
        auditLogger.login(0, clientIP, false);
        return res
          .status(400)
          .json({ success: false, message: "Código inválido", code: 'INVALID_CODE' });
      }
    } catch (error) {
      console.error('Error al verificar código:', error);
      auditLogger.login(0, clientIP, false);
      return res
        .status(500)
        .json({ success: false, message: "Error interno del servidor", code: 'INTERNAL_ERROR' });
    }
  }

  try {
    // Buscar usuario por email con información del rol
    const users = await query(
      `SELECT u.*, r.nombre as rol_nombre 
       FROM usuarios u 
       LEFT JOIN roles r ON u.rol_id = r.id_rol 
       WHERE u.email = ? AND u.estado = 1`,
      [email]
    ) as any[];

    if (!Array.isArray(users) || users.length === 0) {
      auditLogger.login(0, clientIP, false);
      return res
        .status(401)
        .json({ success: false, message: "Credenciales inválidas", code: 'INVALID_CREDENTIALS' });
    }

    const user = users[0] as any;

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      auditLogger.login(user.id_usuario, clientIP, false);
      return res
        .status(401)
        .json({ success: false, message: "Credenciales inválidas", code: 'INVALID_CREDENTIALS' });
    }

    // Verificar si requiere código de verificación
    console.log('🔍 Debug - Rol:', user.rol_nombre);
    console.log('🔍 Debug - Requiere código:', requiereCodigoVerificacion(user.rol_nombre));
    
    // Verificar si requiere código de verificación
    if (requiereCodigoVerificacion(user.rol_nombre)) {
      console.log('🔍 Debug - Entrando en lógica de código requerido');
      console.log('🔍 Debug - Código proporcionado:', codigo);
      if (!codigo) {
        // Requiere código pero no se proporcionó
        console.log('🔍 Debug - Enviando respuesta con requiereCodigo: true');
        console.log('🔍 Debug - Datos del usuario:', {
          id: user.id_usuario,
          username: user.username,
          email: user.email,
          role: user.rol_nombre
        });
        
        auditLogger.login(user.id_usuario, clientIP, false);
        const response = {
          success: false,
          requiereCodigo: true,
          message: "Se requiere código de verificación para este horario",
          user: {
            id: user.id_usuario,
            username: user.username,
            email: user.email,
            role: user.rol_nombre
          }
        };
        console.log('🔍 Debug - Respuesta completa:', response);
        return res.status(200).json(response);
      }
      
      // Validar código si se proporcionó
      try {
        const codeRes = await query(
          "SELECT codigo FROM codigos WHERE codigo = ?",
          [codigo]
        ) as any[];
        if (Array.isArray(codeRes) && codeRes.length > 0) {
          // Código existe en la base de datos
          console.log('🔍 Debug - Código válido encontrado');
        } else {
          // Código no existe
          console.log('🔍 Debug - Código no encontrado en BD');
          auditLogger.login(user.id_usuario, clientIP, false);
          return res
            .status(401)
            .json({ success: false, message: "Código de verificación incorrecto", code: 'INVALID_CODE' });
        }
      } catch (error) {
        console.error('Error al verificar código:', error);
        auditLogger.login(user.id_usuario, clientIP, false);
        return res
          .status(500)
          .json({ success: false, message: "Error interno del servidor", code: 'INTERNAL_ERROR' });
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
      process.env.JWT_SECRET || "default_secret",
      { expiresIn: "24h" }
    );

    // Configurar cookie
    cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // 24 horas
      path: "/"
    });

    // Registrar login exitoso
    await registrarLogin(user.id_usuario, token, req);

    // Registrar asistencia si corresponde
    if (isHoraAsistencia()) {
      await registrarAsistencia(user.id_usuario, user.rol_nombre);
    }

    // Log de login exitoso
    auditLogger.login(user.id_usuario, clientIP, true);

    return res.status(200).json({
      success: true,
      message: "Login exitoso",
      user: {
        id: user.id_usuario,
        username: user.username,
        email: user.email,
        role: user.rol_nombre
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    auditLogger.error(error as Error, { action: 'LOGIN', email, clientIP });
    return res
      .status(500)
      .json({ success: false, message: "Error interno del servidor", code: 'INTERNAL_ERROR' });
  }
}

// Exportar con rate limiting y seguridad
export default withRateLimit(loginLimiter)(
  validateMethod(['POST'])(
    withSecurity(loginHandler)
  )
);
