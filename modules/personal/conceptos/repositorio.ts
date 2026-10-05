import type { ContextoOperacion } from '@/lib/transaccion/contrato';
import { resolverTransaccion } from '@/lib/transaccion/infraestructura';
import { generateUUID, query } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { TipRegisterSchema } from '@/lib/business/schemas';
import { BaseRepository } from '@/lib/database/base-repository';
import { DatabaseError } from '@/lib/errors/errors';
import { logger } from '@/lib/utils/logger';
import { z } from 'zod';
import type { ComisionVenta, DetalleComisionVenta } from '../contracts';
type TipRegisterInput = z.input<typeof TipRegisterSchema>;
export async function insertarComisiones(
  contexto: ContextoOperacion,
  mainRows: ComisionVenta[],
  detailRows: DetalleComisionVenta[]
): Promise<void> {
  const trx = resolverTransaccion(contexto);
  if (mainRows.length === 0) return;

  // Batch insert comisiones
  const mainColumns = ['id_comision', 'venta_id', 'monto', 'estado', 'fecha_crea'] as const;
  const mainPlaceholders = mainRows
    .map(() => `(${mainColumns.map(() => '?').join(', ')})`)
    .join(', ');
  const mainValues = mainRows.flatMap(row => mainColumns.map(col => row[col]));

  await trx(
    `INSERT INTO comisiones (${mainColumns.join(', ')}) VALUES ${mainPlaceholders}`,
    mainValues
  );

  // Batch insert detalle_comisiones
  const detailCols = [
    'id_detalle_comision',
    'comision_id',
    'usuario_id',
    'comision',
    'estado',
    'fecha_crea'
  ] as const;
  const detailPlaceholders = detailRows
    .map(() => `(${detailCols.map(() => '?').join(', ')})`)
    .join(', ');
  const detailValues = detailRows.flatMap(row => detailCols.map(col => row[col]));

  await trx(
    `INSERT INTO detalle_comisiones (${detailCols.join(', ')}) VALUES ${detailPlaceholders}`,
    detailValues
  );
}
export async function insertarPropina(body: TipRegisterInput, contexto: ContextoOperacion) {
  const trx = resolverTransaccion(contexto);
  try {
    const { venta_id, monto, usuario_ids } = TipRegisterSchema.parse(body);

    const usuarioIdsNormalizados = Array.from(
      new Set((usuario_ids || []).map(id => String(id)).filter(Boolean))
    );

    // La selección manual también debe cumplir las reglas de elegibilidad.
    const distribucionUsuarios = await trx<any[]>(
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

      {
        await BaseRepository.insert(trx, 'propinas', {
          id_propina: id,
          venta_id,
          propina: monto,
          estado: 1,
          fecha_crea: now
        });
      }

      return { id, mensaje: 'Propina registrada sin distribución (sin usuarios activos)' };
    }

    const usuariosCount = distribucionUsuarios.length;
    const montoBase = Math.floor(monto / usuariosCount);
    const resto = Math.round(monto - montoBase * usuariosCount);
    const now = getNowInBusinessTimezone();
    const id = generateUUID();

    {
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
    }

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

/**
 * Reversión de conceptos por anulación total de una venta. Mismo SQL que
 * ejecutaba `SaleQueries.updateStatus`: las comisiones se dan de baja y las
 * propinas se borran, porque la venta deja de existir como hecho comercial.
 */
export async function anularComisionesVenta(
  ventaId: string,
  contexto: ContextoOperacion
): Promise<void> {
  const trx = resolverTransaccion(contexto);
  await trx('UPDATE comisiones SET estado = 0 WHERE venta_id = ?', [ventaId]);
  await trx(
    `UPDATE detalle_comisiones dc SET estado = 0 FROM comisiones c WHERE c.id_comision = dc.comision_id AND c.venta_id = ?`,
    [ventaId]
  );
}

export async function anularPropinasVenta(
  ventaId: string,
  contexto: ContextoOperacion
): Promise<void> {
  const trx = resolverTransaccion(contexto);
  await trx(
    'DELETE FROM detalle_propinas WHERE propina_id IN (SELECT id_propina FROM propinas WHERE venta_id = ?)',
    [ventaId]
  );
  await trx('DELETE FROM propinas WHERE venta_id = ?', [ventaId]);
}

/**
 * Reversión de comisiones por anulación de un servicio. Mismo SQL que
 * ejecutaba `approveAnulacionServicio`: las comisiones se dan de baja, no se
 * borran, para conservar el historial de lo que se pagó.
 */
export async function anularComisionesServicio(
  servicioId: string,
  contexto: ContextoOperacion
): Promise<void> {
  const trx = resolverTransaccion(contexto);
  await trx('UPDATE comisiones SET estado = 0 WHERE servicio_id = ?', [servicioId]);
  await trx(
    `UPDATE detalle_comisiones dc SET estado = 0 FROM comisiones c WHERE c.id_comision = dc.comision_id AND c.servicio_id = ?`,
    [servicioId]
  );
}

export async function leerComisionTotalServicio(
  servicioId: string,
  contexto: ContextoOperacion
): Promise<number> {
  const trx = resolverTransaccion(contexto);
  const rows = await trx<{ total_comision: number }[]>(
    `SELECT COALESCE(SUM(dc.comision), 0) as total_comision
       FROM detalle_comisiones dc
       INNER JOIN comisiones c ON c.id_comision = dc.comision_id
      WHERE c.servicio_id = ? AND c.estado = 1 AND dc.estado = 1`,
    [servicioId]
  );
  return Number(rows[0]?.total_comision || 0);
}

/**
 * Lecturas de propinas. Mismo SQL que `TipRepository`: resumen por usuario,
 * propinas de un usuario, detalle por fechas y propina con participantes.
 * Cruzan `usuarios`, `ventas` y `cajas` en lectura para mostrar nombres y
 * filtrar por turno; la fase 6 las acotará.
 */

export async function leerResumenPropinas(
  isAdmin: boolean,
  userId: string,
  cajaActiva: boolean
): Promise<any[]> {
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
    logger.error('[personal/conceptos] Error en leerResumenPropinas:', { isAdmin, userId, err });
    throw new DatabaseError('Error al obtener resumen de propinas', err);
  }
}

export async function leerPropinasDeUsuario(userId: string): Promise<any[]> {
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
    logger.error('[personal/conceptos] Error en leerPropinasDeUsuario:', { userId, err });
    throw new DatabaseError(`Error al obtener propinas del usuario ${userId}`, err);
  }
}

