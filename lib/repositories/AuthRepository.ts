import { query, generateUUID } from '@/lib/database/db';
import * as argon2 from 'argon2';
import { generateToken, registrarLogin } from '@/lib/auth/auth';
import { getSystemTimezone, getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import crypto from 'crypto';

const ROLES_CON_CODIGO = ['cajero', 'garzon', 'anfitriona'];
const SHIFT_START = 20 * 60;
const SHIFT_END = 23 * 60;

export class AuthRepository {
  static getSystemDateTime() {
    const now = getNowInBusinessTimezone();
    const [date, time] = now.split(' ');
    const [h, m, s] = time.split(':').map(Number);
    return {
      hora: h, totalMinutos: h * 60 + m,
      timeString: time,
      dateString: date
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
      const isMatch = await argon2.verify(user.password, creds.password);
      if (!isMatch) throw new Error('Contraseña incorrecta');
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
        const { regenerateAttendanceCode } = await import('@/lib/business/codigoService');
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

  static async registerFirstUser(data: { nombre: string, apellido: string, email: string, password: string, ci: string }) {
    const hasUsers = await this.checkUsers();
    if (hasUsers) throw new Error('Ya existen usuarios registrados');

    const hashedPassword = await argon2.hash(data.ci);
    const id = generateUUID();

    // Buscar o crear rol administrador
    let adminRoleId = '';
    const roles = await query<any[]>('SELECT id_rol FROM roles WHERE nombre = ?', ['Administrador']);
    if (roles.length > 0) {
      adminRoleId = roles[0].id_rol;
    } else {
      adminRoleId = generateUUID();
      await query('INSERT INTO roles (id_rol, nombre, descripcion, estado) VALUES (?, ?, ?, 1)',
        [adminRoleId, 'Administrador', 'Admin con todos los permisos']);
    }

    const now = getNowInBusinessTimezone();

    await query(`
      INSERT INTO usuarios (id_usuario, run, nombre, apellido, email, password, rol_id, estado, fecha_crea, estado_servicio)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, 0)
    `, [id, data.ci, data.nombre, data.apellido, data.email, hashedPassword, adminRoleId, now]);

    const res = await query<any[]>('SELECT * FROM usuarios WHERE id_usuario = ?', [id]);
    return { success: true, data: res[0] };
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
