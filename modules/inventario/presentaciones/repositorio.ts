/**
 * Presentaciones: el formato en que se vende un producto (botella, caja,
 * shot, media) con su stock, su precio y su código de barras.
 * Infraestructura privada del módulo: nadie fuera de `modules/inventario`
 * importa este archivo (§5). Mismo SQL y mismas reglas que la capa heredada
 * (`PresentacionQueries`): este corte mueve código, no cambia comportamiento.
 */
import { query, generateUUID, withTransaction, type TransactionQuery } from '@/lib/database/db';
import { mapPresentacion } from '../helpers';
import { ESTADO_UNIDAD_ACTIVA } from '../estados';
import type { PresentacionRow } from '../tipos';
import type { NuevaPresentacionInput, PresentacionCamposInput } from '../contracts';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { BaseRepository } from '@/lib/database/base-repository';
import { ConflictError, NotFoundError } from '@/lib/errors/errors';

type Ejecutor = TransactionQuery | typeof query;

export async function listarPresentacionesPorProductos(
  productoIds: string[],
  trx: Ejecutor = query
): Promise<Record<string, PresentacionRow[]>> {
  const map: Record<string, PresentacionRow[]> = {};
  const ids = [...new Set(productoIds.filter(Boolean))];
  if (ids.length === 0) return map;
  const placeholders = ids.map(() => '?').join(',');
  const rows = await trx<any[]>(
    `SELECT p.*,
      (SELECT COUNT(*) FROM inventario_unidades u WHERE u.presentacion_id = p.id AND u.estado = '${ESTADO_UNIDAD_ACTIVA}' AND u.ubicacion = 'almacen') AS stock, (SELECT COUNT(*) FROM inventario_unidades u WHERE u.presentacion_id = p.id AND u.estado = '${ESTADO_UNIDAD_ACTIVA}' AND u.ubicacion = 'bar') AS stock_bar
     FROM inventario_presentaciones p
     WHERE p.producto_id IN (${placeholders})
     ORDER BY p.fecha_crea ASC, p.id ASC`,
    ids
  );
  for (const row of rows) {
    const pres = mapPresentacion(row);
    (map[pres.producto_id] ??= []).push(pres);
  }
  return map;
}

export async function listarPresentaciones(
  productoId: string,
  trx: Ejecutor = query
): Promise<PresentacionRow[]> {
  const rows = await trx<any[]>(
    `SELECT p.*,
      (SELECT COUNT(*) FROM inventario_unidades u WHERE u.presentacion_id = p.id AND u.estado = '${ESTADO_UNIDAD_ACTIVA}' AND u.ubicacion = 'almacen') AS stock, (SELECT COUNT(*) FROM inventario_unidades u WHERE u.presentacion_id = p.id AND u.estado = '${ESTADO_UNIDAD_ACTIVA}' AND u.ubicacion = 'bar') AS stock_bar,
      (SELECT COALESCE(SUM(u.ml_restante), 0) FROM inventario_unidades u WHERE u.presentacion_id = p.id AND u.estado = '${ESTADO_UNIDAD_ACTIVA}' AND u.ubicacion = 'bar') AS ml_abierta
     FROM inventario_presentaciones p
     WHERE p.producto_id = ?
     ORDER BY p.fecha_crea ASC, p.id ASC`,
    [productoId]
  );
  return rows.map(mapPresentacion);
}

export async function crearPresentacion(
  trx: TransactionQuery,
  data: NuevaPresentacionInput
): Promise<PresentacionRow> {
  const id = generateUUID();
  await BaseRepository.insert(trx, 'inventario_presentaciones', {
    id,
    producto_id: data.producto_id,
    nombre: data.nombre,
    codigo_barras: data.codigo_barras?.trim() ? data.codigo_barras.trim() : null,
    precio_compra: data.precio_compra ?? 0,
    stock_minimo: data.stock_minimo ?? null,
    stock_maximo: data.stock_maximo ?? null,
    foto: data.foto || null,
    fecha_crea: getNowInBusinessTimezone()
  });
  const row = await BaseRepository.findOne<any>(trx, 'inventario_presentaciones', 'id', id);
  return mapPresentacion(row);
}

