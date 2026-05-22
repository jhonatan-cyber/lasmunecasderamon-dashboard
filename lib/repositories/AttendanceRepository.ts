import { query, rawQuery, generateUUID } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { AttendanceRegisterSchema } from '@/lib/business/schemas';
import { BaseRepository } from './BaseRepository';
import logger from '../utils/logger';
import { ValidationError } from '@/lib/errors/errors';
import { z } from 'zod';

type AttendanceRegisterInput = z.input<typeof AttendanceRegisterSchema>;

export class AttendanceRepository {
  static async getSummary() {
    const sql = `
     SELECT
        U.id_usuario, U.nick, CONCAT(U.nombre, ' ', U.apellido) AS nombre_completo,
        U.foto AS usuario_foto,
        R.nombre AS rol,
COALESCE(ASIS.total_asistencias, 0) AS total_asistencias,
         COALESCE(ASIS.total_asistencias, 0) * COALESCE(U.sueldo, 0) AS sueldo_total,
         COALESCE(ASIS.total_asistencias, 0) * COALESCE(U.aporte, 0) AS aporte_total,
         COALESCE(SEM.semanas, 0) * COALESCE(U.descuento, 0) AS descuento_total,
         (COALESCE(ASIS.total_asistencias, 0) * COALESCE(U.sueldo, 0)) -
         (COALESCE(ASIS.total_asistencias, 0) * COALESCE(U.aporte, 0)) -
         (COALESCE(SEM.semanas, 0) * COALESCE(U.descuento, 0)) AS total_final
       FROM usuarios U
       INNER JOIN roles R ON U.rol_id = R.id_rol
LEFT JOIN (SELECT usuario_id, COUNT(*) AS total_asistencias FROM asistencias WHERE estado = 1 GROUP BY usuario_id) AS ASIS ON ASIS.usuario_id = U.id_usuario
      LEFT JOIN (SELECT usuario_id, COUNT(DISTINCT YEARWEEK(fecha, 1)) AS semanas FROM asistencias WHERE estado = 1 AND DAYOFWEEK(fecha) IN (3,4,5,6,7,1) GROUP BY usuario_id) AS SEM ON SEM.usuario_id = U.id_usuario
       WHERE COALESCE(ASIS.total_asistencias, 0) > 0
      ORDER BY nombre_completo;
    `;
    return await rawQuery(sql);
  }

  static async getStats() {
    const bizNow = getNowInBusinessTimezone();
    const fechaHoy = bizNow.substring(0, 10);
    const cajaRes = await query<any[]>(
      'SELECT id_caja, fecha_apertura, fecha_cierre FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1'
    );
    const caja = cajaRes[0];

    const totalUsuariosRes = await query<any[]>(
      "SELECT COUNT(*) as total FROM usuarios u INNER JOIN roles r ON r.id_rol = u.rol_id WHERE r.nombre != 'administrador' AND u.estado = 1"
    );
    const totalUsuarios = Number(totalUsuariosRes[0]?.total || 0);

    const asistenciasHoy = await query<any[]>(
      'SELECT DISTINCT usuario_id FROM asistencias WHERE fecha = ? AND estado = 1',
      [fechaHoy]
    );
    const presentesHoy = asistenciasHoy.length;

    let stats = {
      presentes: presentesHoy,
      ausentes: totalUsuarios - presentesHoy,
      porcentajeAsistencia:
        totalUsuarios > 0 ? Math.round((presentesHoy / totalUsuarios) * 100) : 0,
      fechaApertura: fechaHoy,
      fechaCierre: fechaHoy
    };

    if (caja) {
      const perCaja = await query<any[]>(
        'SELECT DISTINCT usuario_id FROM asistencias WHERE fecha >= ? AND (fecha <= ? OR ? IS NULL) AND estado = 1',
        [caja.fecha_apertura, caja.fecha_cierre, caja.fecha_cierre]
      );
      if (presentesHoy === 0 && perCaja.length > 0) {
        stats = {
          presentes: perCaja.length,
          ausentes: totalUsuarios - perCaja.length,
          porcentajeAsistencia:
            totalUsuarios > 0 ? Math.round((perCaja.length / totalUsuarios) * 100) : 0,
          fechaApertura: caja.fecha_apertura,
          fechaCierre: caja.fecha_cierre || fechaHoy
        };
      }
    }

    return { total: totalUsuarios, ...stats };
  }

