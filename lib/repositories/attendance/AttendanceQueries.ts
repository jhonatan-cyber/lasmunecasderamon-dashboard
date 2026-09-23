import { query, generateUUID, withTransaction } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { AttendanceRegisterSchema } from '@/lib/business/schemas';
import { CHALLENGE_FAILURE_MESSAGES, redeemChallenge } from '@/lib/kiosk/attendanceChallenges';
import { BaseRepository } from '../BaseRepository';
import logger from '../../utils/logger';
import { ValidationError, DatabaseError } from '@/lib/errors/errors';
import { z } from 'zod';

type AttendanceRegisterInput = z.input<typeof AttendanceRegisterSchema>;

export async function getAttendanceSummary() {
  try {
    const sql = `
   SELECT
      U.id_usuario, U.nick, (CAST(U.nombre AS text) || CAST(' ' AS text) || CAST(U.apellido AS text)) AS nombre_completo,
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
    LEFT JOIN (SELECT usuario_id, COUNT(DISTINCT TO_CHAR(fecha, 'IYYY-IW')) AS semanas FROM asistencias WHERE estado = 1 AND (EXTRACT(DOW FROM fecha)::integer + 1) IN (3,4,5,6,7,1) GROUP BY usuario_id) AS SEM ON SEM.usuario_id = U.id_usuario
    WHERE COALESCE(ASIS.total_asistencias, 0) > 0
    ORDER BY nombre_completo;
  `;
    return await query(sql);
  } catch (err) {
    logger.error('[AttendanceQueries] Error en getAttendanceSummary:', { err });
    throw new DatabaseError('Error al obtener resumen de asistencias', err);
  }
}

export async function getAttendanceStats() {
  try {
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
        'SELECT DISTINCT usuario_id FROM asistencias WHERE fecha >= ? AND (fecha <= ? OR CAST(? AS date) IS NULL) AND estado = 1',
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
  } catch (err) {
    logger.error('[AttendanceQueries] Error en getAttendanceStats:', { err });
    throw new DatabaseError('Error al obtener estadísticas de asistencia', err);
  }
}

export async function getAttendanceConfigHours(): Promise<{ startHour: number; endHour: number }> {
  try {
    const configRows = await query<any[]>(
      "SELECT clave, valor FROM configuraciones WHERE clave IN ('asistencia_hora_inicio', 'asistencia_hora_fin')"
    );

    let startHour = 21;
    let endHour = 23;

    for (const row of configRows) {
      if (row.clave === 'asistencia_hora_inicio') {
        const val = parseInt(row.valor, 10);
        if (!isNaN(val)) startHour = val;
      } else if (row.clave === 'asistencia_hora_fin') {
        const val = parseInt(row.valor, 10);
        if (!isNaN(val)) endHour = val;
      }
    }
    return { startHour, endHour };
  } catch {
    return { startHour: 21, endHour: 23 };
  }
}

/**
 * Registra una asistencia a partir de una prueba de presencia verificada en el servidor.
 *
 * El unico dato que llega del cliente es `qrData`, y solo hay dos cosas que puede ser:
 *
 *  1. Un desafio emitido por una superficie del local (kiosko o pantalla de personal).
 *     Se canjea una vez, vence a los 120 s y acredita a la persona para la que se emitio.
 *     Lo puede canjear su dueño, o quien lo emitio desde el mostrador.
 *  2. El codigo de 4 digitos del local, que se muestra en la pantalla de la entrada y
 *     rota en cada uso. Acredita a quien tiene la sesion abierta.
 *
 * El token personal (`usuarios.qr_token`) ya no se acepta: publicarlo en un endpoint
 * publico era justamente lo que permitia marcar asistencia ajena desde cualquier lado.
 */
