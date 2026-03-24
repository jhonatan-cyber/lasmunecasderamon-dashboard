import type { NextApiRequest, NextApiResponse } from 'next';
import { query, generateUUID } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { registrarLogin, generateToken } from '@/lib/auth';
import { regenerateAttendanceCode } from '@/lib/codigoService';
import { setSecureCookie } from '@/lib/middleware/cookieUtils';
import { getSystemTimezone } from '@/lib/timezoneService';
import crypto from 'crypto';

const SYSTEM_TIMEZONE = getSystemTimezone();
const ROLES_CON_CODIGO = ['cajero', 'garzon', 'anfitriona'];
const SHIFT_START = 20 * 60;
const SHIFT_END = 23 * 60;

const getSystemDateTime = () => {
  const ahora = new Date();
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: SYSTEM_TIMEZONE, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  const parts = formatter.formatToParts(ahora);
  const getVal = (type: string) => parts.find(p => p.type === type)?.value || '0';
  const h = parseInt(getVal('hour'));
  const m = parseInt(getVal('minute'));
  return {
    hora: h, totalMinutos: h * 60 + m,
    timeString: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${parseInt(getVal('second')).toString().padStart(2, '0')}`,
    dateString: `${getVal('year')}-${getVal('month')}-${getVal('day')}`
  };
};

const persistAttendance = async (userId: number, date: string, time: string) => {
  const existing = await query('SELECT id_asistencia FROM asistencias WHERE usuario_id = ? AND fecha = ?', [userId, date]) as any[];
  if (existing.length === 0) {
    await query('INSERT INTO asistencias (id_asistencia, usuario_id, fecha, hora, estado) VALUES (?, ?, ?, ?, 1)', [
      generateUUID(), userId, date, time
    ]);
  }
};

export default async function loginHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Método no permitido' });

  const { email, password, codigo, qr_token } = req.body;
  let user: any = null;

  try {
    if (qr_token) {
      const users = await query(
        `SELECT u.*, r.nombre as rol_nombre 
                 FROM usuarios u 
                 LEFT JOIN roles r ON u.rol_id = r.id_rol 
                 WHERE u.qr_token = ? AND u.estado = 1`,
        [qr_token]
      ) as any[];

      if (users.length === 0) {
        return res.status(401).json({ success: false, message: 'Código QR no válido o expirado.' });
      }
      user = users[0];
      const newToken = crypto.randomBytes(16).toString('hex');
      await query('UPDATE usuarios SET qr_token = ? WHERE id_usuario = ?', [newToken, user.id_usuario]);
      user.qr_token = newToken;

    } else if (email && password) {
      const users = await query(
        `SELECT u.*, r.nombre as rol_nombre 
                 FROM usuarios u 
                 LEFT JOIN roles r ON u.rol_id = r.id_rol 
                 WHERE u.email = ? AND u.estado = 1`,
        [email]
      ) as any[];

      if (users.length === 0) return res.status(401).json({ success: false, message: 'Credenciales inválidas' });

      user = users[0];
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(401).json({ success: false, message: 'Contraseña incorrecta' });

    } else {
      return res.status(400).json({ success: false, message: 'Proporciones QR o credenciales' });
    }

    const { hora, totalMinutos, dateString, timeString } = getSystemDateTime();
    const rolLower = user.rol_nombre?.toLowerCase() || '';
    const esCajero = rolLower === 'cajero';
    const isShiftTime = totalMinutos >= SHIFT_START && totalMinutos <= SHIFT_END;
    const needsCodeFlow = ROLES_CON_CODIGO.includes(rolLower) && isShiftTime;
    const attendanceRes = await query('SELECT id_asistencia FROM asistencias WHERE usuario_id = ? AND fecha = ?', [user.id_usuario, dateString]) as any[];
    const alreadyHasAttendance = attendanceRes.length > 0;

    if (needsCodeFlow && !alreadyHasAttendance && !qr_token) {
      if (!codigo) {
        return res.status(200).json({
          success: false,
          requiereCodigo: true,
          message: 'Horario de ingreso detectado. Escanee el QR del Cajero o ingrese el código.',
          user: { id: user.id_usuario, email: user.email, role: user.rol_nombre }
        });
      }

      const validGlobalCode = await query('SELECT codigo FROM codigos WHERE codigo = ?', [codigo]) as any[];
      if (validGlobalCode.length === 0) {
        return res.status(401).json({ success: false, message: 'Código de verificación incorrecto.' });
      }
    }

    const token = generateToken({
      id: user.id_usuario,
      username: user.username || user.nombre,
      nick: user.nick,
      email: user.email,
      role: user.rol_nombre
    });

    setSecureCookie(req, res, 'token', token);
    await registrarLogin(user.id_usuario, (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress);

    const marksAttendance = (esCajero && hora >= 21 && hora < 23) ||
      (needsCodeFlow && (qr_token || codigo));

    if (marksAttendance) {
      await persistAttendance(user.id_usuario, dateString, timeString);
      await query('UPDATE logins SET en_local = 1 WHERE usuario_id = ? AND estado = 1', [user.id_usuario]);
      if (codigo) await regenerateAttendanceCode();
    }

    return res.status(200).json({
      success: true,
      message: 'Acceso concedido',
      token,
      user: {
        id: user.id_usuario,
        name: user.nombre,
        lastName: user.apellido,
        email: user.email,
        role: user.rol_nombre,
        foto: user.foto || 'default.png',
        qr_token: user.qr_token
      }
    });

  } catch (error) {
    console.error('[LOGIN_ERROR]', error);
    return res.status(500).json({ success: false, message: 'Error interno de acceso' });
  }
}
