import { query, rawQuery, generateUUID } from '@/lib/db';
import { getSystemTimezone, getNowInBusinessTimezone } from '@/lib/timezoneService';
import { toDateKey } from '@/lib/calendarUtils';

export class AttendanceRepository {
  static async getSummary() {
    const sql = `
      SELECT 
        U.id_usuario, U.nick, CONCAT(U.nombre, ' ', U.apellido) AS nombre_completo,
        COALESCE(ASIS.total_asistencias, 0) AS total_asistencias,
        COALESCE(ASIS.total_asistencias, 0) * COALESCE(U.sueldo, 0) AS sueldo_total,
        COALESCE(ASIS.total_asistencias, 0) * COALESCE(U.aporte, 0) AS aporte_total,
        COALESCE(SEM.semanas, 0) * COALESCE(U.descuento, 0) AS descuento_total,
        (COALESCE(ASIS.total_asistencias, 0) * COALESCE(U.sueldo, 0)) - 
        (COALESCE(ASIS.total_asistencias, 0) * COALESCE(U.aporte, 0)) - 
        (COALESCE(SEM.semanas, 0) * COALESCE(U.descuento, 0)) AS total_final
      FROM usuarios U
      LEFT JOIN (SELECT usuario_id, COUNT(*) AS total_asistencias FROM asistencias WHERE estado = 1 GROUP BY usuario_id) AS ASIS ON ASIS.usuario_id = U.id_usuario
      LEFT JOIN (SELECT usuario_id, COUNT(DISTINCT CONCAT(YEAR(fecha), '-', WEEK(fecha, 1))) AS semanas FROM asistencias WHERE estado = 1 AND DAYOFWEEK(fecha) IN (3,4,5,6,7,1) GROUP BY usuario_id) AS SEM ON SEM.usuario_id = U.id_usuario
      WHERE COALESCE(ASIS.total_asistencias, 0) > 0
      ORDER BY nombre_completo
    `;
    return await rawQuery(sql);
  }

  static async getStats() {
    const fechaHoy = toDateKey(new Date());
    const cajaRes = await query<any[]>('SELECT id_caja, fecha_apertura, fecha_cierre FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1');
    const caja = cajaRes[0];

    const totalUsuariosRes = await query<any[]>("SELECT COUNT(*) as total FROM usuarios u INNER JOIN roles r ON r.id_rol = u.rol_id WHERE r.nombre != 'administrador'");
    const totalUsuarios = Number(totalUsuariosRes[0]?.total || 0);

    const asistenciasHoy = await query<any[]>('SELECT DISTINCT usuario_id FROM asistencias WHERE fecha = ? AND estado = 1', [fechaHoy]);
    const presentesHoy = asistenciasHoy.length;

    let stats = { presentes: presentesHoy, ausentes: totalUsuarios - presentesHoy, porcentaje: totalUsuarios > 0 ? Math.round((presentesHoy/totalUsuarios)*100) : 0, fechaApertura: fechaHoy, fechaCierre: fechaHoy };

    if (caja) {
      const perCaja = await query<any[]>('SELECT DISTINCT usuario_id FROM asistencias WHERE fecha >= ? AND fecha <= ? AND estado = 1', [caja.fecha_apertura, caja.fecha_cierre || fechaHoy]);
      if (presentesHoy === 0 && perCaja.length > 0) {
        stats = { presentes: perCaja.length, ausentes: totalUsuarios - perCaja.length, porcentaje: totalUsuarios > 0 ? Math.round((perCaja.length/totalUsuarios)*100) : 0, fechaApertura: caja.fecha_apertura, fechaCierre: caja.fecha_cierre || fechaHoy };
      }
    }

    return { total: totalUsuarios, ...stats };
  }

