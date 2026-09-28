import { query, generateUUID, withTransaction, type TransactionQuery } from '@/lib/database/db';
import { randomInt } from 'crypto';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { sendNotificationToAll } from '@/lib/api/sseService';
import { BaseRepository } from './BaseRepository';
import { BusinessError, NotFoundError, ValidationError } from '@/lib/errors/errors';
import type { SaleOption } from '@/types/sale-options';
import { resolveShotMl, resolveShotMlAnfitriona } from '@/lib/business/shotMl';

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
  /** Capacidad de la botella en ml (null = usar el default de Configuraciones). */
  ml_botella?: number | null;
  /**
   * Ml por shot del producto al que pertenece (columna `productos.ml_shot`; null = el
   * default de Configuraciones). Sólo viene cuando la query trae el join con productos.
   */
  ml_shot?: number | null;
  /**
   * Ml por shot cuando lo pide una anfitriona (columna `productos.ml_shot_anfitriona`;
   * null = igual que el shot de cliente).
   */
  ml_shot_anfitriona?: number | null;
  /** ml que quedan en las botellas abiertas de esta presentación en el bar. */
  ml_abierta?: number;
  /** Acumulado de ml servidos por shots en las ventas de esta presentación. */
  ml_servidos?: number;
  /** Config de Comisiones (tabla productos). Null = default según precio/categoría. */
  max_anfitrionas?: number | null;
  /** Base del producto (tabla productos), último fallback de visualización. */
  producto_precio?: number;
  producto_comision?: number;
}

export interface UnidadRow {
  fecha_crea?: string | null;
  fecha_impresion?: string | null;
  /** Marca de la devolución verificada al proveedor (null = todavía no se devuelve). */
  fecha_devolucion?: string | null;
  /** Usuario que verificó el escaneo del envase devuelto. */
  devuelto_por?: string | null;
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
      .map(o => {
        const option: SaleOption = {
          tipo: o.tipo as SaleOption['tipo'],
          precio: Number(o.precio ?? 0),
          comision: Number(o.comision ?? 0)
        };
        // Precio del shot para anfitrionas: 0 o ausente = igual que a un cliente.
        const anfitriona = Number(o.precio_anfitriona ?? 0);
        if (o.tipo === 'shot' && Number.isFinite(anfitriona) && anfitriona > 0) {
          option.precio_anfitriona = anfitriona;
        }
        return option;
      });
    return options.length > 0 ? options : undefined;
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

/** Defaults de servir shots cuando Configuraciones no tiene las claves. */
export const DEFAULT_SHOT_ML = 50;
export const DEFAULT_BOTTLE_ML = 750;
/** Shots restantes con los que una botella abierta entra en "por agotarse". */
export const DEFAULT_SHOTS_ALERTA = 3;

/**
 * Botella abierta que con esta venta quedó en el umbral de alerta (`shots_alerta`) y no
 * estaba antes: el aviso se emite después de confirmar la transacción de la venta.
 */
export interface ShotAlert {
  presentacion_id: string;
  nombre: string;
  ml_restante: number;
  shots_restantes: number;
}

export interface ShotsSummary {
  shotMl: number;
  shotsAlerta: number;
  /** ml servidos por shots desde el inicio del día (zona horaria del negocio). */
  mlServidosHoy: number;
  shotsServidosHoy: number;
  /** ml que quedan en las botellas abiertas del bar. */
  mlRestantesTotales: number;
  botellasAbiertas: number;
  botellasPorAgotarse: number;
}

/**
 * Configuración de tragos (`shot_ml`, `botella_ml` y `shots_alerta`). Es tolerante a
 * propósito: sin las claves guardadas se sirve con 50 ml por shot, se asume una botella de
 * 750 ml y se avisa al llegar a 3 shots restantes.
 */
export async function getBarMlConfig(
  trx: Queryable = query
): Promise<{ shotMl: number; botellaMl: number; shotsAlerta: number }> {
  try {
    const rows = await trx<any[]>(
      "SELECT clave, valor FROM configuraciones WHERE clave IN ('shot_ml', 'botella_ml', 'shots_alerta')",
      []
    );
    const valores = new Map<string, number>();
    for (const row of rows) {
      const n = Number(row?.valor);
      if (Number.isFinite(n) && n > 0) valores.set(String(row.clave), Math.floor(n));
    }
    return {
      shotMl: valores.get('shot_ml') ?? DEFAULT_SHOT_ML,
      botellaMl: valores.get('botella_ml') ?? DEFAULT_BOTTLE_ML,
      shotsAlerta: valores.get('shots_alerta') ?? DEFAULT_SHOTS_ALERTA
    };
  } catch {
    return {
      shotMl: DEFAULT_SHOT_ML,
      botellaMl: DEFAULT_BOTTLE_ML,
      shotsAlerta: DEFAULT_SHOTS_ALERTA
    };
  }
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
    ml_botella:
      row.ml_botella === null || row.ml_botella === undefined ? null : Number(row.ml_botella),
    ml_shot: row.ml_shot === null || row.ml_shot === undefined ? null : Number(row.ml_shot),
    ml_shot_anfitriona:
      row.ml_shot_anfitriona === null || row.ml_shot_anfitriona === undefined
        ? null
        : Number(row.ml_shot_anfitriona),
    ml_abierta: row.ml_abierta === undefined ? undefined : Number(row.ml_abierta ?? 0),
    ml_servidos: row.ml_servidos === undefined ? undefined : Number(row.ml_servidos ?? 0),
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
  fecha_devolucion: row.fecha_devolucion ?? null,
  devuelto_por: row.devuelto_por ?? null,
  compra_id: row.compra_id ?? null,
  compra_folio: row.compra_folio ?? null,
  id: row.id,
  producto_id: row.producto_id,
  presentacion_id: row.presentacion_id ?? null,
  codigo: row.codigo,
  codigo_barras: row.codigo_barras ?? null,
  estado: row.estado
});