  static async register(body: AttendanceRegisterInput, currentUser?: { id: string }, ip?: string) {
    const { qrData } = AttendanceRegisterSchema.parse(body);
    let targetUser: any = null;
    let isSystemCode = false;

    if (qrData.length <= 4) {
      const codes = await query<any[]>(
        'SELECT codigo FROM codigos WHERE estado = 1 AND codigo = ? LIMIT 1',
        [qrData]
      );

      if (codes.length === 0) {
        throw new ValidationError('Codigo invalido, expirado o ya utilizado');
      }

      if (!currentUser) {
        throw new ValidationError('Codigo invalido, expirado o ya utilizado');
      }

      const logged = await query<any[]>(
        'SELECT id_usuario, nombre, apellido FROM usuarios WHERE id_usuario = ? AND estado = 1',
        [currentUser.id]
      );
      if (logged.length > 0) {
        targetUser = logged[0];
        isSystemCode = true;
      } else {
        throw new ValidationError('Codigo invalido, expirado o ya utilizado');
      }
    } else {
      const users = await query<any[]>(
        'SELECT id_usuario, nombre, apellido FROM usuarios WHERE qr_token = ? AND estado = 1',
        [qrData]
      );
      if (users.length > 0) {
        targetUser = users[0];
      } else {
        throw new ValidationError('Codigo invalido, expirado o ya utilizado');
      }
    }

    if (!targetUser) throw new ValidationError('Codigo invalido, expirado o ya utilizado');

    const nowStr = getNowInBusinessTimezone();
    const hour = parseInt(nowStr.substring(11, 13), 10);
    const fechaHoy = nowStr.substring(0, 10);
    const ipLimpia = ip?.split(',')[0].trim() || null;

    const existing = await query<any[]>(
      'SELECT id_asistencia FROM asistencias WHERE usuario_id = ? AND fecha = ?',
      [targetUser.id_usuario, fechaHoy]
    );
    const alreadyRegistered = existing.length > 0;

    // Si ya tiene asistencia hoy, solo actualizar en_local
    if (alreadyRegistered) {
      await BaseRepository.update(query, 'logins', 'usuario_id', targetUser.id_usuario, {
        en_local: 1,
        ...(ipLimpia && { ip_address: ipLimpia })
      });
      return {
        success: true,
        alreadyRegistered: true,
        message: 'Ya tienes asistencias registrada hoy. Ubicacion actualizada.'
      };
    }

    // Fuera del horario de asistencia (21:00–22:59): solo en_local = 1, sin registrar asistencia
    if (hour < 21 || hour >= 23) {
      await BaseRepository.update(query, 'logins', 'usuario_id', targetUser.id_usuario, {
        en_local: 1,
        ...(ipLimpia && { ip_address: ipLimpia })
      });
      return {
        success: true,
        tipo: 'login',
        message: 'Ubicación registrada en el local.'
      };
    }

    // Hora válida para asistencia: entre 21:00 y 22:59
    const timeStr = nowStr.substring(11, 19);
    const id = generateUUID();
    await BaseRepository.insert(query, 'asistencias', {
      id_asistencia: id,
      usuario_id: targetUser.id_usuario,
      fecha: fechaHoy,
      hora: timeStr,
      estado: 1
    });

    await BaseRepository.update(query, 'logins', 'usuario_id', targetUser.id_usuario, {
      en_local: 1,
      ...(ipLimpia && { ip_address: ipLimpia })
    });

    if (isSystemCode) {
      setTimeout(async () => {
        try {
          const { regenerateAttendanceCode } = await import('@/lib/business/codigoService');
          await regenerateAttendanceCode();
        } catch (e) {
          logger.error('Error al regenerar codigo de asistencia', e);
        }
      }, 100);
    }

    return {
      success: true,
      message: `Tu asistencia ha sido registrada`,
      user: { id: targetUser.id_usuario, nombre: targetUser.nombre, apellido: targetUser.apellido }
    };
  }

