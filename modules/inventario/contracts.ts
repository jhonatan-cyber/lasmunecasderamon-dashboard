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
  acompanamiento_botella?: { presentacion_id: string; unidades: number };
  acompanamiento_corto?: { presentacion_id: string; unidades?: number; ml_por_corto?: number };
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

/** De dónde salió un corto: la barra, una cuenta, una habitación, un servicio o un pedido. */
export type OrigenCorto = 'barra' | 'cuenta' | 'habitacion' | 'servicio' | 'pedido';

/**
 * Bebida con la que se sirvió un corto: queda por línea en
 * `detalle_ventas.acompanamiento` (migración 071), sin deducirla de la
 * configuración vigente. El nombre sale del catálogo; si la presentación ya
 * no existe, se conserva el que se guardó con la venta.
 */
export interface AcompanamientoCortoHoy {
  nombre: string | null;
  /** ml servidos por cada corto; `null` cuando el acompañamiento fue por unidades. */
  ml_por_corto: number | null;
  /** Unidades servidas por corto; `null` cuando fue por ml. */
  unidades: number | null;
}

/** Un corto vendido hoy, con la venta que lo originó y a quién se le sirvió. */
export interface CortoVendidoHoy {
  id: string;
  venta_id: string;
  venta_codigo: string;
  /** Fecha y hora del detalle en la zona del negocio. */
  fecha: string;
  cantidad: number;
  precio: number;
  comision: number;
  subtotal: number;
  /** `true` cuando se cobró al precio de anfitriona. */
  anfitriona: boolean;
  anfitriona_nombre: string | null;
  producto_id: string;
  producto_nombre: string;
  producto_foto: string | null;
  presentacion_nombre: string | null;
  origen: OrigenCorto;
  cliente_nombre: string | null;
  habitacion_nombre: string | null;
  /** Quién registró la venta. */
  vendido_por: string | null;
  /** Garzón del pedido, cuando el corto salió de uno. */
  mesero_nombre: string | null;
  metodo_pago: string | null;
  /**
   * ml que salió del bar con este corto: el volumen del trago (cliente o
   * anfitriona, según el producto y su configuración) por la cantidad. No
   * incluye el acompañamiento ni botellas enteras.
   */
  ml: number;
  /** `null` cuando el trago salió sin acompañamiento. */
  acompanamiento: AcompanamientoCortoHoy | null;
}

/**
 * Colación servida hoy: los ml que salieron del bar para consumo del personal.
 * No es un corto vendido, pero explica parte de `mlServidosHoy`.
 */
export interface ColacionServidaHoy {
  id: string;
  producto_nombre: string;
  producto_foto: string | null;
  presentacion_nombre: string | null;
  ml: number;
  /** Quién registró la colación. */
  registrado_por: string | null;
  fecha: string;
}

export interface ShotsSummary {
  shotMl: number;
  shotsAlerta: number;
  /**
   * ml que salieron del bar en el día (zona horaria del negocio): ventas más
   * colaciones. El acompañamiento de una colación también es ml servido.
   */
  mlServidosHoy: number;
  /**
   * Parte de `mlServidosHoy` que vino de colaciones. No suma a
   * `shotsServidosHoy`: una colación no es un corto vendido.
   */
  mlColacionHoy: number;
  shotsServidosHoy: number;
  /**
   * Cortos vendidos hoy, del más reciente al más antiguo. Es la fuente de
   * `shotsServidosHoy`: el stat y su detalle no pueden discrepar.
   */
  cortosHoy: CortoVendidoHoy[];
  /**
   * Colaciones del día. Es la fuente de `mlColacionHoy`, así que el detalle del
   * stat explica exactamente los ml que muestra la tarjeta.
   */
  colacionesHoy: ColacionServidaHoy[];
  /** ml que quedan en las botellas abiertas del bar. */
  mlRestantesTotales: number;
  botellasAbiertas: number;
  botellasPorAgotarse: number;
}

/** Detalle de una botella actualmente abierta en el bar. */
export interface BotellaAbiertaDetalle {
  id: string;
  codigo: string;
  codigo_barras: string | null;
  ml_restante: number;
}

/** Botella abierta por shots vacía o dentro de la tolerancia, lista para escanear. */
export interface BotellaDevolucionPendiente {
  id: string;
  codigo: string;
  codigo_barras: string | null;
  ml_restante: number;
}

/** Motivo por el que un escaneo de envase no quedó marcado. */
export type DevolucionEnvaseMotivo =
  | 'no_es_nuestro'
  | 'no_esta_vacia'
  | 'ya_devuelto'
  /** La botella se vendió entera: su envase se lo llevó el cliente, no vuelve al bar. */
  | 'venta_entera'
  /** El bar todavía no marcó la entrega, así que la bodega no puede confirmar. */
  | 'no_entregado'
  /** El bodega ya confirmó la recepción de este envase. */
  | 'ya_confirmado';

/** Envase verificado, con lo necesario para mostrarlo en el panel de envases. */
export interface DevolucionEnvaseUnidad {
  id: string;
  codigo: string;
  codigo_barras: string | null;
  estado: string;
  /** true si esta botella se sirvió alguna vez por shots: es la que vuelve a bodega. */
  abierta_por_shots: boolean;
  /** Ml que se reconocieron como merma al entregar la botella vacía. */
  ml_merma: number;
  /** Date crudo de pg en la consulta; string al marcar (hora del negocio). */
  fecha_devolucion: string | Date | null;
  /** Confirmación de recepción de la bodega (null = todavía no se confirma). */
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
  /** true mientras la bodega no confirme la recepción. */
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

/** Solicitud de traspaso de unidades de bodega al bar (crea la transferencia). */
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
  transferencia_id?: string;
  trasladadas: number;
  stock_bar: number;
}

/** Alta de una presentación de catálogo. */
export interface NuevaPresentacionInput {
  stock_minimo?: number | null;
  stock_maximo?: number | null;
  producto_id: string;
  nombre: string;
  codigo_barras?: string | null;
  precio_compra?: number;
  foto?: string | null;
}

/** Campos editables de una presentación (los no enviados no se tocan). */
export interface PresentacionCamposInput {
  stock_minimo?: number | null;
  stock_maximo?: number | null;
  opciones_venta?: SaleOption[];
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
 * Contadores del control de envases: entregados por el bar que la bodega
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
  venta_id?: string;
  servicio_id?: string;
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
  servicioId?: string;
}

/**
 * Orden pendiente de reposición para una presentación que quedó bajo su
 * `stock_minimo`. `stock_actual` es la suma de Bar y Bodega; `cantidad` es lo
 * que falta para llegar al máximo sin superarlo.
 */
export interface OrdenReposicion {
  id: string;
  producto_id: string;
  presentacion_id: string;
  producto: string;
  presentacion: string;
  stock_bodega: number;
  stock_bar: number;
  stock_actual: number;
  stock_minimo: number;
  stock_maximo: number;
  cantidad: number;
  precio_compra: number;
}

export { CLAVES_INVENTARIO } from './configuracionClaves';
