import { query, generateUUID } from '@/lib/database/db';
import * as argon2 from 'argon2';
import { generateToken } from '@/lib/auth/auth';
import { registrarLogin } from './sesionesRepositorio';
import { crearSesion, revocarSesion, revocarTodasLasSesiones } from './sesionTokensRepositorio';
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
import { enUnaUnidad } from '@/lib/transaction/contract';
import { resolverTransaccion } from '@/lib/transaction/infrastructure';
import { randomBytes } from 'node:crypto';
import { enviarWhatsApp, enviarEmailRecuperacionContrasena } from '@/modules/comunicaciones';
import { normalizeWhatsAppPhone } from '@/lib/utils/whatsappPhone';
import { sendNotificationToAll } from '@/lib/api/sseService';

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
  private_rooms: { read: true, write: true },
  entradas: { view: true, create: true, deliver: true, authorize_cover: true },
  quinchos: { read: true, write: true, delete: true }
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
 * Solo acepta identificador y contraseña: el acceso nunca exige el código del
 * local. Registrar asistencia y quedar «en el local» (`logins.en_local`) es una
 * decisión posterior que la persona toma desde dentro del dashboard con el
 * código rotativo o los desafíos del kiosko (`/api/attendance/register`).
 *
 * Antes también aceptaba `qr_token` y obligaba al código del local en la
 * ventana del turno. El token se retiró (024) y la exigencia del código en el
 * login se repatrió al módulo de Asistencia: no queda ningún camino de acceso
 * por posesión de un token.
 */
export async function loginUser(creds: { email?: string; password?: string }, ip?: string) {
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

    // Cada inicio de sesión abre su propia fila en `sesiones`: el `sid` viaja en
    // el token y permite cerrar un dispositivo sin tocar los demás.
    const sid = await crearSesion(user.id_usuario, ip);

    const tokenPromise = generateToken(
      {
        id: user.id_usuario,
        username: user.username || user.nombre,
        name: user.nombre,
        lastName: user.apellido,
        nick: user.nick,
        email: user.email,
        role: user.rol_nombre
      },
      sid
    );

    // Optimización: registrarLogin fire-and-forget (no bloqueante, tiene try/catch)
    await registrarLogin(user.id_usuario, user.rol_nombre);

    const [resolvedToken, mappedUser] = await Promise.all([
      tokenPromise,
      mapAuthenticatedUser(user)
    ]);
    // Todo login cambia los logueados, aunque no registre asistencia presencial.
    sendNotificationToAll('presence_updated', { userId: user.id_usuario, motivo: 'login' });

    // S7: Forzar cambio de contraseña en primer login
    const forcePasswordChange =
      user.force_password_change === 1 || user.force_password_change === '1';

    return {
      success: true,
      token: resolvedToken,
      sid,
      user: { ...mappedUser, forcePasswordChange }
    };
  } catch (err) {
    logger.error('[AuthQueries] Error en loginUser:', { err });
    if (err instanceof ValidationError) throw err;
    throw new DatabaseError('Error al iniciar sesión', err);
  }
}

/**
 * Cierra la sesión del dispositivo que llama.
 *
 * Revoca sólo la fila de `sesiones` de ese token: los demás equipos del mismo
 * usuario siguen trabajando. La revocación global (cambio de rol, baja de
 * cuenta, «cerrar todas las sesiones») sigue pasando por `session_version`.
 */
export async function logoutUser(userId: string, sesionId?: string) {
  try {
    if (sesionId) await revocarSesion(sesionId);
    // La presencia sigue a las sesiones: si al usuario le quedan otras sesiones
    // vivas (otro dispositivo), su fila de `logins` se conserva.
    const [vivas] = await query<Array<{ count: number }>>(
      `SELECT COUNT(*)::int AS count FROM sesiones
       WHERE usuario_id = ? AND revocada_en IS NULL AND expira_en > now()`,
      [userId]
    );
    if (Number(vivas?.count ?? 0) === 0) {
      await query('DELETE FROM logins WHERE usuario_id = ?', [userId]);
      // Sin fila de `logins` la persona deja de estar en el local: el resto de sesiones
      // refresca contadores y selectores de personal presente.
      sendNotificationToAll('presence_updated', { userId, en_local: false });
    }
  } catch (err) {
    logger.error('[AuthQueries] Error en logoutUser:', { userId, err });
    throw new DatabaseError(`Error al cerrar sesión del usuario ${userId}`, err);
  }
}

