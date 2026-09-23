import { query, generateUUID, withTransaction } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { TipRegisterSchema } from '@/lib/business/schemas';
import { BaseRepository } from './BaseRepository';
import { NotFoundError, BusinessError, DatabaseError } from '@/lib/errors/errors';
import { logger } from '@/lib/utils/logger';
import { z } from 'zod';

type TipRegisterInput = z.input<typeof TipRegisterSchema>;

export class TipRepository {
  static async register(body: TipRegisterInput) {
    try {
      const { venta_id, monto, usuario_ids } = TipRegisterSchema.parse(body);

      const usuarioIdsNormalizados = Array.from(
        new Set((usuario_ids || []).map(id => String(id)).filter(Boolean))
      );

      // La selección manual también debe cumplir las reglas de elegibilidad.
      const distribucionUsuarios = await query<any[]>(
        `SELECT DISTINCT u.id_usuario
       FROM logins l
       INNER JOIN usuarios u ON u.id_usuario = l.usuario_id
       INNER JOIN roles r ON r.id_rol = u.rol_id
       WHERE u.estado = 1
         AND (l.estado = 1 OR l.en_local = 1)
         AND LOWER(r.nombre) IN ('cajero', 'garzon', 'barman')
         ${
           usuarioIdsNormalizados.length > 0
             ? `AND u.id_usuario IN (${usuarioIdsNormalizados.map(() => '?').join(', ')})`
             : ''
         }
       ORDER BY u.id_usuario`,
        usuarioIdsNormalizados
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

        // OPTIMIZACIÓN: Batch insert multi-row (antes N queries individuales)
        const detalleRows = distribucionUsuarios.map((u, i) => ({
          id_detalle_propina: generateUUID(),
          propina_id: id,
          usuario_id: u.id_usuario,
          monto: montoBase + (i < resto ? 1 : 0),
          fecha_mod: null,
          estado: 1,
          fecha_crea: now
        }));

        const columns = [
          'id_detalle_propina',
          'propina_id',
          'usuario_id',
          'monto',
          'fecha_mod',
          'estado',
          'fecha_crea'
        ];
        const placeholders = detalleRows
          .map(() => `(${columns.map(() => '?').join(', ')})`)
          .join(', ');
        const values = detalleRows.flatMap(row => columns.map(col => row[col as keyof typeof row]));
        await trx(
          `INSERT INTO detalle_propinas (${columns.join(', ')}) VALUES ${placeholders}`,
          values
        );
      });

      return {
        id,
        montoPorUsuario: montoBase,
        count: usuariosCount,
        usuarios_distribucion: usuariosCount
      };
    } catch (err) {
      logger.error('[TipRepository] Error en register:', { err });
      if (err instanceof z.ZodError) throw err;
      throw new DatabaseError('Error al registrar propina', err);
    }
  }

  static async getSummary(isAdmin: boolean, userId: string, cajaActiva: boolean) {
    try {
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
      SELECT U.id_usuario, U.nick, (CAST(U.nombre AS text) || CAST(' ' AS text) || CAST(U.apellido AS text)) AS nombre_completo,
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
    } catch (err) {
      logger.error('[TipRepository] Error en getSummary:', { isAdmin, userId, err });
      throw new DatabaseError('Error al obtener resumen de propinas', err);
    }
  }

  static async getByUser(userId: string) {
    try {
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
    } catch (err) {
      logger.error('[TipRepository] Error en getByUser:', { userId, err });
      throw new DatabaseError(`Error al obtener propinas del usuario ${userId}`, err);
    }
  }

  static async getDetails(usuario_id: string, startDate?: string, endDate?: string) {
    try {
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
    } catch (err) {
      logger.error('[TipRepository] Error en getDetails:', { usuario_id, err });
      throw new DatabaseError(
        `Error al obtener detalle de propinas del usuario ${usuario_id}`,
        err
      );
    }
  }

  static async getByIdWithParticipants(id: string) {
    try {
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
    } catch (err) {
      logger.error('[TipRepository] Error en getByIdWithParticipants:', { id, err });
      if (err instanceof NotFoundError) throw err;
      throw new DatabaseError(`Error al obtener propina ${id}`, err);
    }
  }
}
