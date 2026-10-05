import type { ContextoOperacion } from '@/lib/transaccion/contrato';
import { resolverTransaccion } from '@/lib/transaccion/infraestructura';
import { generateUUID } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { TipRegisterSchema } from '@/lib/business/schemas';
import { BaseRepository } from '@/lib/repositories/BaseRepository';
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
