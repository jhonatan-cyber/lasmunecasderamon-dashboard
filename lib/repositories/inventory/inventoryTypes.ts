/**
 * Tipos del inventario. Sólo declaraciones: si algún día aparece lógica aquí, va a
 * `inventoryHelpers.ts` (puro) o a `inventoryConfig.ts` (lecturas de Configuraciones).
 */
import { type TransactionQuery, type query } from '@/lib/database/db';
import type { SaleOption } from '@/types/sale-options';
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

export interface NivelPrecio {
  precio: number;
  comision: number;
}

/** Motivo por el que un escaneo de envase no quedó marcado. */
export type DevolucionEnvaseMotivo =
  | 'no_es_nuestro'
  | 'no_esta_vacia'
  | 'ya_devuelto'
  /** La botella se vendió entera: su envase se lo llevó el cliente, no vuelve al bar. */
  | 'venta_entera'
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
  /** true si esta botella se sirvió alguna vez por shots: es la que vuelve a almacén. */
  abierta_por_shots: boolean;
  /** Date crudo de pg en la consulta; string al marcar (hora del negocio). */
  fecha_devolucion: string | Date | null;
  /** Confirmación de recepción del almacén (null = todavía no se confirma). */
  fecha_confirmacion: string | Date | null;
  producto_nombre: string | null;
  presentacion_nombre: string | null;
  compra_folio: string | null;
}

/** Fila cruda de la consulta de envase (trae los nombres con join). */
export type EnvaseFila = DevolucionEnvaseUnidad & {
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

export interface TraspasoInput {
  opciones_venta?: SaleOption[];
  producto_id: string;
  presentacion_id: string;
  cantidad: number;
  precio_venta?: number;
  comision?: number;
  usuario_id?: string | null;
}
