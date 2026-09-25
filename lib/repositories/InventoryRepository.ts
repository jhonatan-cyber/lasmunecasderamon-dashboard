import { query, generateUUID, withTransaction, type TransactionQuery } from '@/lib/database/db';
import { randomInt } from 'crypto';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { BaseRepository } from './BaseRepository';
import { BusinessError, NotFoundError } from '@/lib/errors/errors';
import type { SaleOption } from '@/types/sale-options';

type Queryable = TransactionQuery | typeof query;

export interface PresentacionRow {
  opciones_venta?: SaleOption[];
  id: string;
  producto_id: string;
  nombre: string;
  codigo_barras: string | null;
  precio_compra: number;
  precio_venta: number;
  comision: number;
  foto: string | null;
  stock: number;
  stock_bar?: number;
  /** Config de Comisiones (tabla productos). Null = default según precio/categoría. */
  max_anfitrionas?: number | null;
  /** Base del producto (tabla productos), último fallback de visualización. */
  producto_precio?: number;
  producto_comision?: number;
}

export interface UnidadRow {
  fecha_crea?: string | null;
  fecha_impresion?: string | null;
  compra_id?: string | null;
  compra_folio?: string | null;
  id: string;
  producto_id: string;
  presentacion_id: string | null;
  codigo: string;
  codigo_barras: string | null;
  estado: string;
}

export function parseOpcionesVenta(
  raw: unknown,
  fallback?: { precio_venta?: unknown; comision?: unknown }
): SaleOption[] | undefined {
  let value: unknown = raw;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    try {
      value = JSON.parse(trimmed);
    } catch {
      return undefined;
    }
  }
  if (Array.isArray(value)) {
    const options = (value as any[])
      .filter(o => o && typeof o.tipo === 'string')
      .map(o => ({
        tipo: o.tipo as SaleOption['tipo'],
        precio: Number(o.precio ?? 0),
        comision: Number(o.comision ?? 0)
      }));
    return options.length > 0 ? (options as SaleOption[]) : undefined;
  }
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'object') {
    const maybe = value as { opciones_venta?: unknown };
    if (maybe.opciones_venta !== undefined)
      return parseOpcionesVenta(maybe.opciones_venta, fallback);
    return undefined;
  }
  return undefined;
}

/** Tope de venta simple (`umbral_simple_hasta`). Tolerante: 10000 si falta la clave. */
export async function getTopeSimple(trx: Queryable = query): Promise<number> {
  try {
    const rows = await trx<any[]>(
      "SELECT valor FROM configuraciones WHERE clave = 'umbral_simple_hasta' LIMIT 1",
      []
    );
    const n = Number(rows[0]?.valor);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 10000;
  } catch {
    return 10000;
  }
}

export interface NivelPrecio {
  precio: number;
  comision: number;
}

/**
 * Resuelve botella recorriendo niveles en orden (traspaso → … → producto)
 * y saltando ceros. Venta simple (precio ≤ tope): sin comisión.
 */
export function resolverBotella(
  opt: NivelPrecio,
  niveles: NivelPrecio[],
  topeSimple = 10000
): SaleOption {
  const precio = [opt.precio, ...niveles.map(l => l.precio)].find(v => v > 0) ?? 0;
  const comisionBruta = [opt.comision, ...niveles.map(l => l.comision)].find(v => v > 0) ?? 0;
  return {
    tipo: 'botella',
    precio,
    comision: precio > 0 && precio <= topeSimple ? 0 : comisionBruta
  };
}

/** Aplica `resolverBotella` a la opción botella; shots pasan intactos. */
export function completarOpciones(
  raw: unknown,
  niveles: NivelPrecio[],
  topeSimple = 10000
): SaleOption[] | undefined {
  const parsed = parseOpcionesVenta(raw);
  if (!parsed) return undefined;
  return parsed.map(o =>
    o.tipo === 'botella'
      ? resolverBotella({ precio: o.precio, comision: o.comision }, niveles, topeSimple)
      : o
  );
}

