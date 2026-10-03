/**
 * Funciones puras del inventario: leer y componer opciones de venta, y mapear filas crudas
 * a los tipos de `inventoryTypes.ts`. Sin SQL ni red, así que se comparten por igual entre
 * los módulos de dominio.
 */
import type { SaleOption } from '@/types/sale-options';
import { randomInt } from 'crypto';
import type {
  DevolucionEnvaseUnidad,
  NivelPrecio,
  PresentacionRow,
  UnidadRow
} from './inventoryTypes';

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

export const mapPresentacion = (row: any, topeSimple = 10000): PresentacionRow => {
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

export const mapUnidad = (row: any): UnidadRow => ({
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

export const mapearEnvase = (fila: any): DevolucionEnvaseUnidad => ({
  id: fila.id,
  codigo: fila.codigo,
  codigo_barras: fila.codigo_barras ?? null,
  estado: fila.estado,
  abierta_por_shots: fila.abierta_por_shots === true,
  fecha_devolucion: fila.fecha_devolucion ?? null,
  fecha_confirmacion: fila.fecha_confirmacion ?? null,
  producto_nombre: fila.producto_nombre ?? null,
  presentacion_nombre: fila.presentacion_nombre ?? null,
  compra_folio: fila.compra_folio ?? null
});

/** `timestamp` llega como Date de pg; se muestra como fecha+hora local legible. */
export const fechaDevolucionLegible = (valor: string | Date): string => {
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
export const ESTADOS_UNIDAD_VALIDOS = [ESTADO_UNIDAD_ACTIVA, ESTADO_UNIDAD_INACTIVA];

export function esEstadoUnidadValido(estado: unknown): estado is string {
  return typeof estado === 'string' && ESTADOS_UNIDAD_VALIDOS.includes(estado);
}

/** Prefijo GS1 reservado para códigos internos de tienda. */
export const EAN_PREFIJO_INTERNO = '29';

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
