import { query, generateUUID, type TransactionQuery } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { BaseRepository } from './BaseRepository';

export class CommissionRepository {
  static async createWithDetail(
    trx: TransactionQuery,
    data: {
      venta_id: string;
      usuario_id: string;
      monto: number;
    }
  ): Promise<void> {
    const commissionId = generateUUID();

    const now = getNowInBusinessTimezone();
    await BaseRepository.insert(trx, 'comisiones', {
      id_comision: commissionId,
      venta_id: data.venta_id,
      monto: data.monto,
      estado: 1,
      fecha_crea: now
    });

    await BaseRepository.insert(trx, 'detalle_comisiones', {
      id_detalle_comision: generateUUID(),
      comision_id: commissionId,
      usuario_id: data.usuario_id,
      comision: data.monto,
      estado: 1,
      fecha_crea: now
    });
  }

  static async summary(): Promise<any> {
    const summary = await query<any[]>(`
      SELECT
        SUM(dc.comision) as total_comisiones,
        COUNT(DISTINCT dc.usuario_id) as cantidad_comisiones,
        SUM(CASE WHEN c.venta_id IS NOT NULL AND c.venta_id <> '' AND c.venta_id <> '0' THEN dc.comision ELSE 0 END) as comision_ventas,
        SUM(CASE WHEN c.servicio_id IS NOT NULL AND c.servicio_id <> '' AND c.servicio_id <> '0' THEN dc.comision ELSE 0 END) as comision_servicios
      FROM comisiones c
      INNER JOIN detalle_comisiones dc ON c.id_comision = dc.comision_id
      WHERE c.estado = 1 AND dc.estado = 1
    `);

    const data = summary[0] || {
      total_comisiones: 0,
      cantidad_comisiones: 0,
      comision_ventas: 0,
      comision_servicios: 0
    };

    const total = data.total_comisiones || 1;
    data.porcentaje_ventas = Math.round(((data.comision_ventas || 0) / total) * 100);
    data.porcentaje_servicios = Math.round(((data.comision_servicios || 0) / total) * 100);

    return data;
  }

  static async list(params: {
    status?: string;
    employeeId?: string;
    search?: string;
  }): Promise<any[]> {
    let where = 'WHERE 1=1';
    let sqlParams: any[] = [];

    if (params.status && params.status !== 'all') {
      const statusMap: Record<string, number> = { por_pagar: 1, pagado: 2, anulado: 0 };
      if (statusMap[params.status] !== undefined) {
        where += ' AND c.estado = ?';
        sqlParams.push(statusMap[params.status]);
      }
    }

    if (params.employeeId) {
      where += ' AND dc.usuario_id = ?';
      sqlParams.push(params.employeeId);
    }

    if (params.search) {
      where += ` AND (u.nick ILIKE ? OR (CAST(u.nombre AS text) || CAST(' ' AS text) || CAST(u.apellido AS text)) ILIKE ?)`;
      const searchTerm = `%${params.search}%`;
      sqlParams.push(searchTerm, searchTerm);
    }

    const sql = `
      SELECT
        dc.usuario_id AS id,
        dc.usuario_id AS "employeeId",
        u.nick AS nick,
        (CAST(u.nombre AS text) || CAST(' ' AS text) || CAST(u.apellido AS text)) AS "employeeName",
        u.foto AS empleado_foto,
        SUM(CASE WHEN c.venta_id IS NOT NULL AND c.venta_id <> '' AND c.venta_id <> '0' THEN dc.comision ELSE 0 END) AS venta,
        SUM(CASE WHEN c.servicio_id IS NOT NULL AND c.servicio_id <> '' AND c.servicio_id <> '0' THEN dc.comision ELSE 0 END) AS servicio,
        SUM(dc.comision) AS total,
        MAX(c.estado) AS estado_int,
        MAX(c.fecha_crea) AS fecha_crea,
        CASE
          WHEN MAX(c.estado) = 1 THEN 'por_pagar'
          WHEN MAX(c.estado) = 2 THEN 'pagado'
          ELSE 'anulado'
        END AS status
      FROM detalle_comisiones dc
      INNER JOIN comisiones c ON c.id_comision = dc.comision_id
      INNER JOIN usuarios u ON dc.usuario_id = u.id_usuario
      ${where}
      GROUP BY dc.usuario_id, u.nick, u.nombre, u.apellido, u.foto
      ORDER BY SUM(dc.comision) DESC
    `;
    return await query<any[]>(sql, sqlParams);
  }

  static async create(data: any): Promise<string> {
    const id = generateUUID();
    await BaseRepository.insert(query, 'comisiones', {
      id_comision: id,
      ...data,
      estado: 1,
      fecha_crea: getNowInBusinessTimezone()
    });
    return id;
  }

  static async getDetails(usuarioId: string) {
    return await query(
      `
      SELECT
        c.id_comision AS id,
        c.fecha_crea AS fecha_hora,
        v.codigo AS codigo_venta,
        NULL AS codigo_servicio,
        'venta' AS tipo,
        c.monto AS monto,
        CASE
          WHEN c.estado = 1 THEN 'Por pagar'
          WHEN c.estado = 2 THEN 'Pagado'
          ELSE 'Anulado'
        END AS estado,
        p.nombre AS producto,
        NULL AS fecha_pago,
        v.codigo AS descripcion
      FROM comisiones c
      INNER JOIN detalle_comisiones dc ON c.id_comision = dc.comision_id
      INNER JOIN usuarios u ON dc.usuario_id = u.id_usuario
      LEFT JOIN ventas v ON c.venta_id = v.id_venta
      -- Intentamos unir con el detalle de venta para obtener el nombre del producto
      LEFT JOIN detalle_ventas dv ON (v.id_venta = dv.venta_id AND dc.usuario_id = dv.hostess_id AND (c.monto = dv.comision OR c.monto = (dv.comision * dv.cantidad)))
      LEFT JOIN productos p ON dv.producto_id = p.id_producto
      WHERE dc.usuario_id = ? AND c.venta_id IS NOT NULL AND c.venta_id <> '' AND c.venta_id <> '0'

      UNION ALL

      SELECT
        c.id_comision AS id,
        c.fecha_crea AS fecha_hora,
        NULL AS codigo_venta,
        s.codigo AS codigo_servicio,
        'servicio' AS tipo,
        c.monto AS monto,
        CASE
          WHEN c.estado = 1 THEN 'Por pagar'
          WHEN c.estado = 2 THEN 'Pagado'
          ELSE 'Anulado'
        END AS estado,
        'Servicio de Acompañante' AS producto,
        NULL AS fecha_pago,
        s.codigo AS descripcion
      FROM comisiones c
      INNER JOIN detalle_comisiones dc ON c.id_comision = dc.comision_id
      INNER JOIN usuarios u ON dc.usuario_id = u.id_usuario
      LEFT JOIN servicios s ON c.servicio_id = s.id_servicio
      WHERE dc.usuario_id = ? AND c.servicio_id IS NOT NULL AND c.servicio_id <> '' AND c.servicio_id <> '0'

      ORDER BY fecha_hora DESC
    `,
      [usuarioId, usuarioId]
    );
  }

  static async delete(id: string) {
    await BaseRepository.update(query, 'comisiones', 'id_comision', id, { estado: 0 });
  }

  static async update(id: string, data: any) {
    await BaseRepository.update(query, 'comisiones', 'id_comision', id, data);
  }
}