  static async getByUser(userId: string, tipo?: string, startDate?: string, endDate?: string) {
    if (tipo === 'detalle') {
      let sql = `
        SELECT
          A.id_asistencia, A.usuario_id, A.fecha, A.hora, A.fecha_pago,
          A.estado,
          U.sueldo, U.aporte, U.descuento,
          (U.sueldo - U.aporte) AS total,
          (
            SELECT COUNT(DISTINCT YEARWEEK(A2.fecha, 1))
            FROM asistencias A2
            WHERE A2.usuario_id = A.usuario_id
              AND A2.estado = 1
              AND DAYOFWEEK(A2.fecha) IN (3,4,5,6,7,1)
          ) AS semanas_con_descuento,
          (
            SELECT COUNT(DISTINCT YEARWEEK(A2.fecha, 1))
            FROM asistencias A2
            WHERE A2.usuario_id = A.usuario_id
              AND A2.estado = 1
              AND DAYOFWEEK(A2.fecha) IN (3,4,5,6,7,1)
          ) * COALESCE(U.descuento, 0) AS descuento_total,
          (U.sueldo - U.aporte) - (
            (
              SELECT COUNT(DISTINCT YEARWEEK(A2.fecha, 1))
              FROM asistencias A2
              WHERE A2.usuario_id = A.usuario_id
                AND A2.estado = 1
                AND DAYOFWEEK(A2.fecha) IN (3,4,5,6,7,1)
            ) * COALESCE(U.descuento, 0) / GREATEST((SELECT COUNT(*) FROM asistencias A3 WHERE A3.usuario_id = A.usuario_id AND A3.estado = 1), 1)
          ) AS total_final
        FROM asistencias A
        INNER JOIN usuarios U ON U.id_usuario = A.usuario_id
        WHERE A.usuario_id = ?
      `;
      const params: any[] = [userId];
      if (startDate && endDate) {
        sql += ' AND DATE(A.fecha) BETWEEN ? AND ?';
        params.push(startDate, endDate);
      }
      sql += ' ORDER BY A.fecha DESC, A.hora DESC';
      return await query(sql, params);
    }

    const sql = `
      SELECT
        U.id_usuario, U.nick, CONCAT(U.nombre, ' ', U.apellido) AS nombre_completo,
        COALESCE((SELECT COUNT(*) FROM asistencias A WHERE A.estado = 1 AND A.usuario_id = U.id_usuario), 0) AS total_asistencias,
        COALESCE((SELECT COUNT(*) FROM asistencias A WHERE A.estado = 1 AND A.usuario_id = U.id_usuario), 0) * COALESCE(U.sueldo, 0) AS sueldo_total,
        COALESCE((SELECT COUNT(*) FROM asistencias A WHERE A.estado = 1 AND A.usuario_id = U.id_usuario), 0) * COALESCE(U.aporte, 0) AS aporte_total,
        COALESCE((SELECT COUNT(DISTINCT YEARWEEK(A.fecha, 1)) FROM asistencias A WHERE A.estado = 1 AND A.usuario_id = U.id_usuario AND DAYOFWEEK(A.fecha) IN (3,4,5,6,7,1)), 0) * COALESCE(U.descuento, 0) AS descuento_total,
        (COALESCE((SELECT COUNT(*) FROM asistencias A WHERE A.estado = 1 AND A.usuario_id = U.id_usuario), 0) * COALESCE(U.sueldo, 0)) -
        (COALESCE((SELECT COUNT(*) FROM asistencias A WHERE A.estado = 1 AND A.usuario_id = U.id_usuario), 0) * COALESCE(U.aporte, 0)) -
        (COALESCE((SELECT COUNT(DISTINCT YEARWEEK(A.fecha, 1)) FROM asistencias A WHERE A.estado = 1 AND A.usuario_id = U.id_usuario AND DAYOFWEEK(A.fecha) IN (3,4,5,6,7,1)), 0) * COALESCE(U.descuento, 0)) AS total_final
      FROM usuarios U
      WHERE U.id_usuario = ?
    `;
    return await query(sql, [userId]);
  }

