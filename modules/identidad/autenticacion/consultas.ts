import { query, generateUUID } from '@/lib/database/db';
import * as argon2 from 'argon2';
import { randomBytes } from 'node:crypto';
import { generateToken } from '@/lib/auth/auth';
import { registrarLogin } from './sesionesRepositorio';
import { getSystemTimezone, getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import {
  ValidationError,
  NotFoundError,
  BusinessError,
  ConflictError,
  DatabaseError
} from '@/lib/errors/errors';
import { createEmptyPermissions, type UserPermissions } from '@/lib/middleware/auth';
import { matrixFlagsFor, toMatrixModule } from '@/lib/constants/route-permissions';
import { SecurityAlertService } from '@/modules/auditoria';
import logger from '@/lib/utils/logger';
import { regenerateAttendanceCode } from './codigos';
import { enUnaUnidad, type ContextoOperacion } from '@/lib/transaccion/contrato';
import { resolverTransaccion } from '@/lib/transaccion/infraestructura';
import { enviarWhatsApp } from '@/modules/comunicaciones';

const ROLES_CON_CODIGO = ['cajero', 'garzon', 'anfitriona'];
const SHIFT_START = 21 * 60;
const SHIFT_END = 23 * 60;

const ADMIN_PERMS: UserPermissions = {
  roles: { read: true, write: true, delete: true },
  users: { read: true, write: true, delete: true },
  sales: { read: true, write: true, delete: true, anulate: true },
  products: { read: true, write: true, delete: true },
  clients: { read: true, write: true, delete: true },
  finances: { read: true, write: true, delete: true },
  reports: { read: true, export: true },
  settings: { read: true, write: true },
  orders: { read: true, write: true, delete: true, process: true },
  advances: { read: true, write: true, delete: true, process: true },
  commissions: { read: true, write: true, delete: true },
  payroll: { read: true, write: true },
  rooms: { read: true, write: true, delete: true },
  attendance: { read: true, write: true },
  overtime: { read: true, write: true },
  tips: { read: true, write: true },
  gratificaciones: { read: true, write: true, edit: true, delete: true },
  accounts: { read: true, write: true, edit: true },
  categories: { read: true, write: true, delete: true },
  returns: { read: true, write: true, delete: true },
  dashboard: { read: true },
  private_rooms: { read: true, write: true }
};

export async function getUserPermissions(
  userId: string,
  roleId: string | number,
  roleName?: string
): Promise<UserPermissions> {
  const roleKey = (roleName?.toLowerCase() || '') as string;

  // Optimización: admin retorna defaults sin consultar DB
  if (roleKey === 'administrador') {
    return ADMIN_PERMS;
  }

  // Sin rol asignado no hay permisos que resolver: se deniega todo.
  if (!roleId) {
    return createEmptyPermissions();
  }

  try {
    const perms = await query<Array<{ module: keyof UserPermissions; action: string }>>(
      `SELECT p.module, p.action
       FROM permissions p
       INNER JOIN role_permissions rp ON p.id = rp.permission_id
       WHERE rp.role_id = ? AND p.deleted_at IS NULL`,
      [String(roleId)]
    );

    // Un rol sin filas asignadas no concede nada.
    if (!perms || perms.length === 0) {
      logger.info('[Auth] El rol no tiene permisos asignados; se deniegan todos', { roleId });
      return createEmptyPermissions();
    }

    const userPerms = createEmptyPermissions();

    // La traducción catálogo → matriz es la compartida (`lib/constants/route-permissions`):
    // la misma que usa `lib/middleware/auth` para poblar la matriz que consumen las rutas.
    perms.forEach(perm => {
      const moduleName = toMatrixModule(perm.module as string);
      const modulePerms = (userPerms as any)[moduleName];
      if (!modulePerms) return;

      for (const flag of matrixFlagsFor(modulePerms, perm.action)) {
        modulePerms[flag] = true;
      }
    });

    return userPerms;
  } catch (err) {
    logger.captureException(err, { context: 'AuthQueries:fetchPermissions' });
    // Ante un error de base tampoco se conceden permisos implícitos.
    return createEmptyPermissions();
  }
}

async function mapAuthenticatedUser(user: any) {
  const permissions = await getUserPermissions(user.id_usuario, user.rol_id, user.rol_nombre);
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
    two_factor_enabled: Boolean(user.two_factor_enabled),
    permissions
  };
}