/**
 * Roles que usan correo de recuperación como método principal.
 *
 * Barman, garzón, anfitriona y cajero reciben la clave temporal por email
 * cuando tienen `recovery_email` configurado. Si no lo tienen, no se puede
 * resetear la contraseña por este flujo (debe contactarse a un administrador).
 */
const ROLES_USAN_CORREO = new Set(['barman', 'garzon', 'anfitriona', 'cajero']);

/**
 * Mensaje único del modo automático.
 *
 * La respuesta **no puede** revelar si el RUT consultado pertenece a un
 * administrador: con mensajes distintos, una llamada pública al endpoint
 * permitiría enumerar los RUT de los administradores. Por eso el modo
 * automático devuelve siempre este texto.
 */
const MENSAJE_RESET_AUTO =
  'Si el RUT corresponde a una cuenta activa, restablecemos tu contraseña: te llega por correo de recuperación o WhatsApp según tu rol y configuración.';

/** Respuesta pública del reset: nunca dice si el RUT existe ni qué rol tiene. */
export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

/**
 * Actualiza la contraseña del usuario y cierra sesiones activas dentro de
 * una transacción. Luego envía la clave temporal por los canales indicados.
 */
async function actualizarPasswordYEnviar(
  userId: string,
  passwordTemporal: string,
  opciones: {
    enviarEmail?: boolean;
    emailDestino?: string;
    enviarWhatsApp?: boolean;
    telefono?: string;
    nick?: string;
  }
): Promise<void> {
  const hashedPassword = await argon2.hash(passwordTemporal);
  await enUnaUnidad(unidad =>
    unidad.ejecutar(async contexto => {
      const trx = resolverTransaccion(contexto);
      await trx(
        'UPDATE usuarios SET password = ?, force_password_change = 1, session_version = session_version + 1, fecha_mod = ? WHERE id_usuario = ?',
        [hashedPassword, getNowInBusinessTimezone(), userId]
      );
      await trx('DELETE FROM logins WHERE usuario_id = ?', [userId]);

      // Enviar por email si se solicita
      if (opciones.enviarEmail && opciones.emailDestino) {
        try {
          const enviado = await enviarEmailRecuperacionContrasena({
            to: opciones.emailDestino,
            passwordTemporal,
            username: opciones.nick || undefined
          });
          if (!enviado) throw new Error('Envío rechazado');
        } catch {
          throw new BusinessError(
            'No se pudo enviar el correo de recuperación. Intenta nuevamente más tarde.'
          );
        }
      }

      // Enviar por WhatsApp si se solicita
      if (opciones.enviarWhatsApp && opciones.telefono) {
        let telefono: string;
        try {
          telefono = normalizeWhatsAppPhone(opciones.telefono);
        } catch {
          return;
        }
        try {
          const enviado = await enviarWhatsApp(
            telefono,
            `*Recuperación de contraseña - Las Muñecas de Ramón*\n\nTu clave temporal es:\n${passwordTemporal}\n\nIngresa al dashboard con tu usuario habitual. Deberás cambiar esta clave al iniciar sesión. No compartas esta clave con nadie.`
          );
          if (!enviado) throw new Error('Envío rechazado');
        } catch {
          throw new BusinessError(
            'No se pudo enviar el WhatsApp de recuperación. Intenta nuevamente más tarde.'
          );
        }
      }
    })
  );
}