export async function leerDetallePropinas(
  usuario_id: string,
  startDate?: string,
  endDate?: string
): Promise<any[]> {
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
    logger.error('[personal/conceptos] Error en leerDetallePropinas:', { usuario_id, err });
    throw new DatabaseError(`Error al obtener detalle de propinas del usuario ${usuario_id}`, err);
  }
}

export async function obtenerPropinaConParticipantes(id: string): Promise<any | null> {
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
    logger.error('[personal/conceptos] Error en obtenerPropinaConParticipantes:', { id, err });
    throw new DatabaseError(`Error al obtener propina ${id}`, err);
  }
}

export interface ComisionServicio {
  id_comision: string;
  servicio_id: string;
  monto: number;
  estado: number;
  fecha_crea: string;
}

/**
 * Alta de comisiones de un servicio. Misma inserción por lotes que
 * `insertarComisiones`, con `servicio_id` en vez de `venta_id`: la
 * creación de servicios la necesita en su misma unidad.
 */
export async function insertarComisionesServicio(
  contexto: ContextoOperacion,
  mainRows: ComisionServicio[],
  detailRows: DetalleComisionVenta[]
): Promise<void> {
  const trx = resolverTransaccion(contexto);
  if (mainRows.length === 0) return;

  const mainColumns = ['id_comision', 'servicio_id', 'monto', 'estado', 'fecha_crea'] as const;
  const mainPlaceholders = mainRows
    .map(() => `(${mainColumns.map(() => '?').join(', ')})`)
    .join(', ');
  const mainValues = mainRows.flatMap(row => mainColumns.map(col => row[col]));

  await trx(
    `INSERT INTO comisiones (${mainColumns.join(', ')}) VALUES ${mainPlaceholders}`,
    mainValues
  );

  const detailCols = [
    'id_detalle_comision',
    'comision_id',
    'usuario_id',
    'comision',
    'estado',
    'fecha_crea'
  ] as const;
  const detailPlaceholders = detailRows
    .map(() => `(${detailCols.map(() => '?').join(', ')})`)
    .join(', ');
  const detailValues = detailRows.flatMap(row => detailCols.map(col => row[col]));

  await trx(
    `INSERT INTO detalle_comisiones (${detailCols.join(', ')}) VALUES ${detailPlaceholders}`,
    detailValues
  );
}

