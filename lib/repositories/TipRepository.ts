import { query, generateUUID, withTransaction } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { TipRegisterSchema } from '@/lib/business/schemas';
import { BaseRepository } from './BaseRepository';

export class TipRepository {
  static async register(body: any) {
    const { venta_id, monto } = TipRegisterSchema.parse(body);

    const logueados = await query<any[]>(`
      SELECT DISTINCT u.id_usuario FROM logins l
      INNER JOIN usuarios u ON u.id_usuario = l.usuario_id
      INNER JOIN roles r ON r.id_rol = u.rol_id
      WHERE l.estado = 1 AND l.en_local = 1 AND u.estado = 1 AND r.nombre IN ('cajero', 'garzon')
    `);

    if (logueados.length === 0) throw new Error('No hay usuarios logueados disponibles para distribuir la propina');

    const montoPorUsuario = monto / logueados.length;
    const now = getNowInBusinessTimezone();
    const id = generateUUID();

    await withTransaction(async (trx) => {
      await BaseRepository.insert(trx, 'propinas', {
        id_propina: id,
        venta_id,
        propina: monto,
        estado: 1, // 1 = por cobrar, 0 = cobrado
        fecha_crea: now
      });

      for (const u of logueados) {
        await BaseRepository.insert(trx, 'detalle_propinas', {
          id_detalle_propina: generateUUID(), // Aseguramos que tenga ID si la tabla lo requiere
          propina_id: id,
          usuario_id: u.id_usuario,
          monto: montoPorUsuario,
          estado: 1, // 1 = por cobrar, 0 = cobrado
          fecha_crea: now
        });
      }
    });

    return { id, montoPorUsuario, count: logueados.length, usuarios_distribucion: logueados.length };
  }

  static async getSummary(isAdmin: boolean, userId: string, cajaActiva: boolean) {
    let where = '';
    const params: any[] = [];

    if (!isAdmin) {
      where = 'WHERE DP.usuario_id = ?';
      params.push(userId);
    }

    if (cajaActiva) {
      const active = await query<any[]>('SELECT id_caja FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1');
      if (active.length > 0) {
        where += (where ? ' AND ' : 'WHERE ') + 'V.caja_id = ?';
        params.push(active[0].id_caja);
      } else {
        return [];
      }
    }

    return await query(`
      SELECT U.id_usuario, U.nick, CONCAT(U.nombre, ' ', U.apellido) AS nombre_completo,
             MAX(DP.fecha_crea) AS fecha_crea, SUM(CASE WHEN P.estado = 1 THEN DP.monto ELSE 0 END) AS total_propinas
      FROM propinas P 
      INNER JOIN detalle_propinas DP ON DP.propina_id = P.id_propina
      INNER JOIN usuarios U ON U.id_usuario = DP.usuario_id
      INNER JOIN ventas V ON V.id_venta = P.venta_id
      ${where} GROUP BY U.id_usuario ORDER BY total_propinas DESC
    `, params);
  }

  static async getByUser(userId: string) {
    return await query(`
      SELECT P.id_propina, P.fecha_crea AS fecha_hora, P.fecha_crea, V.codigo AS codigo_venta, DP.monto,
             P.estado, CASE WHEN P.estado = 1 THEN 'Por pagar' ELSE 'Pagado' END AS estado_texto
      FROM propinas P 
      INNER JOIN detalle_propinas DP ON DP.propina_id = P.id_propina
      INNER JOIN ventas V ON V.id_venta = P.venta_id
      WHERE DP.usuario_id = ? ORDER BY P.fecha_crea DESC
    `, [userId]);
  }

  static async getDetails(usuario_id: string, startDate?: string, endDate?: string) {
    let sql = `
      SELECT 
        v.fecha_crea, v.total, dp.monto, COALESCE(p.estado, 1) as estado, v.metodo_pago, v.codigo
      FROM ventas v
      INNER JOIN propinas p ON p.venta_id = v.id_venta
      INNER JOIN detalle_propinas dp ON dp.propina_id = p.id_propina
      WHERE dp.usuario_id = ?
    `;
    const params: any[] = [usuario_id];

    if (startDate && endDate) {
      sql += ' AND DATE(v.fecha_crea) BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    sql += ' ORDER BY v.fecha_crea DESC';
    return await query(sql, params);
  }
}