/** Motivo por el que un escaneo de envase no quedó marcado. */
export type DevolucionEnvaseMotivo =
  | 'no_es_nuestro'
  | 'no_esta_vacia'
  | 'ya_devuelto'
  /** El bar todavía no marcó la entrega, así que el almacén no puede confirmar. */
  | 'no_entregado'
  /** El almacén ya confirmó la recepción de este envase. */
  | 'ya_confirmado';

/** Envase verificado, con lo necesario para mostrarlo en el panel de envases. */
export interface DevolucionEnvaseUnidad {
  id: string;
  codigo: string;
  codigo_barras: string | null;
  estado: string;
  /** Date crudo de pg en la consulta; string al marcar (hora del negocio). */
  fecha_devolucion: string | Date | null;
  /** Confirmación de recepción del almacén (null = todavía no se confirma). */
  fecha_confirmacion: string | Date | null;
  producto_nombre: string | null;
  presentacion_nombre: string | null;
  compra_folio: string | null;
}

/** Fila cruda de la consulta de envase (trae los nombres con join). */
type EnvaseFila = DevolucionEnvaseUnidad & {
  devuelto_por?: string | null;
  confirmado_por?: string | null;
};

/** Registro del historial: el envase + quién entregó y quién recibió. */
export interface DevolucionEnvaseRegistro extends DevolucionEnvaseUnidad {
  devuelto_por: string | null;
  usuario_nombre: string | null;
  usuario_apellido: string | null;
  usuario_nick: string | null;
  confirmado_por: string | null;
  confirmado_nombre: string | null;
  confirmado_apellido: string | null;
  confirmado_nick: string | null;
  /** true mientras el almacén no confirme la recepción. */
  pendiente_confirmacion: boolean;
}

export type DevolucionEnvaseResultado =
  | { ok: true; mensaje: string; unidad: DevolucionEnvaseUnidad }
  | {
      ok: false;
      motivo: DevolucionEnvaseMotivo;
      mensaje: string;
      unidad: DevolucionEnvaseUnidad | null;
    };

const mapearEnvase = (fila: any): DevolucionEnvaseUnidad => ({
  id: fila.id,
  codigo: fila.codigo,
  codigo_barras: fila.codigo_barras ?? null,
  estado: fila.estado,
  fecha_devolucion: fila.fecha_devolucion ?? null,
  fecha_confirmacion: fila.fecha_confirmacion ?? null,
  producto_nombre: fila.producto_nombre ?? null,
  presentacion_nombre: fila.presentacion_nombre ?? null,
  compra_folio: fila.compra_folio ?? null
});

