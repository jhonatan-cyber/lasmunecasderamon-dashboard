/**
 * Contratos del módulo de inventario — §5: «DTO y esquemas aptos para consumidores».
 *
 * Aquí vive lo que el módulo comparte con quien está fuera: la UI de Bar y el
 * escáner de envases consumen estos tipos directamente. Con la fase 4 cerrada,
 * `lib/repositories/inventory/` ya no existe y este archivo es la única fuente
 * de los DTO. Ninguna fila SQL, tipo del driver ni implementación lo cruza.
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

/**
 * Contadores del control de envases: entregados por el bar que el almacén
 * todavía no confirmó, y de esos, los que superan el umbral de horas sin
 * recibir.
 */
export interface ResumenEnvases {
  pendientes: number;
  vencidos: number;
}

/**
 * Venta cuyo stock se devuelve porque se anuló.
 *
 * `fraccion` es la parte del consumo que esta anulación repone: 1 cuando la
 * venta se anula entera, y el porcentaje del monto devuelto cuando sólo se
 * anula una parte. Lo que ya se repuso en una anulación anterior no vuelve a
 * contarse, así que una segunda anulación sobre la misma venta no duplica stock.
 */
export interface AnulacionStockEntrada {
  venta_id: string;
  usuario_id: string | null;
  fecha: string;
  fraccion?: number;
}

/** Lo que una anulación devolvió al bar. */
export interface ReversaStockAnulacion {
  movimientos_revertidos: number;
  unidades_repuestas: number;
  ml_repuesto: number;
  /**
   * ml que no se pudo reponer porque las botellas de aquella venta ya no
   * tienen esa capacidad (se les cambió `ml_botella` después). Se reporta en
   * vez de repartirse en otras botellas: devolvería al bar contenido que esa
   * venta no llegó a sacar.
   */
  ml_no_repuesto: number;
}

/**
 * Contexto de la venta que consume stock: quién la cobró, cuándo y cuál es
 * (`venta_id`). Sin `venta_id` el consumo sigue funcionando, pero la anulación
 * de esa venta no podrá reponer las unidades consumidas.
 */
export interface ContextoVentaInventario {
  usuarioId: string | null;
  fecha: string;
  ventaId?: string | null;
}
