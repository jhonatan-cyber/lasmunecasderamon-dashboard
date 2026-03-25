import { query, generateUUID } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { generateToken, registrarLogin } from '@/lib/auth';
import { getSystemTimezone } from '@/lib/timezoneService';
import crypto from 'crypto';

const ROLES_CON_CODIGO = ['cajero', 'garzon', 'anfitriona'];
const SHIFT_START = 20 * 60;
const SHIFT_END = 23 * 60;

export class AuthRepository {
  static getSystemDateTime() {
    const tz = getSystemTimezone();
    const now = new Date();
    const f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(now);
    const getV = (t: string) => f.find(p => p.type === t)?.value || '0';
    const h = parseInt(getV('hour'));
    const m = parseInt(getV('minute'));
    return {
      hora: h, totalMinutos: h * 60 + m,
      timeString: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${getV('second').padStart(2, '0')}`,
      dateString: `${getV('year')}-${getV('month')}-${getV('day')}`
    };
  }

  static async login(creds: { email?: string, password?: string, qr_token?: string, codigo?: string }, ip?: string) {
    let user: any = null;
    if (creds.qr_token) {
      const users = await query<any[]>(`SELECT u.*, r.nombre as rol_nombre FROM usuarios u LEFT JOIN roles r ON u.rol_id = r.id_rol WHERE u.qr_token = ? AND u.estado = 1`, [creds.qr_token]);
      if (users.length === 0) throw new Error('Código QR no válido o expirado');
      user = users[0];
      const nextQR = crypto.randomBytes(16).toString('hex');
      await query('UPDATE usuarios SET qr_token = ? WHERE id_usuario = ?', [nextQR, user.id_usuario]);
      user.qr_token = nextQR;
    } else if (creds.email && creds.password) {
      const users = await query<any[]>(`SELECT u.*, r.nombre as rol_nombre FROM usuarios u LEFT JOIN roles r ON u.rol_id = r.id_rol WHERE u.email = ? AND u.estado = 1`, [creds.email]);
      if (users.length === 0) throw new Error('Credenciales inválidas');
      user = users[0];
      if (!await bcrypt.compare(creds.password, user.password)) throw new Error('Contraseña incorrecta');
    } else {
      throw new Error('Proporciones QR o credenciales');
    }

    const { hora, totalMinutos, dateString, timeString } = this.getSystemDateTime();
    const rol = user.rol_nombre?.toLowerCase() || '';
    const needsCode = ROLES_CON_CODIGO.includes(rol) && (totalMinutos >= SHIFT_START && totalMinutos <= SHIFT_END);
    const hasAsis = (await query<any[]>('SELECT id_asistencia FROM asistencias WHERE usuario_id = ? AND fecha = ?', [user.id_usuario, dateString])).length > 0;

    if (needsCode && !hasAsis && !creds.qr_token) {
      if (!creds.codigo) return { requiereCodigo: true, user: { id: user.id_usuario, email: user.email, role: user.rol_nombre } };
      const valid = await query<any[]>('SELECT codigo FROM codigos WHERE codigo = ?', [creds.codigo]);
      if (valid.length === 0) throw new Error('Código de verificación incorrecto');
    }

    const token = generateToken({ 
      id: user.id_usuario, 
      username: user.username || user.nombre, 
      name: user.nombre,
      lastName: user.apellido,
      nick: user.nick, 
      email: user.email, 
      role: user.rol_nombre 
    });
    await registrarLogin(user.id_usuario, ip);

    const marksAsis = (rol === 'cajero' && hora >= 21 && hora < 23) || (needsCode && (creds.qr_token || creds.codigo));
    if (marksAsis && !hasAsis) {
      await query('INSERT INTO asistencias (id_asistencia, usuario_id, fecha, hora, estado) VALUES (?, ?, ?, ?, 1)', [generateUUID(), user.id_usuario, dateString, timeString]);
      await query('UPDATE logins SET en_local = 1 WHERE usuario_id = ? AND estado = 1', [user.id_usuario]);
      if (creds.codigo) {
        const { regenerateAttendanceCode } = await import('@/lib/codigoService');
        await regenerateAttendanceCode();
      }
    }

    return { success: true, token, user: { id: user.id_usuario, name: user.nombre, lastName: user.apellido, email: user.email, role: user.rol_nombre, qr_token: user.qr_token } };
  }

  static async logout(userId: string) {
    await query('DELETE FROM logins WHERE usuario_id = ?', [userId]);
  }

  static async cerrarSesiones() {
    await query('DELETE FROM logins');
  }

  static async getLogs(filters: { estado?: string, usuario_id?: string, fecha_inicio?: string, fecha_fin?: string }) {
    let sql = `SELECT l.*, CONCAT(u.nombre, ' ', u.apellido) as usuario_nombre, u.nick as usuario_nick, r.nombre as usuario_rol
               FROM logins l INNER JOIN usuarios u ON l.usuario_id = u.id_usuario INNER JOIN roles r ON u.rol_id = r.id_rol WHERE 1=1`;
    const params: any[] = [];
    if (filters.estado) { sql += " AND l.estado = ?"; params.push(filters.estado === 'activo' ? 1 : filters.estado === 'cerrado' ? 0 : filters.estado); }
    if (filters.usuario_id) { sql += " AND l.usuario_id = ?"; params.push(filters.usuario_id); }
    if (filters.fecha_inicio) { sql += " AND DATE(l.fecha_login) >= ?"; params.push(filters.fecha_inicio); }
    if (filters.fecha_fin) { sql += " AND DATE(l.fecha_login) <= ?"; params.push(filters.fecha_fin); }
    sql += " ORDER BY l.fecha_login DESC";
    return await query(sql, params);
  }

  static async checkUsers() {
    const users = await query<any[]>('SELECT COUNT(*) as count FROM usuarios');
    return Number(users[0].count) > 0;
  }

  static async registerFirstUser(data: { nombre: string, apellido: string, email: string, password: string }) {
    const hasUsers = await this.checkUsers();
    if (hasUsers) throw new Error('Ya existen usuarios registrados');

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const id = generateUUID();
    const adminRoleId = '3c4ae24a-700a-436d-8bb8-d44e6d45b007'; 

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    await query(`
      INSERT INTO usuarios (id_usuario, nombre, apellido, email, password, rol_id, estado, fecha_crea)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?)
    `, [id, data.nombre, data.apellido, data.email, hashedPassword, adminRoleId, now]);

    return { success: true, id };
  }

  static async checkSession(userId: string) {
    const users = await query<any[]>(`SELECT u.*, r.nombre as rol_nombre FROM usuarios u LEFT JOIN roles r ON u.rol_id = r.id_rol WHERE u.id_usuario = ?`, [userId]);
    if (users.length === 0) return { success: false, message: 'Usuario no encontrado' };
    const user = users[0];

    const { totalMinutos, dateString } = this.getSystemDateTime();
    const rol = user.rol_nombre?.toLowerCase() || '';
    const needsCode = ROLES_CON_CODIGO.includes(rol) && (totalMinutos >= SHIFT_START && totalMinutos <= SHIFT_END);
    const hasAsis = (await query<any[]>('SELECT id_asistencia FROM asistencias WHERE usuario_id = ? AND fecha = ?', [user.id_usuario, dateString])).length > 0;

    if (needsCode && !hasAsis) {
      return { success: true, debeDesconectar: true };
    }

    return { success: true, debeDesconectar: false };
  }
}
