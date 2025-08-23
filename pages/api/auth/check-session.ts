import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import jwt from 'jsonwebtoken';

// Función simple para verificar token
const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
  } catch (error) {
    return null;
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('🔍 [SESSION] Iniciando verificación de sesión...');
    
    // Verificar token desde header Authorization o desde cookies
    let token = req.headers.authorization?.replace('Bearer ', '');
    
    // Si no hay token en el header, intentar obtenerlo de las cookies
    if (!token) {
      const cookies = req.headers.cookie;
      if (cookies) {
        const tokenCookie = cookies.split(';').find(c => c.trim().startsWith('token='));
        if (tokenCookie) {
          token = tokenCookie.split('=')[1];
        }
      }
    }
    
    if (!token) {
      console.log('❌ [SESSION] No se encontró token');
      return res.status(401).json({ success: false, message: 'Token no proporcionado' });
    }

    console.log('🔍 [SESSION] Verificando token...');
    const decoded = verifyToken(token) as any;
    if (!decoded) {
      console.log('❌ [SESSION] Token inválido');
      return res.status(401).json({ success: false, message: 'Token inválido' });
    }

    console.log('✅ [SESSION] Token válido, datos decodificados:', { id: decoded.id, role: decoded.role });
    const userId = decoded.id;
    const userRole = decoded.role;
    const ahora = new Date();
    const hora = ahora.getHours();
    const minutos = ahora.getMinutes();
    const horaActual = hora * 60 + minutos;

    console.log(`🔍 [SESSION] Verificando sesión para usuario ${userId} (${userRole})`);
    console.log(`⏰ [SESSION] Hora actual: ${hora.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')} (${horaActual} minutos)`);

    // Roles que requieren verificación de asistencia
    const rolesConRestriccion = ['garzon', 'anfitriona'];
    const roleLower = userRole?.toLowerCase() || '';

    // Si no es un rol que requiere verificación, permitir continuar
    if (!rolesConRestriccion.includes(roleLower)) {
      console.log(`✅ [SESSION] Rol ${userRole} no requiere verificación de asistencia`);
      return res.status(200).json({
        success: true,
        debeDesconectar: false,
        message: 'Rol sin restricciones',
        hora: `${hora.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`
      });
    }

    // Hora de inicio del horario de trabajo: 20:00 (1200 minutos)
    const horaInicioTrabajo = 20 * 60;
    // Hora de fin del horario de trabajo: 23:00 (1380 minutos)
    const horaFinTrabajo = 23 * 60;
    // Hora de inicio de madrugada: 23:00 (1380 minutos)
    const horaInicioMadrugada = 23 * 60;
    // Hora de fin de madrugada: 06:00 (360 minutos)
    const horaFinMadrugada = 6 * 60;
    // Hora de inicio libre diurno: 06:00 (360 minutos)
    const horaInicioLibreDiurno = 6 * 60;
    // Hora de fin libre diurno: 20:00 (1200 minutos)
    const horaFinLibreDiurno = 20 * 60;

    console.log(`📅 [SESSION] Horario de trabajo: 20:00-23:00 (${horaInicioTrabajo}-${horaFinTrabajo} minutos)`);
    console.log(`🌙 [SESSION] Horario de madrugada: 23:00-06:00 (${horaInicioMadrugada}-${horaFinMadrugada} minutos)`);
    console.log(`☀️ [SESSION] Horario libre diurno: 06:00-20:00 (${horaInicioLibreDiurno}-${horaFinLibreDiurno} minutos)`);
    console.log(`🔍 [SESSION] ¿Es horario de trabajo? ${horaActual >= horaInicioTrabajo && horaActual <= horaFinTrabajo ? 'Sí' : 'No'}`);

    // Verificar si está en horario libre diurno (06:00-20:00) - no hay restricciones
    const esLibreDiurno = horaActual >= horaInicioLibreDiurno && horaActual < horaFinLibreDiurno;
    if (esLibreDiurno) {
      console.log(`☀️ [SESSION] Horario libre diurno (06:00-20:00), no hay restricciones`);
      return res.status(200).json({
        success: true,
        debeDesconectar: false,
        message: 'Horario libre diurno - sin restricciones',
        hora: `${hora.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`
      });
    }

    // Verificar si está en horario de madrugada (23:00-06:00) - no hay restricciones
    const esMadrugada = (horaActual >= horaInicioMadrugada) || (horaActual <= horaFinMadrugada);
    if (esMadrugada) {
      console.log(`🌙 [SESSION] Horario de madrugada (23:00-06:00), no hay restricciones`);
      return res.status(200).json({
        success: true,
        debeDesconectar: false,
        message: 'Horario de madrugada - sin restricciones',
        hora: `${hora.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`
      });
    }

    // Verificar si está en horario de trabajo (20:00-23:00)
    if (horaActual >= horaInicioTrabajo && horaActual <= horaFinTrabajo) {
      console.log(`🔍 [SESSION] En horario de trabajo, verificando situación del usuario...`);
      
      try {
        // Verificar si el usuario tiene un login registrado en horario de trabajo (>= 20:00)
        const loginTrabajo = await query(
          `SELECT id_login, HOUR(last_login) as hora_login FROM logins 
           WHERE usuario_id = ? AND estado = 1 
           AND HOUR(last_login) >= 20 
           AND DATE(last_login) = CURDATE()
           ORDER BY last_login DESC LIMIT 1`,
          [userId]
        );

        console.log(`📊 [SESSION] Resultado de consulta login:`, loginTrabajo);

        // Si NO tiene login de trabajo, significa que se conectó en horario libre
        if (!Array.isArray(loginTrabajo) || loginTrabajo.length === 0) {
          console.log(`⚠️ [SESSION] Usuario sin login de trabajo - probablemente conectado en horario libre, debe desconectarse`);
          
          return res.status(200).json({
            success: true,
            debeDesconectar: true,
            message: 'Horario de trabajo iniciado - debe reingresar con código de verificación',
            hora: `${hora.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`
          });
        }
        
        console.log(`✅ [SESSION] Usuario tiene login válido de horario de trabajo, verificando asistencia...`);
        
        // Verificar si el usuario tiene asistencia registrada para hoy
        const asistenciaExistente = await query(
          'SELECT id_asistencia FROM asistencias WHERE usuario_id = ? AND fecha = CURDATE()',
          [userId]
        );

        console.log(`📊 [SESSION] Resultado de consulta asistencia:`, asistenciaExistente);

        if (!Array.isArray(asistenciaExistente) || asistenciaExistente.length === 0) {
          // Usuario no tiene asistencia registrada, debe ser desconectado
          console.log(`🔒 [SESSION] Usuario ${userId} debe ser desconectado - No tiene asistencia registrada`);
          return res.status(200).json({
            success: true,
            debeDesconectar: true,
            message: 'Debe ingresar con código de verificación',
            hora: `${hora.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`
          });
        } else {
          // Usuario tiene asistencia registrada, puede continuar
          console.log(`✅ [SESSION] Usuario ${userId} puede continuar - Tiene asistencia registrada`);
          return res.status(200).json({
            success: true,
            debeDesconectar: false,
            message: 'Puede continuar con la sesión',
            hora: `${hora.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`
          });
        }
      } catch (dbError) {
        console.error('❌ [SESSION] Error en consulta de base de datos:', dbError);
        return res.status(500).json({
          success: false,
          message: 'Error en consulta de base de datos'
        });
      }
    } else {
      // Después de las 23:00 pero antes de las 06:00 (madrugada ya cubierta)
      console.log(`✅ [SESSION] Fuera de horarios definidos, no hay restricciones`);
      return res.status(200).json({
        success: true,
        debeDesconectar: false,
        message: 'Fuera de horarios definidos',
        hora: `${hora.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`
      });
    }
  } catch (error) {
    console.error('❌ [SESSION] Error verificando sesión:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}
