/**
 * Tipos del inventario. Sólo declaraciones: si algún día aparece lógica aquí, va a
 * `inventoryHelpers.ts` (puro) o a `modules/inventario/bar/configuracion.ts` (configuración).
 */
import { type TransactionQuery, type query } from '@/lib/database/db';
import type { SaleOption } from '@/types/sale-options';
// Los DTO que la UI consume viven en el módulo propietario (Fase 4). Este archivo
// sólo los reexporta mientras la fachada heredada siga en uso: definirlos acá
// duplicaría el contrato y la excepción de UI no podría eliminarse.
import type { DevolucionEnvaseUnidad } from '@/modules/inventario/contracts';
export type {
  DevolucionEnvaseMotivo,
  DevolucionEnvaseRegistro,
  DevolucionEnvaseResultado,
  DevolucionEnvaseUnidad,
  ShotAlert,
  ShotsSummary
} from '@/modules/inventario/contracts';
/** Cualquier cosa que sepa ejecutar SQL: la conexión libre o una transacción. */
export type Queryable = TransactionQuery | typeof query;

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
  /**
   * Capacidad de la botella en ml (null = la que declara el nombre de la presentación y,
   * si tampoco dice un volumen, el default de Configuraciones).
   */
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

export interface NivelPrecio {
  precio: number;
  comision: number;
}

/** Fila cruda de la consulta de envase (trae los nombres con join). */
export type EnvaseFila = DevolucionEnvaseUnidad & {
  devuelto_por?: string | null;
  confirmado_por?: string | null;
};

/**
 * El traspaso (TraspasoInput) vive en `modules/inventario/contracts.ts`, el módulo
 * propietario de las transferencias (Fase 4).
 */
