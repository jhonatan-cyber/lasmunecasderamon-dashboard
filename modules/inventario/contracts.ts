/**
 * Contratos del módulo de inventario — §5: «DTO y esquemas aptos para consumidores».
 *
 * Aquí vive lo que el módulo comparte con quien está fuera: la UI de Bar y el
 * escáner de envases consumen estos tipos directamente, y la capa heredada
 * (`lib/repositories/inventory/`) los reexporta mientras dure la transición.
 * Ninguna fila SQL, tipo del driver ni implementación cruza este archivo.
 */

import type { SaleOption } from '@/types/sale-options';

export interface ConsumoInventarioDetalle {
  presentacion_id?: string | null;
  cantidad?: number | null;
  tipo_venta?: string | null;
  shot_anfitriona?: boolean | null;
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

/** Solicitud de traspaso de unidades de almacén al bar (crea la transferencia). */
export interface TraspasoInput {
  opciones_venta?: SaleOption[];
  producto_id: string;
  presentacion_id: string;
  cantidad: number;
  precio_venta?: number;
  comision?: number;
  usuario_id?: string | null;
}

/** Resultado de un traspaso: unidades enviadas y stock resultante en el bar. */
export interface TraspasoResultado {
  trasladadas: number;
  stock_bar: number;
}

/** Alta de una presentación de catálogo. */
export interface NuevaPresentacionInput {
  producto_id: string;
  nombre: string;
  codigo_barras?: string | null;
  precio_compra?: number;
  foto?: string | null;
}

/** Campos editables de una presentación (los no enviados no se tocan). */
export interface PresentacionCamposInput {
  nombre?: string;
  codigo_barras?: string | null;
  precio_compra?: number;
  precio_venta?: number;
  comision?: number;
  ml_botella?: number | null;
}

/** Generación de unidades (botellas) de una presentación. */
export interface UnidadesGenerarInput {
  producto_id: string;
  cantidad: number;
  presentacion_id?: string | null;
  compra_id?: string | null;
}
