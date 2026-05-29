import { query, generateUUID } from '@/lib/database/db';
import * as argon2 from 'argon2';
import { generateToken, registrarLogin } from '@/lib/auth/auth';
import { getSystemTimezone, getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import crypto from 'crypto';
import { ValidationError, NotFoundError, BusinessError, ConflictError } from '@/lib/errors/errors';
import type { UserPermissions } from '@/lib/middleware/auth';
import logger from '@/lib/utils/logger';

const ROLES_CON_CODIGO = ['cajero', 'garzon', 'anfitriona'];
const SHIFT_START = 21 * 60;
const SHIFT_END = 23 * 60;

export class AuthRepository {
  private static async mapAuthenticatedUser(user: any) {
    // Cargar permisos del usuario desde la DB
    const permissions = await this.getUserPermissions(
      user.id_usuario,
      user.rol_id,
      user.rol_nombre
    );

    return {
      id: user.id_usuario,
      username: user.nick || user.username || user.nombre,
      name: user.nombre,
      lastName: user.apellido,
      email: user.email,
      role: user.rol_nombre,
      foto: user.foto,
      nick: user.nick,
      phone: user.telefono,
      address: user.direccion,
      estado_civil: user.estado_civil,
      qr_token: user.qr_token,
      two_factor_enabled: Boolean(user.two_factor_enabled),
      permissions
    };
  }

  private static async getUserPermissions(
    userId: string,
    roleId: string | number,
    roleName?: string
  ): Promise<UserPermissions> {
    // Permisos por defecto según el rol
    const defaultPermissions: Record<string, UserPermissions> = {
      administrador: {
        users: { read: true, write: true, delete: true },
        sales: { read: true, write: true, delete: true, anulate: true },
        products: { read: true, write: true, delete: true },
        clients: { read: true, write: true, delete: true },
        finances: { read: true, write: true, delete: true },
        reports: { read: true, export: true },
        settings: { read: true, write: true },
        orders: { read: true, write: true, delete: true, process: true },
        advances: { read: true, write: true, delete: true, process: true }
      },
      cajero: {
        users: { read: true, write: true, delete: false },
        sales: { read: true, write: true, delete: false, anulate: false },
        products: { read: true, write: false, delete: false },
        clients: { read: true, write: true, delete: false },
        finances: { read: true, write: true, delete: false },
        reports: { read: false, export: false },
        settings: { read: false, write: false },
        orders: { read: true, write: true, delete: false, process: true },
        advances: { read: true, write: true, delete: false, process: true }
      },
      garzon: {
        users: { read: false, write: false, delete: false },
        sales: { read: false, write: false, delete: false, anulate: false },
        products: { read: false, write: false, delete: false },
        clients: { read: false, write: false, delete: false },
        finances: { read: false, write: false, delete: false },
        reports: { read: false, export: false },
        settings: { read: false, write: false },
        orders: { read: true, write: true, delete: false, process: true },
        advances: { read: true, write: true, delete: false, process: false }
      },
      anfitriona: {
        users: { read: false, write: false, delete: false },
        sales: { read: false, write: false, delete: false, anulate: false },
        products: { read: false, write: false, delete: false },
        clients: { read: false, write: false, delete: false },
        finances: { read: false, write: false, delete: false },
        reports: { read: false, export: false },
        settings: { read: false, write: false },
        orders: { read: false, write: false, delete: false, process: false },
        advances: { read: true, write: false, delete: false, process: false }
      }
    };

    // Si no hay roleId, usar permisos por defecto según el rol
    if (!roleId) {
      const roleKey = (roleName?.toLowerCase() || 'administrador') as string;
      return defaultPermissions[roleKey] || defaultPermissions.administrador;
    }

    try {
      const perms = await query<Array<{ module: keyof UserPermissions; action: string }>>(
        `SELECT p.module, p.action 
         FROM permissions p 
         INNER JOIN role_permissions rp ON p.id = rp.permission_id 
         WHERE rp.role_id = ? AND p.deleted_at IS NULL`,
        [String(roleId)]
      );

      // Si no hay permisos en la DB, usar los permisos por defecto del rol
      if (!perms || perms.length === 0) {
        const roleKey = (roleName?.toLowerCase() || 'administrador') as string;
        logger.info('[Auth] No hay permisos en DB para rol', { roleKey });
        return defaultPermissions[roleKey] || defaultPermissions.administrador;
      }

      const userPerms: UserPermissions = {
        users: { read: false, write: false, delete: false },
        sales: { read: false, write: false, delete: false, anulate: false },
        products: { read: false, write: false, delete: false },
        clients: { read: false, write: false, delete: false },
        finances: { read: false, write: false, delete: false },
        reports: { read: false, export: false },
        settings: { read: false, write: false },
        orders: { read: false, write: false, delete: false, process: false },
        advances: { read: false, write: false, delete: false, process: false }
      };

      const actionMap: Record<string, string> = {
        view: 'read',
        view_details: 'read',
        create: 'write',
        edit: 'write',
        open: 'write',
        close: 'write',
        withdraw: 'write',
        delete: 'delete',
        export: 'export',
        anulate: 'anulate',
        process: 'process'
      };

      perms.forEach(perm => {
        const mappedAction = actionMap[perm.action] || perm.action;
        let moduleName = perm.module as string;
        if (moduleName === 'cash_register' || moduleName === 'cashregister')
          moduleName = 'finances';
        if (moduleName === 'habitaciones') moduleName = 'rooms';

        if (userPerms[moduleName as keyof typeof userPerms]) {
          (userPerms as any)[moduleName][mappedAction] = true;
        }
      });

      return userPerms;
    } catch (err) {
      logger.captureException(err, { context: 'AuthRepository:fetchPermissions' });
      // En caso de error, usar permisos por defecto del rol
      const roleKey = (roleName?.toLowerCase() || 'administrador') as string;
      return defaultPermissions[roleKey] || defaultPermissions.administrador;
    }
  }

  static getSystemDateTime() {
    const now = getNowInBusinessTimezone();
    const [date, time] = now.split(' ');
    const [h, m, s] = time.split(':').map(Number);
    return {
      hora: h,
      totalMinutos: h * 60 + m,
      timeString: time,
      dateString: date
    };
  }

  static async login(
    creds: { email?: string; password?: string; qr_token?: string; codigo?: string },
    ip?: string
  ) {
    let user: any = null;
    if (creds.qr_token) {
      const users = await query<any[]>(
        `SELECT u.*, r.nombre as rol_nombre FROM usuarios u LEFT JOIN roles r ON u.rol_id = r.id_rol WHERE u.qr_token = ? AND u.estado = 1`,
        [creds.qr_token]
      );
      if (users.length === 0) throw new ValidationError('Código QR no válido o expirado');
      user = users[0];
      const nextQR = crypto.randomBytes(16).toString('hex');
      await query('UPDATE usuarios SET qr_token = ? WHERE id_usuario = ?', [
        nextQR,
        user.id_usuario
      ]);
      user.qr_token = nextQR;
    } else if (creds.email && creds.password) {
      const normalizedIdentifier = String(creds.email).trim();
      const nickIdentifier = normalizedIdentifier.includes('@')
        ? normalizedIdentifier.split('@')[0]
        : normalizedIdentifier;
      const users = await query<any[]>(
        `SELECT u.*, r.nombre as rol_nombre
         FROM usuarios u
         LEFT JOIN roles r ON u.rol_id = r.id_rol
         WHERE u.estado = 1
           AND (
             LOWER(u.email) = LOWER(?)
             OR LOWER(u.nick) = LOWER(?)
           )
         LIMIT 1`,
        [normalizedIdentifier, nickIdentifier]
      );
      if (users.length === 0) throw new ValidationError('Credenciales inválidas');
      user = users[0];
      const isMatch = await argon2.verify(user.password, creds.password);
      if (!isMatch) throw new ValidationError('Contraseña incorrecta');
    } else {
      throw new ValidationError('Proporcione QR o credenciales');
    }

    const { hora, totalMinutos, dateString, timeString } = this.getSystemDateTime();
    const rol = user.rol_nombre?.toLowerCase() || '';
    const isCajeroRole = rol === 'cajero' || rol === 'cajera';
    const needsCode =
      ROLES_CON_CODIGO.includes(rol) && totalMinutos >= SHIFT_START && totalMinutos <= SHIFT_END;
    const hasAsis =
      (
        await query<any[]>(
          'SELECT id_asistencia FROM asistencias WHERE usuario_id = ? AND fecha = ?',
          [user.id_usuario, dateString]
        )
      ).length > 0;

    if (needsCode && !hasAsis && !creds.qr_token && !isCajeroRole) {
      if (!creds.codigo)
        return {
          requiereCodigo: true,
          user: { id: user.id_usuario, email: user.email, role: user.rol_nombre }
        };
      const valid = await query<any[]>('SELECT codigo FROM codigos WHERE codigo = ?', [
        creds.codigo
      ]);
      if (valid.length === 0) throw new ValidationError('Código de verificación incorrecto');
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
    await registrarLogin(user.id_usuario);

    const usedQrOrCodigo = !!(creds.qr_token || creds.codigo);
    const marksAsis = (isCajeroRole && needsCode) || (needsCode && usedQrOrCodigo);
    let asistenciaRegistrada = false;
    if (marksAsis && !hasAsis) {
      // Dentro del horario 21:00–22:59 con QR o código: registrar asistencia
      await query(
        'INSERT INTO asistencias (id_asistencia, usuario_id, fecha, hora, estado) VALUES (?, ?, ?, ?, 1)',
        [generateUUID(), user.id_usuario, dateString, timeString]
      );
      await query('UPDATE logins SET en_local = 1 WHERE usuario_id = ? AND estado = 1', [
        user.id_usuario
      ]);
      if (creds.codigo) {
        const { regenerateAttendanceCode } = await import('@/lib/business/codigoService');
        await regenerateAttendanceCode();
      }
      asistenciaRegistrada = true;
    } else if (usedQrOrCodigo && !marksAsis) {
      // Fuera del horario de asistencia pero se usó QR o código: solo en_local = 1
      await query('UPDATE logins SET en_local = 1 WHERE usuario_id = ? AND estado = 1', [
        user.id_usuario
      ]);
    }

    return {
      success: true,
      token,
      user: await this.mapAuthenticatedUser(user),
      asistenciaRegistrada
    };
  }

  static async logout(userId: string) {
    await query('DELETE FROM logins WHERE usuario_id = ?', [userId]);
  }

  static async resetPassword(run: string) {
    const normalizedRun = run.trim();
    const users = await query<any[]>(
      `SELECT id_usuario, run, email, nick, nombre, apellido
       FROM usuarios
       WHERE estado = 1
       AND run = ?
       LIMIT 1`,
      [normalizedRun]
    );

    if (users.length === 0) {
      throw new ValidationError('Usuario no encontrado');
    }

    const user = users[0];
    if (!user.run || String(user.run).trim().length === 0) {
      throw new ValidationError('El usuario no tiene RUN registrado');
    }

    const hashedPassword = await argon2.hash(String(user.run).trim());

    await query('UPDATE usuarios SET password = ?, fecha_mod = ? WHERE id_usuario = ?', [
      hashedPassword,
      getNowInBusinessTimezone(),
      user.id_usuario
    ]);

    return {
      success: true,
      message: 'La contraseña fue reseteada correctamente',
      user: {
        id: user.id_usuario,
        name: user.nombre,
        lastName: user.apellido,
        email: user.email,
        nick: user.nick
      }
    };
  }

  static async cerrarSesiones() {
    await query('DELETE FROM logins');
  }

  static async getLogs(filters: {
    estado?: string;
    usuario_id?: string;
    fecha_inicio?: string;
    fecha_fin?: string;
  }) {
    let sql = `SELECT l.*, CONCAT(u.nombre, ' ', u.apellido) as usuario_nombre, u.nick as usuario_nick, r.nombre as usuario_rol
               FROM logins l INNER JOIN usuarios u ON l.usuario_id = u.id_usuario INNER JOIN roles r ON u.rol_id = r.id_rol WHERE 1=1`;
    const params: any[] = [];
    if (filters.estado) {
      sql += ' AND l.estado = ?';
      params.push(
        filters.estado === 'activo' ? 1 : filters.estado === 'cerrado' ? 0 : filters.estado
      );
    }
    if (filters.usuario_id) {
      sql += ' AND l.usuario_id = ?';
      params.push(filters.usuario_id);
    }
    if (filters.fecha_inicio) {
      sql += ' AND DATE(l.last_login) >= ?';
      params.push(filters.fecha_inicio);
    }
    if (filters.fecha_fin) {
      sql += ' AND DATE(l.last_login) <= ?';
      params.push(filters.fecha_fin);
    }
    sql += ' ORDER BY l.last_login DESC';
    return await query(sql, params);
  }

  static async checkUsers() {
    const users = await query<any[]>('SELECT COUNT(*) as count FROM usuarios');
    return Number(users[0].count) > 0;
  }

  static async registerFirstUser(data: {
    nombre: string;
    apellido: string;
    email: string;
    password: string;
    ci: string;
  }) {
    const hasUsers = await this.checkUsers();
    if (hasUsers) throw new ConflictError('Ya existen usuarios registrados');

    if (!data.password || data.password.trim().length < 8) {
      throw new ValidationError('La contraseña inicial debe tener al menos 8 caracteres');
    }

    const hashedPassword = await argon2.hash(data.password.trim());
    const id = generateUUID();

    // Buscar o crear rol administrador
    let adminRoleId = '';
    const roles = await query<any[]>('SELECT id_rol FROM roles WHERE nombre = ?', [
      'Administrador'
    ]);
    if (roles.length > 0) {
      adminRoleId = roles[0].id_rol;
    } else {
      adminRoleId = generateUUID();
      await query('INSERT INTO roles (id_rol, nombre, descripcion, estado) VALUES (?, ?, ?, 1)', [
        adminRoleId,
        'Administrador',
        'Admin con todos los permisos'
      ]);
    }

    const now = getNowInBusinessTimezone();

    await query(
      `
      INSERT INTO usuarios (id_usuario, run, nombre, apellido, email, password, rol_id, estado, fecha_crea, estado_servicio)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, 0)
    `,
      [id, data.ci, data.nombre, data.apellido, data.email, hashedPassword, adminRoleId, now]
    );

    const res = await query<any[]>('SELECT * FROM usuarios WHERE id_usuario = ?', [id]);
    return { success: true, data: res[0] };
  }

  static async checkSession(userId: string) {
    const users = await query<any[]>(
      `SELECT u.*, r.nombre as rol_nombre FROM usuarios u LEFT JOIN roles r ON u.rol_id = r.id_rol WHERE u.id_usuario = ?`,
      [userId]
    );
    if (users.length === 0) return { success: false, message: 'Usuario no encontrado' };
    const user = users[0];

    const { totalMinutos, dateString } = this.getSystemDateTime();
    const rol = user.rol_nombre?.toLowerCase() || '';
    const needsCode =
      ROLES_CON_CODIGO.includes(rol) && totalMinutos >= SHIFT_START && totalMinutos <= SHIFT_END;
    const hasAsis =
      (
        await query<any[]>(
          'SELECT id_asistencia FROM asistencias WHERE usuario_id = ? AND fecha = ?',
          [user.id_usuario, dateString]
        )
      ).length > 0;

    if (needsCode && !hasAsis) {
      return { success: true, debeDesconectar: true };
    }

    return { success: true, debeDesconectar: false };
  }
}
