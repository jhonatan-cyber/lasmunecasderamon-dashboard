import { query, generateUUID, withTransaction } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { TipRegisterSchema } from '@/lib/business/schemas';
import { BaseRepository } from './BaseRepository';
import { BusinessError } from '@/lib/errors/errors';
import { z } from 'zod';

type TipRegisterInput = z.input<typeof TipRegisterSchema>;

export class TipRepository {
  static async register(body: TipRegisterInput) {
    const { venta_id, monto, usuario_ids } = TipRegisterSchema.parse(body);

    const usuarioIdsNormalizados = Array.from(
      new Set((usuario_ids || []).map(id => String(id)).filter(Boolean))
    );

    const distribucionUsuarios =
      usuarioIdsNormalizados.length > 0
        ? await query<any[]>(
            `SELECT DISTINCT u.id_usuario
             FROM usuarios u
             INNER JOIN roles r ON r.id_rol = u.rol_id
             WHERE u.estado = 1
               AND LOWER(r.nombre) IN ('cajero', 'garzon')
               AND u.id_usuario IN (${usuarioIdsNormalizados.map(() => '?').join(', ')})`,
            usuarioIdsNormalizados
          )
        : await query<any[]>(
            `SELECT DISTINCT u.id_usuario
             FROM logins l
             INNER JOIN usuarios u ON u.id_usuario = l.usuario_id
             INNER JOIN roles r ON r.id_rol = u.rol_id
             WHERE l.estado = 1
               AND l.en_local = 1
               AND u.estado = 1
               AND LOWER(r.nombre) IN ('cajero', 'garzon')`
          );

    if (distribucionUsuarios.length === 0) {
      const now = getNowInBusinessTimezone();
      const id = generateUUID();

      await withTransaction(async trx => {
        await BaseRepository.insert(trx, 'propinas', {
          id_propina: id,
          venta_id,
          propina: monto,
          estado: 1,
          fecha_crea: now
        });
      });

      return { id, mensaje: 'Propina registrada sin distribución (sin usuarios activos)' };
    }

    const usuariosCount = distribucionUsuarios.length;
    const montoBase = Math.floor(monto / usuariosCount);
    const resto = Math.round(monto - montoBase * usuariosCount);
    const now = getNowInBusinessTimezone();
    const id = generateUUID();

    await withTransaction(async trx => {
      await BaseRepository.insert(trx, 'propinas', {
        id_propina: id,
        venta_id,
        propina: monto,
        estado: 1,
        fecha_crea: now
      });

      for (let i = 0; i < distribucionUsuarios.length; i++) {
        const u = distribucionUsuarios[i];
        const montoPorUsuario = montoBase + (i < resto ? 1 : 0);
        await BaseRepository.insert(trx, 'detalle_propinas', {
          id_detalle_propina: generateUUID(),
          propina_id: id,
          usuario_id: u.id_usuario,
          monto: montoPorUsuario,
          fecha_mod: null,
          estado: 1,
          fecha_crea: now
        });
      }
    });

    return {
      id,
      montoPorUsuario: montoBase,
      count: usuariosCount,
      usuarios_distribucion: usuariosCount
    };
  }

  static async getSummary(isAdmin: boolean, userId: string, cajaActiva: boolean) {
    let where = '';
    const params: any[] = [];

    if (!isAdmin) {
      where = 'WHERE DP.usuario_id = ?';
      params.push(userId);
    }

    if (cajaActiva) {
      const active = await query<any[]>(
        'SELECT id_caja FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1'
      );
      if (active.length > 0) {
        where += (where ? ' AND ' : 'WHERE ') + '(V.caja_id = ? OR V.id_venta IS NULL)';
        params.push(active[0].id_caja);
      } else {
        return [];
      }
    }

    return await query(
      `
      SELECT U.id_usuario, U.nick, CONCAT(U.nombre, ' ', U.apellido) AS nombre_completo,
             U.foto AS usuario_foto,
             MAX(COALESCE(V.fecha_crea, P.fecha_crea)) AS fecha_crea, 
             SUM(DP.monto) AS total_propinas,
             SUM(CASE WHEN DP.estado = 1 THEN DP.monto ELSE 0 END) AS propinas_pendientes,
             SUM(CASE WHEN DP.estado = 0 THEN DP.monto ELSE 0 END) AS propinas_cobradas
      FROM propinas P 
      INNER JOIN detalle_propinas DP ON DP.propina_id = P.id_propina
      INNER JOIN usuarios U ON U.id_usuario = DP.usuario_id
      LEFT JOIN ventas V ON V.id_venta = P.venta_id
      ${where} GROUP BY U.id_usuario ORDER BY total_propinas DESC
    `,
      params
    );
  }

  static async getByUser(userId: string) {
    return await query(
      `
      SELECT P.id_propina AS propina_id, DP.id_detalle_propina, P.fecha_crea AS fecha_hora, 
             P.fecha_crea AS fecha_crea,
             V.fecha_crea AS fecha_venta,
             DP.fecha_mod AS propina_fecha_crea,
             V.codigo AS codigo_venta, DP.monto, V.id_venta AS venta_id,
             DP.estado, CASE WHEN DP.estado = 1 THEN 'Por pagar' ELSE 'Pagado' END AS estado_texto
      FROM propinas P 
      INNER JOIN detalle_propinas DP ON DP.propina_id = P.id_propina
      LEFT JOIN ventas V ON V.id_venta = P.venta_id
      WHERE DP.usuario_id = ? ORDER BY P.fecha_crea DESC
    `,
      [userId]
    );
  }

  static async getDetails(usuario_id: string, startDate?: string, endDate?: string) {
    let sql = `
      SELECT
        p.id_propina AS propina_id,
        dp.id_detalle_propina,
        p.fecha_crea as fecha_crea,
        v.fecha_crea as fecha_venta,
        v.total,
        dp.monto,
        COALESCE(p.estado, 1) as estado,
        v.metodo_pago,
        v.codigo AS codigo_venta,
        v.id_venta AS venta_id,
        dp.fecha_mod AS fecha_pago
      FROM propinas p
      LEFT JOIN ventas v ON v.id_venta = p.venta_id
      INNER JOIN detalle_propinas dp ON dp.propina_id = p.id_propina
      WHERE dp.usuario_id = ?
    `;
    const params: any[] = [usuario_id];

    if (startDate && endDate) {
      sql += ' AND DATE(p.fecha_crea) BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    sql += ' ORDER BY p.fecha_crea DESC';
    return await query(sql, params);
  }

  static async getByIdWithParticipants(id: string) {
    const tip = await query<any[]>(
      `
      SELECT id_propina, venta_id, propina AS monto_total, fecha_crea
      FROM propinas WHERE id_propina = ?
    `,
      [id]
    );

    if (tip.length === 0) return null;

    const participantes = await query<any[]>(
      `
      SELECT U.id_usuario, U.nick, U.nombre, DP.monto, DP.estado
      FROM detalle_propinas DP
      INNER JOIN usuarios U ON U.id_usuario = DP.usuario_id
      WHERE DP.propina_id = ?
    `,
      [id]
    );

    return {
      ...tip[0],
      conteo_usuarios: participantes.length,
      participantes
    };
  }
}