function getSystemDateTime() {
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

/**
 * Inicio de sesión.
 *
 * Solo acepta identificador y contraseña. Antes también aceptaba `qr_token`: una
 * credencial estática y de vida larga, la misma que /api/public/users publicaba y que
 * /api/attendance/register usaba para marcar asistencia. Ese token se retiró (024), así
 * que no queda ningún camino de acceso por posesión de un token.
 */
export async function loginUser(
  creds: { email?: string; password?: string; codigo?: string },
  ip?: string,
  registrarMarca?: (
    usuarioId: string,
    fecha: string,
    hora: string,
    contexto: ContextoOperacion
  ) => Promise<void>
) {
  try {
    let user: any = null;

    if (creds.email && creds.password) {
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
      if (users.length === 0) {
        // 🔒 Alerta de seguridad: intento de login con usuario inexistente
        if (ip) {
          SecurityAlertService.checkFailedLogin(normalizedIdentifier, ip).catch(() => {});
        }
        throw new ValidationError('Credenciales inválidas');
      }
      user = users[0];
      const isMatch = await argon2.verify(user.password, creds.password);
      if (!isMatch) {
        // 🔒 Alerta de seguridad: contraseña incorrecta
        const userIdentifier = user.email || user.nick || user.id_usuario;
        if (ip) {
          const { blocked } = await SecurityAlertService.checkFailedLogin(userIdentifier, ip);
          if (blocked) {
            throw new ValidationError(
              'Cuenta bloqueada temporalmente por múltiples intentos fallidos. Intenta de nuevo más tarde.'
            );
          }
        }
        throw new ValidationError('Contraseña incorrecta');
      }
    } else {
      throw new ValidationError('Proporcione credenciales');
    }

    const { hora, totalMinutos, dateString, timeString } = getSystemDateTime();
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

    if (needsCode && !hasAsis && !isCajeroRole) {
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

    const tokenPromise = generateToken({
      id: user.id_usuario,
      username: user.username || user.nombre,
      name: user.nombre,
      lastName: user.apellido,
      nick: user.nick,
      email: user.email,
      role: user.rol_nombre
    });

    // Optimización: registrarLogin fire-and-forget (no bloqueante, tiene try/catch)
    await registrarLogin(user.id_usuario, user.rol_nombre);

    const usoTicketDelLocal = !!creds.codigo;
    const marksAsis = (isCajeroRole && needsCode) || (needsCode && usoTicketDelLocal);
    let asistenciaRegistrada = false;
    if (marksAsis && !hasAsis) {
      if (!registrarMarca)
        throw new Error('El inicio de sesión presencial requiere el coordinador de asistencia');
      await enUnaUnidad(unidad =>
        unidad.ejecutar(async contexto => {
          await registrarMarca(user.id_usuario, dateString, timeString, contexto);
          await resolverTransaccion(contexto)(
            'UPDATE logins SET en_local = 1 WHERE usuario_id = ? AND estado = 1',
            [user.id_usuario]
          );
        })
      );
      if (creds.codigo) {
        await regenerateAttendanceCode();
      }
      asistenciaRegistrada = true;
    } else if (usoTicketDelLocal && !marksAsis) {
      await query('UPDATE logins SET en_local = 1 WHERE usuario_id = ? AND estado = 1', [
        user.id_usuario
      ]);
    }

    // Optimización: await del tokenPromise + mapAuthenticatedUser en paralelo
    const [resolvedToken, mappedUser] = await Promise.all([
      tokenPromise,
      mapAuthenticatedUser(user)
    ]);

    // S7: Forzar cambio de contraseña en primer login
    const forcePasswordChange =
      user.force_password_change === 1 || user.force_password_change === '1';

    return {
      success: true,
      token: resolvedToken,
      user: { ...mappedUser, forcePasswordChange },
      asistenciaRegistrada
    };
  } catch (err) {
    logger.error('[AuthQueries] Error en loginUser:', { err });
    if (err instanceof ValidationError) throw err;
    throw new DatabaseError('Error al iniciar sesión', err);
  }
}

export async function logoutUser(userId: string) {
  try {
    await query('DELETE FROM logins WHERE usuario_id = ?', [userId]);
  } catch (err) {
    logger.error('[AuthQueries] Error en logoutUser:', { userId, err });
    throw new DatabaseError(`Error al cerrar sesión del usuario ${userId}`, err);
  }
}

export async function resetPassword(run: string) {
  try {
    const normalizedRun = run.trim();
    const users = await query<any[]>(
      `SELECT id_usuario, run, email, nick, nombre, apellido, telefono
     FROM usuarios
     WHERE estado = 1
     AND run = ?
     LIMIT 1`,
      [normalizedRun]
    );

    if (users.length === 0) throw new ValidationError('Usuario no encontrado');
    const user = users[0];
    const telefono = String(user.telefono || '').trim();
    const digitosTelefono = telefono.replace(/\D/g, '');
    if (!telefono || digitosTelefono.length < 7 || digitosTelefono.length > 15) {
      throw new ValidationError(
        'La cuenta no tiene un teléfono válido registrado. Contacta al administrador.'
      );
    }

    // El RUN solo identifica la cuenta: nunca se reutiliza como contraseña.
    const passwordTemporal = randomBytes(18).toString('base64url');
    const hashedPassword = await argon2.hash(passwordTemporal);
    try {
      await enUnaUnidad(unidad =>
        unidad.ejecutar(async contexto => {
          const trx = resolverTransaccion(contexto);
          await trx(
            'UPDATE usuarios SET password = ?, force_password_change = 1, fecha_mod = ? WHERE id_usuario = ?',
            [hashedPassword, getNowInBusinessTimezone(), user.id_usuario]
          );
          await enviarWhatsApp(
            telefono,
            `Recuperación de contraseña — Las Muñecas de Ramón. Tu clave temporal es: ${passwordTemporal}. Inicia sesión y crea una contraseña nueva. Si no solicitaste este cambio, contacta al administrador.`
          );
        })
      );
    } catch (error) {
      logger.error('[AuthQueries] No se pudo enviar la clave temporal de recuperación', {
        usuarioId: user.id_usuario,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
      throw new BusinessError('No se pudo enviar la clave temporal. Contacta al administrador.');
    }

    return {
      success: true,
      message: 'Enviamos una clave temporal a tu WhatsApp registrado. Cámbiala al ingresar.',
      user: {
        id: user.id_usuario,
        name: user.nombre,
        lastName: user.apellido,
        email: user.email,
        nick: user.nick,
        telefono: `••••${digitosTelefono.slice(-4)}`
      }
    };
  } catch (err) {
    logger.error('[AuthQueries] Error en resetPassword:', { run, err });
    if (err instanceof ValidationError || err instanceof BusinessError) throw err;
    throw new DatabaseError('Error al resetear contraseña', err);
  }
}

export async function cerrarTodasSesiones() {
  try {
    await query('DELETE FROM logins');
  } catch (err) {
    logger.error('[AuthQueries] Error en cerrarTodasSesiones:', { err });
    throw new DatabaseError('Error al cerrar todas las sesiones', err);
  }
}

export async function getAuthLogs(filters: {
  estado?: string;
  usuario_id?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
}) {
  let sql = `SELECT l.*, (CAST(u.nombre AS text) || CAST(' ' AS text) || CAST(u.apellido AS text)) as usuario_nombre, u.nick as usuario_nick, r.nombre as usuario_rol
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
  try {
    return await query(sql, params);
  } catch (err) {
    logger.error('[AuthQueries] Error en getAuthLogs:', { filters, err });
    throw new DatabaseError('Error al obtener logs de autenticación', err);
  }
}

export async function checkUsersExist() {
  try {
    const users = await query<any[]>('SELECT COUNT(*) as count FROM usuarios');
    return Number(users[0].count) > 0;
  } catch (err) {
    logger.error('[AuthQueries] Error en checkUsersExist:', { err });
    throw new DatabaseError('Error al verificar existencia de usuarios', err);
  }
}

export async function registerFirstUser(data: {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  ci: string;
}) {
  try {
    const hasUsers = await checkUsersExist();
    if (hasUsers) throw new ConflictError('Ya existen usuarios registrados');

    if (!data.password || data.password.trim().length < 8) {
      throw new ValidationError('La contraseña inicial debe tener al menos 8 caracteres');
    }

    const hashedPassword = await argon2.hash(data.password.trim());
    const id = generateUUID();

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
      `INSERT INTO usuarios (id_usuario, run, nombre, apellido, email, password, rol_id, estado, fecha_crea, estado_servicio)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, 0)`,
      [id, data.ci, data.nombre, data.apellido, data.email, hashedPassword, adminRoleId, now]
    );

    const res = await query<any[]>('SELECT * FROM usuarios WHERE id_usuario = ?', [id]);
    return { success: true, data: res[0] };
  } catch (err) {
    logger.error('[AuthQueries] Error en registerFirstUser:', { err });
    if (err instanceof ConflictError || err instanceof ValidationError) throw err;
    throw new DatabaseError('Error al registrar primer usuario', err);
  }
}

export async function checkSession(userId: string) {
  try {
    const users = await query<any[]>(
      `SELECT u.*, r.nombre as rol_nombre FROM usuarios u LEFT JOIN roles r ON u.rol_id = r.id_rol WHERE u.id_usuario = ?`,
      [userId]
    );
    if (users.length === 0) return { success: false, message: 'Usuario no encontrado' };
    const user = users[0];

    const { totalMinutos, dateString } = getSystemDateTime();
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

    if (needsCode && !hasAsis) return { success: true, debeDesconectar: true };
    return { success: true, debeDesconectar: false };
  } catch (err) {
    logger.error('[AuthQueries] Error en checkSession:', { userId, err });
    throw new DatabaseError(`Error al verificar sesión del usuario ${userId}`, err);
  }
}

export async function clearForcePasswordChange(userId: string) {
  try {
    await query(
      'UPDATE usuarios SET force_password_change = 0, fecha_mod = ? WHERE id_usuario = ?',
      [getNowInBusinessTimezone(), userId]
    );
    return { success: true };
  } catch (err) {
    logger.error('[AuthQueries] Error en clearForcePasswordChange:', { userId, err });
    throw new DatabaseError(`Error al limpiar force_password_change para usuario ${userId}`, err);
  }
}

export { getSystemDateTime };