export async function registerAttendance(
  body: AttendanceRegisterInput,
  currentUser?: { id: string },
  ip?: string
) {
  try {
    const { qrData } = AttendanceRegisterSchema.parse(body);

    if (!currentUser) {
      throw new ValidationError('Necesitas una sesion activa para registrar tu asistencia');
    }

    const esCodigoDelLocal = /^\d{4}$/.test(qrData);
    let targetUser: any = null;
    let isSystemCode = false;

    if (esCodigoDelLocal) {
      const codes = await query<any[]>(
        'SELECT codigo FROM codigos WHERE estado = 1 AND codigo = ? LIMIT 1',
        [qrData]
      );
      if (codes.length === 0) throw new ValidationError('Codigo invalido, expirado o ya utilizado');

      const logged = await query<any[]>(
        'SELECT id_usuario, nombre, apellido FROM usuarios WHERE id_usuario = ? AND estado = 1',
        [currentUser.id]
      );
      if (logged.length === 0) {
        throw new ValidationError('Codigo invalido, expirado o ya utilizado');
      }
      targetUser = logged[0];
      isSystemCode = true;
    } else {
      const canje = await redeemChallenge(qrData, String(currentUser.id));
      if (!canje.ok) throw new ValidationError(CHALLENGE_FAILURE_MESSAGES[canje.motivo]);

      const dueño = await query<any[]>(
        'SELECT id_usuario, nombre, apellido FROM usuarios WHERE id_usuario = ? AND estado = 1',
        [canje.usuarioId]
      );
      if (dueño.length === 0) {
        throw new ValidationError('La persona del codigo ya no esta activa.');
      }
      targetUser = dueño[0];
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

    const { startHour, endHour } = await getAttendanceConfigHours();
    if (hour < startHour || hour >= endHour) {
      await BaseRepository.update(query, 'logins', 'usuario_id', targetUser.id_usuario, {
        en_local: 1,
        ...(ipLimpia && { ip_address: ipLimpia })
      });
      return { success: true, tipo: 'login', message: 'Ubicación registrada en el local.' };
    }

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

    // El desafio ya quedo consumido por el canje. El codigo del local, en cambio, es
    // compartido: rota en cada uso para que una foto del codigo no vuelva a servir.
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
      message: 'Tu asistencia ha sido registrada',
      user: { id: targetUser.id_usuario, nombre: targetUser.nombre, apellido: targetUser.apellido }
    };
  } catch (err) {
    logger.error('[AttendanceQueries] Error en registerAttendance:', { err });
    if (err instanceof ValidationError || err instanceof z.ZodError) throw err;
    throw new DatabaseError('Error al registrar asistencia', err);
  }
}