export type ComisionAnulacionFila = {
  id_comision: string;
  monto: number;
  id_detalle_comision: string;
  comision: number;
};

export type PropinaAnulacionFila = {
  id_detalle_propina: string;
  propina_id: string;
  monto: number;
};

export async function leerComisionesVenta(
  ventaId: string,
  contexto: ContextoOperacion
): Promise<ComisionAnulacionFila[]> {
  const trx = resolverTransaccion(contexto);
  return await trx<ComisionAnulacionFila[]>(
    `SELECT c.id_comision, c.monto, dc.id_detalle_comision, dc.comision
       FROM comisiones c INNER JOIN detalle_comisiones dc ON dc.comision_id = c.id_comision
      WHERE c.venta_id = ? AND c.estado = 1 AND dc.estado = 1 ORDER BY c.id_comision ASC`,
    [ventaId]
  );
}

export async function ajustarComisionesVenta(
  filas: { id_comision: string; id_detalle_comision: string; monto: number }[],
  contexto: ContextoOperacion
): Promise<void> {
  const trx = resolverTransaccion(contexto);
  for (const fila of filas) {
    await trx('UPDATE detalle_comisiones SET comision = ? WHERE id_detalle_comision = ?', [
      fila.monto,
      fila.id_detalle_comision
    ]);
    await trx('UPDATE comisiones SET monto = ? WHERE id_comision = ?', [
      fila.monto,
      fila.id_comision
    ]);
  }
}

export async function leerPropinasVenta(
  ventaId: string,
  contexto: ContextoOperacion
): Promise<{
  cabeceras: { id_propina: string; propina: number }[];
  detalles: PropinaAnulacionFila[];
}> {
  const trx = resolverTransaccion(contexto);
  const cabeceras = await trx<{ id_propina: string; propina: number }[]>(
    'SELECT id_propina, propina FROM propinas WHERE venta_id = ? AND estado = 1 ORDER BY id_propina ASC',
    [ventaId]
  );
  const detalles = await trx<PropinaAnulacionFila[]>(
    `SELECT dp.id_detalle_propina, dp.propina_id, dp.monto
       FROM detalle_propinas dp INNER JOIN propinas p ON p.id_propina = dp.propina_id
      WHERE p.venta_id = ? AND COALESCE(dp.estado, 1) = 1 ORDER BY dp.id_detalle_propina ASC`,
    [ventaId]
  );
  return { cabeceras, detalles };
}

export async function ajustarPropinasVenta(
  detalles: { id_detalle_propina: string; propina_id: string; monto: number }[],
  cabeceras: { id_propina: string; propina: number }[],
  contexto: ContextoOperacion
): Promise<void> {
  const trx = resolverTransaccion(contexto);
  for (const detalle of detalles) {
    await trx('UPDATE detalle_propinas SET monto = ? WHERE id_detalle_propina = ?', [
      detalle.monto,
      detalle.id_detalle_propina
    ]);
  }
  for (const cabecera of cabeceras) {
    await trx('UPDATE propinas SET propina = ?, fecha_mod = ? WHERE id_propina = ?', [
      cabecera.propina,
      getNowInBusinessTimezone(),
      cabecera.id_propina
    ]);
  }
}

/**
 * Agregados de comisiones. Mismo SQL que `CommissionRepository`: resumen con
 * reparto venta/servicio, listado por empleado, alta, detalle por usuario,
 * edición y baja lógica.
 */

export async function resumirComisiones(): Promise<any> {
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

export async function listarComisiones(params: {
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

export async function crearComision(data: Record<string, unknown>): Promise<string> {
  const id = generateUUID();
  await BaseRepository.insert(query, 'comisiones', {
    id_comision: id,
    ...data,
    estado: 1,
    fecha_crea: getNowInBusinessTimezone()
  });
  return id;
}

export async function detalleComisionesDeUsuario(usuarioId: string): Promise<any> {
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

export async function actualizarComision(id: string, data: Record<string, unknown>): Promise<void> {
  await BaseRepository.update(query, 'comisiones', 'id_comision', id, data);
}

export async function anularComision(id: string): Promise<void> {
  await BaseRepository.update(query, 'comisiones', 'id_comision', id, { estado: 0 });
}

export async function insertarComisionConDetalle(
  data: { venta_id: string; usuario_id: string; monto: number },
  contexto: ContextoOperacion
): Promise<void> {
  const trx = resolverTransaccion(contexto);
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