  static async register(qrData: string, currentUser?: { id: string }) {
    let targetUser: any = null;
    let isSystemCode = false;

    const users = await query<any[]>('SELECT id_usuario, nombre, apellido FROM usuarios WHERE qr_token = ? AND estado = 1', [qrData]);
    if (users.length > 0) {
      targetUser = users[0];
    } else {
      const codes = await query<any[]>('SELECT codigo FROM codigos ORDER BY fecha_crea DESC LIMIT 1');
      if (codes.length > 0 && codes[0].codigo === qrData && currentUser) {
        const logged = await query<any[]>('SELECT id_usuario, nombre, apellido FROM usuarios WHERE id_usuario = ? AND estado = 1', [currentUser.id]);
        if (logged.length > 0) { targetUser = logged[0]; isSystemCode = true; }
      }
    }

    if (!targetUser) throw new Error('Código inválido, expirado o ya utilizado');

    if (isSystemCode) {
      const { regenerateAttendanceCode } = await import('@/lib/codigoService');
      await regenerateAttendanceCode();
    } else {
      const crypto = await import('crypto');
      await query('UPDATE usuarios SET qr_token = ? WHERE id_usuario = ?', [crypto.randomBytes(16).toString('hex'), targetUser.id_usuario]);
    }

    const tz = getSystemTimezone();
    const hour = parseInt(new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hour12: false }).format(new Date()));
    if (hour >= 23) return { success: false, message: 'Horario cerrado (después de las 23:00)' };

    const existing = await query<any[]>('SELECT id_asistencia FROM asistencias WHERE usuario_id = ? AND fecha = CURDATE()', [targetUser.id_usuario]);
    if (existing.length > 0) return { success: true, alreadyRegistered: true, message: `${targetUser.nombre} ya tiene asistencia hoy` };

    const now = new Date();
    const f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(now);
    const getV = (t: string) => f.find(p => p.type === t)?.value;
    const dateStr = `${getV('year')}-${getV('month')}-${getV('day')}`;
    const timeStr = `${getV('hour')}:${getV('minute')}:${getV('second')}`;

    const id = generateUUID();
    await query('INSERT INTO asistencias (id_asistencia, usuario_id, fecha, hora, estado) VALUES (?, ?, ?, ?, 1)', [id, targetUser.id_usuario, dateStr, timeStr]);
    await query('UPDATE logins SET en_local = 1 WHERE usuario_id = ? AND estado = 1', [targetUser.id_usuario]);

    return { success: true, message: `Asistencia registrada para ${targetUser.nombre}`, user: { id: targetUser.id_usuario, nombre: targetUser.nombre, apellido: targetUser.apellido } };
  }

  static async getByUser(userId: string, tipo?: string, startDate?: string, endDate?: string) {
    if (tipo === 'detalle') {
      let sql = `
        SELECT 
          A.id_asistencia, A.usuario_id, A.fecha, A.hora, A.fecha_pago,
          U.sueldo, U.aporte, (U.sueldo - U.aporte) AS total, A.estado
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
        COALESCE((SELECT COUNT(*) FROM asistencias A WHERE A.estado = 1 AND A.usuario_id = U.id_usuario), 0) * U.sueldo AS sueldo_total,
        COALESCE((SELECT COUNT(*) FROM asistencias A WHERE A.estado = 1 AND A.usuario_id = U.id_usuario), 0) * U.aporte AS aporte_total,
        COALESCE((SELECT COUNT(DISTINCT YEARWEEK(A.fecha, 1)) FROM asistencias A WHERE A.estado = 1 AND A.usuario_id = U.id_usuario AND DAYOFWEEK(A.fecha) IN (3,4,5,6,7,1)), 0) * U.descuento AS descuento_total,
        (COALESCE((SELECT COUNT(*) FROM asistencias A WHERE A.estado = 1 AND A.usuario_id = U.id_usuario), 0) * U.sueldo) - 
        (COALESCE((SELECT COUNT(*) FROM asistencias A WHERE A.estado = 1 AND A.usuario_id = U.id_usuario), 0) * U.aporte) - 
        (COALESCE((SELECT COUNT(DISTINCT YEARWEEK(A.fecha, 1)) FROM asistencias A WHERE A.estado = 1 AND A.usuario_id = U.id_usuario AND DAYOFWEEK(A.fecha) IN (3,4,5,6,7,1)), 0) * U.descuento) AS total_final
      FROM usuarios U
      WHERE U.id_usuario = ?
    `;
    return await query(sql, [userId]);
  }

  static async getByDates(userId: string, dates: string[]) {
    if (dates.length === 0) return [];
    return await query(`
      SELECT 
        A.id_asistencia, A.usuario_id, A.fecha, A.hora, A.fecha_pago,
        U.sueldo, U.aporte, (U.sueldo - U.aporte) AS total, A.estado
      FROM asistencias A
      INNER JOIN usuarios U ON U.id_usuario = A.usuario_id
      WHERE A.usuario_id = ? AND A.fecha IN (?)
      ORDER BY A.fecha DESC, A.hora DESC
    `, [userId, dates]);
  }

  static async getHoy() {
    const fechaHoy = toDateKey(new Date());
    return await query(`
      SELECT 
        A.id_asistencia, A.fecha, A.hora,
        U.id_usuario, U.nick, CONCAT(U.nombre, ' ', U.apellido) as nombre_completo,
        R.nombre as rol
      FROM asistencias A
      INNER JOIN usuarios U ON A.usuario_id = U.id_usuario
      INNER JOIN roles R ON U.rol_id = R.id_rol
      WHERE A.fecha = ? AND A.estado = 1
      ORDER BY A.hora DESC
    `, [fechaHoy]);
  }
}
