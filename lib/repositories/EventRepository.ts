import { query } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';

export class EventRepository {
  static async getStats(userId: string) {
    const now = getNowInBusinessTimezone();
    const weeklyIncome = await query<any[]>(
      `
      SELECT DATE(date) as day, SUM(amount) as total
      FROM (
        SELECT S.fecha_crea as date, COALESCE(DC.comision, 0) as amount FROM servicios S
        INNER JOIN detalle_servicios DS ON DS.servicio_id = S.id_servicio
        LEFT JOIN comisiones C ON C.servicio_id = S.id_servicio
        LEFT JOIN detalle_comisiones DC ON DC.comision_id = C.id_comision AND DC.usuario_id = DS.usuario_id
        WHERE DS.usuario_id = ? AND S.fecha_crea >= DATE_SUB(?, INTERVAL 7 DAY)
        UNION ALL
        SELECT DC.fecha_crea as date, DC.comision as amount FROM detalle_comisiones DC
        INNER JOIN comisiones C ON C.id_comision = DC.comision_id
        WHERE DC.usuario_id = ? AND C.venta_id IS NOT NULL AND DC.fecha_crea >= DATE_SUB(?, INTERVAL 7 DAY)
        UNION ALL
        SELECT DP.fecha_crea as date, DP.monto as amount FROM detalle_propinas DP
        WHERE DP.usuario_id = ? AND DP.fecha_crea >= DATE_SUB(?, INTERVAL 7 DAY)
        UNION ALL
        SELECT G.fecha_crea as date, G.monto as amount FROM gratificaciones G
        WHERE G.usuario_id = ? AND G.fecha_crea >= DATE_SUB(?, INTERVAL 7 DAY)
      ) as combined
      GROUP BY DATE(date)
      ORDER BY DATE(date) ASC
    `,
      [userId, now, userId, now, userId, now, userId, now]
    );

    const stats = await Promise.all([
      query<any[]>('SELECT COUNT(*) as count FROM detalle_servicios WHERE usuario_id = ?', [
        userId
      ]),
      query<any[]>('SELECT SUM(comision) as total FROM detalle_comisiones WHERE usuario_id = ?', [
        userId
      ]),
      query<any[]>('SELECT SUM(monto) as total FROM detalle_propinas WHERE usuario_id = ?', [
        userId
      ]),
      query<any[]>('SELECT SUM(monto) as total FROM gratificaciones WHERE usuario_id = ?', [userId])
    ]);

    const svcCount = stats[0][0]?.count || 0;
    const totalEarnings =
      Number(stats[1][0]?.total || 0) +
      Number(stats[2][0]?.total || 0) +
      Number(stats[3][0]?.total || 0);

    const badges = [];
    if (svcCount >= 10)
      badges.push({
        id: 'pro',
        icon: '🏆',
        title: 'Top 10 Servicios',
        description: '¡Has completado más de 10 servicios!'
      });
    if (totalEarnings >= 1000000000)
      badges.push({
        id: 'gold',
        icon: '💰',
        title: 'Experta en Ventas',
        description: 'Más de $100,000,000 acumulados'
      });

    return {
      weeklyIncome: weeklyIncome.map(w => ({ ...w, total: Number(w.total) })),
      badges,
      svcCount,
      totalEarnings
    };
  }

