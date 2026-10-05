/**
 * Unidades físicas de una presentación: las botellas individuales con su
 * código interno. Infraestructura privada del módulo: nadie fuera de
 * `modules/inventario` importa este archivo (§5).
 *
 * Acá viven la generación de códigos y EAN, la impresión de etiquetas, los
 * cambios de estado y el recálculo de stock; el resto del módulo (bar,
 * transferencias, envases) usa `sincronizarStockTotal` para mantener
 * `productos.stock_almacen` consistente. Mismo SQL que la capa heredada
 * (`UnidadQueries`): este corte mueve código, no cambia comportamiento.
 */
import { query, withTransaction, generateUUID, type TransactionQuery } from '@/lib/database/db';
import { generarEan13Interno, mapUnidad } from '../helpers';
import { ESTADO_UNIDAD_ACTIVA } from '../estados';
import type { UnidadRow } from '../tipos';
import { BusinessError } from '@/lib/errors/errors';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { BaseRepository } from '@/lib/database/base-repository';

async function nextCodigos(trx: TransactionQuery, count: number): Promise<string[]> {
  const rows = await trx<any[]>(
    "SELECT nextval('inventario_sku_seq') AS seq FROM generate_series(1, ?)",
    [count]
  );
  return rows.map(r => `LM-${String(Number(r?.seq ?? 0)).padStart(6, '0')}`);
}

async function asignarBarrasUnicas(trx: TransactionQuery, count: number): Promise<string[]> {
  const result: string[] = [];
  const used = new Set<string>();
  let pending = count;
  for (let intento = 0; intento < 20 && pending > 0; intento++) {
    const candidates: string[] = [];
    while (candidates.length < pending) {
      const candidato = generarEan13Interno();
      if (!used.has(candidato) && !candidates.includes(candidato)) candidates.push(candidato);
    }
    const placeholders = candidates.map(() => '?').join(',');
    const rows = await trx<any[]>(
      `SELECT codigo_barras FROM inventario_unidades WHERE codigo_barras IN (${placeholders})`,
      candidates
    );
    const taken = new Set(rows.map(r => String(r.codigo_barras)));
    for (const candidato of candidates) {
      if (taken.has(candidato)) continue;
      used.add(candidato);
      result.push(candidato);
    }
    pending = count - result.length;
  }
  if (result.length < count) {
    throw new BusinessError('No se pudo generar un código de barras único');
  }
  return result;
}

async function asignarBarraUnica(trx: TransactionQuery, unidadId: string | null): Promise<string> {
  const [codigo] = await asignarBarrasUnicas(trx, 1);
  if (unidadId) {
    await BaseRepository.update(trx, 'inventario_unidades', 'id', unidadId, {
      codigo_barras: codigo
    });
  }
  return codigo;
}

export async function contarUnidades(
  trx: TransactionQuery,
  productoId: string,
  ubicacion: string = 'almacen'
): Promise<number> {
  const rows = await trx<any[]>(
    `SELECT COUNT(*) AS total FROM inventario_unidades WHERE producto_id = ? AND estado = '${ESTADO_UNIDAD_ACTIVA}' AND ubicacion = ?`,
    [productoId, ubicacion]
  );
  return Number(rows[0]?.total ?? 0);
}

export async function cambiarEstadoUnidades(
  trx: TransactionQuery,
  unidadIds: string[],
  estado: string
): Promise<void> {
  const ids = [...new Set(unidadIds.filter(Boolean))];
  if (ids.length === 0) return;
  const placeholders = ids.map(() => '?').join(',');
  await trx(`UPDATE inventario_unidades SET estado = ? WHERE id IN (${placeholders})`, [
    estado,
    ...ids
  ]);
}