export async function eliminarPresentacion(id: string): Promise<void> {
  await withTransaction(async trx => {
    const [presentacion] = await trx<{ id: string }[]>(
      'SELECT id FROM inventario_presentaciones WHERE id = ? FOR UPDATE',
      [id]
    );
    if (!presentacion) throw new NotFoundError('Presentación', id);

    const [deps] = await trx<
      {
        unidades: string;
        movimientos: string;
        consumos: string;
        compras: string;
        ventas: string;
        colaciones: string;
        entradas: string;
        entradas_productos: string;
        reposicion: string;
        servicios: string;
        solicitudes: string;
      }[]
    >(
      `SELECT
         (SELECT COUNT(*) FROM inventario_unidades WHERE presentacion_id = ?) AS unidades,
         (SELECT COUNT(*) FROM inventario_movimientos WHERE presentacion_id = ?) AS movimientos,
         (SELECT COUNT(*) FROM inventario_movimiento_unidades mu
            INNER JOIN inventario_unidades u ON u.id = mu.unidad_id
           WHERE u.presentacion_id = ?) AS consumos,
         (SELECT COUNT(*) FROM detalle_compras WHERE presentacion_id = ?) AS compras,
         (SELECT COUNT(*) FROM detalle_ventas WHERE presentacion_id = ?) AS ventas,
         (SELECT COUNT(*) FROM colaciones WHERE presentacion_id = ?) AS colaciones,
         (SELECT COUNT(*) FROM entradas_clientes
           WHERE cover_presentacion_id = ? OR bebida_acompanamiento_presentacion_id = ?) AS entradas,
         (SELECT COUNT(*) FROM entradas_clientes_productos
           WHERE presentacion_id = ? OR acompanamiento_presentacion_id = ?) AS entradas_productos,
         (SELECT COUNT(*) FROM ordenes_reposicion WHERE presentacion_id = ?) AS reposicion,
         (SELECT COUNT(*) FROM servicios WHERE producto_incluido_presentacion_id = ?) AS servicios,
         (SELECT COUNT(*) FROM solicitudes_servicios WHERE producto_incluido_presentacion_id = ?) AS solicitudes`,
      [id, id, id, id, id, id, id, id, id, id, id, id]
    );

    if (Object.values(deps ?? {}).some(valor => Number(valor) > 0)) {
      throw new ConflictError(
        'No se puede eliminar la presentación: tiene stock o historial asociado.'
      );
    }

    await BaseRepository.delete(trx, 'inventario_presentaciones', 'id', id);
  });
}

export async function obtenerPresentacion(id: string): Promise<PresentacionRow | null> {
  const row = await BaseRepository.findOne<any>(query, 'inventario_presentaciones', 'id', id);
  if (!row) return null;
  const withStock = await query<any[]>(
    `SELECT p.*,
      (SELECT COUNT(*) FROM inventario_unidades u WHERE u.presentacion_id = p.id AND u.estado = '${ESTADO_UNIDAD_ACTIVA}' AND u.ubicacion = 'almacen') AS stock, (SELECT COUNT(*) FROM inventario_unidades u WHERE u.presentacion_id = p.id AND u.estado = '${ESTADO_UNIDAD_ACTIVA}' AND u.ubicacion = 'bar') AS stock_bar
     FROM inventario_presentaciones p WHERE p.id = ? LIMIT 1`,
    [id]
  );
  return withStock.length > 0 ? mapPresentacion(withStock[0]) : null;
}

export async function actualizarFotoPresentacion(id: string, foto: string): Promise<void> {
  await BaseRepository.update(query, 'inventario_presentaciones', 'id', id, { foto });
}

export async function actualizarPresentacion(
  id: string,
  fields: PresentacionCamposInput
): Promise<void> {
  const data: Record<string, unknown> = {};
  if (fields.stock_minimo !== undefined) data.stock_minimo = fields.stock_minimo;
  if (fields.stock_maximo !== undefined) data.stock_maximo = fields.stock_maximo;
  if (fields.nombre !== undefined) data.nombre = fields.nombre;
  if (fields.codigo_barras !== undefined)
    data.codigo_barras = fields.codigo_barras?.trim() ? fields.codigo_barras.trim() : null;
  if (fields.precio_compra !== undefined) data.precio_compra = fields.precio_compra;
  if (fields.precio_venta !== undefined) data.precio_venta = fields.precio_venta;
  if (fields.comision !== undefined) data.comision = fields.comision;
  if (fields.opciones_venta !== undefined)
    data.opciones_venta = JSON.stringify(fields.opciones_venta);
  if (fields.ml_botella !== undefined) data.ml_botella = fields.ml_botella;
  if (Object.keys(data).length === 0) return;
  await BaseRepository.update(query, 'inventario_presentaciones', 'id', id, data);
}

export async function buscarPresentacionPorCodigo(
  codigoBarras: string,
  trx: Ejecutor = query
): Promise<PresentacionRow | null> {
  const rows = await trx<any[]>(
    'SELECT * FROM inventario_presentaciones WHERE codigo_barras = ? LIMIT 1',
    [codigoBarras]
  );
  return rows.length > 0 ? mapPresentacion(rows[0]) : null;
}
