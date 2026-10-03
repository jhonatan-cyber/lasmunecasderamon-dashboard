/**
 * Presentaciones: el formato en que se vende un producto (botella, caja, shot, media) con su
 * stock, su precio y su código de barras.
 */
import { query, withTransaction, generateUUID } from '@/lib/database/db';
import { mapPresentacion, mapUnidad } from './inventoryHelpers';
import { ESTADO_UNIDAD_ACTIVA } from './inventoryHelpers';
import type { PresentacionRow, UnidadRow } from './inventoryTypes';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { BaseRepository } from '../BaseRepository';
import type { Queryable } from './inventoryTypes';

export class PresentacionQueries {
  static async listPresentationsByProducts(
    productoIds: string[],
    trx: Queryable = query
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

  static async listPresentations(
    productoId: string,
    trx: Queryable = query
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

  static async createPresentation(
    trx: Queryable,
    data: {
      producto_id: string;
      nombre: string;
      codigo_barras?: string | null;
      precio_compra?: number;
      foto?: string | null;
    }
  ): Promise<PresentacionRow> {
    const id = generateUUID();
    await BaseRepository.insert(trx, 'inventario_presentaciones', {
      id,
      producto_id: data.producto_id,
      nombre: data.nombre,
      codigo_barras: data.codigo_barras?.trim() ? data.codigo_barras.trim() : null,
      precio_compra: data.precio_compra ?? 0,
      foto: data.foto || null,
      fecha_crea: getNowInBusinessTimezone()
    });
    const row = await BaseRepository.findOne<any>(trx, 'inventario_presentaciones', 'id', id);
    return mapPresentacion(row);
  }

  static async deletePresentation(id: string): Promise<void> {
    await BaseRepository.delete(query, 'inventario_presentaciones', 'id', id);
  }

  static async getPresentationById(id: string): Promise<PresentacionRow | null> {
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

  static async updatePresentationFoto(id: string, foto: string): Promise<void> {
    await BaseRepository.update(query, 'inventario_presentaciones', 'id', id, { foto });
  }

  static async updatePresentation(
    id: string,
    fields: {
      nombre?: string;
      codigo_barras?: string | null;
      precio_compra?: number;
      precio_venta?: number;
      comision?: number;
      ml_botella?: number | null;
    }
  ): Promise<void> {
    const data: Record<string, unknown> = {};
    if (fields.nombre !== undefined) data.nombre = fields.nombre;
    if (fields.codigo_barras !== undefined)
      data.codigo_barras = fields.codigo_barras?.trim() ? fields.codigo_barras.trim() : null;
    if (fields.precio_compra !== undefined) data.precio_compra = fields.precio_compra;
    if (fields.precio_venta !== undefined) data.precio_venta = fields.precio_venta;
    if (fields.comision !== undefined) data.comision = fields.comision;
    if (fields.ml_botella !== undefined) data.ml_botella = fields.ml_botella;
    if (Object.keys(data).length === 0) return;
    await BaseRepository.update(query, 'inventario_presentaciones', 'id', id, data);
  }

  static async createPresentationStandalone(data: {
    producto_id: string;
    nombre: string;
    codigo_barras?: string | null;
    precio_compra?: number;
    foto?: string | null;
  }): Promise<PresentacionRow> {
    let creada: PresentacionRow | null = null;
    await withTransaction(async trx => {
      creada = await this.createPresentation(trx, data);
    });
    return creada!;
  }

  static async findByBarcode(
    codigoBarras: string,
    trx: Queryable = query
  ): Promise<PresentacionRow | null> {
    const rows = await trx<any[]>(
      'SELECT * FROM inventario_presentaciones WHERE codigo_barras = ? LIMIT 1',
      [codigoBarras]
    );
    return rows.length > 0 ? mapPresentacion(rows[0]) : null;
  }

  static async findByUnitBarcode(
    codigoBarras: string,
    trx: Queryable = query
  ): Promise<UnidadRow | null> {
    const rows = await trx<any[]>(
      'SELECT * FROM inventario_unidades WHERE codigo_barras = ? LIMIT 1',
      [codigoBarras]
    );
    return rows.length > 0 ? mapUnidad(rows[0]) : null;
  }

  /**
   * Busca el envase escaneado por su EAN-13 interno o por su SKU `LM-…` y
   * bloquea la fila hasta que termine la transacción (`FOR UPDATE OF u`), para
   * que la lectura y la marca del control de envases sean atómicas.
   */
}