export async function resetPassword(
  run: string,
  modo: 'whatsapp' | 'usuarios' | 'auto' = 'auto'
): Promise<ResetPasswordResponse> {
  try {
    const normalizedRun = run.trim();

    // Modo auto: detectar el rol del RUT y aplicar el método correcto
    if (modo === 'auto') {
      const adminUsers = await query<any[]>(
        `SELECT u.id_usuario, u.run, u.telefono
       FROM usuarios u
       INNER JOIN roles r ON r.id_rol = u.rol_id
       WHERE u.estado = 1
       AND LOWER(r.nombre) = 'administrador'
       AND upper(regexp_replace(u.run, '[.\\s-]', '', 'g')) = upper(regexp_replace(?, '[.\\s-]', '', 'g'))
       LIMIT 1`,
        [normalizedRun]
      );
      const esAdministrador = adminUsers.length > 0;
      const resultado = await resetPassword(run, esAdministrador ? 'whatsapp' : 'usuarios');
      // El mensaje es el mismo en los dos casos: la respuesta no delata el rol.
      return { ...resultado, message: MENSAJE_RESET_AUTO };
    }

    if (modo === 'usuarios') {
      const respuesta = {
        success: true,
        message:
          'Si el RUT corresponde a un usuario activo, recibirá una clave temporal por correo de recuperación.'
      };
      await enUnaUnidad(unidad =>
        unidad.ejecutar(async contexto => {
          const trx = resolverTransaccion(contexto);
          const users = await trx<
            Array<{
              id_usuario: string;
              run: string;
              recovery_email: string | null;
              nick: string | null;
              rol_nombre: string;
            }>
          >(
            `SELECT u.id_usuario, u.run, u.recovery_email, u.nick, r.nombre as rol_nombre FROM usuarios u
           INNER JOIN roles r ON r.id_rol = u.rol_id
           WHERE u.estado = 1 AND LOWER(r.nombre) NOT IN ('administrador', 'admin')
             AND upper(regexp_replace(u.run, '[.\\s-]', '', 'g')) = upper(regexp_replace(?, '[.\\s-]', '', 'g'))
           LIMIT 2 FOR UPDATE OF u`,
            [normalizedRun]
          );
          // No resolver cuentas ambiguas ni exponer si existe el RUT consultado.
          if (users.length !== 1) return;
          const user = users[0];

          const rolLower = user.rol_nombre.toLowerCase();
          const esRolCorreo = ROLES_USAN_CORREO.has(rolLower);

          if (esRolCorreo) {
            // Roles de staff: usan correo como método principal.
            // Sin recovery_email no se puede resetear por este flujo.
            if (!user.recovery_email) return;
            const passwordTemporal = randomBytes(18).toString('base64url');
            await actualizarPasswordYEnviar(user.id_usuario, passwordTemporal, {
              enviarEmail: true,
              emailDestino: user.recovery_email,
              nick: user.nick || undefined
            });
            return;
          }

          // Otros roles no-admin: si tiene recovery_email, usa email; sino, contraseña = RUT.
          if (user.recovery_email) {
            const passwordTemporal = randomBytes(18).toString('base64url');
            await actualizarPasswordYEnviar(user.id_usuario, passwordTemporal, {
              enviarEmail: true,
              emailDestino: user.recovery_email,
              nick: user.nick || undefined
            });
            return;
          }

          // Sin recovery_email y no es rol de correo: contraseña = RUT (comportamiento anterior).
          const hashedPassword = await argon2.hash(user.run.trim());
          await trx(
            'UPDATE usuarios SET password = ?, force_password_change = 1, session_version = session_version + 1, fecha_mod = ? WHERE id_usuario = ?',
            [hashedPassword, getNowInBusinessTimezone(), user.id_usuario]
          );
          await trx('DELETE FROM logins WHERE usuario_id = ?', [user.id_usuario]);
        })
      );
      return respuesta;
    }

    // Modo WhatsApp (administradores): envían por email y WhatsApp cuando ambos están disponibles.
    const users = await query<
      Array<{
        id_usuario: string;
        run: string;
        telefono: string | null;
        recovery_email: string | null;
        nick: string | null;
      }>
    >(
      `SELECT u.id_usuario, u.run, u.telefono, u.recovery_email, u.nick
     FROM usuarios u
     INNER JOIN roles r ON r.id_rol = u.rol_id
     WHERE u.estado = 1
     AND LOWER(r.nombre) = 'administrador'
     AND u.run = ?
     LIMIT 1`,
      [normalizedRun]
    );

    const respuesta = {
      success: true,
      message:
        'Si el RUN/CI corresponde a un administrador, recibirá una clave temporal por correo de recuperación y WhatsApp.'
    };
    if (users.length === 0) return respuesta;
    const user = users[0];

    // Administradores: usan ambos métodos cuando están disponibles.
    const tieneEmail = !!user.recovery_email;
    const tieneTelefono = !!user.telefono;

    if (!tieneEmail && !tieneTelefono) return respuesta;

    const passwordTemporal = randomBytes(18).toString('base64url');
    await actualizarPasswordYEnviar(user.id_usuario, passwordTemporal, {
      enviarEmail: tieneEmail,
      emailDestino: user.recovery_email || undefined,
      enviarWhatsApp: tieneTelefono,
      telefono: user.telefono || undefined,
      nick: user.nick || undefined
    });

    return respuesta;
  } catch (err) {
    logger.error('[AuthQueries] Error en resetPassword:', { run, err });
    if (err instanceof ValidationError || err instanceof BusinessError) throw err;
    throw new DatabaseError('Error al resetear contraseña', err);
  }
}

export async function cerrarTodasSesiones() {
  try {
    await query('UPDATE usuarios SET session_version = session_version + 1');
    await query('DELETE FROM logins');
    await revocarTodasLasSesiones();
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

    // El login ya no exige el código del local ni la asistencia previa: la
    // sesión es válida mientras las credenciales y el token existan.
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