  static async getUserEvents(userId: string, startDate?: string, endDate?: string) {
    const tableChecks = await query<any[]>(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = DATABASE()
         AND table_name IN ('gratificaciones', 'horas_extras')`
    );

    const hasGratificaciones = tableChecks.some(row => row.table_name === 'gratificaciones');
    const hasHorasExtras = tableChecks.some(row => row.table_name === 'horas_extras');

    const gratificacionesSql = hasGratificaciones
      ? `
      UNION ALL
      SELECT
        'gratificacion' as type,
        CAST(g.id AS CHAR) as id,
        g.fecha_crea as date,
        g.monto as amount,
        COALESCE(g.descripcion, 'GRAT') as codigo,
        g.estado as estado,
        NULL as subType
      FROM gratificaciones g
      WHERE g.usuario_id = ?
      `
      : '';

    const horasExtrasSql = hasHorasExtras
      ? `
      UNION ALL
      SELECT
        CAST('hora_extra' AS CHAR) as type,
        CAST(he.id_hora_extra AS CHAR) as id,
        he.fecha_crea as date,
        he.total as amount,
        CONCAT(COALESCE(he.hora, 0), ' HRS') as codigo,
        he.estado as estado,
        NULL as subType
      FROM horas_extras he
      WHERE he.usuario_id = ?
      `
      : '';

    const params: any[] = [userId, userId, userId, userId, userId];
    if (hasHorasExtras) params.push(userId);
    if (hasGratificaciones) params.push(userId);

    let whereClause = '';
    if (startDate && endDate) {
      whereClause = 'WHERE date >= ? AND date <= ?';
      params.push(startDate, endDate);
    }

    return await query(
      `
      SELECT *
      FROM (
        SELECT
          'servicio' as type,
          CAST(s.id_servicio AS CHAR) as id,
          s.fecha_crea as date,
          s.total as amount,
          s.codigo as codigo,
          s.estado as estado,
          NULL as subType
        FROM servicios s
        INNER JOIN detalle_servicios ds ON s.id_servicio = ds.servicio_id
        WHERE ds.usuario_id = ?

        UNION ALL

        SELECT
          'comision' as type,
          CAST(dc.id_detalle_comision AS CHAR) as id,
          dc.fecha_crea as date,
          dc.comision as amount,
          COALESCE(v.codigo, s.codigo, 'COMM') as codigo,
          dc.estado as estado,
          CASE
            WHEN c.venta_id IS NOT NULL AND c.venta_id <> 0 THEN 'venta'
            WHEN c.servicio_id IS NOT NULL AND c.servicio_id <> 0 THEN 'servicio'
            ELSE NULL
          END as subType
        FROM detalle_comisiones dc
        LEFT JOIN comisiones c ON c.id_comision = dc.comision_id
        LEFT JOIN ventas v ON v.id_venta = c.venta_id
        LEFT JOIN servicios s ON s.id_servicio = c.servicio_id
        WHERE dc.usuario_id = ?

        UNION ALL

        SELECT
          'propina' as type,
          CAST(dp.id_detalle_propina AS CHAR) as id,
          p.fecha_crea as date,
          dp.monto as amount,
          COALESCE(v.codigo, 'TIPS') as codigo,
          p.estado as estado,
          'venta' as subType
        FROM detalle_propinas dp
        INNER JOIN propinas p ON p.id_propina = dp.propina_id
        LEFT JOIN ventas v ON v.id_venta = p.venta_id
        WHERE dp.usuario_id = ?

        UNION ALL

        SELECT
          'asistencia' as type,
          CAST(a.id_asistencia AS CHAR) as id,
          CONCAT(a.fecha, ' ', COALESCE(a.hora, '00:00:00')) as date,
          (COALESCE(u.sueldo, 0) - COALESCE(u.aporte, 0)) as amount,
          'ASIS' as codigo,
          a.estado as estado,
          NULL as subType
        FROM asistencias a
        INNER JOIN usuarios u ON u.id_usuario = a.usuario_id
        WHERE a.usuario_id = ?

        UNION ALL

        SELECT
          'anticipo' as type,
          CAST(a.id_anticipo AS CHAR) as id,
          a.fecha_crea as date,
          a.monto as amount,
          'ANT' as codigo,
          a.estado as estado,
          NULL as subType
        FROM anticipos a
        WHERE a.usuario_id = ?
        ${horasExtrasSql}
        ${gratificacionesSql}
      ) events
      ${whereClause}
      ORDER BY date DESC
      LIMIT 250
    `,
      params
    );
  }
}