const mapPresentacion = (row: any, topeSimple = 10000): PresentacionRow => {
  const niveles: NivelPrecio[] = [
    { precio: Number(row.precio_venta ?? 0), comision: Number(row.comision ?? 0) },
    { precio: Number(row.producto_precio ?? 0), comision: Number(row.producto_comision ?? 0) }
  ];
  // Cadena de visualización para botella: opción del traspaso → presentación → producto.
  const opciones = completarOpciones(row.opciones_venta, niveles, topeSimple) ?? [
    resolverBotella({ precio: 0, comision: 0 }, niveles, topeSimple)
  ];
  return {
    opciones_venta: opciones,
    id: row.id,
    producto_id: row.producto_id,
    nombre: row.nombre,
    codigo_barras: row.codigo_barras ?? null,
    precio_compra: Number(row.precio_compra ?? 0),
    precio_venta: Number(row.precio_venta ?? 0),
    comision: Number(row.comision ?? 0),
    foto: row.foto ?? null,
    stock: Number(row.stock ?? 0),
    stock_bar: row.stock_bar !== undefined ? Number(row.stock_bar) : undefined,
    max_anfitrionas:
      row.max_anfitrionas === null || row.max_anfitrionas === undefined
        ? null
        : Number(row.max_anfitrionas),
    producto_precio: Number(row.producto_precio ?? 0),
    producto_comision: Number(row.producto_comision ?? 0)
  };
};

const mapUnidad = (row: any): UnidadRow => ({
  fecha_crea: row.fecha_crea ?? null,
  fecha_impresion: row.fecha_impresion ?? null,
  compra_id: row.compra_id ?? null,
  compra_folio: row.compra_folio ?? null,
  id: row.id,
  producto_id: row.producto_id,
  presentacion_id: row.presentacion_id ?? null,
  codigo: row.codigo,
  codigo_barras: row.codigo_barras ?? null,
  estado: row.estado
});

// Nota: `estado` indica si la unidad está vigente ('almacen' = activa,
// 'inactivo' = dada de baja, 'vendida' = salió del bar con una venta) y `ubicacion`
// dónde está físicamente ('almacen' | 'bar' | ...). El conteo de stock solo suma activas.
export const ESTADO_UNIDAD_ACTIVA = 'almacen';
export const ESTADO_UNIDAD_INACTIVA = 'inactivo';
export const ESTADO_UNIDAD_VENDIDA = 'vendida';
// 'vendida' queda fuera a propósito: no se puede reactivar una botella vendida desde
// el alta/baja manual de unidades.
const ESTADOS_UNIDAD_VALIDOS = [ESTADO_UNIDAD_ACTIVA, ESTADO_UNIDAD_INACTIVA];

export function esEstadoUnidadValido(estado: unknown): estado is string {
  return typeof estado === 'string' && ESTADOS_UNIDAD_VALIDOS.includes(estado);
}

/** Prefijo GS1 reservado para códigos internos de tienda. */
const EAN_PREFIJO_INTERNO = '29';

/** Dígito verificador EAN-13 para los primeros 12 dígitos. */
export function ean13CheckDigit(digitos12: string): number {
  let suma = 0;
  for (let i = 0; i < 12; i++) {
    const d = Number(digitos12[i]);
    suma += i % 2 === 0 ? d : d * 3;
  }
  return (10 - (suma % 10)) % 10;
}

/** Genera un EAN-13 interno válido y distinto por unidad. */
export function generarEan13Interno(): string {
  let base = EAN_PREFIJO_INTERNO;
  for (let i = 0; i < 10; i++) base += String(randomInt(0, 10));
  return base + String(ean13CheckDigit(base));
}

export interface TraspasoInput {
  opciones_venta?: SaleOption[];
  producto_id: string;
  presentacion_id: string;
  cantidad: number;
  precio_venta?: number;
  comision?: number;
  usuario_id?: string | null;
}