export async function getAttendanceByUser(
  userId: string,
  tipo?: string,
  startDate?: string,
  endDate?: string
) {
  try {
    if (tipo === 'detalle') {
      let sql = `
      SELECT
        A.id_asistencia, A.usuario_id, A.fecha, A.hora, A.fecha_pago,
        A.estado,
        U.sueldo, U.aporte, U.descuento,
        (U.sueldo - U.aporte) AS total,
        (
          SELECT COUNT(DISTINCT TO_CHAR(A2.fecha, 'IYYY-IW'))
          FROM asistencias A2
          WHERE A2.usuario_id = A.usuario_id
            AND A2.estado = 1
            AND (EXTRACT(DOW FROM A2.fecha)::integer + 1) IN (3,4,5,6,7,1)
        ) AS semanas_con_descuento,
        (
          SELECT COUNT(DISTINCT TO_CHAR(A2.fecha, 'IYYY-IW'))
          FROM asistencias A2
          WHERE A2.usuario_id = A.usuario_id
            AND A2.estado = 1
            AND (EXTRACT(DOW FROM A2.fecha)::integer + 1) IN (3,4,5,6,7,1)
        ) * COALESCE(U.descuento, 0) AS descuento_total,
        (U.sueldo - U.aporte) - (
          (
            SELECT COUNT(DISTINCT TO_CHAR(A2.fecha, 'IYYY-IW'))
            FROM asistencias A2
            WHERE A2.usuario_id = A.usuario_id
              AND A2.estado = 1
              AND (EXTRACT(DOW FROM A2.fecha)::integer + 1) IN (3,4,5,6,7,1)
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
      U.id_usuario, U.nick, (CAST(U.nombre AS text) || CAST(' ' AS text) || CAST(U.apellido AS text)) AS nombre_completo,
      COALESCE((SELECT COUNT(*) FROM asistencias A WHERE A.estado = 1 AND A.usuario_id = U.id_usuario), 0) AS total_asistencias,
      COALESCE((SELECT COUNT(*) FROM asistencias A WHERE A.estado = 1 AND A.usuario_id = U.id_usuario), 0) * COALESCE(U.sueldo, 0) AS sueldo_total,
      COALESCE((SELECT COUNT(*) FROM asistencias A WHERE A.estado = 1 AND A.usuario_id = U.id_usuario), 0) * COALESCE(U.aporte, 0) AS aporte_total,
      COALESCE((SELECT COUNT(DISTINCT TO_CHAR(A.fecha, 'IYYY-IW')) FROM asistencias A WHERE A.estado = 1 AND A.usuario_id = U.id_usuario AND (EXTRACT(DOW FROM A.fecha)::integer + 1) IN (3,4,5,6,7,1)), 0) * COALESCE(U.descuento, 0) AS descuento_total,
      (COALESCE((SELECT COUNT(*) FROM asistencias A WHERE A.estado = 1 AND A.usuario_id = U.id_usuario), 0) * COALESCE(U.sueldo, 0)) -
      (COALESCE((SELECT COUNT(*) FROM asistencias A WHERE A.estado = 1 AND A.usuario_id = U.id_usuario), 0) * COALESCE(U.aporte, 0)) -
      (COALESCE((SELECT COUNT(DISTINCT TO_CHAR(A.fecha, 'IYYY-IW')) FROM asistencias A WHERE A.estado = 1 AND A.usuario_id = U.id_usuario AND (EXTRACT(DOW FROM A.fecha)::integer + 1) IN (3,4,5,6,7,1)), 0) * COALESCE(U.descuento, 0)) AS total_final
    FROM usuarios U
    WHERE U.id_usuario = ?
  `;
    return await query(sql, [userId]);
  } catch (err) {
    logger.error('[AttendanceQueries] Error en getAttendanceByUser:', { userId, err });
    throw new DatabaseError(`Error al obtener asistencias del usuario ${userId}`, err);
  }
}

export async function getAttendanceHoy() {
  try {
    const fechaHoy = getNowInBusinessTimezone().substring(0, 10);
    return await query(
      `
    SELECT
      A.id_asistencia, A.fecha, A.hora,
      U.id_usuario, U.nick, (CAST(U.nombre AS text) || CAST(' ' AS text) || CAST(U.apellido AS text)) as nombre_completo,
      R.nombre as rol
    FROM asistencias A
    INNER JOIN usuarios U ON A.usuario_id = U.id_usuario
    INNER JOIN roles R ON U.rol_id = R.id_rol
    WHERE A.fecha = ? AND A.estado = 1
    ORDER BY A.hora DESC
  `,
      [fechaHoy]
    );
  } catch (err) {
    logger.error('[AttendanceQueries] Error en getAttendanceHoy:', { err });
    throw new DatabaseError('Error al obtener asistencias del día', err);
  }
}

export async function getAttendanceByDates(userId: string, dates: string[]) {
  try {
    if (dates.length === 0) return [];
    return await query(
      `
    SELECT * FROM asistencias
    WHERE usuario_id = ? AND DATE(fecha) IN (?)
    ORDER BY fecha DESC
  `,
      [userId, dates]
    );
  } catch (err) {
    logger.error('[AttendanceQueries] Error en getAttendanceByDates:', { userId, err });
    throw new DatabaseError(`Error al obtener asistencias por fechas del usuario ${userId}`, err);
  }
}

export async function registerAttendanceManual(
  usuarioId: string,
  fecha: string,
  hora: string,
  estado: string,
  currentUser?: any
) {
  try {
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

    const user = await query<any[]>('SELECT sueldo, aporte FROM usuarios WHERE id_usuario = ?', [
      usuarioId
    ]);

    if (user.length === 0) {
      return { success: false, message: 'Usuario no encontrado' };
    }

    const id = generateUUID();
    const estadoNumerico = estado === 'presente' || estado === 'tardanza' ? 1 : 0;

    await BaseRepository.insert(query, 'asistencias', {
      id_asistencia: id,
      usuario_id: usuarioId,
      fecha: fecha,
      hora: hora,
      estado: estadoNumerico
    });

    return { success: true, message: 'Asistencia registrada manualmente' };
  } catch (err) {
    logger.error('[AttendanceQueries] Error en registerAttendanceManual:', {
      usuarioId,
      fecha,
      err
    });
    throw new DatabaseError(`Error al registrar asistencia manual para usuario ${usuarioId}`, err);
  }
}

/**
 * Registra la asistencia de hoy y marca en_local=1 para todas las
 * anfitrionas y garzones activos que aún no tengan asistencia.
 * Idempotente: omite a quienes ya registraron hoy.
 */
export async function registerMasivoHoy(ip?: string) {
  try {
    return await withTransaction(async trx => {
      const nowStr = getNowInBusinessTimezone();
      const fechaHoy = nowStr.substring(0, 10);
      const timeStr = nowStr.substring(11, 19);
      const ipLimpia = ip?.split(',')[0].trim() || null;

      const candidatos = await trx<any[]>(
        `SELECT u.id_usuario, u.nick FROM usuarios u
         INNER JOIN roles r ON r.id_rol = u.rol_id
         WHERE u.estado = 1 AND LOWER(r.nombre) IN ('anfitriona', 'garzon', 'garzona')
           AND NOT EXISTS (
             SELECT 1 FROM asistencias a WHERE a.usuario_id = u.id_usuario AND a.fecha = ?
           )`,
        [fechaHoy]
      );

      const yaRegistrados = await trx<any[]>(
        `SELECT u.nick FROM usuarios u
         INNER JOIN roles r ON r.id_rol = u.rol_id
         INNER JOIN asistencias a ON a.usuario_id = u.id_usuario AND a.fecha = ?
         WHERE u.estado = 1 AND LOWER(r.nombre) IN ('anfitriona', 'garzon', 'garzona')`,
        [fechaHoy]
      );

      const registrados: string[] = [];
      for (const user of candidatos) {
        await BaseRepository.insert(trx, 'asistencias', {
          id_asistencia: generateUUID(),
          usuario_id: user.id_usuario,
          fecha: fechaHoy,
          hora: timeStr,
          estado: 1
        });
        const loginRows = await trx<any[]>(
          'SELECT id_login FROM logins WHERE usuario_id = ? LIMIT 1',
          [user.id_usuario]
        );
        if (loginRows.length > 0) {
          await BaseRepository.update(trx, 'logins', 'usuario_id', user.id_usuario, {
            en_local: 1,
            ...(ipLimpia && { ip_address: ipLimpia })
          });
        } else {
          await BaseRepository.insert(trx, 'logins', {
            id_login: generateUUID(),
            usuario_id: user.id_usuario,
            last_login: nowStr,
            estado: 1,
            ...(ipLimpia ? { ip_address: ipLimpia } : {}),
            en_local: 1
          });
        }
        registrados.push(user.nick);
      }

      return {
        success: true,
        fecha: fechaHoy,
        registrados,
        omitidos: yaRegistrados.map(r => r.nick),
        message:
          registrados.length > 0
            ? `Asistencia registrada para ${registrados.length}: ${registrados.join(', ')}`
            : 'Todas las anfitrionas y garzones ya tenían asistencia hoy'
      };
    });
  } catch (err) {
    logger.error('[AttendanceQueries] Error en registerMasivoHoy:', { err });
    throw new DatabaseError('Error en el registro masivo de asistencia', err);
  }
}