export async function listarUnidades(
  productoId: string,
  limit = 1000,
  ubicacion?: string,
  presentacionId?: string
): Promise<{ total: number; inactivas: number; unidades: UnidadRow[] }> {
  const total = presentacionId
    ? Number(
        (
          await query<any[]>(
            `SELECT COUNT(*) AS total FROM inventario_unidades WHERE producto_id = ? AND presentacion_id = ? AND estado = '${ESTADO_UNIDAD_ACTIVA}' AND ubicacion = 'almacen'`,
            [productoId, presentacionId]
          )
        )[0]?.total ?? 0
      )
    : await contarUnidades(query, productoId);
  const params: any[] = [productoId];
  let whereUbicacion = '';
  if (ubicacion) {
    whereUbicacion = 'AND ubicacion = ?';
    params.push(ubicacion);
  }
  if (presentacionId) {
    whereUbicacion += ' AND presentacion_id = ?';
    params.push(presentacionId);
  }
  params.push(limit);
  const rows = await query<any[]>(
    `SELECT inventario_unidades.*, (SELECT c.folio FROM compras c WHERE c.id = inventario_unidades.compra_id) AS compra_folio FROM inventario_unidades WHERE producto_id = ? ${whereUbicacion} ORDER BY fecha_crea DESC, codigo DESC LIMIT ?`,
    params
  );
  const inactivas = rows.filter(r => r.estado !== ESTADO_UNIDAD_ACTIVA).length;
  const unidades = rows.map(mapUnidad);
  // Backfill: unidades creadas antes de la migración 009 no tienen barra.
  let reparadas = false;
  for (const u of unidades) {
    if (!u.codigo_barras) {
      u.codigo_barras = await asignarBarraUnica(query, u.id);
      reparadas = true;
    }
  }
  if (reparadas) {
    const freshParams: any[] = [productoId];
    if (ubicacion) freshParams.push(ubicacion);
    if (presentacionId) freshParams.push(presentacionId);
    freshParams.push(limit);
    const fresh = await query<any[]>(
      `SELECT inventario_unidades.*, (SELECT c.folio FROM compras c WHERE c.id = inventario_unidades.compra_id) AS compra_folio FROM inventario_unidades WHERE producto_id = ? ${whereUbicacion} ORDER BY fecha_crea DESC, codigo DESC LIMIT ?`,
      freshParams
    );
    return { total, inactivas, unidades: fresh.map(mapUnidad) };
  }
  return { total, inactivas, unidades };
}

/** Marca los códigos como impresos; exige que todos sigan existiendo. */
export async function marcarImpresas(
  trx: TransactionQuery,
  ids: string[]
): Promise<{ id: string; fecha_impresion: string }[]> {
  const rows = await trx<any[]>(
    `SELECT id FROM inventario_unidades WHERE id IN (${ids.map(() => '?').join(',')}) FOR UPDATE`,
    ids
  );
  if (rows.length !== ids.length)
    throw new BusinessError('Algunos códigos ya no existen. Actualiza el inventario.');
  return await trx<{ id: string; fecha_impresion: string }[]>(
    `UPDATE inventario_unidades SET fecha_impresion = CURRENT_TIMESTAMP
     WHERE id IN (${ids.map(() => '?').join(',')}) RETURNING id, fecha_impresion`,
    ids
  );
}

export async function generarUnidades(
  trx: TransactionQuery,
  productoId: string,
  count: number,
  presentacionId?: string | null,
  compraId?: string | null
): Promise<{ id: string; codigo: string; codigo_barras: string }[]> {
  if (count <= 0) return [];
  const [codigos, barcodes] = await Promise.all([
    nextCodigos(trx, count),
    asignarBarrasUnicas(trx, count)
  ]);
  const fechaCrea = getNowInBusinessTimezone();
  const rows = codigos.map((codigo, i) => ({
    id: generateUUID(),
    producto_id: productoId,
    presentacion_id: presentacionId ?? null,
    codigo,
    codigo_barras: barcodes[i],
    ...(compraId ? { compra_id: compraId } : {}),
    ubicacion: 'almacen',
    estado: 'almacen',
    fecha_crea: fechaCrea
  }));
  const columns = Object.keys(rows[0]).join(', ');
  const placeholders = rows
    .map(
      () =>
        `(${Object.keys(rows[0])
          .map(() => '?')
          .join(', ')})`
    )
    .join(', ');
  const values = rows.flatMap(row => Object.values(row));
  await trx(`INSERT INTO inventario_unidades (${columns}) VALUES ${placeholders}`, values);
  return rows.map(r => ({ id: r.id, codigo: r.codigo, codigo_barras: r.codigo_barras }));
}

export async function sincronizarStockTotal(
  trx: TransactionQuery,
  productoId: string
): Promise<number> {
  const total = await contarUnidades(trx, productoId);
  await BaseRepository.update(trx, 'productos', 'id_producto', productoId, {
    stock_almacen: total,
    fecha_mod: getNowInBusinessTimezone()
  });
  return total;
}