export class InventoryRepository {
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
        (SELECT COUNT(*) FROM inventario_unidades u WHERE u.presentacion_id = p.id AND u.estado = '${ESTADO_UNIDAD_ACTIVA}' AND u.ubicacion = 'almacen') AS stock, (SELECT COUNT(*) FROM inventario_unidades u WHERE u.presentacion_id = p.id AND u.estado = '${ESTADO_UNIDAD_ACTIVA}' AND u.ubicacion = 'bar') AS stock_bar
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
    }
  ): Promise<void> {
    const data: Record<string, unknown> = {};
    if (fields.nombre !== undefined) data.nombre = fields.nombre;
    if (fields.codigo_barras !== undefined)
      data.codigo_barras = fields.codigo_barras?.trim() ? fields.codigo_barras.trim() : null;
    if (fields.precio_compra !== undefined) data.precio_compra = fields.precio_compra;
    if (fields.precio_venta !== undefined) data.precio_venta = fields.precio_venta;
    if (fields.comision !== undefined) data.comision = fields.comision;
    if (Object.keys(data).length === 0) return;
    await BaseRepository.update(query, 'inventario_presentaciones', 'id', id, data);
  }

  static async traspasarAlBar(
    trx: Queryable,
    input: TraspasoInput
  ): Promise<{ trasladadas: number; stock_bar: number }> {
    // Serializa traspasos del mismo producto, incluso entre distintas presentaciones.
    await trx('SELECT id_producto FROM productos WHERE id_producto = ? FOR UPDATE', [
      input.producto_id
    ]);
    const candidatas = await trx<any[]>(
      `SELECT id FROM inventario_unidades
       WHERE producto_id = ? AND presentacion_id = ?
         AND estado = '${ESTADO_UNIDAD_ACTIVA}' AND ubicacion = 'almacen'
       ORDER BY fecha_crea ASC, codigo ASC
       LIMIT ?
       FOR UPDATE`,
      [input.producto_id, input.presentacion_id, input.cantidad]
    );
    if (candidatas.length < input.cantidad) {
      throw new BusinessError(
        `Stock insuficiente en almacén: hay ${candidatas.length} y se pidieron ${input.cantidad}`
      );
    }
    const ids = candidatas.map(r => String(r.id));
    const placeholders = ids.map(() => '?').join(',');
    if (!input.usuario_id)
      throw new BusinessError('Se requiere el usuario que realiza la transferencia');
    const movimientoId = generateUUID();
    // Si no se envían precio/comisión, reutiliza la configuración guardada de la presentación.
    let opciones = input.opciones_venta;
    let precioVenta = input.precio_venta;
    let comision = input.comision;
    if (!opciones || opciones.length === 0) {
      const presRows = await trx<any[]>(
        'SELECT opciones_venta, precio_venta, comision FROM inventario_presentaciones WHERE id = ? LIMIT 1',
        [input.presentacion_id]
      );
      const guardadas =
        parseOpcionesVenta(presRows[0]?.opciones_venta) ??
        (presRows[0]
          ? [
              {
                tipo: 'botella' as const,
                precio: Number(presRows[0].precio_venta ?? 0),
                comision: Number(presRows[0].comision ?? 0)
              }
            ]
          : undefined);
      if (precioVenta === undefined && comision === undefined) {
        opciones = guardadas;
      } else {
        opciones = [
          {
            tipo: 'botella' as const,
            precio: Number(precioVenta ?? 0),
            comision: Number(comision ?? 0)
          }
        ];
      }
    }
    if (!opciones || opciones.length === 0) {
      throw new BusinessError(
        'La presentación no tiene precio ni comisión configurados: indícalos para la primera transferencia'
      );
    }
    const botella = opciones.find(o => o.tipo === 'botella');
    precioVenta = botella?.precio ?? opciones[0].precio ?? 0;
    comision = botella?.comision ?? opciones[0].comision ?? 0;
    if (
      !Number.isFinite(precioVenta) ||
      precioVenta < 0 ||
      !Number.isFinite(comision) ||
      comision < 0
    ) {
      throw new BusinessError(
        'La presentación no tiene precio ni comisión configurados: indícalos para la primera transferencia'
      );
    }
    const opcionesVenta = JSON.stringify(opciones);
    await BaseRepository.insert(trx, 'inventario_movimientos', {
      id: movimientoId,
      tipo: 'traspaso',
      estado: 'pendiente',
      opciones_venta: opcionesVenta,
      producto_id: input.producto_id,
      presentacion_id: input.presentacion_id,
      cantidad: input.cantidad,
      precio_venta: Math.floor(precioVenta),
      comision: Math.floor(comision),
      usuario_id: input.usuario_id,
      fecha_crea: getNowInBusinessTimezone()
    });
    await trx(
      `UPDATE inventario_unidades SET ubicacion = 'transito', transferencia_id = ? WHERE id IN (${placeholders})`,
      [movimientoId, ...ids]
    );
    await this.syncStockTotal(trx, input.producto_id);
    const enBar = await trx<any[]>(
      `SELECT COUNT(*) AS total FROM inventario_unidades
       WHERE presentacion_id = ? AND estado = '${ESTADO_UNIDAD_ACTIVA}' AND ubicacion = 'bar'`,
      [input.presentacion_id]
    );
    return { trasladadas: input.cantidad, stock_bar: Number(enBar[0]?.total ?? 0) };
  }

  static async traspasarAlBarStandalone(
    input: TraspasoInput
  ): Promise<{ trasladadas: number; stock_bar: number }> {
    let resultado = { trasladadas: 0, stock_bar: 0 };
    await withTransaction(async trx => {
      resultado = await this.traspasarAlBar(trx, input);
    });
    return resultado;
  }

  /**
   * Descuenta del bar las botellas de una venta registrada.
   *
   * Se invoca dentro de la transacción de la venta: si algo falla después, el descuento
   * se revierte junto con la venta, y si esto falla, la venta entera se revierte. Cada
   * presentación se bloquea con `FOR UPDATE` para que dos ventas simultáneas no
   * descuenten las mismas botellas (docs/INVENTARIO.md).
   *
   * Los detalles sin `presentacion_id` no se tocan: son del catálogo anterior, que no
   * tiene inventario vinculado y conserva su comportamiento.
   */
  static async consume(
    trx: Queryable,
    detalles: { presentacion_id?: string | null; cantidad?: number | null }[],
    contexto: { usuarioId: string | null; fecha: string }
  ): Promise<void> {
    const requerido = new Map<string, number>();
    for (const detalle of detalles) {
      const presentacionId = detalle.presentacion_id?.trim();
      const botellas = Math.max(0, Math.floor(Number(detalle.cantidad ?? 0)));
      if (!presentacionId || botellas === 0) continue;
      requerido.set(presentacionId, (requerido.get(presentacionId) ?? 0) + botellas);
    }

    for (const [presentacionId, botellas] of requerido) {
      const presentacion = await trx<any[]>(
        `SELECT id, producto_id, nombre, precio_venta, comision
         FROM inventario_presentaciones WHERE id = ? FOR UPDATE`,
        [presentacionId]
      );
      // Presentación borrada: las unidades quedaron huérfanas, no hay nada que descontar.
      if (presentacion.length === 0) continue;

      const unidades = await trx<any[]>(
        `SELECT id FROM inventario_unidades
          WHERE presentacion_id = ? AND estado = '${ESTADO_UNIDAD_ACTIVA}' AND ubicacion = 'bar'
          ORDER BY fecha_crea ASC, codigo ASC
          LIMIT ?`,
        [presentacionId, botellas]
      );

      if (unidades.length < botellas) {
        throw new BusinessError(
          `Quedan ${unidades.length} de ${botellas} botellas de "${presentacion[0].nombre}" en el bar`,
          'INSUFFICIENT_BAR_STOCK',
          {
            presentacion_id: presentacionId,
            disponibles: unidades.length,
            requeridas: botellas
          }
        );
      }

      const ids = unidades.map(unidad => unidad.id);
      const placeholders = ids.map(() => '?').join(',');
      await trx(
        `UPDATE inventario_unidades SET estado = '${ESTADO_UNIDAD_VENDIDA}' WHERE id IN (${placeholders})`,
        ids
      );

      // Deja la venta en el historial de la presentación: es el tercer tipo de
      // movimiento que promete el documento junto a ingresos y traspasos.
      await BaseRepository.insert(trx, 'inventario_movimientos', {
        id: generateUUID(),
        tipo: 'venta',
        estado: 'completada',
        producto_id: presentacion[0].producto_id,
        presentacion_id: presentacionId,
        cantidad: botellas,
        precio_venta: Math.floor(Number(presentacion[0].precio_venta ?? 0)),
        comision: Math.floor(Number(presentacion[0].comision ?? 0)),
        usuario_id: contexto.usuarioId,
        fecha_crea: contexto.fecha
      });
    }
  }

  static async acceptTransfer(trx: Queryable, id: string, usuarioId: string): Promise<void> {
    const receivers = await trx<any[]>(
      `SELECT u.id_usuario FROM usuarios u INNER JOIN roles r ON r.id_rol = u.rol_id
       WHERE u.id_usuario = ? AND u.estado = 1 AND r.estado = 1 AND LOWER(r.nombre) = 'barman'`,
      [usuarioId]
    );
    if (!receivers.length)
      throw new BusinessError('Solo el encargado del bar (Barman) puede aceptar la transferencia');
    const lookup = await trx<any[]>(
      "SELECT producto_id FROM inventario_movimientos WHERE id = ? AND tipo = 'traspaso'",
      [id]
    );
    if (!lookup.length) throw new NotFoundError('Transferencia', id);
    await trx('SELECT id_producto FROM productos WHERE id_producto = ? FOR UPDATE', [
      lookup[0].producto_id
    ]);
    const movements = await trx<any[]>(
      "SELECT * FROM inventario_movimientos WHERE id = ? AND tipo = 'traspaso' FOR UPDATE",
      [id]
    );
    const movement = movements[0];
    if (!movement || movement.estado !== 'pendiente')
      throw new BusinessError('La transferencia ya fue procesada o no está pendiente');
    if (movement.usuario_id === usuarioId)
      throw new BusinessError('La recepción debe confirmarla una persona distinta de quien envió');
    const units = await trx<any[]>(
      `SELECT id FROM inventario_unidades WHERE transferencia_id = ? AND ubicacion = 'transito'
       AND estado = '${ESTADO_UNIDAD_ACTIVA}' AND producto_id = ? AND presentacion_id = ? FOR UPDATE`,
      [id, movement.producto_id, movement.presentacion_id]
    );
    if (units.length !== Number(movement.cantidad))
      throw new BusinessError('Las unidades reservadas no coinciden con la cantidad enviada');
    await trx(
      "UPDATE inventario_unidades SET ubicacion = 'bar', transferencia_id = NULL WHERE transferencia_id = ?",
      [id]
    );
    await BaseRepository.update(trx, 'inventario_presentaciones', 'id', movement.presentacion_id, {
      opciones_venta: JSON.stringify(movement.opciones_venta),
      precio_venta: movement.precio_venta,
      comision: movement.comision
    });
    await BaseRepository.update(trx, 'inventario_movimientos', 'id', id, {
      estado: 'aceptada',
      aceptado_por: usuarioId,
      fecha_aceptacion: getNowInBusinessTimezone()
    });
  }

  static async acceptTransferStandalone(id: string, usuarioId: string): Promise<void> {
    await withTransaction(trx => this.acceptTransfer(trx, id, usuarioId));
  }

  static async rejectTransfer(trx: Queryable, id: string, usuarioId: string): Promise<void> {
    const resolvers = await trx<any[]>(
      `SELECT u.id_usuario FROM usuarios u INNER JOIN roles r ON r.id_rol = u.rol_id
       WHERE u.id_usuario = ? AND u.estado = 1 AND r.estado = 1 AND LOWER(r.nombre) = 'barman'`,
      [usuarioId]
    );
    if (!resolvers.length)
      throw new BusinessError('Solo el encargado del bar (Barman) puede rechazar la transferencia');
    const lookup = await trx<any[]>(
      "SELECT producto_id FROM inventario_movimientos WHERE id = ? AND tipo = 'traspaso'",
      [id]
    );
    if (!lookup.length) throw new NotFoundError('Transferencia', id);
    await trx('SELECT id_producto FROM productos WHERE id_producto = ? FOR UPDATE', [
      lookup[0].producto_id
    ]);
    const movements = await trx<any[]>(
      "SELECT * FROM inventario_movimientos WHERE id = ? AND tipo = 'traspaso' FOR UPDATE",
      [id]
    );
    const movement = movements[0];
    if (!movement) throw new NotFoundError('Transferencia', id);
    if (movement.estado !== 'pendiente')
      throw new BusinessError('La transferencia ya fue procesada o no está pendiente');
    await trx(
      "UPDATE inventario_unidades SET ubicacion = 'almacen', transferencia_id = NULL WHERE transferencia_id = ?",
      [id]
    );
    await BaseRepository.update(trx, 'inventario_movimientos', 'id', id, {
      estado: 'rechazada',
      aceptado_por: usuarioId,
      fecha_aceptacion: getNowInBusinessTimezone()
    });
    await this.syncStockTotal(trx, movement.producto_id);
  }

  static async rejectTransferStandalone(id: string, usuarioId: string): Promise<void> {
    await withTransaction(trx => this.rejectTransfer(trx, id, usuarioId));
  }

  /** Mapa producto_id → max_anfitrionas. Vacío si la columna aún no existe (migración 017 pendiente). */
  static async getMaxAnfitrionasMap(productoIds: string[]): Promise<Record<string, number | null>> {
    const ids = [...new Set(productoIds.filter(Boolean))];
    if (ids.length === 0) return {};
    try {
      const placeholders = ids.map(() => '?').join(',');
      const rows = await query<any[]>(
        `SELECT id_producto AS producto_id, max_anfitrionas FROM productos WHERE id_producto IN (${placeholders})`,
        ids
      );
      const map: Record<string, number | null> = {};
      for (const r of rows) {
        map[String(r.producto_id)] =
          r.max_anfitrionas === null || r.max_anfitrionas === undefined
            ? null
            : Number(r.max_anfitrionas);
      }
      return map;
    } catch {
      return {};
    }
  }

  static async listBarStock(productoId?: string): Promise<
    (PresentacionRow & {
      producto_nombre: string;
      producto_codigo: string;
      producto_foto: string | null;
      categoria_nombre: string | null;
    })[]
  > {
    const rows = await query<any[]>(
      `SELECT p.*,
        (SELECT COUNT(*) FROM inventario_unidades u WHERE u.presentacion_id = p.id AND u.estado = '${ESTADO_UNIDAD_ACTIVA}' AND u.ubicacion = 'almacen') AS stock,
        (SELECT COUNT(*) FROM inventario_unidades u WHERE u.presentacion_id = p.id AND u.estado = '${ESTADO_UNIDAD_ACTIVA}' AND u.ubicacion = 'bar') AS stock_bar,
        pr.nombre AS producto_nombre, pr.codigo AS producto_codigo, pr.foto AS producto_foto,
        pr.precio AS producto_precio, pr.comision AS producto_comision,
        c.nombre AS categoria_nombre
       FROM inventario_presentaciones p
       INNER JOIN productos pr ON pr.id_producto = p.producto_id
       LEFT JOIN categorias c ON c.id_categoria = pr.categoria_id
       ${productoId ? 'WHERE p.producto_id = ?' : ''}
       ORDER BY pr.nombre ASC, p.fecha_crea ASC, p.id ASC`,
      productoId ? [productoId] : []
    );
    // `productos.max_anfitrionas` puede no existir si falta la migración 017.
    // Se carga aparte y tolerante para no romper el listado del bar.
    const maxMap = await this.getMaxAnfitrionasMap([
      ...new Set(rows.map(r => String(r.producto_id)).filter(Boolean))
    ]);
    const topeSimple = await getTopeSimple();
    return rows.map(row => ({
      ...mapPresentacion(
        { ...row, max_anfitrionas: maxMap[String(row.producto_id)] ?? null },
        topeSimple
      ),
      producto_nombre: row.producto_nombre,
      producto_codigo: row.producto_codigo,
      producto_foto: row.producto_foto ?? null,
      categoria_nombre: row.categoria_nombre ?? null
    }));
  }

  static async listForSale(filters?: { category_id?: string; term?: string }): Promise<any[]> {
    const params: any[] = [];
    let whereCategoria = '';
    if (filters?.category_id) {
      whereCategoria = 'AND pr.categoria_id = ?';
      params.push(filters.category_id);
    }
    let whereTerm = '';
    const term = filters?.term?.trim();
    if (term) {
      const like = `%${term}%`;
      whereTerm =
        'AND (LOWER(pr.nombre) LIKE LOWER(?) OR LOWER(pr.codigo) LIKE LOWER(?) OR LOWER(p.nombre) LIKE LOWER(?) OR LOWER(p.codigo_barras) LIKE LOWER(?))';
      params.push(like, like, like, like);
    }
    const rows = await query<any[]>(
      `SELECT p.id AS presentacion_id, p.nombre AS presentacion_nombre,
        p.codigo_barras, p.foto AS presentacion_foto,
        p.precio_venta, p.comision AS presentacion_comision,
        (SELECT COUNT(*) FROM inventario_unidades u WHERE u.presentacion_id = p.id AND u.estado = '${ESTADO_UNIDAD_ACTIVA}' AND u.ubicacion = 'bar') AS stock_bar,
        pr.id_producto AS producto_id, pr.codigo AS producto_codigo, pr.nombre AS producto_nombre,
        pr.foto AS producto_foto, pr.categoria_id, c.nombre AS categoria_nombre
       FROM inventario_presentaciones p
       INNER JOIN productos pr ON pr.id_producto = p.producto_id AND pr.estado = 1
       LEFT JOIN categorias c ON c.id_categoria = pr.categoria_id
       WHERE EXISTS (
         SELECT 1 FROM inventario_unidades u WHERE u.presentacion_id = p.id
           AND u.estado = '${ESTADO_UNIDAD_ACTIVA}' AND u.ubicacion = 'bar'
       )
       ${whereCategoria} ${whereTerm}
       ORDER BY pr.nombre ASC, p.fecha_crea ASC, p.id ASC`,
      params
    );
    return rows.map(row => ({
      presentacion_id: row.presentacion_id,
      presentacion_nombre: row.presentacion_nombre,
      codigo_barras: row.codigo_barras ?? null,
      foto: row.presentacion_foto || row.producto_foto || 'default.png',
      precio_venta: Number(row.precio_venta ?? 0),
      comision: Number(row.presentacion_comision ?? 0),
      stock_bar: Number(row.stock_bar ?? 0),
      producto_id: row.producto_id,
      producto_codigo: row.producto_codigo,
      producto_nombre: row.producto_nombre,
      categoria_id: row.categoria_id ?? null,
      categoria_nombre: row.categoria_nombre ?? null
    }));
  }

  static async listMovimientos(presentacionId: string, limit = 20): Promise<any[]> {
    return await query<any[]>(
      `SELECT * FROM inventario_movimientos WHERE presentacion_id = ? ORDER BY fecha_crea DESC LIMIT ?`,
      [presentacionId, limit]
    );
  }

  static async listMovimientosRecientes(limit = 100): Promise<any[]> {
    try {
      const rows = await query<any[]>(
        `SELECT m.*, pr.nombre AS producto_nombre, p.nombre AS presentacion_nombre,
          u.nick AS usuario_nombre,
          r.nick AS aceptado_nombre,
          c.nombre AS categoria_nombre,
          p.precio_venta AS pres_precio, p.comision AS pres_comision,
          pr.precio AS producto_precio, pr.comision AS producto_comision
         FROM inventario_movimientos m
         LEFT JOIN productos pr ON pr.id_producto = m.producto_id
         LEFT JOIN inventario_presentaciones p ON p.id = m.presentacion_id
         LEFT JOIN categorias c ON c.id_categoria = pr.categoria_id
         LEFT JOIN usuarios u ON u.id_usuario = m.usuario_id
         LEFT JOIN usuarios r ON r.id_usuario = m.aceptado_por
         ORDER BY m.fecha_crea DESC LIMIT ?`,
        [limit]
      );
      const topeSimple = await getTopeSimple();
      return rows.map(row => ({
        ...row,
        opciones_venta:
          completarOpciones(
            row.opciones_venta,
            [
              { precio: Number(row.precio_venta ?? 0), comision: Number(row.comision ?? 0) },
              { precio: Number(row.pres_precio ?? 0), comision: Number(row.pres_comision ?? 0) },
              {
                precio: Number(row.producto_precio ?? 0),
                comision: Number(row.producto_comision ?? 0)
              }
            ],
            topeSimple
          ) ?? row.opciones_venta
      }));
    } catch {
      return [];
    }
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

  static async listTransfers(pendingOnly = false) {
    const rows = await query<any[]>(
      `SELECT m.id, m.producto_id, m.cantidad, m.fecha_crea, m.precio_venta, m.comision, m.opciones_venta, m.estado, m.usuario_id, m.aceptado_por, m.fecha_aceptacion,
        COALESCE(p.nombre, 'Producto eliminado') AS producto_nombre,
        COALESCE(pr.nombre, 'Presentación eliminada') AS presentacion_nombre,
        COALESCE(u.nick, 'Sin usuario') AS usuario_nombre,
        receptor.nick AS aceptado_nombre,
        c.nombre AS categoria_nombre,
        pr.precio_venta AS pres_precio, pr.comision AS pres_comision,
        p.precio AS producto_precio, p.comision AS producto_comision
       FROM inventario_movimientos m
       LEFT JOIN productos p ON p.id_producto = m.producto_id
       LEFT JOIN inventario_presentaciones pr ON pr.id = m.presentacion_id
       LEFT JOIN categorias c ON c.id_categoria = p.categoria_id
       LEFT JOIN usuarios u ON u.id_usuario = m.usuario_id
       LEFT JOIN usuarios receptor ON receptor.id_usuario = m.aceptado_por
        WHERE m.tipo = 'traspaso' ${pendingOnly ? "AND m.estado = 'pendiente'" : ''}
        ORDER BY (m.estado = 'pendiente') DESC, m.fecha_crea DESC, m.id DESC ${pendingOnly ? '' : 'LIMIT 100'}`,
      []
    );
    const topeSimple = await getTopeSimple();
    return rows.map(row => ({
      ...row,
      opciones_venta:
        completarOpciones(
          row.opciones_venta,
          [
            { precio: Number(row.precio_venta ?? 0), comision: Number(row.comision ?? 0) },
            { precio: Number(row.pres_precio ?? 0), comision: Number(row.pres_comision ?? 0) },
            {
              precio: Number(row.producto_precio ?? 0),
              comision: Number(row.producto_comision ?? 0)
            }
          ],
          topeSimple
        ) ??
        (row.precio_venta !== null && row.precio_venta !== undefined
          ? [
              resolverBotella(
                { precio: 0, comision: 0 },
                [
                  {
                    precio: Number(row.precio_venta ?? 0),
                    comision: Number(row.comision ?? 0)
                  }
                ],
                topeSimple
              )
            ]
          : undefined)
    })) as import('@/types/transfer').TransferRecord[];
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

  private static async nextCodigos(trx: Queryable, count: number): Promise<string[]> {
    const rows = await trx<any[]>(
      "SELECT nextval('inventario_sku_seq') AS seq FROM generate_series(1, ?)",
      [count]
    );
    return rows.map(r => `LM-${String(Number(r?.seq ?? 0)).padStart(6, '0')}`);
  }

  private static async nextCodigo(trx: Queryable): Promise<string> {
    const [codigo] = await this.nextCodigos(trx, 1);
    return codigo;
  }

  private static async assignUniqueBarcodes(trx: Queryable, count: number): Promise<string[]> {
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

  private static async assignUniqueBarcode(
    trx: Queryable,
    unidadId: string | null
  ): Promise<string> {
    const [codigo] = await this.assignUniqueBarcodes(trx, 1);
    if (unidadId) {
      await BaseRepository.update(trx, 'inventario_unidades', 'id', unidadId, {
        codigo_barras: codigo
      });
    }
    return codigo;
  }

  static async countUnits(
    productoId: string,
    trx: Queryable = query,
    ubicacion: string = 'almacen'
  ): Promise<number> {
    const rows = await trx<any[]>(
      `SELECT COUNT(*) AS total FROM inventario_unidades WHERE producto_id = ? AND estado = '${ESTADO_UNIDAD_ACTIVA}' AND ubicacion = ?`,
      [productoId, ubicacion]
    );
    return Number(rows[0]?.total ?? 0);
  }

  static async setUnitsEstado(trx: Queryable, unidadIds: string[], estado: string): Promise<void> {
    const ids = [...new Set(unidadIds.filter(Boolean))];
    if (ids.length === 0) return;
    const placeholders = ids.map(() => '?').join(',');
    await trx(`UPDATE inventario_unidades SET estado = ? WHERE id IN (${placeholders})`, [
      estado,
      ...ids
    ]);
  }

  static async setUnitsEstadoStandalone(
    productoId: string,
    unidadIds: string[],
    estado: string
  ): Promise<number> {
    let total = 0;
    await withTransaction(async trx => {
      await this.setUnitsEstado(trx, unidadIds, estado);
      total = await this.syncStockTotal(trx, productoId);
    });
    return total;
  }

  static async listUnits(
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
      : await this.countUnits(productoId);
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
        u.codigo_barras = await this.assignUniqueBarcode(query, u.id);
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

  static async markUnitsPrinted(ids: string[]) {
    return await withTransaction(async trx => {
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
    });
  }

  static async generateUnits(
    trx: Queryable,
    productoId: string,
    count: number,
    presentacionId?: string | null,
    compraId?: string | null
  ): Promise<{ codigo: string; codigo_barras: string }[]> {
    if (count <= 0) return [];
    const [codigos, barcodes] = await Promise.all([
      this.nextCodigos(trx, count),
      this.assignUniqueBarcodes(trx, count)
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
    return rows.map(r => ({ codigo: r.codigo, codigo_barras: r.codigo_barras }));
  }

  static async syncStockTotal(trx: Queryable, productoId: string): Promise<number> {
    const total = await this.countUnits(productoId, trx);
    await BaseRepository.update(trx, 'productos', 'id_producto', productoId, {
      stock_almacen: total,
      fecha_mod: getNowInBusinessTimezone()
    });
    return total;
  }

  static async generateUnitsStandalone(
    productoId: string,
    count: number,
    presentacionId?: string | null
  ): Promise<{ codigo: string; codigo_barras: string }[]> {
    let generadas: { codigo: string; codigo_barras: string }[] = [];
    await withTransaction(async trx => {
      generadas = await this.generateUnits(trx, productoId, count, presentacionId);
      await this.syncStockTotal(trx, productoId);
    });
    return generadas;
  }
}