/** `timestamp` llega como Date de pg; se muestra como fecha+hora local legible. */
const fechaDevolucionLegible = (valor: string | Date): string => {
  const fecha = valor instanceof Date ? valor : new Date(String(valor));
  if (Number.isNaN(fecha.getTime())) return String(valor).slice(0, 16);
  return `${fecha.toLocaleDateString('es-CL')} ${fecha.toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit'
  })}`;
};

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
    // Solo después de confirmar la transacción: el módulo Transferencias se refresca en vivo.
    sendNotificationToAll('transfers_updated', {
      action: 'created',
      producto_id: input.producto_id,
      presentacion_id: input.presentacion_id
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
   *
   * Un detalle con `tipo_venta: 'shot'` no gasta una botella entera: descuenta ml. Se sigue
   * sirviendo de la botella que ya está abierta y, si no alcanza, se abre la siguiente
   * (la unidad queda activa con `ml_restante`, visible en el inventario del bar). Cuando el
   * contenido llega a 0 la botella pasa a 'vendida' como cualquier otra.
   *
   * Devuelve las botellas que con esta venta quedaron bajo el umbral de alerta
   * (`shots_alerta` shots restantes) sin haber estado antes: el aviso para el barman se
   * emite fuera de la transacción, para no notificar una venta que después se revierte.
   */
  static async consume(
    trx: Queryable,
    detalles: {
      presentacion_id?: string | null;
      cantidad?: number | null;
      tipo_venta?: string | null;
      shot_anfitriona?: boolean | null;
    }[],
    contexto: { usuarioId: string | null; fecha: string }
  ): Promise<ShotAlert[]> {
    const alertas: ShotAlert[] = [];
    const requerido = new Map<
      string,
      { botellas: number; shotsCliente: number; shotsAnfitriona: number }
    >();
    for (const detalle of detalles) {
      const presentacionId = detalle.presentacion_id?.trim();
      const unidades = Math.max(0, Math.floor(Number(detalle.cantidad ?? 0)));
      if (!presentacionId || unidades === 0) continue;
      const acumulado = requerido.get(presentacionId) ?? {
        botellas: 0,
        shotsCliente: 0,
        shotsAnfitriona: 0
      };
      if (detalle.tipo_venta === 'shot') {
        if (detalle.shot_anfitriona) acumulado.shotsAnfitriona += unidades;
        else acumulado.shotsCliente += unidades;
      } else acumulado.botellas += unidades;
      requerido.set(presentacionId, acumulado);
    }
    if (requerido.size === 0) return alertas;

    const hayShots = [...requerido.values()].some(
      pedido => pedido.shotsCliente > 0 || pedido.shotsAnfitriona > 0
    );
    const { shotMl, botellaMl, shotsAlerta } = hayShots
      ? await getBarMlConfig(trx)
      : {
          shotMl: DEFAULT_SHOT_ML,
          botellaMl: DEFAULT_BOTTLE_ML,
          shotsAlerta: DEFAULT_SHOTS_ALERTA
        };

    for (const [presentacionId, pedido] of requerido) {
      const presentacion = await trx<any[]>(
        `SELECT p.id, p.producto_id, p.nombre, p.precio_venta, p.comision, p.ml_botella, pr.ml_shot,
          pr.ml_shot_anfitriona
         FROM inventario_presentaciones p
         INNER JOIN productos pr ON pr.id_producto = p.producto_id
         WHERE p.id = ? FOR UPDATE OF p`,
        [presentacionId]
      );
      // Presentación borrada: las unidades quedaron huérfanas, no hay nada que descontar.
      if (presentacion.length === 0) continue;

      const capacidadMl =
        Math.floor(Number(presentacion[0].ml_botella)) > 0
          ? Math.floor(Number(presentacion[0].ml_botella))
          : botellaMl;
      // Ml por shot del producto (null o 0 = el global de Configuraciones) y ml del
      // shot de anfitriona (null o 0 = igual que el de cliente).
      const shotMlPresentacion = resolveShotMl(presentacion[0].ml_shot, shotMl);
      const shotMlAnfitriona = resolveShotMlAnfitriona(
        presentacion[0].ml_shot_anfitriona,
        shotMlPresentacion
      );
      const umbralAlertaPresentacion = shotMlPresentacion * shotsAlerta;

      // Botellas abiertas primero (se termina la que ya está servida), luego las llenas
      // en FIFO. Se leen todas para poder rechazar la venta antes de escribir nada.
      const unidades = await trx<any[]>(
        `SELECT id, ml_restante FROM inventario_unidades
          WHERE presentacion_id = ? AND estado = '${ESTADO_UNIDAD_ACTIVA}' AND ubicacion = 'bar'
          ORDER BY CASE WHEN ml_restante > 0 THEN 0 ELSE 1 END, fecha_crea ASC, codigo ASC
          FOR UPDATE`,
        [presentacionId]
      );

      // Plan de consumo: ml pendientes de shots (cliente y anfitriona por separado)
      // y botellas completas por separado.
      const plan: { id: string; ml_restante: number }[] = [];
      let mlPendiente =
        pedido.shotsCliente * shotMlPresentacion + pedido.shotsAnfitriona * shotMlAnfitriona;
      let botellasPendientes = pedido.botellas;

      for (const unidad of unidades) {
        if (mlPendiente <= 0) break;
        const restante = Math.floor(Number(unidad.ml_restante ?? 0));
        if (restante <= 0) continue;
        const consumido = Math.min(restante, mlPendiente);
        mlPendiente -= consumido;
        plan.push({ id: unidad.id, ml_restante: restante - consumido });
      }

      for (const unidad of unidades) {
        if (Number(unidad.ml_restante ?? 0) > 0) continue;
        if (mlPendiente > 0) {
          const consumido = Math.min(capacidadMl, mlPendiente);
          mlPendiente -= consumido;
          plan.push({ id: unidad.id, ml_restante: capacidadMl - consumido });
          continue;
        }
        if (botellasPendientes > 0) {
          botellasPendientes -= 1;
          plan.push({ id: unidad.id, ml_restante: 0 });
          continue;
        }
        break;
      }

      if (mlPendiente > 0 || botellasPendientes > 0) {
        const abiertas = unidades.filter(u => Number(u.ml_restante ?? 0) > 0).length;
        const totalShots = pedido.shotsCliente + pedido.shotsAnfitriona;
        const mlRequeridos =
          pedido.shotsCliente * shotMlPresentacion + pedido.shotsAnfitriona * shotMlAnfitriona;
        const mensaje =
          totalShots === 0
            ? `Quedan ${unidades.length} de ${pedido.botellas} botellas de "${presentacion[0].nombre}" en el bar`
            : `No alcanza el stock de "${presentacion[0].nombre}" en el bar: faltan ${
                mlPendiente > 0 ? `${mlPendiente} ml` : `${botellasPendientes} botella(s)`
              }`;
        throw new BusinessError(mensaje, 'INSUFFICIENT_BAR_STOCK', {
          presentacion_id: presentacionId,
          disponibles: unidades.length,
          requeridas: pedido.botellas + totalShots,
          ml_requeridos: totalShots > 0 ? mlRequeridos : 0,
          ml_disponibles: unidades.reduce(
            (total, unidad) =>
              total +
              (Number(unidad.ml_restante ?? 0) > 0
                ? Math.floor(Number(unidad.ml_restante))
                : capacidadMl),
            0
          ),
          botellas_abiertas: abiertas
        });
      }

      const vendidas: string[] = [];
      const mlAnterior = new Map(
        unidades.map(unidad => [unidad.id, Math.floor(Number(unidad.ml_restante ?? 0))])
      );
      for (const item of plan) {
        if (item.ml_restante > 0) {
          await trx(`UPDATE inventario_unidades SET ml_restante = ? WHERE id = ?`, [
            item.ml_restante,
            item.id
          ]);
          // Le queda poco y **no** estaba en alerta: avisa sólo en el cruce (o al abrir
          // una botella que ya arranca bajo el umbral), para no repetir por cada shot.
          const antes = mlAnterior.get(item.id) ?? 0;
          const estabaEnAlerta = antes > 0 && antes <= umbralAlertaPresentacion;
          if (!estabaEnAlerta && item.ml_restante <= umbralAlertaPresentacion) {
            alertas.push({
              presentacion_id: presentacionId,
              nombre: presentacion[0].nombre,
              ml_restante: item.ml_restante,
              shots_restantes: Math.floor(item.ml_restante / shotMlPresentacion)
            });
          }
        } else {
          vendidas.push(item.id);
        }
      }
      if (vendidas.length > 0) {
        const placeholders = vendidas.map(() => '?').join(',');
        await trx(
          `UPDATE inventario_unidades SET estado = '${ESTADO_UNIDAD_VENDIDA}', ml_restante = 0 WHERE id IN (${placeholders})`,
          vendidas
        );
      }

      // Deja la venta en el historial de la presentación: es el tercer tipo de
      // movimiento que promete el documento junto a ingresos y traspasos. `cantidad`
      // cuenta las botellas que salieron del bar (una botella abierta sigue en stock y
      // su contenido queda en `ml`).
      await BaseRepository.insert(trx, 'inventario_movimientos', {
        id: generateUUID(),
        tipo: 'venta',
        estado: 'completada',
        producto_id: presentacion[0].producto_id,
        presentacion_id: presentacionId,
        cantidad: vendidas.length,
        ml:
          pedido.shotsCliente + pedido.shotsAnfitriona > 0
            ? pedido.shotsCliente * shotMlPresentacion + pedido.shotsAnfitriona * shotMlAnfitriona
            : null,
        precio_venta: Math.floor(Number(presentacion[0].precio_venta ?? 0)),
        comision: Math.floor(Number(presentacion[0].comision ?? 0)),
        usuario_id: contexto.usuarioId,
        fecha_crea: contexto.fecha
      });
    }

    return alertas;
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
    sendNotificationToAll('transfers_updated', { action: 'accepted', id });
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
    sendNotificationToAll('transfers_updated', { action: 'rejected', id });
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
        (SELECT COALESCE(SUM(u.ml_restante), 0) FROM inventario_unidades u WHERE u.presentacion_id = p.id AND u.estado = '${ESTADO_UNIDAD_ACTIVA}' AND u.ubicacion = 'bar') AS ml_abierta,
        (SELECT COALESCE(SUM(m.ml), 0) FROM inventario_movimientos m WHERE m.presentacion_id = p.id AND m.tipo = 'venta' AND m.ml > 0) AS ml_servidos,
        pr.nombre AS producto_nombre, pr.codigo AS producto_codigo, pr.foto AS producto_foto,
        pr.precio AS producto_precio, pr.comision AS producto_comision, pr.ml_shot,
        pr.ml_shot_anfitriona,
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

  /**
   * Resumen para el panel de shots del bar: lo servido hoy, los ml que quedan en las
   * botellas abiertas y cuántas están por agotarse (≤ `shots_alerta` shots restantes).
   *
   * Los ml por shot pueden variar por producto (`productos.ml_shot`): los conteos se
   * calculan producto por producto y sólo se recurre al `shot_ml` global cuando el
   * producto no define los suyos.
   */
  static async getShotsSummary(): Promise<ShotsSummary> {
    const { shotMl, shotsAlerta } = await getBarMlConfig();
    const inicioDia = `${getNowInBusinessTimezone().slice(0, 10)} 00:00:00`;

    const [hoy] = await query<any[]>(
      `SELECT COALESCE(SUM(m.ml), 0) AS ml,
              COALESCE(SUM(m.ml / COALESCE(NULLIF(pr.ml_shot, 0), ?)), 0) AS shots
         FROM inventario_movimientos m
         LEFT JOIN productos pr ON pr.id_producto = m.producto_id
        WHERE m.tipo = 'venta' AND m.ml > 0 AND m.fecha_crea >= ?`,
      [shotMl, inicioDia]
    );
    const [abiertas] = await query<any[]>(
      `SELECT COUNT(*) AS botellas,
              COALESCE(SUM(u.ml_restante), 0) AS ml,
              COALESCE(SUM(CASE WHEN u.ml_restante <= (COALESCE(NULLIF(pr.ml_shot, 0), ?) * ?)
                               THEN 1 ELSE 0 END), 0) AS por_agotarse
         FROM inventario_unidades u
         LEFT JOIN productos pr ON pr.id_producto = u.producto_id
        WHERE u.estado = '${ESTADO_UNIDAD_ACTIVA}' AND u.ubicacion = 'bar' AND u.ml_restante > 0`,
      [shotMl, shotsAlerta]
    );

    const mlServidosHoy = Number(hoy?.ml ?? 0);
    return {
      shotMl,
      shotsAlerta,
      mlServidosHoy,
      shotsServidosHoy: Number(hoy?.shots ?? 0),
      mlRestantesTotales: Number(abiertas?.ml ?? 0),
      botellasAbiertas: Number(abiertas?.botellas ?? 0),
      botellasPorAgotarse: Number(abiertas?.por_agotarse ?? 0)
    };
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
        p.opciones_venta, p.ml_botella,
        (SELECT COUNT(*) FROM inventario_unidades u WHERE u.presentacion_id = p.id AND u.estado = '${ESTADO_UNIDAD_ACTIVA}' AND u.ubicacion = 'bar') AS stock_bar,
        (SELECT COALESCE(SUM(u.ml_restante), 0) FROM inventario_unidades u WHERE u.presentacion_id = p.id AND u.estado = '${ESTADO_UNIDAD_ACTIVA}' AND u.ubicacion = 'bar') AS ml_abierta,
        pr.id_producto AS producto_id, pr.codigo AS producto_codigo, pr.nombre AS producto_nombre,
        pr.foto AS producto_foto, pr.categoria_id, c.nombre AS categoria_nombre, pr.ml_shot,
        pr.ml_shot_anfitriona, pr.max_anfitrionas
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
    const topeSimple = await getTopeSimple();
    return rows.map(row => ({
      presentacion_id: row.presentacion_id,
      presentacion_nombre: row.presentacion_nombre,
      codigo_barras: row.codigo_barras ?? null,
      foto: row.presentacion_foto || row.producto_foto || 'default.png',
      precio_venta: Number(row.precio_venta ?? 0),
      comision: Number(row.presentacion_comision ?? 0),
      stock_bar: Number(row.stock_bar ?? 0),
      ml_botella:
        row.ml_botella === null || row.ml_botella === undefined ? null : Number(row.ml_botella),
      ml_shot: row.ml_shot === null || row.ml_shot === undefined ? null : Number(row.ml_shot),
      ml_shot_anfitriona:
        row.ml_shot_anfitriona === null || row.ml_shot_anfitriona === undefined
          ? null
          : Number(row.ml_shot_anfitriona),
      max_anfitrionas:
        row.max_anfitrionas === null || row.max_anfitrionas === undefined
          ? null
          : Number(row.max_anfitrionas),
      ml_abierta: Number(row.ml_abierta ?? 0),
      // Precio de shot guardado (si existe) para el selector Botella/Shot de la venta.
      opciones_venta:
        completarOpciones(
          row.opciones_venta,
          [
            {
              precio: Number(row.precio_venta ?? 0),
              comision: Number(row.presentacion_comision ?? 0)
            }
          ],
          topeSimple
        ) ?? undefined,
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
          pr.precio AS producto_precio, pr.comision AS producto_comision, pr.ml_shot,
          pr.ml_shot_anfitriona
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
        p.precio AS producto_precio, p.comision AS producto_comision, p.ml_shot,
        p.ml_shot_anfitriona
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

  /**
   * Busca el envase escaneado por su EAN-13 interno o por su SKU `LM-…` y
   * bloquea la fila hasta que termine la transacción (`FOR UPDATE OF u`), para
   * que la lectura y la marca del control de envases sean atómicas.
   */
  private static async buscarEnvase(trx: Queryable, escaneo: string): Promise<EnvaseFila | null> {
    const filas = await trx<any[]>(
      `SELECT u.id, u.codigo, u.codigo_barras, u.estado, u.fecha_devolucion, u.devuelto_por,
              u.fecha_confirmacion, u.confirmado_por,
              p.nombre AS producto_nombre, pr.nombre AS presentacion_nombre, c.folio AS compra_folio
         FROM inventario_unidades u
         LEFT JOIN productos p ON p.id_producto = u.producto_id
         LEFT JOIN inventario_presentaciones pr ON pr.id = u.presentacion_id
         LEFT JOIN compras c ON c.id = u.compra_id
        WHERE u.codigo_barras = ? OR u.codigo = ?
        LIMIT 1
        FOR UPDATE OF u`,
      [escaneo, escaneo]
    );
    return filas[0] ?? null;
  }

  /**
   * Verifica un código escaneado contra las unidades que nosotros registramos
   * (EAN-13 interno `codigo_barras` o SKU `LM-…` en `codigo`) y, si el envase
   * es nuestro, está vacío (`vendida`) y todavía no se entregó, lo marca con
   * `fecha_devolucion` + `devuelto_por` en el mismo paso (migración 032). Esta
   * es la mitad del bar del control bar → almacén; la recepción la confirma
   * `confirmContainerReturn`.
   *
   * No crea movimientos de inventario: la botella ya salió con la venta; el
   * control es solo la entrega física del envase vacío. La marca es además lo
   * que permite detectar re-escaneos. Corre en una transacción para que el
   * bloqueo `FOR UPDATE` cubra la lectura y la marca juntas: dos escaneos
   * simultáneos del mismo envase no pueden marcarlo dos veces.
   */
  static async verifyAndReturnContainer(
    codigoEscaneado: unknown,
    usuarioId: string | null
  ): Promise<DevolucionEnvaseResultado> {
    return await withTransaction(trx =>
      this.verificarYMarcarEnvase(trx, codigoEscaneado, usuarioId)
    );
  }

  /** Núcleo transaccional de `verifyAndReturnContainer` (ver su doc). */
  static async verificarYMarcarEnvase(
    trx: Queryable,
    codigoEscaneado: unknown,
    usuarioId: string | null
  ): Promise<DevolucionEnvaseResultado> {
    const escaneo = String(codigoEscaneado ?? '')
      .trim()
      .toUpperCase();
    if (!escaneo) throw new ValidationError('Escanea o digita el código del envase');

    const clasificar = (fila: EnvaseFila): DevolucionEnvaseResultado | null => {
      if (fila.fecha_devolucion) {
        return {
          ok: false,
          motivo: 'ya_devuelto',
          mensaje: `Este envase ya fue devuelto el ${fechaDevolucionLegible(fila.fecha_devolucion)}.`,
          unidad: mapearEnvase(fila)
        };
      }
      if (fila.estado !== ESTADO_UNIDAD_VENDIDA) {
        return {
          ok: false,
          motivo: 'no_esta_vacia',
          mensaje: `El envase es nuestro pero no está vacío (estado '${fila.estado}'); solo se devuelven botellas ya consumidas.`,
          unidad: mapearEnvase(fila)
        };
      }
      return null;
    };

    const fila = await this.buscarEnvase(trx, escaneo);
    if (!fila) {
      return {
        ok: false,
        motivo: 'no_es_nuestro',
        mensaje: 'El código no corresponde a ningún envase de nuestro inventario.',
        unidad: null
      };
    }

    const rechazo = clasificar(fila);
    if (rechazo) return rechazo;

    const ahora = getNowInBusinessTimezone();
    const marcadas = await trx<any[]>(
      `UPDATE inventario_unidades
          SET fecha_devolucion = ?, devuelto_por = ?
        WHERE id = ? AND estado = ? AND fecha_devolucion IS NULL
        RETURNING id`,
      [ahora, usuarioId, fila.id, ESTADO_UNIDAD_VENDIDA]
    );
    if (marcadas.length === 0) {
      // La fila estaba bloqueada con FOR UPDATE, así que esto no debería pasar:
      // otro escaneo no pudo haberse colado entre la lectura y la marca.
      throw new BusinessError('No se pudo marcar la devolución. Intenta de nuevo.');
    }

    return {
      ok: true,
      mensaje: 'Envase verificado: es nuestro, estaba vacío y quedó marcado como devuelto.',
      unidad: { ...mapearEnvase(fila), fecha_devolucion: ahora }
    };
  }

  /**
   * Confirma la recepción en almacén de un envase que el bar ya entregó
   * (`fecha_devolucion` marcada en 032) y que todavía no se confirmó (033).
   *
   * Es el segundo paso del control bar → almacén: el barman escanea el vacío al
   * entregarlo y el almacén escanea al recibirlo. Quien entrega no puede
   * confirmar porque el permiso es distinto (`confirm_container_return`), y el
   * almacén no puede dar por recibido un envase que el bar nunca entregó.
   *
   * Como la entrega, no crea movimientos de inventario ni repone stock: solo
   * deja la marca de recepción. Corre en una transacción con `FOR UPDATE` para
   * que dos confirmaciones simultáneas no puedan colarse.
   */
  static async confirmContainerReturn(
    codigoEscaneado: unknown,
    usuarioId: string | null
  ): Promise<DevolucionEnvaseResultado> {
    return await withTransaction(trx =>
      this.confirmarRecepcionEnvase(trx, codigoEscaneado, usuarioId)
    );
  }

  /** Núcleo transaccional de `confirmContainerReturn` (ver su doc). */
  static async confirmarRecepcionEnvase(
    trx: Queryable,
    codigoEscaneado: unknown,
    usuarioId: string | null
  ): Promise<DevolucionEnvaseResultado> {
    const escaneo = String(codigoEscaneado ?? '')
      .trim()
      .toUpperCase();
    if (!escaneo) throw new ValidationError('Escanea o digita el código del envase');

    const fila = await this.buscarEnvase(trx, escaneo);
    if (!fila) {
      return {
        ok: false,
        motivo: 'no_es_nuestro',
        mensaje: 'El código no corresponde a ningún envase de nuestro inventario.',
        unidad: null
      };
    }
    if (!fila.fecha_devolucion) {
      return {
        ok: false,
        motivo: 'no_entregado',
        mensaje: 'El bar todavía no entregó este envase: primero debe escanearlo en el bar.',
        unidad: mapearEnvase(fila)
      };
    }
    if (fila.fecha_confirmacion) {
      return {
        ok: false,
        motivo: 'ya_confirmado',
        mensaje: `Este envase ya fue recibido en almacén el ${fechaDevolucionLegible(
          fila.fecha_confirmacion
        )}.`,
        unidad: mapearEnvase(fila)
      };
    }

    const ahora = getNowInBusinessTimezone();
    const confirmadas = await trx<any[]>(
      `UPDATE inventario_unidades
          SET fecha_confirmacion = ?, confirmado_por = ?
        WHERE id = ? AND fecha_devolucion IS NOT NULL AND fecha_confirmacion IS NULL
        RETURNING id`,
      [ahora, usuarioId, fila.id]
    );
    if (confirmadas.length === 0) {
      // La fila estaba bloqueada con FOR UPDATE, así que esto no debería pasar:
      // otra confirmación no pudo haberse colado entre la lectura y la marca.
      throw new BusinessError('No se pudo confirmar la recepción. Intenta de nuevo.');
    }

    return {
      ok: true,
      mensaje: 'Recepción confirmada: el envase entregado por el bar quedó recibido en almacén.',
      unidad: { ...mapearEnvase(fila), fecha_confirmacion: ahora }
    };
  }

  /**
   * Historial de envases entregados por el bar, lo más reciente primero, con la
   * entrega y la recepción en almacén de cada uno.
   */
  static async listContainerReturns(
    limite: number = 100,
    trx: Queryable = query
  ): Promise<DevolucionEnvaseRegistro[]> {
    const tope = Math.min(Math.max(Math.floor(Number(limite) || 100), 1), 500);
    const rows = await trx<any[]>(
      `SELECT u.id, u.codigo, u.codigo_barras, u.estado, u.fecha_devolucion, u.devuelto_por,
              u.fecha_confirmacion, u.confirmado_por,
              p.nombre AS producto_nombre, pr.nombre AS presentacion_nombre, c.folio AS compra_folio,
              us.nombre AS usuario_nombre, us.apellido AS usuario_apellido, us.nick AS usuario_nick,
              cf.nombre AS confirmado_nombre, cf.apellido AS confirmado_apellido, cf.nick AS confirmado_nick
         FROM inventario_unidades u
         LEFT JOIN productos p ON p.id_producto = u.producto_id
         LEFT JOIN inventario_presentaciones pr ON pr.id = u.presentacion_id
         LEFT JOIN compras c ON c.id = u.compra_id
         LEFT JOIN usuarios us ON us.id_usuario = u.devuelto_por
         LEFT JOIN usuarios cf ON cf.id_usuario = u.confirmado_por
        WHERE u.fecha_devolucion IS NOT NULL
        ORDER BY u.fecha_devolucion DESC, u.codigo ASC
        LIMIT ?`,
      [tope]
    );
    return rows.map(fila => ({
      ...mapearEnvase(fila),
      devuelto_por: fila.devuelto_por ?? null,
      usuario_nombre: fila.usuario_nombre ?? null,
      usuario_apellido: fila.usuario_apellido ?? null,
      usuario_nick: fila.usuario_nick ?? null,
      confirmado_por: fila.confirmado_por ?? null,
      confirmado_nombre: fila.confirmado_nombre ?? null,
      confirmado_apellido: fila.confirmado_apellido ?? null,
      confirmado_nick: fila.confirmado_nick ?? null,
      pendiente_confirmacion: !fila.fecha_confirmacion
    }));
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
  ): Promise<{ id: string; codigo: string; codigo_barras: string }[]> {
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
    return rows.map(r => ({ id: r.id, codigo: r.codigo, codigo_barras: r.codigo_barras }));
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
  ): Promise<{ id: string; codigo: string; codigo_barras: string }[]> {
    let generadas: { id: string; codigo: string; codigo_barras: string }[] = [];
    await withTransaction(async trx => {
      generadas = await this.generateUnits(trx, productoId, count, presentacionId);
      await this.syncStockTotal(trx, productoId);
    });
    return generadas;
  }
}
