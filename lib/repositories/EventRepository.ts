import { query } from '@/lib/db';

export class EventRepository {
  static async getStats(userId: string) {
    const weeklyIncome = await query<any[]>(`
      SELECT DATE(date) as day, SUM(amount) as total
      FROM (
        SELECT S.fecha_crea as date, COALESCE(DC.comision, 0) as amount FROM servicios S
        INNER JOIN detalle_servicios DS ON DS.servicio_id = S.id_servicio
        LEFT JOIN comisiones C ON C.servicio_id = S.id_servicio
        LEFT JOIN detalle_comisiones DC ON DC.comision_id = C.id_comision AND DC.usuario_id = DS.usuario_id
        WHERE DS.usuario_id = ? AND S.fecha_crea >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        UNION ALL
        SELECT DC.fecha_crea as date, DC.comision as amount FROM detalle_comisiones DC
        INNER JOIN comisiones C ON C.id_comision = DC.comision_id
        WHERE DC.usuario_id = ? AND C.venta_id IS NOT NULL AND DC.fecha_crea >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        UNION ALL
        SELECT DP.fecha_crea as date, DP.monto as amount FROM detalle_propinas DP
        WHERE DP.usuario_id = ? AND DP.fecha_crea >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        UNION ALL
        SELECT G.fecha_hora as date, G.monto as amount FROM gratificaciones G
        WHERE G.usuario_id = ? AND G.fecha_hora >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      ) as combined
      GROUP BY DATE(date)
      ORDER BY DATE(date) ASC
    `, [userId, userId, userId, userId]);

    const stats = await Promise.all([
      query<any[]>('SELECT COUNT(*) as count FROM detalle_servicios WHERE usuario_id = ?', [userId]),
      query<any[]>('SELECT SUM(comision) as total FROM detalle_comisiones WHERE usuario_id = ?', [userId]),
      query<any[]>('SELECT SUM(monto) as total FROM detalle_propinas WHERE usuario_id = ?', [userId]),
      query<any[]>('SELECT SUM(monto) as total FROM gratificaciones WHERE usuario_id = ?', [userId])
    ]);

    const svcCount = stats[0][0]?.count || 0;
    const totalEarnings = Number(stats[1][0]?.total || 0) + Number(stats[2][0]?.total || 0) + Number(stats[3][0]?.total || 0);

    const badges = [];
    if (svcCount >= 10) badges.push({ id: 'pro', icon: '🏆', title: 'Top 10 Servicios', description: '¡Has completado más de 10 servicios!' });
    if (totalEarnings >= 100000) badges.push({ id: 'gold', icon: '💰', title: 'Experta en Ventas', description: 'Más de $100,000 acumulados' });

    return { weeklyIncome: weeklyIncome.map(w => ({ ...w, total: Number(w.total) })), badges, svcCount, totalEarnings };
  }

  static async getUserEvents(userId: string) {
    return await query(`
      SELECT 'servicio' as type, s.id_servicio as id, s.fecha_crea as date, s.total as amount, s.codigo
      FROM servicios s
      INNER JOIN detalle_servicios ds ON s.id_servicio = ds.servicio_id
      WHERE ds.usuario_id = ?
      UNION ALL
      SELECT 'comision' as type, dc.id_detalle_comision as id, dc.fecha_crea as date, dc.comision as amount, 'COMM' as codigo
      FROM detalle_comisiones dc
      WHERE dc.usuario_id = ?
      ORDER BY date DESC
      LIMIT 100
    `, [userId, userId]);
  }
}