  static async getHoy() {
    const fechaHoy = getNowInBusinessTimezone().substring(0, 10);
    return await query(
      `
      SELECT
        A.id_asistencia, A.fecha, A.hora,
        U.id_usuario, U.nick, CONCAT(U.nombre, ' ', U.apellido) as nombre_completo,
        R.nombre as rol
      FROM asistencias A
      INNER JOIN usuarios U ON A.usuario_id = U.id_usuario
      INNER JOIN roles R ON U.rol_id = R.id_rol
      WHERE A.fecha = ? AND A.estado = 1
      ORDER BY A.hora DESC
    `,
      [fechaHoy]
    );
  }

  static async getByDates(userId: string, dates: string[]) {
    if (dates.length === 0) return [];
    return await query(
      `
      SELECT * FROM asistencias
      WHERE usuario_id = ? AND DATE(fecha) IN (?)
      ORDER BY fecha DESC
    `,
      [userId, dates]
    );
  }

  static async registerManual(
    usuarioId: string,
    fecha: string,
    hora: string,
    estado: string,
    currentUser?: any
  ) {
    // Verificar si ya existe asistencia para ese usuario en esa fecha
    const existing = await query<any[]>(
      'SELECT id_asistencia FROM asistencias WHERE usuario_id = ? AND fecha = ?',
      [usuarioId, fecha]
    );

    if (existing.length > 0) {
      return {
        success: false,
        message: 'Ya existe una asistencia registrada para este usuario en esa fecha'
      };
    }

    // Obtener datos del usuario para sueldo y aporte
    const user = await query<any[]>('SELECT sueldo, aporte FROM usuarios WHERE id_usuario = ?', [
      usuarioId
    ]);

    if (user.length === 0) {
      return {
        success: false,
        message: 'Usuario no encontrado'
      };
    }

    const id = generateUUID();
    // Solo presente y tardanza cuentan como asistencia (estado=1), ausente no (estado=0)
    const estadoNumerico = estado === 'presente' || estado === 'tardanza' ? 1 : 0;

    await BaseRepository.insert(query, 'asistencias', {
      id_asistencia: id,
      usuario_id: usuarioId,
      fecha: fecha,
      hora: hora,
      estado: estadoNumerico
    });

    return {
      success: true,
      message: 'Asistencia registrada manualmente'
    };
  }

  static async selfRegister(currentUser: { id: string }, ip?: string) {
    const nowStr = getNowInBusinessTimezone();
    const hour = parseInt(nowStr.substring(11, 13), 10);
    const fechaHoy = nowStr.substring(0, 10);
    const ipLimpia = ip?.split(',')[0].trim() || null;

    const existing = await query<any[]>(
      'SELECT id_asistencia FROM asistencias WHERE usuario_id = ? AND fecha = ?',
      [currentUser.id, fechaHoy]
    );
    const alreadyRegistered = existing.length > 0;

    if (alreadyRegistered) {
      await BaseRepository.update(query, 'logins', 'usuario_id', currentUser.id, {
        en_local: 1,
        ...(ipLimpia && { ip_address: ipLimpia })
      });
      return {
        success: true,
        alreadyRegistered: true,
        message: 'Ya tienes asistencia registrada hoy. Ubicación actualizada en el local.'
      };
    }

    // Fuera del horario de asistencia (21:00–22:59): solo login
    if (hour < 21 || hour >= 23) {
      await BaseRepository.update(query, 'logins', 'usuario_id', currentUser.id, {
        en_local: 1,
        ...(ipLimpia && { ip_address: ipLimpia })
      });
      return {
        success: true,
        tipo: 'login',
        message: 'Login registrado en el local.'
      };
    }

    // Hora válida para asistencia: entre 21:00 y 22:59
    const timeStr = nowStr.substring(11, 19);
    const id = generateUUID();
    await BaseRepository.insert(query, 'asistencias', {
      id_asistencia: id,
      usuario_id: currentUser.id,
      fecha: fechaHoy,
      hora: timeStr,
      estado: 1
    });

    await BaseRepository.update(query, 'logins', 'usuario_id', currentUser.id, {
      en_local: 1,
      ...(ipLimpia && { ip_address: ipLimpia })
    });

    return {
      success: true,
      tipo: 'asistencia',
      message: 'Asistencia registrada correctamente.'
    };
  }
}
